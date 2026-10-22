import { createClient } from "@supabase/supabase-js";

// The browser's connection to Supabase. It uses the publishable key, which can only
// READ fish, listings and boat names (see supabase/schema.sql). All writes go through n8n.
// Keep only https://xxxx.supabase.co, in case "/rest/v1/" was copied along with it.
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/rest\/v1\/?$|\/$/, "");
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const supabaseConfigured = Boolean(url && publishableKey);

export const supabase = supabaseConfigured
  ? createClient(url, publishableKey, { auth: { persistSession: false } })
  : null;
