// Builds the n8n workflows that run the chat bots.
// Run it with: npm run build:n8n
//
// Writes (none of them contain any key; keys live in n8n credentials only):
//   n8n/meenubazaar-workflow.json        WhatsApp bot, placeholders, safe to commit
//   n8n/telegram-workflow.json           Telegram demo bot, placeholders, safe to commit
//   n8n/*.local.json                     the same with your Supabase URL (and WhatsApp
//                                        Phone number ID) filled in; import these (git-ignored)
//
// Flow (both bots):
//   message → Read message → Supabase inbound()        (Telegram: tg_inbound())
//     ├─ YES / NO   → reply straight away
//     └─ anything else → Gemini (OpenRouter) reads it → Supabase after_ai() → reply
//   → Send reply (+ "pack" alert to the boat when an order is confirmed)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const GRAPH_VERSION = "v25.0";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const PLACEHOLDER_SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";

// The Gemini prompts and request shape, copied from ai/reader.mjs into the n8n Code node.
const readerSource = readFileSync(new URL("../ai/reader.mjs", import.meta.url), "utf8").replace(/^export /gm, "");

// ─── Node building blocks ───────────────────────────────────────────────────

function http(id, name, position, { url, body, credName, withAuth = true, continueOnError = false }) {
  return {
    id,
    name,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position,
    parameters: {
      method: "POST",
      url,
      ...(withAuth
        ? { authentication: "genericCredentialType", genericAuthType: "httpHeaderAuth" }
        : { authentication: "none" }),
      sendBody: true,
      specifyBody: "json",
      jsonBody: body,
      options: { timeout: 30000 },
    },
    ...(withAuth ? { credentials: { httpHeaderAuth: { id: "", name: credName } } } : {}),
    ...(continueOnError ? { onError: "continueRegularOutput" } : {}),
  };
}

function ifNode(id, name, position, leftValue, operation, rightValue) {
  return {
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
  };
}

function code(id, name, position, jsCode) {
  return { id, name, type: "n8n-nodes-base.code", typeVersion: 2, position, parameters: { jsCode } };
}

const manualTrigger = (name) => ({
  id: "trigger",
  name,
  type: "n8n-nodes-base.manualTrigger",
  typeVersion: 1,
  position: [0, 300],
  parameters: {},
});

const settingsLine = (supabaseUrl) => `const SUPABASE_URL = ${JSON.stringify(supabaseUrl)};`;
const incomingLine = (testMessage) =>
  testMessage
    ? `\n// TEST ONLY: a fake incoming message\nconst incoming = [{ json: ${JSON.stringify(testMessage)} }];\n`
    : "const incoming = $input.all();";
const cleanUrl = 'SUPABASE_URL.replace(/\\/rest\\/v1\\/?$|\\/$/, "")';

