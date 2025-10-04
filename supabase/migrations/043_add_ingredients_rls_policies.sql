-- Enable RLS on ingredients table
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Ingredients are publicly readable" ON ingredients;
DROP POLICY IF EXISTS "Enable read access for all users" ON ingredients;

-- Create policy to allow public SELECT access for ingredients
-- This allows the dashboard to display ingredient data and stock levels
CREATE POLICY "Enable read access for all users"
  ON ingredients
  FOR SELECT
  USING (true);

-- Optional: Add policies for authenticated users to manage ingredients
-- (Owner dashboard should be able to insert, update, delete)
CREATE POLICY "Enable insert for authenticated users"
  ON ingredients
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON ingredients
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
  ON ingredients
  FOR DELETE
  USING (true);

-- Add comment
COMMENT ON POLICY "Enable read access for all users" ON ingredients IS
  'Allows public read access to ingredients for displaying in dashboard and customer apps';
