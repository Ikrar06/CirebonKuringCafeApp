-- Fix RLS policy for menu_items UPDATE
-- The current policy checks JWT role which doesn't work for authenticated users
-- We need to allow authenticated users to update menu items

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Only owners can update menu items" ON menu_items;

-- Create new UPDATE policy that allows authenticated users
CREATE POLICY "Authenticated users can update menu items"
    ON menu_items FOR UPDATE
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

COMMENT ON POLICY "Authenticated users can update menu items" ON menu_items
IS 'Allow any authenticated user (owner dashboard) to update menu items';
