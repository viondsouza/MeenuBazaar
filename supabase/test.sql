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
  v_tg_saved text;
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

  -- ─ A full WhatsApp conversation, as n8n will run it (Gemini's reading is typed in by hand) ─
  perform reset_demo();

  r := inbound(v_boat, 'bangude 50 220');
  insert into test_results (test, result) values ('chat: fisherman message is sent to Gemini as a catch',
    case when r->>'action' = 'read' and r->>'kind' = 'catch' and jsonb_array_length(r->'fish') > 0
         then 'PASS' else 'FAIL: ' || r::text end);

  r := after_ai(v_boat, 'catch', '{"understood":true,"items":[{"fish":"bangude","kg":50,"price_per_kg":220}],"question":null}');
  insert into test_results (test, result) values ('chat: bot repeats the catch and asks for YES',
    case when r->>'reply' like '%Bangude: 50 kg at ₹220/kg%YES%' then 'PASS' else 'FAIL: ' || r::text end);

  r := inbound(v_boat, 'Yes!');
  insert into test_results (test, result) values ('chat: fisherman YES puts the catch live',
    case when r->>'reply' like '%Live on the MeenuBazaar board%'
              and (select kg_left from listings where fish_key = 'bangude') = 50
         then 'PASS' else 'FAIL: ' || r::text end);

  r := inbound('919000000002', 'Order 1 kg Bangude cleaned');
  insert into test_results (test, result) values ('chat: customer message is sent to Gemini as an order',
    case when r->>'action' = 'read' and r->>'kind' = 'order' then 'PASS' else 'FAIL: ' || r::text end);

  r := after_ai('919000000002', 'order', '{"understood":true,"fish":"bangude","kg":1,"cleaned":true,"question":null}');
  insert into test_results (test, result) values ('chat: bot shows the order total and asks for YES',
    case when r->>'reply' like '%1 kg Bangude* (cleaned)%₹220%YES%' then 'PASS' else 'FAIL: ' || r::text end);

  r := inbound('919000000002', 'yes');
  insert into test_results (test, result) values ('chat: customer YES confirms, sends UPI and a pack alert to the boat',
    case when r->>'reply' like '%Order confirmed%UPI%' and r->>'alert_phone' = v_boat and r->>'alert' like '%pack%'
              and (select kg_left from listings where fish_key = 'bangude') = 49
         then 'PASS' else 'FAIL: ' || r::text end);

  r := after_ai('919000000002', 'order', '{"understood":true,"fish":"bangude","kg":60,"cleaned":false,"question":null}');
  insert into test_results (test, result) values ('chat: asking for more than the stock is refused before YES',
    case when r->>'reply' like '%only 49 kg%' then 'PASS' else 'FAIL: ' || r::text end);

  r := after_ai('919000000002', 'order', '{"understood":true,"fish":"unknown","kg":1,"cleaned":false,"question":null}');
  insert into test_results (test, result) values ('chat: an unknown fish gets today''s list instead',
    case when r->>'reply' like '%don''t have that fish%Bangude ₹220/kg%' then 'PASS' else 'FAIL: ' || r::text end);

  r := after_ai('919000000002', 'order', '{"understood":false,"fish":"unknown","kg":1,"cleaned":false,"question":"A MeenuBazaar person will reply soon."}');
  insert into test_results (test, result) values ('chat: a question (not an order) gets Gemini''s polite reply',
    case when r->>'reply' = 'A MeenuBazaar person will reply soon.' then 'PASS' else 'FAIL: ' || r::text end);

  perform after_ai('919000000002', 'order', '{"understood":true,"fish":"bangude","kg":2,"cleaned":false,"question":null}');
  r := inbound('919000000002', 'no');
  insert into test_results (test, result) values ('chat: NO cancels, and a later YES finds nothing waiting',
    case when r->>'reply' like '%cancelled%' and inbound('919000000002', 'yes')->>'reply' like '%nothing waiting%'
              and (select kg_left from listings where fish_key = 'bangude') = 49
         then 'PASS' else 'FAIL: ' || r::text end);

  -- ─ The Telegram demo: same flow through tg_inbound()/tg_after_ai() ─
  -- The boat's real Telegram ID (if any) is put back at the end.
  perform reset_demo();
  v_tg_saved := (select telegram_id from boats where id = '00000000-0000-0000-0000-000000000001');
  update boats set telegram_id = 'TEST111' where id = '00000000-0000-0000-0000-000000000001';

  r := tg_inbound('TEST111', '/start');
  insert into test_results (test, result) values ('telegram: /start greets the boat and shows its ID',
    case when r->>'reply' like 'Welcome back, Sri Durga%TEST111' then 'PASS' else 'FAIL: ' || r::text end);

  r := tg_inbound('TEST111', 'bangude 50 220');
  insert into test_results (test, result) values ('telegram: boat message goes to Gemini as a catch',
    case when r->>'action' = 'read' and r->>'kind' = 'catch' and r->>'chat_id' = 'TEST111'
         then 'PASS' else 'FAIL: ' || r::text end);

  r := tg_after_ai('TEST111', 'catch', '{"understood":true,"items":[{"fish":"bangude","kg":50,"price_per_kg":220}],"question":null}');
  insert into test_results (test, result) values ('telegram: bot repeats the catch (plain text, no stars)',
    case when r->>'reply' like '%Bangude: 50 kg at ₹220/kg%Reply YES%' and r->>'reply' not like '%*%'
         then 'PASS' else 'FAIL: ' || r::text end);

  r := tg_inbound('TEST111', 'YES');
  insert into test_results (test, result) values ('telegram: boat YES puts the catch live',
    case when r->>'reply' like '%Live on the MeenuBazaar board%'
              and (select kg_left from listings where fish_key = 'bangude') = 50
         then 'PASS' else 'FAIL: ' || r::text end);

  r := tg_inbound('TEST222', 'bangude 50 220');
  insert into test_results (test, result) values ('telegram: a non-boat user can''t post a catch (read as an order)',
    case when r->>'kind' = 'order' then 'PASS' else 'FAIL: ' || r::text end);

  r := tg_after_ai('TEST222', 'catch', '{"understood":false,"items":[],"question":"Which fish?"}');
  perform tg_after_ai('TEST222', 'order', '{"understood":false,"fish":"unknown","kg":1,"cleaned":false,"question":"Which fish would you like?"}');
  insert into test_results (test, result) values ('telegram: unclear messages change nothing on the board',
    case when (select count(*) from listings) = 1 and (select kg_left from listings where fish_key = 'bangude') = 50
         then 'PASS' else 'FAIL' end);

  r := tg_after_ai('TEST222', 'order', '{"understood":true,"fish":"bangude","kg":1,"cleaned":true,"question":null}');
  insert into test_results (test, result) values ('telegram: customer sees the total and is asked for YES',
    case when r->>'reply' like '%1 kg Bangude (cleaned)%₹220%Reply YES%' then 'PASS' else 'FAIL: ' || r::text end);

  r := tg_inbound('TEST222', 'yes');
  insert into test_results (test, result) values ('telegram: customer YES → UPI ID, stock down, pack alert to the boat''s Telegram',
    case when r->>'reply' like '%Order confirmed%UPI%' and r->>'alert_chat_id' = 'TEST111' and r->>'alert' like '%pack%'
              and (select kg_left from listings where fish_key = 'bangude') = 49
         then 'PASS' else 'FAIL: ' || r::text end);

  r := tg_after_ai('TEST222', 'order', '{"understood":true,"fish":"bangude","kg":60,"cleaned":false,"question":null}');
  insert into test_results (test, result) values ('telegram: too many kg says how many are left',
    case when r->>'reply' like '%only 49 kg%' then 'PASS' else 'FAIL: ' || r::text end);

  r := tg_after_ai('TEST222', 'order', '{"understood":true,"fish":"bangude","kg":999,"cleaned":false,"question":null}');
  insert into test_results (test, result) values ('telegram: a huge order (999 kg) also says how many are left',
    case when r->>'reply' like '%only 49 kg%' then 'PASS' else 'FAIL: ' || r::text end);

  update boats set telegram_id = v_tg_saved where id = '00000000-0000-0000-0000-000000000001';
  perform reset_demo();
end;
$$;

select test, result from test_results order by n;
