// Builds the n8n workflow that runs the WhatsApp bot.
// Run it with: npm run build:n8n
//
// Writes two files:
//   n8n/meenubazaar-workflow.json        placeholders, safe to commit
//   n8n/meenubazaar-workflow.local.json  your Supabase URL and WhatsApp Phone number ID
//                                        filled in; import this one (git-ignored)
// Neither file contains any key. Keys live in n8n credentials only.
//
// Flow:  WhatsApp message → Read message → Supabase inbound()
//          ├─ YES / NO   → reply straight away
//          └─ anything else → Gemini (OpenRouter) reads it → Supabase after_ai() → reply
//        → Send WhatsApp reply (+ "pack" alert to the boat when an order is confirmed)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const GRAPH_VERSION = "v25.0";

// The Gemini prompts and request shape, copied from ai/reader.mjs into the n8n Code node.
const readerSource = readFileSync(new URL("../ai/reader.mjs", import.meta.url), "utf8").replace(/^export /gm, "");

export function buildWorkflow({
  supabaseUrl = "https://YOUR-PROJECT.supabase.co",
  phoneNumberId = "YOUR_PHONE_NUMBER_ID",
  openrouterUrl = "https://openrouter.ai/api/v1/chat/completions",
  graphBase = `https://graph.facebook.com/${GRAPH_VERSION}`,
  testTrigger = null, // tests only: a fake WhatsApp message instead of the real trigger
  withAuth = true, // tests only: false skips n8n credentials
} = {}) {
  const auth = (credName) =>
    withAuth
      ? {
          parameters: { authentication: "genericCredentialType", genericAuthType: "httpHeaderAuth" },
          credentials: { httpHeaderAuth: { id: "", name: credName } },
        }
      : { parameters: { authentication: "none" }, credentials: undefined };

  const http = (id, name, position, { url, body, credName, continueOnError = false }) => {
    const a = auth(credName);
    return {
      id,
      name,
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position,
      parameters: {
        method: "POST",
        url,
        ...a.parameters,
        sendBody: true,
        specifyBody: "json",
        jsonBody: body,
        options: { timeout: 30000 },
      },
      ...(a.credentials ? { credentials: a.credentials } : {}),
      ...(continueOnError ? { onError: "continueRegularOutput" } : {}),
    };
  };

  const ifNode = (id, name, position, leftValue, operation, rightValue) => ({
    id,
    name,
    type: "n8n-nodes-base.if",
    typeVersion: 2,
    position,
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "loose" },
        conditions: [
          {
            id: `${id}-c`,
            leftValue,
            rightValue: rightValue ?? "",
            operator:
              operation === "notEmpty"
                ? { type: "string", operation: "notEmpty", singleValue: true }
                : { type: "string", operation },
          },
        ],
        combinator: "and",
      },
      options: {},
    },
  });

  const code = (id, name, position, jsCode) => ({
    id,
    name,
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position,
    parameters: { jsCode },
  });

  const trigger = testTrigger
    ? {
        id: "trigger",
        name: "WhatsApp Trigger",
        type: "n8n-nodes-base.manualTrigger",
        typeVersion: 1,
        position: [0, 300],
        parameters: {},
      }
    : {
        id: "trigger",
        name: "WhatsApp Trigger",
        type: "n8n-nodes-base.whatsAppTrigger",
        typeVersion: 1,
        position: [0, 300],
        webhookId: "6d1f4f52-6a2e-4d43-9d1c-3e5b8f3a9b10",
        // Only real messages; skip "delivered"/"read" receipts so each message runs once.
        parameters: { updates: ["messages"], options: { messageStatusUpdates: [] } },
        credentials: { whatsAppTriggerApi: { id: "", name: "WhatsApp OAuth account" } },
      };

  const readMessage = code(
    "read",
    "Read message",
    [220, 300],
    `// ✏️ Your settings (not secret). Keys live in n8n Credentials, never here.
const SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
const WHATSAPP_PHONE_NUMBER_ID = ${JSON.stringify(phoneNumberId)};
${testTrigger ? `\n// TEST ONLY: a fake WhatsApp message\nconst incoming = [{ json: ${JSON.stringify(testTrigger)} }];\n` : "const incoming = $input.all();"}
// WhatsApp sends text messages, plus delivery/read receipts (which we skip).
const out = [];
for (const item of incoming) {
  const j = item.json;
  const values = [];
  if (j.messages) values.push(j);
  if (j.value?.messages) values.push(j.value);
  for (const e of j.entry ?? []) for (const c of e.changes ?? []) if (c.value) values.push(c.value);
  for (const v of values) {
    for (const m of v.messages ?? []) {
      const text =
        m.type === "text" ? m.text?.body :
        m.type === "button" ? m.button?.text :
        m.type === "interactive" ? (m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title) : "";
      out.push({ json: {
        supabase_url: SUPABASE_URL.replace(/\\/rest\\/v1\\/?$|\\/$/, ""),
        phone_number_id: WHATSAPP_PHONE_NUMBER_ID,
        phone: m.from,
        text: text ?? "",
      } });
    }
  }
}
return out;`,
  );

  const inbound = http("inbound", "Supabase: inbound", [440, 300], {
    url: "={{ $json.supabase_url }}/rest/v1/rpc/inbound",
    body: "={{ JSON.stringify({ p_phone: $json.phone, p_text: $json.text }) }}",
    credName: "Supabase secret key",
  });

  const needsAi = ifNode("needs-ai", "Needs Gemini?", [660, 300], "={{ $json.action }}", "equals", "read");

  const buildAi = code(
    "build-ai",
    "Build Gemini request",
    [880, 160],
    `// Copied from ai/reader.mjs by scripts/build-n8n.mjs. Edit it there, then rebuild.
${readerSource}
const j = $input.first().json;
return [{ json: { phone: j.phone, kind: j.kind, request: buildRequest(j.kind, j.fish, j.text) } }];`,
  );

  const gemini = http("gemini", "Gemini (OpenRouter)", [1100, 160], {
    url: openrouterUrl,
    body: "={{ JSON.stringify($json.request) }}",
    credName: "OpenRouter key",
    continueOnError: true,
  });

  const readAi = code(
    "read-ai",
    "Read Gemini answer",
    [1320, 160],
    `const asked = $('Build Gemini request').first().json;
const res = $input.first().json;
let reading = null; // null tells the database to say "please send it again"
try {
  reading = JSON.parse(res.choices[0].message.content);
} catch (e) {}
return [{ json: {
  supabase_url: $('Read message').first().json.supabase_url,
  phone: asked.phone,
  kind: asked.kind,
  reading,
} }];`,
  );

  const afterAi = http("after-ai", "Supabase: after_ai", [1540, 160], {
    url: "={{ $json.supabase_url }}/rest/v1/rpc/after_ai",
    body: "={{ JSON.stringify({ p_phone: $json.phone, p_kind: $json.kind, p_reading: $json.reading }) }}",
    credName: "Supabase secret key",
  });

  const ready = {
    id: "ready",
    name: "Reply ready",
    type: "n8n-nodes-base.noOp",
    typeVersion: 1,
    position: [1760, 300],
    parameters: {},
  };

  const graphUrl = `=${graphBase}/{{ $('Read message').first().json.phone_number_id }}/messages`;
  const sendReply = http("send-reply", "Send WhatsApp reply", [1980, 220], {
    url: graphUrl,
    body: `={{ JSON.stringify({ messaging_product: "whatsapp", to: $json.phone, type: "text", text: { body: $json.reply } }) }}`,
    credName: "WhatsApp token",
  });

  const hasAlert = ifNode("has-alert", "Pack alert?", [1980, 420], "={{ $json.alert_phone }}", "notEmpty");

  const sendAlert = http("send-alert", "Send pack alert to boat", [2200, 400], {
    url: graphUrl,
    body: `={{ JSON.stringify({ messaging_product: "whatsapp", to: $json.alert_phone, type: "text", text: { body: $json.alert } }) }}`,
    credName: "WhatsApp token",
  });

  const to = (...names) => ({ main: [names.map((node) => ({ node, type: "main", index: 0 }))] });
  return {
    name: "MeenuBazaar WhatsApp bot",
    nodes: [trigger, readMessage, inbound, needsAi, buildAi, gemini, readAi, afterAi, ready, sendReply, hasAlert, sendAlert],
    connections: {
      "WhatsApp Trigger": to("Read message"),
      "Read message": to("Supabase: inbound"),
      "Supabase: inbound": to("Needs Gemini?"),
      "Needs Gemini?": {
        main: [
          [{ node: "Build Gemini request", type: "main", index: 0 }],
          [{ node: "Reply ready", type: "main", index: 0 }],
        ],
      },
      "Build Gemini request": to("Gemini (OpenRouter)"),
      "Gemini (OpenRouter)": to("Read Gemini answer"),
      "Read Gemini answer": to("Supabase: after_ai"),
      "Supabase: after_ai": to("Reply ready"),
      "Reply ready": to("Send WhatsApp reply", "Pack alert?"),
      "Pack alert?": to("Send pack alert to boat"),
    },
    settings: { executionOrder: "v1" },
    pinData: {},
  };
}

// Run directly: write the two workflow files.
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const env = process.env;
  const dir = new URL("../n8n/", import.meta.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL("meenubazaar-workflow.json", dir), JSON.stringify(buildWorkflow(), null, 2) + "\n");
  console.log("✅ Wrote n8n/meenubazaar-workflow.json (placeholders, safe to commit)");

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/rest\/v1\/?$|\/$/, "");
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (supabaseUrl && phoneNumberId) {
    writeFileSync(
      new URL("meenubazaar-workflow.local.json", dir),
      JSON.stringify(buildWorkflow({ supabaseUrl, phoneNumberId }), null, 2) + "\n",
    );
    console.log("✅ Wrote n8n/meenubazaar-workflow.local.json (import this one into n8n)");
  } else {
    console.log("⚠️  Add WHATSAPP_PHONE_NUMBER_ID to .env.local, then run this again to get the file to import.");
  }
}
