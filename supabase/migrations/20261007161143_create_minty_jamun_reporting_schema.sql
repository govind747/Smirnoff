/*
# Smirnoff Minty Jamun Activity Reporting Schema

## Purpose
Track live field data for the Smirnoff Minty Jamun promotional activity across 4 liquor shop locations in Purbna. Models stationed at each location approach customers; buy 4 bottles of Minty Jamun to get a free dispenser (jar). The app is used by location models/team members to report live sales data every 2 hours.

## Locations
1. TLDW ISCO Chowk
2. TLDW DLF Phase 3
3. PRIBE Preview
4. Nasgela Chowk

Each location has its own 4-digit PIN for login verification.

## Reporting Structure
- **Session**: One active day's report per location. Created when the model logs in at 2 PM (with a login photo).
- **Time-Slot Reports**: 4 reporting windows — 2-4 PM, 4-6 PM, 6-8 PM, 8-10 PM. Each slot captures: bottles sold, customers approached, jars (dispensers) given.
- **Stock Additions**: Tracks jars received as new stock during the day (these are the free dispensers given with 4 bottles).
- **Stock**: Opening stock of jars (set at session creation), plus additions, minus jars given = balance.

## Tables

### `locations`
- `id` (int, primary key, 1-4)
- `name` (text) — full location name
- `pin` (text) — 4-digit PIN for login
- `created_at` (timestptz)

### `sessions`
- `id` (uuid, primary key)
- `location_id` (int, FK to locations)
- `session_date` (date) — the day of the activity
- `login_photo_url` (text) — URL of the photo taken at login
- `opening_jar_stock` (int) — jars in hand at start of day
- `created_at` (timestamptz)

### `slot_reports`
- `id` (uuid, primary key)
- `session_id` (uuid, FK to sessions)
- `slot_number` (int, 1-4) — 1=2-4PM, 2=4-6PM, 3=6-8PM, 4=8-10PM
- `bottles_sold` (int, default 0)
- `customers_approached` (int, default 0)
- `jars_given` (int, default 0)
- `updated_at` (timestamptz, default now())
- Unique constraint on (session_id, slot_number)

### `jar_stock_additions`
- `id` (uuid, primary key)
- `session_id` (uuid, FK to sessions)
- `quantity` (int) — number of jars received
- `note` (text, optional)
- `created_at` (timestamptz)

## Security
- RLS enabled on all tables.
- This is a no-auth (PIN-based) app — the frontend uses the anon key. All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` since the data is intentionally shared among the team for live reporting.

## Notes
1. Locations are seeded with default data.
2. PINs are stored as plain text (4-digit numeric) — this is a simple field-reporting app, not high-security.
3. One session per location per day.
*/

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
  id integer PRIMARY KEY,
  name text NOT NULL,
  pin text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_locations" ON locations;
CREATE POLICY "anon_select_locations" ON locations FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_locations" ON locations;
CREATE POLICY "anon_insert_locations" ON locations FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_locations" ON locations;
CREATE POLICY "anon_update_locations" ON locations FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_locations" ON locations;
CREATE POLICY "anon_delete_locations" ON locations FOR DELETE
TO anon, authenticated USING (true);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id integer NOT NULL REFERENCES locations(id),
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  login_photo_url text,
  opening_jar_stock integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (location_id, session_date)
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sessions" ON sessions;
CREATE POLICY "anon_select_sessions" ON sessions FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sessions" ON sessions;
CREATE POLICY "anon_insert_sessions" ON sessions FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sessions" ON sessions;
CREATE POLICY "anon_update_sessions" ON sessions FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sessions" ON sessions;
CREATE POLICY "anon_delete_sessions" ON sessions FOR DELETE
TO anon, authenticated USING (true);

-- Slot reports table
CREATE TABLE IF NOT EXISTS slot_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  slot_number integer NOT NULL CHECK (slot_number BETWEEN 1 AND 4),
  bottles_sold integer NOT NULL DEFAULT 0,
  customers_approached integer NOT NULL DEFAULT 0,
  jars_given integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (session_id, slot_number)
);

ALTER TABLE slot_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_slot_reports" ON slot_reports;
CREATE POLICY "anon_select_slot_reports" ON slot_reports FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_slot_reports" ON slot_reports;
CREATE POLICY "anon_insert_slot_reports" ON slot_reports FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_slot_reports" ON slot_reports;
CREATE POLICY "anon_update_slot_reports" ON slot_reports FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_slot_reports" ON slot_reports;
CREATE POLICY "anon_delete_slot_reports" ON slot_reports FOR DELETE
TO anon, authenticated USING (true);

-- Jar stock additions table
CREATE TABLE IF NOT EXISTS jar_stock_additions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE jar_stock_additions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_jar_stock_additions" ON jar_stock_additions;
CREATE POLICY "anon_select_jar_stock_additions" ON jar_stock_additions FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_jar_stock_additions" ON jar_stock_additions;
CREATE POLICY "anon_insert_jar_stock_additions" ON jar_stock_additions FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_jar_stock_additions" ON jar_stock_additions;
CREATE POLICY "anon_update_jar_stock_additions" ON jar_stock_additions FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_jar_stock_additions" ON jar_stock_additions;
CREATE POLICY "anon_delete_jar_stock_additions" ON jar_stock_additions FOR DELETE
TO anon, authenticated USING (true);

-- Seed location data
INSERT INTO locations (id, name, pin) VALUES
  (1, 'TLDW ISCO Chowk', '1111'),
  (2, 'TLDW DLF Phase 3', '2222'),
  (3, 'PRIBE Preview', '3333'),
  (4, 'Nasgela Chowk', '4444')
ON CONFLICT (id) DO NOTHING;