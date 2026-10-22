// Asks Google Gemini (through OpenRouter) to read today's catch and write the AI Insights
// page: a market summary, insights and smart picks for customers. Saves lib/ai-insights.json.
// Run it with: npm run ai:insights   (needs OPENROUTER_API_KEY in .env.local; never printed)
import { writeFileSync } from "node:fs";
import { FISH, REFERENCE_RATE, offersFor, priceHistory, priceOf, availableKg, type Market } from "../lib/catalog";

const MODEL = "google/gemini-3.7-flash";
const key = process.env.OPENROUTER_API_KEY?.trim();
if (!key) {
  console.log("❌ OPENROUTER_API_KEY is empty in .env.local");
  process.exit(1);
}

// Morning prices (no evening deal), full stock: the market as it opens.
const market: Market = { sold: {}, ops: { approved: {}, held: {}, kg: {} }, hour: 9 };

const data = FISH.map((f) => {
  const offers = offersFor(f.key, market);
  const best = offers[0];
  if (!best) return null;
  const today = priceOf(best, market);
  const week = priceHistory(f.key, today);
  return {
    fishKey: f.key,
    name: `${f.name} (${f.english})`,
    bestPricePerKg: today,
    lastPricePerKg: best.lastPrice,
    weekAveragePerKg: Math.round(week.slice(0, -1).reduce((s, v) => s + v, 0) / 6),
    harbourRatePerKg: REFERENCE_RATE[f.key],
    boats: offers.length,
    kgAvailable: availableKg(f.key, market),
    bestBoatGrade: best.grade ?? "not graded",
    bestFor: f.bestFor,
    serves: f.serves,
  };
}).filter(Boolean);

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "summary", "insights", "picks", "tip"],
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    insights: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["emoji", "title", "text", "fishKey"],
        properties: {
          emoji: { type: "string" },
          title: { type: "string" },
          text: { type: "string" },
          fishKey: { type: "string", enum: FISH.map((f) => f.key) },
        },
      },
    },
    picks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "fishKey", "reason"],
        properties: {
          label: { type: "string", enum: ["Budget pick", "Family pick", "Special occasion"] },
          fishKey: { type: "string", enum: FISH.map((f) => f.key) },
          reason: { type: "string" },
        },
      },
    },
    tip: { type: "string" },
  },
};

const prompt = `You are a friendly fish-market analyst for home cooks in Mangaluru.
Using ONLY the numbers in the data below (do not invent any other numbers, places or facts), write:
- headline: at most 10 words about today's market
- summary: 2 short sentences a customer understands
- insights: exactly 4 items (emoji, title of at most 5 words, text of at most 22 words, fishKey it is about),
  covering: the best deal against the week average, a fish that is pricier than usual, the most plentiful fish,
  and a high-quality (Grade A) premium choice
- picks: exactly 3, one each of "Budget pick", "Family pick", "Special occasion", with a reason of at most 18 words
- tip: one practical buying or cooking tip of at most 22 words
Use rupees like ₹210/kg. Use the local fish names (Bangude, Anjal...). Simple English, no hype.

Data (price per kg in rupees):
${JSON.stringify(data, null, 1)}`;

const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: MODEL,
    temperature: 0.4,
    provider: { only: ["google-vertex", "google-ai-studio"], allow_fallbacks: false, require_parameters: true },
    response_format: { type: "json_schema", json_schema: { name: "market_insights", strict: true, schema } },
    messages: [{ role: "user", content: prompt }],
  }),
});
const body = await res.json();
if (!res.ok) {
  console.log(`❌ OpenRouter said ${res.status}: ${body.error?.message ?? JSON.stringify(body)}`);
  process.exit(1);
}
const insights = JSON.parse(body.choices[0].message.content);
const out = { model: MODEL, generatedAt: new Date().toISOString(), basedOn: "Morning prices of the demo catalogue", ...insights };
writeFileSync(new URL("../lib/ai-insights.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(`✅ Saved lib/ai-insights.json (${body.model}, ${body.usage?.total_tokens ?? "?"} tokens, cost $${body.usage?.cost ?? "?"})`);
console.log(JSON.stringify(insights, null, 2));
