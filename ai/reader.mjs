// The AI "reader": turns a messy WhatsApp message into clean data, using a Google
// Gemini model through OpenRouter. The AI only READS. It never sets prices, checks stock
// or replies by itself; the n8n workflow and the database do that.
//
// This file is the single source of the prompts and answer shapes. scripts/test-ai.mjs
// tests it on your Mac, and the same text is copied into the n8n workflow.

export const MODEL = "google/gemini-3.7-flash";
export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// "bangude (also: bangda, ayala, mackerel)" — one line per fish, from the Supabase fish table.
function fishList(fish) {
  return fish.map((f) => `- ${f.key} (also: ${f.aliases.join(", ")}; English: ${f.english_name})`).join("\n");
}

const CATCH_PROMPT = (fish) => `You read WhatsApp messages from fishing-boat owners at Mangaluru harbour.
They report what they caught and the price they want. Messages are short and mix English,
Kannada, Tulu and Konkani, often in Roman letters, with no fixed format.

Pull out every fish they offer, with:
- fish: the matching key from the list below, or "unknown" if it is not on the list
- kg: total kilograms (convert "quintal" = 100 kg, "ton" = 1000 kg, number words in any language)
- price_per_kg: rupees per kg (the number written with rs, ₹, rate, or the second number)

Usual pattern is "<fish> <kg> <price>", e.g. "bangude 50 220" = 50 kg bangude at ₹220/kg.
Set understood=false if the message is not a catch report, or if any fish is missing its kg or
price. Then write a short, friendly question in "question" asking for what is missing.
Never guess a number that is not in the message.

Fish list:
${fishList(fish)}`;

const ORDER_PROMPT = (fish) => `You read WhatsApp messages from customers in Mangaluru ordering fresh fish.
They write like they talk, mixing English, Kannada, Tulu and Konkani.

Pull out:
- fish: the matching key from the list below, or "unknown" if it is not on the list
- kg: kilograms wanted ("1 kilo" = 1, "half kg" = 0.5, "500 g" = 0.5, "1.5kg" = 1.5).
  Never turn "1 kilo" into 10. If no amount is given, use 1.
- cleaned: true only if they ask for it cleaned/cut/dressed

Set understood=false if the message is not a fish order (a greeting, a question, a complaint),
or asks for more than one fish. Then write a short, friendly reply in "question"
(for several fish: ask them to order one fish per message).
The reply must never promise anything: no delivery areas or times, prices, stock or discounts.
For questions you can't answer from this message, say a MeenuBazaar person will reply soon,
and that they can order by sending a fish name and kg, e.g. "1 kg bangude cleaned".

Fish list:
${fishList(fish)}`;

function catchSchema(fish) {
  const keys = [...fish.map((f) => f.key), "unknown"];
  return {
    type: "object",
    additionalProperties: false,
    required: ["understood", "items", "question"],
    properties: {
      understood: { type: "boolean" },
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["fish", "kg", "price_per_kg"],
          properties: {
            fish: { type: "string", enum: keys },
            kg: { type: "number" },
            price_per_kg: { type: "number" },
          },
        },
      },
      question: { type: ["string", "null"] },
    },
  };
}

function orderSchema(fish) {
  const keys = [...fish.map((f) => f.key), "unknown"];
  return {
    type: "object",
    additionalProperties: false,
    required: ["understood", "fish", "kg", "cleaned", "question"],
    properties: {
      understood: { type: "boolean" },
      fish: { type: "string", enum: keys },
      kg: { type: "number" },
      cleaned: { type: "boolean" },
      question: { type: ["string", "null"] },
    },
  };
}

// The exact request body sent to OpenRouter. kind is "catch" (fisherman) or "order" (customer).
export function buildRequest(kind, fish, message) {
  const isCatch = kind === "catch";
  return {
    model: MODEL,
    temperature: 0,
    // Only Google's own servers answer, and only ones that honour the JSON shape. No fallbacks.
    provider: { only: ["google-vertex", "google-ai-studio"], allow_fallbacks: false, require_parameters: true },
    response_format: {
      type: "json_schema",
      json_schema: {
        name: isCatch ? "catch_report" : "fish_order",
        strict: true,
        schema: isCatch ? catchSchema(fish) : orderSchema(fish),
      },
    },
    messages: [
      { role: "system", content: isCatch ? CATCH_PROMPT(fish) : ORDER_PROMPT(fish) },
      { role: "user", content: message },
    ],
  };
}
