-- MeenuBazaar demo data. Run after schema.sql (SQL Editor → New query → paste → Run).
-- Safe to run again: it updates existing rows instead of adding duplicates.

-- The demo boat. Messages from this WhatsApp number are treated as the fisherman;
-- every other number is treated as a customer.
-- ⚠️ BEFORE RUNNING: replace 919999999999 with the fisherman test phone's WhatsApp number
--    (country code + number, digits only, no + or spaces), and the UPI ID with a real one.
insert into boats (id, name, phone, upi_id)
values ('00000000-0000-0000-0000-000000000001', 'Sri Durga', '919999999999', 'sridurga.demo@upi')
on conflict (id) do update
  set name = excluded.name, phone = excluded.phone, upi_id = excluded.upi_id;

-- Fish names as people type them at Bunder (Tulu, Kannada, Konkani, Malayalam, English).
-- Aliases must be lowercase. Add more spellings whenever someone types a name the app doesn't know.
insert into fish (key, name, english_name, aliases) values
  ('bangude',   'Bangude',   'Indian mackerel', array['bangude', 'banguda', 'bangda', 'bangada', 'ayala', 'mackerel']),
  ('bhutai',    'Bhutai',    'Oil sardine',     array['bhutai', 'boothai', 'bhootai', 'tarle', 'tarli', 'mathi', 'sardine']),
  ('anjal',     'Anjal',     'Seer fish',       array['anjal', 'anjel', 'surmai', 'vanjaram', 'iswan', 'seer', 'seer fish', 'king fish', 'kingfish']),
  ('maanji',    'Maanji',    'Pomfret',         array['maanji', 'manji', 'paplet', 'pomfret', 'avoli']),
  ('kane',      'Kane',      'Ladyfish',        array['kane', 'kaane', 'ladyfish', 'lady fish']),
  ('etti',      'Etti',      'Prawns',          array['etti', 'yetti', 'sungta', 'prawn', 'prawns', 'shrimp']),
  ('bondas',    'Bondas',    'Squid',           array['bondas', 'bondaas', 'kanava', 'squid']),
  ('denji',     'Denji',     'Crab',            array['denji', 'crab', 'crabs', 'kekda']),
  ('balchatte', 'Balchatte', 'Ribbon fish',     array['balchatte', 'baale', 'ribbon fish', 'ribbonfish'])
on conflict (key) do update
  set name = excluded.name, english_name = excluded.english_name, aliases = excluded.aliases;
