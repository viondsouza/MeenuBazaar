-- MeenuBazaar database setup.
-- Run in Supabase: SQL Editor → New query → paste this whole file → Run.
-- Safe to run again: it only creates what is missing and refreshes the functions and rules.
--
-- Who uses what:
--   • n8n (with the secret key) calls the functions below: save_catch, place_order,
--     set_pending, take_pending. It never writes to tables directly.
--   • The website (with the publishable key) can only READ fish, listings and boat names.

-- ─── Tables ──────────────────────────────────────────────────────────────

-- Boats that sell fish. "phone" is the WhatsApp number exactly as WhatsApp sends it:
-- country code + number, digits only, no + or spaces (e.g. 919876543210).
create table if not exists boats (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique check (phone ~ '^[0-9]{10,15}$'),
  upi_id text not null,
  created_at timestamptz not null default now()
);

-- Telegram demo: Telegram doesn't share phone numbers with bots, only a numeric user ID.
-- A Telegram user whose ID is here is treated as that boat. (Hidden from the browser.)
alter table boats add column if not exists telegram_id text unique;

-- Fish the app understands, with the local names people actually type.
create table if not exists fish (
  key text primary key,            -- short id, e.g. 'bangude'
  name text not null,              -- shown on the board, e.g. 'Bangude'
  english_name text not null,      -- e.g. 'Indian mackerel'
  aliases text[] not null default '{}'  -- lowercase spellings, e.g. {'bangda','ayala'}
);

-- What each boat has for sale right now. One row per boat + fish.
-- previous_price_per_kg lets the board show an up/down arrow when the price changes.
create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references boats(id) on delete cascade,
  fish_key text not null references fish(key),
  price_per_kg numeric(10,2) not null check (price_per_kg > 0),
  previous_price_per_kg numeric(10,2),
  kg_left numeric(10,2) not null check (kg_left >= 0),
  updated_at timestamptz not null default now(),
  unique (boat_id, fish_key)
);

-- Customer orders. Price is copied in so later price changes don't alter old orders.
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_phone text not null,
  listing_id uuid references listings(id) on delete set null,
  boat_id uuid not null references boats(id),
  fish_key text not null references fish(key),
  kg numeric(10,2) not null check (kg > 0),
  cleaned boolean not null default false,
  price_per_kg numeric(10,2) not null,
  total numeric(12,2) not null,
  status text not null default 'awaiting_payment',
  created_at timestamptz not null default now()
);

