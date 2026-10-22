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

-- ─── Who can do what ─────────────────────────────────────────────────────
-- Only the server (secret key, used by n8n) may run the functions that change data.
revoke execute on function save_catch(text, text, numeric, numeric) from public, anon, authenticated;
revoke execute on function place_order(text, text, numeric, boolean) from public, anon, authenticated;
revoke execute on function set_pending(text, text, jsonb) from public, anon, authenticated;
revoke execute on function take_pending(text) from public, anon, authenticated;
revoke execute on function reset_demo() from public, anon, authenticated;
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
