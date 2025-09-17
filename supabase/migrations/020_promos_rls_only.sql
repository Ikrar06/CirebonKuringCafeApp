-- =====================================================
-- PROMOS RLS POLICIES ONLY
-- Purpose: Create RLS policies specifically for promos table
-- This is safer to run without affecting other tables
-- =====================================================

-- Drop existing promo policies if they exist
DROP POLICY IF EXISTS "Active promos are public" ON promos;
DROP POLICY IF EXISTS "Only owner can manage promos" ON promos;
DROP POLICY IF EXISTS "Only owner can insert promos" ON promos;
DROP POLICY IF EXISTS "Only owner can update promos" ON promos;
DROP POLICY IF EXISTS "Only owner can delete promos" ON promos;

-- Drop promo_usage policies if they exist
DROP POLICY IF EXISTS "Staff can view promo usage" ON promo_usage;
DROP POLICY IF EXISTS "System can create promo usage" ON promo_usage;

-- Create correct policies for promos
CREATE POLICY "Active promos are public"
    ON promos FOR SELECT
    USING (is_active = true);

CREATE POLICY "Only owner can insert promos"
    ON promos FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'owner');

CREATE POLICY "Only owner can update promos"
    ON promos FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'owner')
    WITH CHECK (auth.jwt() ->> 'role' = 'owner');

CREATE POLICY "Only owner can delete promos"
    ON promos FOR DELETE
    USING (auth.jwt() ->> 'role' = 'owner');

-- Create policies for promo_usage
CREATE POLICY "Staff can view promo usage"
    ON promo_usage FOR SELECT
    USING (
        auth.jwt() ->> 'role' IN ('owner', 'employee', 'device')
    );

CREATE POLICY "System can create promo usage"
    ON promo_usage FOR INSERT
    WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_usage ENABLE ROW LEVEL SECURITY;

-- Test that promo access works
-- This should return active promos without authentication
SELECT 'RLS Test: Promos accessible' as test_name, count(*) as active_promos
FROM promos WHERE is_active = true;