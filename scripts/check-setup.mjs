// Checks that the website's keys in .env.local work and the database is set up safely.
// Run it with: npm run check:setup
// It never prints your keys.
import { createClient } from "@supabase/supabase-js";

let failed = false;
const pass = (msg) => console.log(`✅ ${msg}`);
const warn = (msg) => console.log(`⚠️  ${msg}`);
const fail = (msg, fix) => {
  failed = true;
  console.log(`❌ ${msg}\n   → ${fix}`);
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/rest\/v1\/?$|\/$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

// 1. Are the keys filled in, and is it the right kind of key?
if (!url || !key) {
  if (!url) fail("NEXT_PUBLIC_SUPABASE_URL is empty", "Open .env.local, paste the value right after the = sign, and save.");
  if (!key) fail("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is empty", "Open .env.local, paste the value right after the = sign, and save.");
  process.exit(1);
}
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
  fail("NEXT_PUBLIC_SUPABASE_URL doesn't look like https://xxxx.supabase.co", "Copy the Project URL again from Supabase.");
  process.exit(1);
}
if (key.startsWith("sb_secret_")) {
  fail("You pasted the SECRET key", "Use the publishable key (starts with sb_publishable_). The secret key must never go in the website.");
  process.exit(1);
}
pass("Both website keys are filled in");

const db = createClient(url, key, { auth: { persistSession: false } });

// 2. Can the website read the fish list?
const { data: fish, error: fishError } = await db.from("fish").select("key");
if (fishError) {
  fail(`Couldn't read the fish list (${fishError.message})`, "Check the URL and publishable key, and that supabase/schema.sql ran.");
} else if (fish.length === 0) {
  fail("The fish list is empty", "Run supabase/seed.sql in the Supabase SQL Editor.");
} else {
  pass(`Supabase connected: ${fish.length} fish names loaded`);
}

// 3. Can it read listings and boat names (what the board shows)?
const { error: listError } = await db.from("listings").select("id, fish(name), boats(name)").limit(1);
if (listError) fail(`Couldn't read listings (${listError.message})`, "Re-run supabase/schema.sql in the SQL Editor.");
else pass("The board can read listings and boat names");

// 4. Private data must stay private.
const { error: phoneError } = await db.from("boats").select("phone").limit(1);
if (phoneError) pass("Boat phone numbers are hidden from the website");
else fail("The website can see boat phone numbers", "Re-run supabase/schema.sql in the SQL Editor.");

const { error: ordersError } = await db.from("orders").select("id").limit(1);
if (ordersError) pass("Orders are hidden from the website");
else fail("The website can read orders", "Make sure you used the publishable key, then re-run supabase/schema.sql.");

const { error: rpcError } = await db.rpc("place_order", {
  p_customer_phone: "0", p_fish: "__setup_check__", p_kg: 1, p_cleaned: false,
});
if (rpcError) pass("The website can't place orders by itself (only n8n can)");
else fail("The website key can place orders", "Make sure you used the publishable key, then re-run supabase/schema.sql.");

// 5. WhatsApp number (filled in later, at Step 4).
const wa = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");
if (wa) pass("WhatsApp order number is set");
else warn("NEXT_PUBLIC_WHATSAPP_NUMBER is empty. That's fine until Step 4.");

console.log(failed ? "\nFix the ❌ lines above, then run this again." : "\nAll set! The website can talk to Supabase.");
process.exit(failed ? 1 : 0);
