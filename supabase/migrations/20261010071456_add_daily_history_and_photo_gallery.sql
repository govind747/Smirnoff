/*
# Add daily history and multi-photo gallery

## Purpose
Keep a permanent daily activity history and allow teams to attach multiple evidence photos to a session or any two-hour slot.

## New table: `activity_photos`
- `id` (uuid, primary key)
- `session_id` (uuid, references sessions)
- `slot_number` (integer, nullable) — null for login/logout photos, otherwise 1-4
- `photo_type` (text) — login, logout, or slot
- `photo_url` (text) — uploaded image URL or captured fallback data URL
- `created_at` (timestamptz)

## Security
- RLS is enabled on `activity_photos`.
- The existing PIN-based app intentionally permits shared team read/write access for live field reporting.
- Photo type and slot number are constrained to valid values.

## Notes
1. Existing login_photo_url and slot_reports.photo_url values remain untouched for backwards compatibility.
2. New uploads are stored as individual rows, so multiple photos can be added without overwriting earlier evidence.
3. Daily history is keyed by the IST session_date already used by the reporting app.
*/

CREATE TABLE IF NOT EXISTS activity_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  slot_number integer,
  photo_type text NOT NULL CHECK (photo_type IN ('login', 'logout', 'slot')),
  photo_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_photos_slot_check CHECK (slot_number IS NULL OR slot_number BETWEEN 1 AND 4),
  CONSTRAINT activity_photos_type_slot_check CHECK (
    (photo_type = 'slot' AND slot_number IS NOT NULL)
    OR (photo_type IN ('login', 'logout') AND slot_number IS NULL)
  )
);

ALTER TABLE activity_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_activity_photos" ON activity_photos;
CREATE POLICY "anon_select_activity_photos" ON activity_photos FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_activity_photos" ON activity_photos;
CREATE POLICY "anon_insert_activity_photos" ON activity_photos FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_activity_photos" ON activity_photos;
CREATE POLICY "anon_update_activity_photos" ON activity_photos FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_activity_photos" ON activity_photos;
CREATE POLICY "anon_delete_activity_photos" ON activity_photos FOR DELETE
TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS activity_photos_session_idx ON activity_photos(session_id, created_at);
