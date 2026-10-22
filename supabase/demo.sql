-- MeenuBazaar DEMO data: extra boats and catch so the shop looks full for a demo.
-- Run after schema.sql and seed.sql (SQL Editor → New query → paste → Run). Safe to run again.
-- Everything here is marked is_demo = true, and the website labels it "Demo listing".
-- Real catch (sent by fishermen on Telegram/WhatsApp) is never marked demo.
--
-- To remove all demo data later:
--   delete from listings where is_demo;  delete from boats where is_demo;

insert into boats (id, name, phone, upi_id, harbour, boat_type, rating, is_demo) values
  ('00000000-0000-0000-0000-000000000101', 'Matsya Lakshmi', '910000000101', 'demo.matsyalakshmi@upi', 'Malpe', 'Purse seiner', 4.5, true),
  ('00000000-0000-0000-0000-000000000102', 'Al-Rahman', '910000000102', 'demo.alrahman@upi', 'Gangolli', 'Gillnet boat', 4.6, true),
  ('00000000-0000-0000-0000-000000000103', 'Sagar Rani', '910000000103', 'demo.sagarrani@upi', 'Mangaluru Bunder', 'Trawler', 4.4, true)
on conflict (id) do update
  set name = excluded.name, harbour = excluded.harbour, boat_type = excluded.boat_type,
      rating = excluded.rating, is_demo = true;

-- Prices are rough Mangaluru retail rates per kg, for the demo only.
insert into listings (boat_id, fish_key, price_per_kg, previous_price_per_kg, kg_left, landed_at, grade, verified_at, is_demo)
select b.id, v.fish, v.price, v.prev, v.kg, now() - v.ago, v.grade,
       case when v.grade is not null then now() - v.ago + interval '30 minutes' end, true
from (values
  ('00000000-0000-0000-0000-000000000101'::uuid, 'bhutai',    180,  200,  300, interval '3 hours',  'A'),
  ('00000000-0000-0000-0000-000000000101'::uuid, 'bangude',   240,  230,  120, interval '2 hours',  'A'),
  ('00000000-0000-0000-0000-000000000101'::uuid, 'kane',      420,  null,  40, interval '4 hours',  null),
  ('00000000-0000-0000-0000-000000000102'::uuid, 'anjal',     950,  900,   25, interval '3 hours',  'A'),
  ('00000000-0000-0000-0000-000000000102'::uuid, 'maanji',   1100, 1150,   18, interval '5 hours',  'A'),
  ('00000000-0000-0000-0000-000000000102'::uuid, 'etti',      520,  null,  30, interval '2 hours',  null),
  ('00000000-0000-0000-0000-000000000103'::uuid, 'bondas',    380,  400,   45, interval '6 hours',  'B'),
  ('00000000-0000-0000-0000-000000000103'::uuid, 'denji',     420,  null,  20, interval '4 hours',  null),
  ('00000000-0000-0000-0000-000000000103'::uuid, 'balchatte', 260,  250,   60, interval '1 hour',   'A')
) as v(boat, fish, price, prev, kg, ago, grade)
join boats b on b.id = v.boat
on conflict (boat_id, fish_key) do update
  set price_per_kg = excluded.price_per_kg, previous_price_per_kg = excluded.previous_price_per_kg,
      kg_left = excluded.kg_left, landed_at = excluded.landed_at, grade = excluded.grade,
      verified_at = excluded.verified_at, is_demo = true, updated_at = now();
