-- ============================================================
-- q starter data, pulled from the planning notes.
-- Run ONCE in the Supabase SQL editor after 003_q_app.sql and 004.
-- Every value and price is a placeholder — tune them in the app.
-- Rule of thumb: a solid day ≈ 100 Q$, a solid week ≈ 1,000 Q$,
-- and wants are priced at roughly 20 Q$ per real dollar.
-- ============================================================

-- ── routines ────────────────────────────────────────────────
insert into q_routines (domain, title, cadence, interval_days, value, sort_order) values
  -- daily
  ('body', 'shower',            'daily', null, 5,  1),
  ('body', 'brush teeth',       'daily', null, 5,  2),
  ('body', 'floss',             'daily', null, 10, 3),
  ('body', 'exercise',          'daily', null, 25, 4),
  ('arts', 'read',              'daily', null, 15, 5),
  ('home', 'do dishes',         'daily', null, 10, 6),
  ('home', 'sweep',             'daily', null, 10, 7),
  ('home', 'wipe surfaces',     'daily', null, 10, 8),
  -- weekly
  ('home', 'water plants',                   'weekly', null, 30, 1),
  ('home', 'laundry',                        'weekly', null, 50, 2),
  ('body', 'journal',                        'weekly', null, 40, 3),
  ('crew', 'call friends & family',          'weekly', null, 50, 4),
  ('admn', 'budget',                         'weekly', null, 50, 5),
  ('make', 'arts projects update & timelines','weekly', null, 50, 6),
  -- monthly
  ('home', 'deep clean an area', 'monthly', null, 150, 1),
  ('home', 'mow grass',          'monthly', null, 100, 2),
  -- quarterly
  ('home', 'fertilize plants',              'quarterly', null, 300, 1),
  ('styl', 'swap clothes for the season',   'quarterly', null, 400, 2),
  -- yearly
  ('styl', 'clothes audit (remove ones i don’t wear)', 'yearly', null, 1000, 1),
  -- every n days
  ('home', 'bedsheet laundry', 'interval', 14,  40, 1),
  ('body', 'cut nails',        'interval', 14,  20, 2),
  ('body', 'haircut',          'interval', 42,  75, 3),
  ('admn', 'dentist',          'interval', 182, 200, 4);

-- ── log types (needs 004 for `kind`) ───────────────────────
insert into q_log_types (domain, name, kind, unit, value, sort_order) values
  ('body', 'lift',        'lift',      null,  25, 1),
  ('body', 'run',         'run',       'mi',  25, 2),
  ('body', 'bike',        'basic',     'mi',  20, 3),
  ('body', 'meditate',    'basic',     'min', 15, 4),
  ('body', 'substances',  'substance', null,  0,  5),
  ('arts', 'movie',       'movie',     null,  15, 6),
  ('arts', 'book',        'book',      null,  100, 7),
  ('arts', 'album',       'album',     null,  10, 8),
  ('city', 'event',       'event',     null,  30, 9),
  ('styl', 'fit pic',     'photo',     null,  15, 10),
  ('crew', 'letter sent', 'basic',     null,  40, 11),
  ('crew', 'kind act',    'basic',     null,  25, 12),
  ('home', 'laundry load','basic',     null,  0,  13);

-- ── shop: purchase wants ────────────────────────────────────
insert into q_rewards (title, category, domain, cost) values
  ('macbook',                                    'want', 'make', 30000),
  ('new iphone (512gb)',                         'want', 'admn', 24000),
  ('new watch',                                  'want', 'styl', 8000),
  ('fix shinola',                                'want', 'styl', 3000),
  ('seiko',                                      'want', 'styl', 6000),
  ('casio',                                      'want', 'styl', 1200),
  ('motorcycle',                                 'want', 'city', 100000),
  ('sweater',                                    'want', 'styl', 2500),
  ('adidas response cl · core black carbon',     'want', 'styl', 2800),
  ('asics gt 2160 · jjjound black',              'want', 'styl', 3600),
  ('nike v5 rnr · sail british tan ivory',       'want', 'styl', 2400),
  ('belt',                                       'want', 'styl', 1500),
  ('slim necklace',                              'want', 'styl', 2000);

-- ── one-off tasks (S 25 · M 75 · L 200 · XL 500) ────────────
insert into q_tasks (domain, title, value, due_date) values
  ('home', 'get cork board', 25, null),
  ('home', 'bleach whites', 25, null),
  ('styl', 'sort clothes that need mending', 75, null),
  ('home', 'get new cinnamon brooms', 25, null),
  ('home', 'plan next steps with couch', 75, null),
  ('home', 'buy more plants (pothos)', 25, null),
  ('home', 'bike hangers in basement', 75, null),
  ('home', 'framed posters for bedroom', 75, null),
  ('home', 'wall shelves', 200, null),
  ('home', 'wall hooks for towels', 25, null),
  ('home', 'clean carpet in room', 75, null),
  ('home', 'fix closet light', 25, null),
  ('home', 'roommate dinner', 75, null),
  ('styl', 'sort things to sell', 75, null),
  ('styl', 'purge & sell clothes', 200, null),
  ('styl', 'list clothes i want', 25, null),
  ('styl', 'take fit pics', 25, null),
  ('styl', 'update farley file with notes', 25, null),
  ('admn', 'get new passport', 200, null),
  ('admn', 'get new id', 75, null),
  ('admn', 'cancel gym membership', 25, null),
  ('admn', 'get bike tuned up', 75, null),
  ('admn', 'fix computer charger', 25, null),
  ('admn', 'buy new hdmi', 25, null),
  ('admn', 'schedule dentist appointment', 25, null),
  ('admn', 'pay taxes', 200, null),
  ('admn', 'ask for saturdays off at walden', 75, null),
  ('admn', 'talk to drew about accommodation', 75, null),
  ('admn', 'get motorcycle cert', 500, null),
  ('arts', 'get super 8 developed / text mikey', 75, null),
  ('arts', 'watch gremlins', 25, '2026-12-20'),
  ('crew', 'plan group bike ride', 75, null),
  ('crew', 'visit greenville', 200, null),
  ('crew', 'visit mitch, meg & morg', 200, null),
  ('crew', 'visit marquette', 200, null),
  ('crew', 'corn maze', 75, '2026-10-31'),
  ('crew', 'visit nyc', 200, null),
  ('crew', 'wine & cheese full moon dinner', 75, null),
  ('crew', 'november full moon dinner', 75, null),
  ('crew', 'december solstice dinner', 200, '2026-12-21'),
  ('crew', 'start a meal prep swap', 75, null),
  ('crew', 'council of movie watchers', 75, null),
  ('crew', 'watch digger', 25, null),
  ('make', 'help set up brad & hobey tour company', 200, null);
