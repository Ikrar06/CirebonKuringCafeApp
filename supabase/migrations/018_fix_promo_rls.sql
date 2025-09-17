-- Fix RLS policies for promos table
-- This file fixes the RLS policy issues for promos

-- Drop existing incorrect policy if exists
DROP POLICY IF EXISTS "Only owner can manage promos" ON promos;

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

-- Create policies for promo_usage if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'promo_usage'
        AND policyname = 'Staff can view promo usage'
    ) THEN
        CREATE POLICY "Staff can view promo usage"
            ON promo_usage FOR SELECT
            USING (
                auth.jwt() ->> 'role' IN ('owner', 'employee', 'device')
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'promo_usage'
        AND policyname = 'System can create promo usage'
    ) THEN
        CREATE POLICY "System can create promo usage"
            ON promo_usage FOR INSERT
            WITH CHECK (true);
    END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_usage ENABLE ROW LEVEL SECURITY;