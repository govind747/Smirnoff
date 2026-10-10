/*
# Add live slot evidence and admin access

## Purpose
Extend the Minty Jamun field reporting system so each two-hour slot can include an on-the-spot photo and administrators can open a monitoring view.

## Modified tables
- `slot_reports.photo_url` (text, nullable): stores the photo URL captured for the slot.

## New tables
- `admin_settings`
  - `id` (integer, primary key)
  - `admin_pin` (text): four-digit PIN used by the monitoring entry screen.
  - `created_at` (timestamptz)

## Functions
- `verify_admin_pin(text)`: returns true only when the supplied PIN matches the stored admin PIN. It does not expose the stored PIN.

## Security
- RLS is enabled on `admin_settings` with no public table policies.
- The verification function is callable by anon and authenticated users because this is a PIN-based field app. The admin PIN is not readable through a table query.
- Existing reporting tables remain shared for team-wide live reporting, as established in the original schema.

## Notes
1. The seeded admin PIN is `9090`; change it directly in the admin settings row before production use.
2. The browser still needs reporting-table read access for the monitoring dashboard, matching the existing shared reporting model.
*/

ALTER TABLE slot_reports
  ADD COLUMN IF NOT EXISTS photo_url text;

CREATE TABLE IF NOT EXISTS admin_settings (
  id integer PRIMARY KEY,
  admin_pin text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_settings_no_anon_select" ON admin_settings;
DROP POLICY IF EXISTS "admin_settings_no_anon_insert" ON admin_settings;
DROP POLICY IF EXISTS "admin_settings_no_anon_update" ON admin_settings;
DROP POLICY IF EXISTS "admin_settings_no_anon_delete" ON admin_settings;

INSERT INTO admin_settings (id, admin_pin)
VALUES (1, '9090')
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION verify_admin_pin(input_pin text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_settings
    WHERE id = 1 AND admin_pin = input_pin
  );
$$;

REVOKE ALL ON FUNCTION verify_admin_pin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_admin_pin(text) TO anon, authenticated;