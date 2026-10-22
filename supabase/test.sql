-- MeenuBazaar database self-test. Run after schema.sql and seed.sql.
-- It pretends to be n8n: saves a catch, places orders, then cleans everything up.
-- Every row in the result should say PASS. It leaves no test data behind.

create temp table if not exists test_results (n serial, test text, result text);
truncate test_results;

do $$
declare
  v_boat text := (select phone from boats where id = '00000000-0000-0000-0000-000000000001');
  r jsonb;
  p jsonb;
begin
  perform reset_demo();

  r := save_catch(v_boat, 'Bangda', 50, 220);
  insert into test_results (test, result) values ('fisherman catch saved ("Bangda" → Bangude)',
    case when (r->>'ok')::boolean and r->>'fish_name' = 'Bangude' then 'PASS' else 'FAIL: ' || r::text end);

  r := save_catch(v_boat, 'bangude', 50, 240);
  insert into test_results (test, result) values ('price change remembers old price for the arrow',
    case when (r->>'previous_price_per_kg')::numeric = 220 then 'PASS' else 'FAIL: ' || r::text end);

  r := save_catch('910000000000', 'bangude', 10, 100);
  insert into test_results (test, result) values ('unknown phone cannot post a catch',
    case when r->>'reason' = 'not_a_boat' then 'PASS' else 'FAIL: ' || r::text end);

  r := place_order('919000000001', 'ayala', 2, true);
  insert into test_results (test, result) values ('order 2 kg at ₹240 → total ₹480, 48 kg left',
    case when (r->>'ok')::boolean and (r->>'total')::numeric = 480 and (r->>'kg_left')::numeric = 48
         then 'PASS' else 'FAIL: ' || r::text end);

  r := place_order('919000000001', 'bangude', 49, false);
  insert into test_results (test, result) values ('ordering more than stock is refused',
    case when r->>'reason' = 'not_enough' then 'PASS' else 'FAIL: ' || r::text end);

  r := place_order('919000000001', 'pomfret', 1, false);
  insert into test_results (test, result) values ('ordering a fish nobody listed is refused',
    case when r->>'reason' = 'not_listed' then 'PASS' else 'FAIL: ' || r::text end);

  r := place_order('919000000001', 'shark', 1, false);
  insert into test_results (test, result) values ('unknown fish name is refused',
    case when r->>'reason' = 'unknown_fish' then 'PASS' else 'FAIL: ' || r::text end);

  perform set_pending('919000000001', 'order', '{"fish":"bangude","kg":1}');
  p := take_pending('919000000001');
  insert into test_results (test, result) values ('pending reading is remembered, then cleared',
    case when p->>'kind' = 'order' and take_pending('919000000001') is null
         then 'PASS' else 'FAIL: ' || coalesce(p::text, 'null') end);

  perform reset_demo();
end;
$$;

select test, result from test_results order by n;
