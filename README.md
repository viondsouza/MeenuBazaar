# MeenuBazaar

A WhatsApp-first fish marketplace for Mangaluru. Boat owners post their catch on WhatsApp, it
appears live on a public price board, and customers order it on WhatsApp.

## The job to be done

> **When** I bring my boat into Mangaluru Bunder before dawn, **I want to** sell my catch at a
> price I set, to buyers who can see it, **so I** stop taking whatever the commission agent's
> auction calls.

And for the buyer: *when I want fresh fish, I want to see today's catch and its real price
and order it in one message, so I skip the market trip and the marked-up vendor price.*

Today, fish passes through 3–4 hands (agent, wholesaler, vendor) before a family buys it.
Fishermen get about 30–68% of what the customer pays ([CMFRI](https://www.cmfri.org.in/)),
and nobody in the chain sees all the prices.

### The 3 tests

The prototype does its job when these three tests pass on real phones:

| # | Test | Pass when | Status |
|---|---|---|---|
| 1 | **Fisherman posts a catch** | Typing `bangude 50 220` on WhatsApp gets back "Bangude, 50 kg at ₹220/kg. Reply YES". After YES, the catch is saved in Supabase. | ⏳ Gemini reading ✅ (14/14 sample messages), database ✅, WhatsApp + n8n not connected yet |
| 2 | **The board updates live** | Within seconds of the YES, the price board shows the fish, kg left and the ▲/▼ price move, with no page refresh. | ✅ Verified with the same database function n8n will call |
| 3 | **Customer orders on WhatsApp** | Tapping "Order on WhatsApp" sends "Order 1 kg Bangude". The bot confirms the total; on YES, stock goes down, the customer gets the UPI ID and the boat gets a "pack" alert. Ordering more than is in stock is refused. | ⏳ Stock check, pricing and refusals ✅ in the database self-test; WhatsApp + n8n not connected yet |

## Current workflow → future workflow

| Today | With MeenuBazaar |
|---|---|
| 1. Boat lands at Bunder before dawn. | 1. Boat owner sends the catch on WhatsApp: `bangude 50 220`. |
| 2. Commission agent auctions the catch in minutes; the boat owner takes the price called. | 2. **The boat owner sets the price.** AI reads the message, the bot repeats it back, the owner replies YES. |
| 3. Agent keeps a commission and may deduct earlier advances. | 3. The listing goes live on the public price board, with every price change visible. |
| 4. Wholesalers and vendors buy at the auction. | 4. **No middle layers.** Customers see the board and tap "Order on WhatsApp". |
| 5. Vendors carry fish to town markets or door to door. | 5. AI reads the order, the system checks stock and totals the price, the customer replies YES. |
| 6. Customers go to the market and pay the marked-up price. | 6. Customer pays the boat by UPI; the boat gets a "pack" alert; fish is cleaned and delivered. |
| 7. On glut days, prices crash and fish goes to fishmeal. | 7. Pre-orders and a live board help match the catch to buyers before it's landed. |

## Architecture

One WhatsApp message in, a confirmed listing or order out, in a few seconds.

```
 INPUT                 AI                       LOGIC                 ACTION                    OUTPUT
┌───────────────┐   ┌──────────────────────┐   ┌───────────────┐   ┌─────────────────────┐   ┌──────────────────────┐
│ WhatsApp      │──▶│ Gemini via OpenRouter│──▶│ n8n workflow  │──▶│ Supabase functions  │──▶│ Live price board     │
│ message from  │   │ reads the message    │   │ who is it?    │   │ save_catch()        │   │ (Next.js on Vercel)  │
│ fisherman or  │   │ into clean JSON:     │   │ YES / NO?     │   │ place_order()       │   │ WhatsApp replies:    │
│ customer      │   │ {fish, kg, price}    │   │ ask to confirm│   │ set/take_pending()  │   │ confirmation, UPI ID,│
│ (Cloud API)   │   │ {fish, kg, cleaned}  │   │ send reply    │   │                     │   │ "pack" alert to boat │
└───────────────┘   └──────────────────────┘   └───────────────┘   └─────────────────────┘   └──────────────────────┘
```

| Stage | What happens | Tool | Where in this repo |
|---|---|---|---|
| **Input** | Fisherman or customer sends a WhatsApp message | WhatsApp Business Cloud API | (n8n workflow, coming next) |
| **AI** | Turns the message into `{fish, kg, price_per_kg}` or `{fish, kg, cleaned}` | `google/gemini-3.7-flash` via OpenRouter, Google servers only | [`ai/reader.mjs`](ai/reader.mjs) |
| **Logic** | Is the sender a registered boat? Is this a YES/NO? Save the reading, ask to confirm, pick the reply | n8n | (n8n workflow, coming next) |
| **Action** | Save the catch, check stock, total the price, lock the row so two buyers can't get the last kilo | Supabase (Postgres functions) | [`supabase/schema.sql`](supabase/schema.sql) |
| **Output** | Live listing with ▲/▼ moves; WhatsApp confirmation, UPI ID and "pack" alert | Next.js on Vercel + Supabase Realtime | [`app/PriceBoard.tsx`](app/PriceBoard.tsx) |

**Security model:** the website uses Supabase's *publishable* key, which can only read fish,
listings and boat names. It can't see phone numbers, UPI IDs or orders, and it can't change
anything. Only n8n holds the secret key, and even n8n changes data only through the four
database functions.

## Where AI is used, and what stays human

AI reads messy messages. People handle anything that touches the fish or the money.

| Step | AI or human | Why |
|---|---|---|
| Read the fisherman's catch (`bangude 50 220`, `Ayala 30 kilo rate 250`) | **AI** (Gemini) | Short, mixed Kannada/Tulu/Konkani/English, never the same format; fixed rules can't parse it |
| Read the customer's order (`1 kilo bangude cleaned`) | **AI** (Gemini) | Customers write like they talk |
| Confirm every reading | **Human** (the sender replies YES) | Nothing goes live or gets sold on an AI guess |
| Check stock, total the price, match order to boat | **Code** (database function) | Fixed rules; must be exact and safe when two people order at once |
| Set the price | **Human** (boat owner) | It's their fish and their decision |
| Approve fish quality at Bunder | **Human** (checker) | Freshness needs eyes, smell and touch |
| Clean, pack, deliver | **Human** (vendor partner, rider) | Physical work |
| Refunds, complaints, unclear messages | **Human** (MeenuBazaar team) | Trust matters more than speed at first |

The AI can only pick a fish from the Supabase fish list (or `"unknown"`), must answer in a fixed
JSON shape, and is told never to promise delivery, prices or stock in its replies.

## Why these tools

| Tool | Why |
|---|---|
| **WhatsApp Business Cloud API** | Fishermen and Mangaluru families already use WhatsApp every day. No app to install. Free test number for the demo. |
| **Gemini through OpenRouter** | Google's fast Flash model reads mixed-language messages well and supports strict JSON output. OpenRouter gives one key and one bill. Requests are pinned to Google's own servers (`google-vertex`, `google-ai-studio`) with no fallback. |
| **n8n** | The workflow is visible as boxes and arrows, so a non-developer can follow and change it. It has a WhatsApp trigger built in. |
| **Supabase** | Postgres with row-level security, safe functions for stock, and Realtime to push changes to the board instantly. Its table view doubles as the admin dashboard. |
| **Next.js + Vercel** | One public page, free hosting, and every `git push` deploys automatically. |
| **GitHub** | Holds the website, the database setup and (next) the n8n workflow export. |

## Failure cases

| What can go wrong | What happens / the fix |
|---|---|
| **AI misreads a message** ("1 kilo" read as 10 kg, wrong fish) | The bot repeats the reading and waits for YES. The test suite checks "1 kilo" stays 1 kg. Unknown fish names come back as `"unknown"` and are never sold. |
| **AI makes up an answer** (e.g. "Yes, we deliver to Kankanady!") | The prompt forbids promises; the test caught this and the prompt was fixed. Unclear questions go to a person. |
| **Two customers order the last kilo at once** | `place_order` locks the listing row; the second order is refused with "not enough left". |
| **Customer orders more than is in stock** | Refused with how many kg are left. |
| **Catch doesn't match orders** (boat lands with less fish) | A person decides: refund or offer a swap. |
| **Fish arrives not fresh** (delay, broken ice) | Refund, and the checker reviews that boat. |
| **A stranger pretends to be a boat** | Only phone numbers in the `boats` table can post catches. |
| **Someone waits too long to reply YES** | Readings expire after 30 minutes; they must send the message again. |
| **WhatsApp limits** | The test number only reaches 5 approved phones, the bot can only reply within 24 hours of the user's last message, and the temporary access token expires after 24 hours. Fine for a demo; production needs a verified business and a permanent token. |

## How to run it locally

You need [Node.js](https://nodejs.org) 20+ and a free [Supabase](https://supabase.com) project.

1. **Install:**
   ```bash
   npm install
   ```
2. **Set up the database:** in Supabase, open **SQL Editor → New query** and run, in order:
   [`supabase/schema.sql`](supabase/schema.sql), then [`supabase/seed.sql`](supabase/seed.sql)
   (put the fisherman's WhatsApp number in it first), then [`supabase/test.sql`](supabase/test.sql).
   Every row of the test should say **PASS**.
3. **Add your keys:** copy `.env.example` to `.env.local` and fill in the Supabase Project URL and
   **publishable** key (Project Settings → API Keys). Never commit `.env.local`.
4. **Check the setup:**
   ```bash
   npm run check:setup
   ```
5. **Start the website** and open http://localhost:3000:
   ```bash
   npm run dev
   ```
6. **Optional, test the AI reader:** add `OPENROUTER_API_KEY` to `.env.local`, then:
   ```bash
   npm run test:ai
   ```
7. **See a live update:** keep the website open and run this in the Supabase SQL Editor:
   ```sql
   select save_catch((select phone from boats limit 1), 'bangude', 50, 220);
   ```

### Deploy to Vercel

Import this repo in Vercel and add `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and (once WhatsApp is set up)
`NEXT_PUBLIC_WHATSAPP_NUMBER`. **Never** add the Supabase secret key or the OpenRouter key to
Vercel; they live only in n8n.

## Telegram demo

WhatsApp is the long-term channel, but Meta blocks message delivery until the business adds a
payment method. For demos, the same bot also runs on **Telegram**, side by side with WhatsApp:
same n8n flow, same Gemini reader, same Supabase functions.

**How it maps users:** Telegram never shares phone numbers with bots, only a numeric user ID.
`boats.telegram_id` links a Telegram user to a boat; anyone else is a customer, stored as
`tg:<id>`. Two thin wrappers, `tg_inbound()` and `tg_after_ai()`, translate the ID and then call
the existing `inbound()`/`after_ai()`, which still use `save_catch`, `place_order` and
`set/take_pending` unchanged.

**Ordering from the website:** Telegram links can't pre-type a message, so "Order on Telegram"
opens `t.me/<bot>?start=order-bangude-1_5-c-kankanady`. When the customer taps **Start**, the
workflow turns that into "Order 1.5 kg bangude cleaned. Deliver to: Kankanady" and Gemini
reads it like any other order.

### Set it up

1. **Create the bot:** in Telegram, message **@BotFather** → `/newbot` → pick a name and a
   username ending in `bot`. Keep the token secret: it goes only into n8n.
2. **Database:** run the latest `supabase/schema.sql` in the Supabase SQL Editor.
3. **n8n:** add a **Telegram** credential (the token), named `Telegram bot`. Run
   `npm run build:n8n`, open `n8n/telegram-workflow.local.json`, copy it all and paste it onto
   an empty n8n canvas (or import `n8n/telegram-workflow.json` and fill in `SUPABASE_URL` in
   "Read message"). On each box choose its credential (Supabase secret key, OpenRouter key,
   Telegram bot), then **Publish**.
4. **Register the fisherman:** from the fisherman's Telegram, send `/start` to the bot. It
   replies with "Your Telegram ID: …". In Supabase run:
   `update boats set telegram_id = '<that id>' where id = '00000000-0000-0000-0000-000000000001';`
5. **Website:** set `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` (the username, without `@`) in Vercel
   and redeploy. The order buttons switch to Telegram; unset it to go back to WhatsApp.

### Demo checks

1. **Fisherman:** send `bangude 50 220` → "Please check your catch… Reply YES" → `YES` → the
   Bangude card on the board updates within seconds, no refresh.
2. **Customer** (another Telegram account): on the board tap **Order on Telegram** → **Start** →
   the bot shows the total → `YES` → the customer gets the UPI ID, the kg on the board drops,
   and the fisherman's chat gets "📦 New order: please pack…".
3. **Bad input:** `hello fish`, `1 kg shark` or `999 kg bangude` get a helpful reply ("only N kg
   left") and change nothing on the board. `bangude 50 220` from a non-boat account is read
   as an order, never a catch.

## What's in the repo

| Path | What it is |
|---|---|
| `app/page.tsx`, `app/PriceBoard.tsx` | The website and the live price board |
| `lib/supabase.ts`, `lib/chat.ts` | Read-only Supabase connection; WhatsApp or Telegram order links |
| `n8n/` | The WhatsApp and Telegram workflows to import (built by `npm run build:n8n`) |
| `supabase/` | Database tables, functions, access rules, demo data and self-test |
| `ai/reader.mjs` | Gemini prompts and the JSON shapes it must answer in |
| `scripts/check-setup.mjs` | Checks the website's Supabase keys and access rules |
| `scripts/test-ai.mjs` | Sends 14 sample WhatsApp messages to Gemini and checks every reading |

## Next

WhatsApp Cloud API + n8n workflow (Tests 1 and 3 end to end) → set `NEXT_PUBLIC_WHATSAPP_NUMBER`
→ Kannada/Tulu voice notes, UPI payment links and an admin dashboard (v2).