-- What the AI read from someone's last message, waiting for them to reply YES or NO.
-- One row per phone: a new message replaces the old reading.
create table if not exists pending (
  phone text primary key,
  kind text not null check (kind in ('catch', 'order')),
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- ─── Web shop additions (customers order on the website) ─────────────────

alter table fish add column if not exists name_kn text;                  -- Kannada name, e.g. ಬಂಗುಡೆ
alter table boats add column if not exists harbour text not null default 'Mangaluru Bunder';
alter table boats add column if not exists boat_type text not null default 'Boat';
alter table boats add column if not exists rating numeric(2,1);          -- null until real reviews exist
alter table boats add column if not exists is_demo boolean not null default false;
alter table listings add column if not exists landed_at timestamptz not null default now();
alter table listings add column if not exists grade text;               -- set only after a real quality check
alter table listings add column if not exists verified_at timestamptz;  -- when freshness was checked at the harbour
alter table listings add column if not exists is_demo boolean not null default false;

-- Delivery slots, made for today and tomorrow by delivery_slot_list(). capacity = how many
-- orders the riders can take in that slot; booked goes up with every checkout.
create table if not exists delivery_slots (
  id bigint generated always as identity primary key,
  starts_at timestamptz not null unique,
  ends_at timestamptz not null,
  label text not null,
  capacity int not null default 10 check (capacity >= 0),
  booked int not null default 0 check (booked >= 0)
);

-- A website order (one per checkout). Its fish are rows in "orders" linked by customer_order_id.
-- The customer tracks it with the secret token; staff change status in the Supabase table view.
create table if not exists customer_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                                -- short, shown to people: MB-3F9K2A
  token uuid not null unique default gen_random_uuid(),     -- secret, in the tracking link
  customer_name text not null,
  customer_phone text not null,
  address text not null,
  area text not null,
  slot_id bigint not null references delivery_slots(id),
  subtotal numeric(12,2) not null,
  cutting_fee numeric(12,2) not null,
  delivery_fee numeric(12,2) not null,
  platform_fee numeric(12,2) not null,
  total numeric(12,2) not null,
  payment text not null default 'upi_on_delivery',
  status text not null default 'placed'
    check (status in ('placed', 'packed', 'out_for_delivery', 'delivered', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table orders add column if not exists customer_order_id uuid references customer_orders(id) on delete cascade;
alter table orders add column if not exists cut text check (cut in ('whole', 'cleaned', 'fry'));
alter table orders add column if not exists cut_fee numeric(12,2) not null default 0;

-- ─── resolve_fish: turns any spelling ("Bangda", "ayala") into a fish key ─
create or replace function resolve_fish(p_name text)
returns text
language sql
stable
set search_path = public
as $$
  select key
    from fish
   where key = lower(trim(p_name))
      or lower(name) = lower(trim(p_name))
      or lower(trim(p_name)) = any (aliases)
   limit 1;
$$;

-- ─── save_catch: a fisherman confirmed "YES" to his catch ────────────────
-- Sets what this boat has of this fish right now (replaces the old kg and price).
create or replace function save_catch(p_phone text, p_fish text, p_kg numeric, p_price numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_boat boats%rowtype;
  v_fish fish%rowtype;
  v_listing listings%rowtype;
begin
  select * into v_boat from boats where phone = p_phone;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_a_boat');
  end if;

  if p_kg is null or p_kg <= 0 or p_kg > 10000 then
    return jsonb_build_object('ok', false, 'reason', 'bad_kg');
  end if;
  if p_price is null or p_price <= 0 or p_price > 10000 then
    return jsonb_build_object('ok', false, 'reason', 'bad_price');
  end if;

  select * into v_fish from fish where key = resolve_fish(p_fish);
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'unknown_fish');
  end if;

  insert into listings (boat_id, fish_key, price_per_kg, kg_left)
  values (v_boat.id, v_fish.key, p_price, p_kg)
  on conflict (boat_id, fish_key) do update
    set previous_price_per_kg = listings.price_per_kg,
        price_per_kg = excluded.price_per_kg,
        kg_left = excluded.kg_left,
        updated_at = now(),
        landed_at = now()
  returning * into v_listing;

  return jsonb_build_object(
    'ok', true,
    'fish_name', v_fish.name,
    'kg', v_listing.kg_left,
    'price_per_kg', v_listing.price_per_kg,
    'previous_price_per_kg', v_listing.previous_price_per_kg,
    'boat_name', v_boat.name
  );
end;
$$;

-- ─── place_order: a customer confirmed "YES" to their order ──────────────
-- The only way stock goes down. Everything happens in one step: if any part fails,
-- nothing changes. The listing row is locked while we work, so two buyers can't
-- both get the last kilo. Picks the cheapest boat that has enough of that fish.
create or replace function place_order(p_customer_phone text, p_fish text, p_kg numeric,
                                       p_cleaned boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fish fish%rowtype;
  v_listing listings%rowtype;
  v_boat boats%rowtype;
  v_most_kg numeric;
  v_total numeric(12,2);
  v_order_id uuid;
begin
  if p_kg is null or p_kg <= 0 or p_kg > 100 then
    return jsonb_build_object('ok', false, 'reason', 'bad_kg');
  end if;

  select * into v_fish from fish where key = resolve_fish(p_fish);
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'unknown_fish');
  end if;

  select * into v_listing
    from listings
   where fish_key = v_fish.key and kg_left >= p_kg
   order by price_per_kg, updated_at desc
   limit 1
   for update;

  if not found then
    select max(kg_left) into v_most_kg from listings where fish_key = v_fish.key;
    if coalesce(v_most_kg, 0) = 0 then
      return jsonb_build_object('ok', false, 'reason', 'not_listed', 'fish_name', v_fish.name);
    end if;
    return jsonb_build_object('ok', false, 'reason', 'not_enough',
                              'fish_name', v_fish.name, 'kg_left', v_most_kg);
  end if;

  select * into v_boat from boats where id = v_listing.boat_id;
  v_total := round(p_kg * v_listing.price_per_kg, 2);

  update listings set kg_left = kg_left - p_kg, updated_at = now() where id = v_listing.id;

  insert into orders (customer_phone, listing_id, boat_id, fish_key, kg, cleaned, price_per_kg, total)
  values (p_customer_phone, v_listing.id, v_boat.id, v_fish.key, p_kg, p_cleaned,
          v_listing.price_per_kg, v_total)
  returning id into v_order_id;

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'fish_name', v_fish.name,
    'kg', p_kg,
    'cleaned', p_cleaned,
    'price_per_kg', v_listing.price_per_kg,
    'total', v_total,
    'boat_name', v_boat.name,
    'boat_phone', v_boat.phone,
    'upi_id', v_boat.upi_id,
    'kg_left', v_listing.kg_left - p_kg
  );
end;
$$;

-- ─── set_pending / take_pending: remember an AI reading until YES or NO ──
create or replace function set_pending(p_phone text, p_kind text, p_data jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into pending (phone, kind, data) values (p_phone, p_kind, p_data)
  on conflict (phone) do update
    set kind = excluded.kind, data = excluded.data, created_at = now();
$$;

-- Removes and returns the waiting reading. Returns null if there is none,
-- or if it is older than 30 minutes (the person must send their message again).
create or replace function take_pending(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row pending%rowtype;
begin
  delete from pending where phone = p_phone returning * into v_row;
  if not found or v_row.created_at < now() - interval '30 minutes' then
    return null;
  end if;
  return jsonb_build_object('kind', v_row.kind, 'data', v_row.data);
end;
$$;

-- ─── reset_demo: empties listings, orders and pending before a demo or test run ─
create or replace function reset_demo()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- "where true" is needed because Supabase refuses a delete with no where clause.
  delete from orders where true;
  delete from customer_orders where true;
  delete from listings where true;
  delete from pending where true;
  update delivery_slots set booked = 0 where true;
end;
$$;

-- ═══ WhatsApp conversation ════════════════════════════════════════════════
-- n8n calls inbound() for every WhatsApp message. It answers YES/NO itself;
-- anything else comes back as action='read', n8n asks Gemini to read it, and
-- then calls after_ai() with what Gemini read. Both return the WhatsApp reply:
--   { action: 'reply', phone, reply, alert_phone?, alert? }
-- alert is the "pack" message for the boat owner when an order is confirmed.

-- ₹220 / 1.5 kg: numbers without trailing zeros.
create or replace function fmt_num(p numeric)
returns text
language sql
immutable
as $$ select trim_scale(round(p, 2))::text $$;

create or replace function help_text(p_kind text)
returns text
language sql
immutable
as $$
  select case when p_kind = 'catch'
    then E'Send your catch like this: *bangude 50 220*\n(fish, kg, price per kg)'
    else E'To order, send the fish and kg, for example: *1 kg bangude cleaned*'
  end
$$;

-- "Today: Bangude ₹230/kg, Anjal ₹650/kg" or a sorry if nothing is listed.
create or replace function todays_fish()
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(
    'Today: ' || string_agg(f.name || ' ₹' || fmt_num(l.price_per_kg) || '/kg', ', ' order by f.name),
    'Nothing is listed yet today. The boats post their catch every morning.')
  from (select distinct on (fish_key) fish_key, price_per_kg
          from listings where kg_left > 0
         order by fish_key, price_per_kg) l
  join fish f on f.key = l.fish_key
$$;

create or replace function inbound(p_phone text, p_text text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text := case when exists (select 1 from boats where phone = p_phone) then 'catch' else 'order' end;
  v_word text := regexp_replace(lower(coalesce(p_text, '')), '[^a-z]', '', 'g');
  v_pending jsonb;
  v_item jsonb;
  v_r jsonb;
  v_lines text := '';
  v_d jsonb;
  v_cut text;
begin
  if coalesce(trim(p_text), '') = '' then
    return jsonb_build_object('action', 'reply', 'phone', p_phone,
      'reply', E'Sorry, I can only read text messages for now.\n' || help_text(v_kind));
  end if;

  -- YES: do what is waiting for this person.
  if v_word in ('yes', 'y', 'yess', 'ok', 'okay', 'confirm', 'haan', 'ha', 'houdu', 'howdu', 'sari')
     or trim(p_text) in ('👍', '✅') then
    v_pending := take_pending(p_phone);
    if v_pending is null then
      return jsonb_build_object('action', 'reply', 'phone', p_phone,
        'reply', E'There is nothing waiting for a YES.\n' || help_text(v_kind));
    end if;
    v_d := v_pending->'data';

    if v_pending->>'kind' = 'catch' then
      for v_item in select * from jsonb_array_elements(v_d->'items') loop
        v_r := save_catch(p_phone, v_item->>'fish', (v_item->>'kg')::numeric, (v_item->>'price_per_kg')::numeric);
        v_lines := v_lines || E'\n' || case when (v_r->>'ok')::boolean
          then '✅ ' || (v_r->>'fish_name') || ': ' || fmt_num((v_r->>'kg')::numeric) || ' kg at ₹'
               || fmt_num((v_r->>'price_per_kg')::numeric) || '/kg'
          else '⚠️ ' || (v_item->>'fish') || ': not saved (' || (v_r->>'reason') || ')' end;
      end loop;
      return jsonb_build_object('action', 'reply', 'phone', p_phone,
        'reply', '*Live on the MeenuBazaar board now:*' || v_lines
                 || E'\n\nYou will get a message here when someone orders.');
    end if;

    -- An order.
    v_r := place_order(p_phone, v_d->>'fish', (v_d->>'kg')::numeric, coalesce((v_d->>'cleaned')::boolean, false));
    v_cut := case when (v_d->>'cleaned')::boolean then ' (cleaned)' else '' end;
    if not (v_r->>'ok')::boolean then
      return jsonb_build_object('action', 'reply', 'phone', p_phone, 'reply',
        case v_r->>'reason'
          when 'not_enough' then 'Sorry, only ' || fmt_num((v_r->>'kg_left')::numeric) || ' kg of '
               || (v_r->>'fish_name') || E' is left now. Send a smaller amount, e.g. *1 kg '
               || lower(v_r->>'fish_name') || '*.'
          when 'not_listed' then 'Sorry, ' || (v_r->>'fish_name') || E' just sold out.\n' || todays_fish()
          else E'Sorry, that order could not be placed.\n' || help_text('order')
        end);
    end if;
    return jsonb_build_object(
      'action', 'reply',
      'phone', p_phone,
      'reply', E'✅ *Order confirmed*\n' || fmt_num((v_r->>'kg')::numeric) || ' kg ' || (v_r->>'fish_name') || v_cut
               || E'\n₹' || fmt_num((v_r->>'price_per_kg')::numeric) || '/kg × ' || fmt_num((v_r->>'kg')::numeric)
               || ' kg = *₹' || fmt_num((v_r->>'total')::numeric) || E'*\n\nPlease pay by UPI to *'
               || (v_r->>'upi_id') || '* (' || (v_r->>'boat_name') || E').\nOrder ID: '
               || upper(left(v_r->>'order_id', 8)) || E'\nWe will message you when it is on the way.',
      'alert_phone', v_r->>'boat_phone',
      'alert', E'📦 *New order: please pack*\n' || fmt_num((v_r->>'kg')::numeric) || ' kg ' || (v_r->>'fish_name') || v_cut
               || E'\nOrder ID: ' || upper(left(v_r->>'order_id', 8))
               || E'\nStock left: ' || fmt_num((v_r->>'kg_left')::numeric) || ' kg');
  end if;

  -- NO: forget what was waiting.
  if v_word in ('no', 'n', 'cancel', 'illa', 'beda', 'nahi', 'stop') then
    delete from pending where phone = p_phone;
    return jsonb_build_object('action', 'reply', 'phone', p_phone,
      'reply', E'Okay, cancelled.\n' || help_text(v_kind));
  end if;

  -- Anything else: n8n should ask Gemini to read it, using this fish list.
  return jsonb_build_object(
    'action', 'read',
    'phone', p_phone,
    'kind', v_kind,
    'text', p_text,
    'fish', (select jsonb_agg(jsonb_build_object('key', key, 'english_name', english_name, 'aliases', aliases)
                              order by key) from fish));
end;
$$;

create or replace function after_ai(p_phone text, p_kind text, p_reading jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_lines text := '';
  v_fish fish%rowtype;
  v_kg numeric;
  v_cleaned boolean;
  v_price numeric;
  v_most numeric;
  v_ask text := nullif(trim(p_reading->>'question'), '');
begin
  if p_reading is null or jsonb_typeof(p_reading) <> 'object' then
    return jsonb_build_object('action', 'reply', 'phone', p_phone,
      'reply', 'Sorry, I could not read that just now. Please send it again.');
  end if;

  -- ─ A fisherman's catch ─
  if p_kind = 'catch' then
    if not coalesce((p_reading->>'understood')::boolean, false)
       or jsonb_array_length(coalesce(p_reading->'items', '[]')) = 0 then
      return jsonb_build_object('action', 'reply', 'phone', p_phone,
        'reply', coalesce(v_ask || E'\n\n', '') || help_text('catch'));
    end if;
    for v_item in select * from jsonb_array_elements(p_reading->'items') loop
      select * into v_fish from fish where key = v_item->>'fish';
      if not found then
        return jsonb_build_object('action', 'reply', 'phone', p_phone,
          'reply', E'I don''t know one of those fish names. Please use names like bangude, bhutai, anjal, maanji or etti.\n'
                   || help_text('catch'));
      end if;
      if coalesce((v_item->>'kg')::numeric, 0) <= 0 or coalesce((v_item->>'price_per_kg')::numeric, 0) <= 0 then
        return jsonb_build_object('action', 'reply', 'phone', p_phone,
          'reply', E'Please send both the kg and the price for ' || v_fish.name || E'.\n' || help_text('catch'));
      end if;
      v_lines := v_lines || E'\n• ' || v_fish.name || ': ' || fmt_num((v_item->>'kg')::numeric) || ' kg at ₹'
                 || fmt_num((v_item->>'price_per_kg')::numeric) || '/kg';
    end loop;
    perform set_pending(p_phone, 'catch', jsonb_build_object('items', p_reading->'items'));
    return jsonb_build_object('action', 'reply', 'phone', p_phone,
      'reply', 'Please check your catch:' || v_lines || E'\n\nReply *YES* to put it live, or *NO* to cancel.');
  end if;

  -- ─ A customer's order ─
  -- First: is it an order at all? (A question like "do you deliver?" also has no fish.)
  if not coalesce((p_reading->>'understood')::boolean, false) then
    return jsonb_build_object('action', 'reply', 'phone', p_phone,
      'reply', coalesce(v_ask, help_text('order')));
  end if;
  if p_reading->>'fish' = 'unknown' then
    return jsonb_build_object('action', 'reply', 'phone', p_phone,
      'reply', E'Sorry, we don''t have that fish.\n' || todays_fish() || E'\n\n' || help_text('order'));
  end if;

  select * into v_fish from fish where key = p_reading->>'fish';
  v_kg := coalesce((p_reading->>'kg')::numeric, 1);
  v_cleaned := coalesce((p_reading->>'cleaned')::boolean, false);
  if not found or v_kg <= 0 then
    return jsonb_build_object('action', 'reply', 'phone', p_phone, 'reply', help_text('order'));
  end if;

  -- Check stock now, so the customer hears about it before saying YES.
  select min(price_per_kg) into v_price from listings where fish_key = v_fish.key and kg_left >= v_kg;
  if v_price is null then
    select max(kg_left) into v_most from listings where fish_key = v_fish.key;
    return jsonb_build_object('action', 'reply', 'phone', p_phone, 'reply',
      case when coalesce(v_most, 0) > 0
        then 'Sorry, only ' || fmt_num(v_most) || ' kg of ' || v_fish.name || E' is left. Send a smaller amount, e.g. *'
             || fmt_num(least(v_most, 100)) || ' kg ' || v_fish.key || '*.'
        else 'Sorry, ' || v_fish.name || E' is not available right now.\n' || todays_fish() end);
  end if;
  if v_kg > 100 then
    return jsonb_build_object('action', 'reply', 'phone', p_phone,
      'reply', 'Sorry, we take up to 100 kg per order. Please send a smaller amount.');
  end if;

  perform set_pending(p_phone, 'order',
    jsonb_build_object('fish', v_fish.key, 'kg', v_kg, 'cleaned', v_cleaned));
  return jsonb_build_object('action', 'reply', 'phone', p_phone,
    'reply', E'Please check your order:\n*' || fmt_num(v_kg) || ' kg ' || v_fish.name || '*'
             || case when v_cleaned then ' (cleaned)' else '' end
             || E'\n₹' || fmt_num(v_price) || '/kg × ' || fmt_num(v_kg) || ' kg = *₹' || fmt_num(round(v_kg * v_price, 2))
             || E'*\n\nReply *YES* to order, or *NO* to cancel.');
end;
$$;

-- ═══ Telegram demo ════════════════════════════════════════════════════════
-- Thin wrappers so the Telegram workflow reuses inbound()/after_ai() unchanged.
-- They turn a Telegram user ID into the key those functions use:
--   a registered boat → its phone, anyone else → 'tg:<telegram id>' (a customer).
-- Replies come back as { action, chat_id, reply, alert_chat_id?, alert? }, plain text.

create or replace function tg_sender(p_telegram_id text)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce((select phone from boats where telegram_id = p_telegram_id), 'tg:' || p_telegram_id)
$$;

-- Adapt a WhatsApp-style reply for Telegram: reply to the chat, send the pack alert to
-- the boat's Telegram, and drop WhatsApp's *bold* stars (Telegram shows plain text).
create or replace function tg_finish(p_telegram_id text, r jsonb)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_alert_chat text;
begin
  if r->>'action' = 'read' then
    return (r - 'phone') || jsonb_build_object('chat_id', p_telegram_id, 'telegram_id', p_telegram_id);
  end if;
  if r->>'alert_phone' is not null then
    select telegram_id into v_alert_chat from boats where phone = r->>'alert_phone';
  end if;
  return jsonb_strip_nulls(jsonb_build_object(
    'action', 'reply',
    'chat_id', p_telegram_id,
    'reply', replace(r->>'reply', '*', ''),
    'alert_chat_id', v_alert_chat,
    'alert', case when v_alert_chat is not null then replace(r->>'alert', '*', '') end));
end;
$$;

create or replace function tg_inbound(p_telegram_id text, p_text text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_boat boats%rowtype;
begin
  -- /start (or /help): say hello, and show the Telegram ID so a boat owner can be registered.
  if lower(split_part(trim(coalesce(p_text, '')), ' ', 1)) in ('/start', '/help') then
    select * into v_boat from boats where telegram_id = p_telegram_id;
    return jsonb_build_object('action', 'reply', 'chat_id', p_telegram_id, 'reply',
      case when found
        then 'Welcome back, ' || v_boat.name || E'! 🎣\n' || replace(help_text('catch'), '*', '')
        else E'Welcome to MeenuBazaar! 🐟\n' || replace(help_text('order'), '*', '')
             || E'\n\nToday''s prices: meenubazaar.vercel.app' end
      || E'\n\nYour Telegram ID: ' || p_telegram_id);
  end if;
  return tg_finish(p_telegram_id, inbound(tg_sender(p_telegram_id), p_text));
end;
$$;

create or replace function tg_after_ai(p_telegram_id text, p_kind text, p_reading jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return tg_finish(p_telegram_id, after_ai(tg_sender(p_telegram_id), p_kind, p_reading));
end;
$$;

-- ═══ Web shop ═════════════════════════════════════════════════════════════
-- The website (publishable key) can call these four functions and nothing else that writes.
-- All prices and fees are worked out here, so a browser can't change what an order costs.

-- Fees in rupees. ⚠️ Placeholder amounts for the demo; set the real ones before launch.
create or replace function shop_fees()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object('cleaned_per_kg', 30, 'fry_per_kg', 40, 'delivery', 40, 'platform', 10)
$$;

-- Creates today's and tomorrow's slots (India time) if missing, then lists the next ones.
-- A slot can be booked only if it starts at least 90 minutes from now and isn't full.
create or replace function delivery_slot_list()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_day date;
begin
  foreach v_day in array array[v_today, v_today + 1] loop
    insert into delivery_slots (starts_at, ends_at, label) values
      ((v_day + time '08:00') at time zone 'Asia/Kolkata', (v_day + time '10:00') at time zone 'Asia/Kolkata', '8–10 AM'),
      ((v_day + time '11:00') at time zone 'Asia/Kolkata', (v_day + time '13:00') at time zone 'Asia/Kolkata', '11 AM–1 PM'),
      ((v_day + time '17:00') at time zone 'Asia/Kolkata', (v_day + time '19:00') at time zone 'Asia/Kolkata', '5–7 PM')
    on conflict (starts_at) do nothing;
  end loop;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', id,
             'label', label,
             'day', case when (starts_at at time zone 'Asia/Kolkata')::date = v_today then 'Today' else 'Tomorrow' end,
             'starts_at', starts_at,
             'spaces_left', greatest(capacity - booked, 0),
             'full', booked >= capacity)
           order by starts_at)
      from delivery_slots
     where starts_at > now() + interval '90 minutes'
       and starts_at < (v_today + 2) at time zone 'Asia/Kolkata'), '[]'::jsonb);
end;
$$;

-- Places a website order in one step. p_items: [{ listing_id, kg, cut, price_per_kg }]
-- where price_per_kg is the price the customer saw. Either every fish is reserved and the
-- order is saved, or nothing changes at all (stock, slot and orders stay as they were).
create or replace function checkout(p_items jsonb, p_name text, p_phone text, p_address text,
                                    p_area text, p_slot_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_fees jsonb := shop_fees();
  v_slot delivery_slots%rowtype;
  v_item jsonb;
  v_listing listings%rowtype;
  v_fish fish%rowtype;
  v_kg numeric;
  v_cut text;
  v_cut_fee numeric;
  v_line numeric;
  v_subtotal numeric := 0;
  v_cutting numeric := 0;
  v_line_id uuid;
  v_line_ids uuid[] := '{}';
  v_order customer_orders%rowtype;
begin
  if length(trim(coalesce(p_name, ''))) < 2 then
    return jsonb_build_object('ok', false, 'reason', 'name');
  end if;
  if v_phone !~ '^(91)?[6-9][0-9]{9}$' then
    return jsonb_build_object('ok', false, 'reason', 'phone');
  end if;
  if length(trim(coalesce(p_address, ''))) < 8 or length(trim(coalesce(p_area, ''))) < 2 then
    return jsonb_build_object('ok', false, 'reason', 'address');
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 10 then
    return jsonb_build_object('ok', false, 'reason', 'empty_cart');
  end if;

  begin  -- if anything below raises an error, all of it is undone
    select * into v_slot from delivery_slots where id = p_slot_id for update;
    if not found or v_slot.starts_at <= now() + interval '90 minutes' then
      raise exception 'slot_gone';
    end if;
    if v_slot.booked >= v_slot.capacity then
      raise exception 'slot_full';
    end if;
    update delivery_slots set booked = booked + 1 where id = v_slot.id;

    for v_item in select * from jsonb_array_elements(p_items) loop
      v_kg := (v_item->>'kg')::numeric;
      v_cut := coalesce(v_item->>'cut', 'whole');
      if v_kg is null or v_kg < 0.5 or v_kg > 20 or v_cut not in ('whole', 'cleaned', 'fry') then
        raise exception 'bad_item';
      end if;

      -- Lock this boat's listing so two customers can't both take the last kilo.
      select * into v_listing from listings where id = (v_item->>'listing_id')::uuid for update;
      if not found then
        raise exception 'not_listed';
      end if;
      select * into v_fish from fish where key = v_listing.fish_key;
      if v_listing.price_per_kg <> (v_item->>'price_per_kg')::numeric then
        raise exception 'price_changed:%', v_fish.name;
      end if;
      if v_listing.kg_left < v_kg then
        raise exception 'not_enough:%:%', v_fish.name, fmt_num(v_listing.kg_left);
      end if;

      update listings set kg_left = kg_left - v_kg, updated_at = now() where id = v_listing.id;

      v_line := round(v_kg * v_listing.price_per_kg, 2);
      v_cut_fee := round(v_kg * case v_cut when 'cleaned' then (v_fees->>'cleaned_per_kg')::numeric
                                           when 'fry' then (v_fees->>'fry_per_kg')::numeric
                                           else 0 end, 2);
      insert into orders (customer_phone, listing_id, boat_id, fish_key, kg, cleaned, price_per_kg, total,
                          cut, cut_fee, status)
      values ('web:' || v_phone, v_listing.id, v_listing.boat_id, v_listing.fish_key, v_kg, v_cut <> 'whole',
              v_listing.price_per_kg, v_line, v_cut, v_cut_fee, 'placed')
      returning id into v_line_id;
      v_line_ids := v_line_ids || v_line_id;
      v_subtotal := v_subtotal + v_line;
      v_cutting := v_cutting + v_cut_fee;
    end loop;

    insert into customer_orders (code, customer_name, customer_phone, address, area, slot_id,
                                 subtotal, cutting_fee, delivery_fee, platform_fee, total)
    values ('MB-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
            trim(p_name), v_phone, trim(p_address), trim(p_area), v_slot.id,
            v_subtotal, v_cutting, (v_fees->>'delivery')::numeric, (v_fees->>'platform')::numeric,
            v_subtotal + v_cutting + (v_fees->>'delivery')::numeric + (v_fees->>'platform')::numeric)
    returning * into v_order;
    update orders set customer_order_id = v_order.id where id = any (v_line_ids);
  exception when others then
    return jsonb_build_object('ok', false,
      'reason', split_part(sqlerrm, ':', 1),
      'fish', nullif(split_part(sqlerrm, ':', 2), ''),
      'kg_left', nullif(split_part(sqlerrm, ':', 3), ''));
  end;

  return jsonb_build_object('ok', true, 'code', v_order.code, 'token', v_order.token, 'total', v_order.total);
end;
$$;

-- Everything the order page shows, found by the secret token from the order link.
create or replace function get_order(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'code', o.code,
    'status', o.status,
    'payment', o.payment,
    'created_at', o.created_at,
    'updated_at', o.updated_at,
    'customer_name', o.customer_name,
    'address', o.address,
    'area', o.area,
    'slot', jsonb_build_object('label', s.label, 'starts_at', s.starts_at, 'ends_at', s.ends_at),
    'subtotal', o.subtotal,
    'cutting_fee', o.cutting_fee,
    'delivery_fee', o.delivery_fee,
    'platform_fee', o.platform_fee,
    'total', o.total,
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
                       'fish', f.name, 'fish_kn', f.name_kn, 'fish_key', f.key, 'kg', i.kg, 'cut', i.cut,
                       'price_per_kg', i.price_per_kg, 'line_total', i.total, 'cut_fee', i.cut_fee,
                       'boat', b.name, 'harbour', b.harbour) order by f.name), '[]'::jsonb)
                from orders i join fish f on f.key = i.fish_key join boats b on b.id = i.boat_id
               where i.customer_order_id = o.id))
  from customer_orders o join delivery_slots s on s.id = o.slot_id
  where o.token = p_token
$$;

-- Keep updated_at fresh when staff change an order's status in the table view.
create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists customer_orders_touch on customer_orders;
create trigger customer_orders_touch before update on customer_orders
  for each row execute function touch_updated_at();

-- ─── Who can do what ─────────────────────────────────────────────────────
-- Only the server (secret key, used by n8n) may run the functions that change data.
revoke execute on function save_catch(text, text, numeric, numeric) from public, anon, authenticated;
revoke execute on function place_order(text, text, numeric, boolean) from public, anon, authenticated;
revoke execute on function set_pending(text, text, jsonb) from public, anon, authenticated;
revoke execute on function take_pending(text) from public, anon, authenticated;
revoke execute on function reset_demo() from public, anon, authenticated;
revoke execute on function inbound(text, text) from public, anon, authenticated;
revoke execute on function after_ai(text, text, jsonb) from public, anon, authenticated;
grant execute on function inbound(text, text) to service_role;
grant execute on function after_ai(text, text, jsonb) to service_role;
revoke execute on function tg_inbound(text, text) from public, anon, authenticated;
revoke execute on function tg_after_ai(text, text, jsonb) from public, anon, authenticated;
revoke execute on function tg_sender(text) from public, anon, authenticated;
revoke execute on function tg_finish(text, jsonb) from public, anon, authenticated;
grant execute on function tg_inbound(text, text) to service_role;
grant execute on function tg_after_ai(text, text, jsonb) to service_role;
grant execute on function resolve_fish(text) to service_role;
grant execute on function save_catch(text, text, numeric, numeric) to service_role;
grant execute on function place_order(text, text, numeric, boolean) to service_role;
grant execute on function set_pending(text, text, jsonb) to service_role;
grant execute on function take_pending(text) to service_role;
grant execute on function reset_demo() to service_role;

-- The server can read and write every table.
grant all on boats, fish, listings, orders, pending to service_role;

-- The browser may read fish and listings, and only the id and name of boats
-- (never a boat owner's phone number or UPI ID). Orders and pending stay private.
revoke all on boats, fish, listings, orders, pending from anon, authenticated;
grant select on fish, listings to anon, authenticated;
grant select (id, name, harbour, boat_type, rating, is_demo) on boats to anon, authenticated;

-- Web shop: customers can place and track orders only through these functions.
-- They can't read other people's orders, slots or phone numbers directly.
grant all on delivery_slots, customer_orders to service_role;
revoke all on delivery_slots, customer_orders from anon, authenticated;
alter table delivery_slots enable row level security;
alter table customer_orders enable row level security;
grant execute on function shop_fees() to anon, authenticated, service_role;
grant execute on function delivery_slot_list() to anon, authenticated, service_role;
grant execute on function checkout(jsonb, text, text, text, text, bigint) to anon, authenticated, service_role;
grant execute on function get_order(uuid) to anon, authenticated, service_role;
revoke execute on function touch_updated_at() from public, anon, authenticated;

-- Row-level security: tables with no rule for the browser are hidden from it.
alter table boats enable row level security;
alter table fish enable row level security;
alter table listings enable row level security;
alter table orders enable row level security;
alter table pending enable row level security;

drop policy if exists "Anyone can read boats" on boats;
create policy "Anyone can read boats" on boats for select to anon, authenticated using (true);

drop policy if exists "Anyone can read fish" on fish;
create policy "Anyone can read fish" on fish for select to anon, authenticated using (true);

drop policy if exists "Anyone can read listings" on listings;
create policy "Anyone can read listings" on listings for select to anon, authenticated using (true);

-- ─── Live updates ────────────────────────────────────────────────────────
-- Tell Supabase Realtime to push listing changes to the price board as they happen.
do $$
begin
  if not exists (select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime' and tablename = 'listings') then
    alter publication supabase_realtime add table listings;
  end if;
end;
$$;
