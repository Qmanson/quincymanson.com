-- ============================================================
-- q — real-dollar prices in the shop
-- Q$ cost = usd_price × rate (q_state 'usd_rate', default 20)
-- ============================================================
alter table q_rewards add column if not exists usd_price numeric(10,2)
  check (usd_price is null or usd_price >= 0);

insert into q_state (key, value) values ('usd_rate', '20')
on conflict (key) do nothing;

-- the starter wants were priced at 20 Q$ per $1 — give them dollar prices
update q_rewards set usd_price = round(cost / 20.0, 2)
where usd_price is null and category = 'want' and status = 'available';
