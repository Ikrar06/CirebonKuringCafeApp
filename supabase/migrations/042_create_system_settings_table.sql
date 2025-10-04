-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, key)
);

-- Create index for faster queries
CREATE INDEX idx_system_settings_category ON system_settings(category);
CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_is_public ON system_settings(is_public);

-- Add RLS policies
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all settings
CREATE POLICY "Allow authenticated users to read all settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to do everything
CREATE POLICY "Allow service role full access"
  ON system_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert initial payment settings
INSERT INTO system_settings (category, key, value, description, is_public)
VALUES
  (
    'payment',
    'methods',
    '{"cash": true, "qris": true, "transfer": true, "card": false}'::jsonb,
    'Available payment methods',
    true
  ),
  (
    'payment',
    'bank_accounts',
    '[
      {"bank": "BCA", "name": "PT Cafe Digital", "account": "1234567890"},
      {"bank": "Mandiri", "name": "PT Cafe Digital", "account": "0987654321"}
    ]'::jsonb,
    'Bank accounts for transfer payments',
    true
  );

-- Insert initial cafe settings
INSERT INTO system_settings (category, key, value, description, is_public)
VALUES
  (
    'cafe',
    'info',
    '{
      "name": "Cirebon Kuring Cafe",
      "address": "Jl. Contoh No. 123, Cirebon",
      "phone": "+62 812 3456 7890",
      "email": "info@cirebon-kuring.com"
    }'::jsonb,
    'Cafe basic information',
    true
  ),
  (
    'cafe',
    'operating_hours',
    '{
      "monday": {"open": "08:00", "close": "22:00"},
      "tuesday": {"open": "08:00", "close": "22:00"},
      "wednesday": {"open": "08:00", "close": "22:00"},
      "thursday": {"open": "08:00", "close": "22:00"},
      "friday": {"open": "08:00", "close": "22:00"},
      "saturday": {"open": "08:00", "close": "22:00"},
      "sunday": {"open": "08:00", "close": "22:00"}
    }'::jsonb,
    'Cafe operating hours',
    true
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

-- Add comment
COMMENT ON TABLE system_settings IS 'System-wide configuration settings';