// The middle of both bots: decide if Gemini is needed, ask it, and hand its reading back
// to the database. `id` is the field that identifies the sender ("phone" or "telegram_id").
function readerNodes({ id, inboundFn, afterAiFn, openrouterUrl, withAuth }) {
  const idArg = id === "phone" ? "p_phone" : "p_telegram_id";
  return [
    http("inbound", `Supabase: ${inboundFn}`, [440, 300], {
      url: `={{ $json.supabase_url }}/rest/v1/rpc/${inboundFn}`,
      body: `={{ JSON.stringify({ ${idArg}: $json.${id}, p_text: $json.text }) }}`,
      credName: "Supabase secret key",
      withAuth,
    }),
    ifNode("needs-ai", "Needs Gemini?", [660, 300], "={{ $json.action }}", "equals", "read"),
    code(
      "build-ai",
      "Build Gemini request",
      [880, 160],
      `// Copied from ai/reader.mjs by scripts/build-n8n.mjs. Edit it there, then rebuild.
${readerSource}
const j = $input.first().json;
return [{ json: { ${id}: j.${id}, kind: j.kind, request: buildRequest(j.kind, j.fish, j.text) } }];`,
    ),
    http("gemini", "Gemini (OpenRouter)", [1100, 160], {
      url: openrouterUrl,
      body: "={{ JSON.stringify($json.request) }}",
      credName: "OpenRouter key",
      withAuth,
      continueOnError: true,
    }),
    code(
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
  ${id}: asked.${id},
  kind: asked.kind,
  reading,
} }];`,
    ),
    http("after-ai", `Supabase: ${afterAiFn}`, [1540, 160], {
      url: `={{ $json.supabase_url }}/rest/v1/rpc/${afterAiFn}`,
      body: `={{ JSON.stringify({ ${idArg}: $json.${id}, p_kind: $json.kind, p_reading: $json.reading }) }}`,
      credName: "Supabase secret key",
      withAuth,
    }),
    { id: "ready", name: "Reply ready", type: "n8n-nodes-base.noOp", typeVersion: 1, position: [1760, 300], parameters: {} },
  ];
}

function connect(triggerName, inboundFn, afterAiFn, sendReply, sendAlert) {
  const to = (...names) => ({ main: [names.map((node) => ({ node, type: "main", index: 0 }))] });
  return {
    [triggerName]: to("Read message"),
    "Read message": to(`Supabase: ${inboundFn}`),
    [`Supabase: ${inboundFn}`]: to("Needs Gemini?"),
    "Needs Gemini?": {
      main: [
        [{ node: "Build Gemini request", type: "main", index: 0 }],
        [{ node: "Reply ready", type: "main", index: 0 }],
      ],
    },
    "Build Gemini request": to("Gemini (OpenRouter)"),
    "Gemini (OpenRouter)": to("Read Gemini answer"),
    "Read Gemini answer": to(`Supabase: ${afterAiFn}`),
    [`Supabase: ${afterAiFn}`]: to("Reply ready"),
    "Reply ready": to(sendReply, "Pack alert?"),
    "Pack alert?": to(sendAlert),
  };
}

// ─── WhatsApp bot ───────────────────────────────────────────────────────────

export function buildWorkflow({
  supabaseUrl = PLACEHOLDER_SUPABASE_URL,
  phoneNumberId = "YOUR_PHONE_NUMBER_ID",
  openrouterUrl = OPENROUTER_URL,
  graphBase = `https://graph.facebook.com/${GRAPH_VERSION}`,
  testTrigger = null, // tests only: a fake WhatsApp message instead of the real trigger
  withAuth = true, // tests only: false skips n8n credentials
} = {}) {
  const trigger = testTrigger
    ? manualTrigger("WhatsApp Trigger")
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
${settingsLine(supabaseUrl)}
const WHATSAPP_PHONE_NUMBER_ID = ${JSON.stringify(phoneNumberId)};
${incomingLine(testTrigger)}
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
        supabase_url: ${cleanUrl},
        phone_number_id: WHATSAPP_PHONE_NUMBER_ID,
        phone: m.from,
        text: text ?? "",
      } });
    }
  }
}
return out;`,
  );

  const graphUrl = `=${graphBase}/{{ $('Read message').first().json.phone_number_id }}/messages`;
  const sendReply = http("send-reply", "Send WhatsApp reply", [1980, 220], {
    url: graphUrl,
    body: `={{ JSON.stringify({ messaging_product: "whatsapp", to: $json.phone, type: "text", text: { body: $json.reply } }) }}`,
    credName: "WhatsApp token",
    withAuth,
  });
  const hasAlert = ifNode("has-alert", "Pack alert?", [1980, 420], "={{ $json.alert_phone }}", "notEmpty");
  const sendAlert = http("send-alert", "Send pack alert to boat", [2200, 400], {
    url: graphUrl,
    body: `={{ JSON.stringify({ messaging_product: "whatsapp", to: $json.alert_phone, type: "text", text: { body: $json.alert } }) }}`,
    credName: "WhatsApp token",
    withAuth,
  });

  return {
    name: "MeenuBazaar WhatsApp bot",
    nodes: [
      trigger,
      readMessage,
      ...readerNodes({ id: "phone", inboundFn: "inbound", afterAiFn: "after_ai", openrouterUrl, withAuth }),
      sendReply,
      hasAlert,
      sendAlert,
    ],
    connections: connect("WhatsApp Trigger", "inbound", "after_ai", "Send WhatsApp reply", "Send pack alert to boat"),
    settings: { executionOrder: "v1" },
    pinData: {},
  };
}

// ─── Telegram demo bot ──────────────────────────────────────────────────────

export function buildTelegramWorkflow({
  supabaseUrl = PLACEHOLDER_SUPABASE_URL,
  openrouterUrl = OPENROUTER_URL,
  testMessage = null, // tests only: a fake Telegram update instead of the real trigger
  withAuth = true, // tests only: false skips the Supabase/OpenRouter credentials
  telegramCredential = { id: "", name: "Telegram bot" },
} = {}) {
  const telegramCreds = { telegramApi: telegramCredential };
  const trigger = testMessage
    ? manualTrigger("Telegram Trigger")
    : {
        id: "trigger",
        name: "Telegram Trigger",
        type: "n8n-nodes-base.telegramTrigger",
        typeVersion: 1.2,
        position: [0, 300],
        webhookId: "b6a1d3f4-2c7e-4f0a-9e51-7d4c8a2b6e93",
        parameters: { updates: ["message"], additionalFields: {} },
        credentials: telegramCreds,
      };

  const readMessage = code(
    "read",
    "Read message",
    [220, 300],
    `// ✏️ Your settings (not secret). Keys live in n8n Credentials, never here.
