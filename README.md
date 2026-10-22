# MeenuBazaar

A WhatsApp-first fish marketplace for Mangaluru. Boat owners post their catch on WhatsApp,
it appears live on a public price board, and customers order on WhatsApp.

```
Fisherman / customer WhatsApp → WhatsApp Cloud API → n8n → Gemini (OpenRouter) → Supabase → live price board (this app)
```

## What's here

| Path | What it is |
|---|---|
| `app/PriceBoard.tsx` | The live price board: prices, kg left, ▲/▼ moves, "Order on WhatsApp" buttons |
| `lib/supabase.ts` | Read-only Supabase connection for the browser |
| `supabase/schema.sql` | Tables, safe functions (`save_catch`, `place_order`, …), access rules, live updates |
| `supabase/seed.sql` | Demo boat and fish names with local spellings |
| `supabase/test.sql` | Database self-test (every row should say PASS) |
| `ai/reader.mjs` | Gemini prompts and JSON shapes that read catch reports and orders |
| `scripts/check-setup.mjs` | `npm run check:setup`: checks the website's Supabase keys |
| `scripts/test-ai.mjs` | `npm run test:ai`: sends 14 sample messages to Gemini and checks the readings |

## Run it on your computer

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the values.
3. `npm run check:setup`
4. `npm run dev`, then open http://localhost:3000

## Deploy (Vercel)

Import this repo in Vercel and add these environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_WHATSAPP_NUMBER` (once the WhatsApp number is set up)

Never add the Supabase secret key or the OpenRouter key to Vercel. Those live only in n8n.

## Status

- ✅ Database (Supabase) with stock-safe ordering
- ✅ Live price board
- ✅ AI reader tested with `google/gemini-3.7-flash`
- ⏳ WhatsApp + n8n workflow
