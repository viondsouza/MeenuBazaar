// Sends real sample WhatsApp messages to Gemini (through OpenRouter) and checks what it reads.
// Run it with: npm run test:ai
// Needs OPENROUTER_API_KEY in .env.local. It never prints your key.
import { createClient } from "@supabase/supabase-js";
import { buildRequest, MODEL, OPENROUTER_URL } from "../ai/reader.mjs";

const apiKey = process.env.OPENROUTER_API_KEY?.trim();
if (!apiKey) {
  console.log("❌ OPENROUTER_API_KEY is empty\n   → Open .env.local, paste your OpenRouter key after the = sign, and save.");
  process.exit(1);
}

// The fish list comes from Supabase, exactly as n8n will load it.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL.trim().replace(/\/rest\/v1\/?$|\/$/, "");
const db = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.trim(), { auth: { persistSession: false } });
const { data: fish, error } = await db.from("fish").select("key, english_name, aliases");
if (error) {
  console.log(`❌ Couldn't load the fish list (${error.message}). Run npm run check:setup first.`);
  process.exit(1);
}

// expect: what a correct reading must contain. Items are compared in any order.
const CASES = [
  { kind: "catch", msg: "bangude 50 220", expect: { understood: true, items: [["bangude", 50, 220]] } },
  { kind: "catch", msg: "50kg bhutai 180rs", expect: { understood: true, items: [["bhutai", 50, 180]] } },
  { kind: "catch", msg: "Ayala 30 kilo rate 250", expect: { understood: true, items: [["bangude", 30, 250]] } },
  { kind: "catch", msg: "today anjal 12kg 650, manji 8 kg rate 900", expect: { understood: true, items: [["anjal", 12, 650], ["maanji", 8, 900]] } },
  { kind: "catch", msg: "bangude 1 quintal 200", expect: { understood: true, items: [["bangude", 100, 200]] } },
  { kind: "catch", msg: "bangude 50", expect: { understood: false } },
  { kind: "catch", msg: "good morning", expect: { understood: false } },
  { kind: "order", msg: "Order Bangude 1 kg", expect: { understood: true, fish: "bangude", kg: 1, cleaned: false } },
  { kind: "order", msg: "1 kilo bangude cleaned", expect: { understood: true, fish: "bangude", kg: 1, cleaned: true } },
  { kind: "order", msg: "half kg anjal", expect: { understood: true, fish: "anjal", kg: 0.5, cleaned: false } },
  { kind: "order", msg: "500 g prawns, cleaned pls", expect: { understood: true, fish: "etti", kg: 0.5, cleaned: true } },
  { kind: "order", msg: "2kg mackerel cut pieces", expect: { understood: true, fish: "bangude", kg: 2, cleaned: true } },
  { kind: "order", msg: "do you deliver to Kankanady?", expect: { understood: false } },
  { kind: "order", msg: "1 kg shark", expect: { fish: "unknown" } },
];

function check(expect, got) {
  for (const [field, want] of Object.entries(expect)) {
    if (field === "items") {
      const norm = (list) => list.map(([f, k, p]) => `${f}|${Number(k)}|${Number(p)}`).sort().join(", ");
      const gotItems = norm((got.items ?? []).map((i) => [i.fish, i.kg, i.price_per_kg]));
      if (gotItems !== norm(want)) return `items should be ${norm(want)}`;
    } else if (got[field] !== want) {
      return `${field} should be ${JSON.stringify(want)}`;
    }
  }
  return null;
}

console.log(`Testing ${CASES.length} messages with ${MODEL}…\n`);
let failures = 0;
for (const c of CASES) {
  const started = Date.now();
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(buildRequest(c.kind, fish, c.msg)),
  });
  const body = await res.json();
  if (!res.ok) {
    console.log(`❌ OpenRouter said ${res.status}: ${body.error?.message ?? JSON.stringify(body)}`);
    if (res.status === 401) console.log("   → The key was rejected. Create a new key at openrouter.ai/keys.");
    if (res.status === 402) console.log("   → No credit left. Add a few dollars at openrouter.ai/credits.");
    process.exit(1);
  }
  let got;
  try {
    got = JSON.parse(body.choices[0].message.content);
  } catch {
    got = { raw: body.choices?.[0]?.message?.content };
  }
  const problem = check(c.expect, got);
  if (problem) failures++;
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`${problem ? "❌" : "✅"} [${c.kind}] "${c.msg}"  (${seconds}s)`);
  console.log(`   read: ${JSON.stringify(got)}${problem ? `\n   problem: ${problem}` : ""}`);
}

console.log(failures ? `\n${failures} of ${CASES.length} readings were wrong.` : `\nAll ${CASES.length} readings correct!`);
process.exit(failures ? 1 : 0);