${settingsLine(supabaseUrl)}
${incomingLine(testMessage)}
const out = [];
for (const item of incoming) {
  const m = item.json.message ?? item.json.edited_message;
  if (!m?.from || m.from.is_bot) continue;
  let text = m.text ?? m.caption ?? "";
  // The website's "Order on Telegram" button opens the bot with a code, because Telegram
  // links can't pre-fill a message: /start order-<fish>-<kg, 1_5 = 1.5>-<c|n>[-<area>].
  // Turn it into the same order sentence the WhatsApp button sends.
  const deep = text.match(/^\\/start\\s+order-([a-z]+)-(\\d+(?:_\\d+)?)-([cn])(?:-([a-z]+))?$/i);
  if (deep) {
    const [, fish, kg, cut, area] = deep;
    text = "Order " + kg.replace("_", ".") + " kg " + fish + (cut === "c" ? " cleaned" : "") + "." +
      (area ? "\\nDeliver to: " + area[0].toUpperCase() + area.slice(1) : "");
  }
  out.push({ json: {
    supabase_url: ${cleanUrl},
    telegram_id: String(m.from.id),
    text,
  } });
}
return out;`,
  );

  const telegramSend = (id, name, position, chatId, text) => ({
    id,
    name,
    type: "n8n-nodes-base.telegram",
    typeVersion: 1.2,
    position,
    parameters: {
      resource: "message",
      operation: "sendMessage",
      chatId,
      text,
      additionalFields: { appendAttribution: false },
    },
    credentials: telegramCreds,
  });

  return {
    name: "MeenuBazaar Telegram bot",
    nodes: [
      trigger,
      readMessage,
      ...readerNodes({ id: "telegram_id", inboundFn: "tg_inbound", afterAiFn: "tg_after_ai", openrouterUrl, withAuth }),
      telegramSend("send-reply", "Send Telegram reply", [1980, 220], "={{ $json.chat_id }}", "={{ $json.reply }}"),
      ifNode("has-alert", "Pack alert?", [1980, 420], "={{ $json.alert_chat_id }}", "notEmpty"),
      telegramSend("send-alert", "Send pack alert to boat", [2200, 400], "={{ $json.alert_chat_id }}", "={{ $json.alert }}"),
    ],
    connections: connect("Telegram Trigger", "tg_inbound", "tg_after_ai", "Send Telegram reply", "Send pack alert to boat"),
    settings: { executionOrder: "v1" },
    pinData: {},
  };
}

// ─── Run directly: write the workflow files ─────────────────────────────────

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const env = process.env;
  const dir = new URL("../n8n/", import.meta.url);
  const write = (file, workflow) => writeFileSync(new URL(file, dir), JSON.stringify(workflow, null, 2) + "\n");
  mkdirSync(dir, { recursive: true });

  write("meenubazaar-workflow.json", buildWorkflow());
  write("telegram-workflow.json", buildTelegramWorkflow());
  console.log("✅ Wrote n8n/meenubazaar-workflow.json and n8n/telegram-workflow.json (placeholders, safe to commit)");

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/rest\/v1\/?$|\/$/, "");
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (supabaseUrl) {
    write("telegram-workflow.local.json", buildTelegramWorkflow({ supabaseUrl }));
    console.log("✅ Wrote n8n/telegram-workflow.local.json (import this one into n8n)");
  }
  if (supabaseUrl && phoneNumberId) {
    write("meenubazaar-workflow.local.json", buildWorkflow({ supabaseUrl, phoneNumberId }));
    console.log("✅ Wrote n8n/meenubazaar-workflow.local.json");
  } else {
    console.log("⚠️  Add WHATSAPP_PHONE_NUMBER_ID to .env.local to also get the WhatsApp file to import.");
  }
}
