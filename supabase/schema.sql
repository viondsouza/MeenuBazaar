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
        updated_at = now()
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
  delete from listings where true;
  delete from pending where true;
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
  if not found or v_kg <= 0 or v_kg > 100 then
    return jsonb_build_object('action', 'reply', 'phone', p_phone, 'reply', help_text('order'));
  end if;

  -- Check stock now, so the customer hears about it before saying YES.
  select min(price_per_kg) into v_price from listings where fish_key = v_fish.key and kg_left >= v_kg;
  if v_price is null then
    select max(kg_left) into v_most from listings where fish_key = v_fish.key;
    return jsonb_build_object('action', 'reply', 'phone', p_phone, 'reply',
      case when coalesce(v_most, 0) > 0
        then 'Sorry, only ' || fmt_num(v_most) || ' kg of ' || v_fish.name || E' is left. Send a smaller amount, e.g. *'
             || fmt_num(v_most) || ' kg ' || v_fish.key || '*.'
        else 'Sorry, ' || v_fish.name || E' is not available right now.\n' || todays_fish() end);
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
grant select (id, name) on boats to anon, authenticated;

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
