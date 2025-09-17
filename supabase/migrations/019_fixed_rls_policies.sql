-- =====================================================
-- FIXED RLS POLICIES
-- Purpose: Fixed version of RLS policies without syntax errors
-- Dependencies: All tables must exist
-- =====================================================

-- Drop existing problematic policies if they exist
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop all existing policies that might have syntax issues
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- ============= USERS & AUTH =============

-- Users table policies
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (id = auth.uid() OR role = 'owner');

CREATE POLICY "Only owners can insert users"
    ON users FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'owner');

CREATE POLICY "Only owners can update users"
    ON users FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'owner')
    WITH CHECK (auth.jwt() ->> 'role' = 'owner');

CREATE POLICY "Only owners can delete users"
    ON users FOR DELETE
    USING (auth.jwt() ->> 'role' = 'owner');

-- ============= MENU =============

-- Menu categories - public read
CREATE POLICY "Menu categories are public"
    ON menu_categories FOR SELECT
    USING (true);

CREATE POLICY "Only owners can insert categories"
    ON menu_categories FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'owner');

CREATE POLICY "Only owners can update categories"
    ON menu_categories FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'owner')
    WITH CHECK (auth.jwt() ->> 'role' = 'owner');

CREATE POLICY "Only owners can delete categories"
    ON menu_categories FOR DELETE
    USING (auth.jwt() ->> 'role' = 'owner');

-- Menu items - public read
CREATE POLICY "Menu items are viewable by everyone"
    ON menu_items FOR SELECT
    USING (true);

CREATE POLICY "Only owners can insert menu items"
    ON menu_items FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'owner');

CREATE POLICY "Only owners can update menu items"
    ON menu_items FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'owner')
    WITH CHECK (auth.jwt() ->> 'role' = 'owner');

CREATE POLICY "Only owners can delete menu items"
    ON menu_items FOR DELETE
    USING (auth.jwt() ->> 'role' = 'owner');

-- ============= ORDERS =============

-- Orders - customers can view their own, staff can view all
CREATE POLICY "Customers can view their own orders"
    ON orders FOR SELECT
    USING (
        customer_phone = auth.jwt() ->> 'phone' OR
        auth.jwt() ->> 'role' IN ('owner', 'employee', 'device')
    );

CREATE POLICY "Anyone can create orders"
    ON orders FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Staff can update orders"
    ON orders FOR UPDATE
    USING (
        auth.jwt() ->> 'role' IN ('owner', 'employee', 'device')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('owner', 'employee', 'device')
    );

-- Order items - same as orders
CREATE POLICY "View order items with order access"
    ON order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND (
                orders.customer_phone = auth.jwt() ->> 'phone' OR
                auth.jwt() ->> 'role' IN ('owner', 'employee', 'device')
            )
        )
    );

CREATE POLICY "Create order items with order"
    ON order_items FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Staff can update order items"
    ON order_items FOR UPDATE
    USING (
        auth.jwt() ->> 'role' IN ('owner', 'employee', 'device')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('owner', 'employee', 'device')
    );

-- Payment transactions
CREATE POLICY "View payment transactions with order access"
    ON payment_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = payment_transactions.order_id
            AND (
                orders.customer_phone = auth.jwt() ->> 'phone' OR
                auth.jwt() ->> 'role' IN ('owner', 'employee', 'device')
            )
        )
    );

CREATE POLICY "Create payment transactions"
    ON payment_transactions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Staff can update payment transactions"
    ON payment_transactions FOR UPDATE
    USING (
        auth.jwt() ->> 'role' IN ('owner', 'employee', 'device')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('owner', 'employee', 'device')
    );

-- ============= PROMOS =============

-- Promos - public read for active promos
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

-- Promo usage - staff can view, system can insert
CREATE POLICY "Staff can view promo usage"
    ON promo_usage FOR SELECT
    USING (
        auth.jwt() ->> 'role' IN ('owner', 'employee', 'device')
    );

CREATE POLICY "System can create promo usage"
    ON promo_usage FOR INSERT
    WITH CHECK (true);

-- ============= TABLES =============

-- Tables - public read
CREATE POLICY "Tables are public"
    ON tables FOR SELECT
    USING (true);

CREATE POLICY "Staff can update table status"
    ON tables FOR UPDATE
    USING (
        auth.jwt() ->> 'role' IN ('owner', 'employee', 'device')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('owner', 'employee', 'device')
    );

-- ============= ENABLE RLS =============

-- Ensure RLS is enabled on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON POLICY "Active promos are public" ON promos IS 'Allow public access to active promos for customer applications';
COMMENT ON POLICY "Anyone can create orders" ON orders IS 'Allow customers to create orders without authentication';
COMMENT ON POLICY "Tables are public" ON tables IS 'Allow public access to table information for QR code scanning';