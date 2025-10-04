-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to read all settings" ON system_settings;
DROP POLICY IF EXISTS "Allow service role full access" ON system_settings;
DROP POLICY IF EXISTS "Allow anonymous to read public settings" ON system_settings;

-- Enable RLS if not already enabled
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read ONLY public settings
CREATE POLICY "Allow anonymous to read public settings"
  ON system_settings
  FOR SELECT
  TO anon
  USING (is_public = true);

-- Allow authenticated users to read all settings
CREATE POLICY "Allow authenticated users to read all settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update settings
CREATE POLICY "Allow authenticated users to update settings"
  ON system_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access"
  ON system_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure is_public column is boolean (not text)
-- First, convert any text values to boolean
UPDATE system_settings
SET is_public = CASE
  WHEN is_public::text = 'true' THEN true
  WHEN is_public::text = 'false' THEN false
  ELSE is_public::boolean
END
WHERE is_public IS NOT NULL;

-- Comment
COMMENT ON POLICY "Allow anonymous to read public settings" ON system_settings
IS 'Allows unauthenticated users (customers) to read public settings like payment methods and cafe info';
