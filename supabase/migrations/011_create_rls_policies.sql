-- =====================================================
-- BATCH 3 - FILE 4: Row Level Security Policies
-- Purpose: Implement security policies for all tables
-- Dependencies: All previous tables must exist
-- =====================================================

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

-- Employees policies
CREATE POLICY "Employees can view their own data"
    ON employees FOR SELECT
    USING (
        user_id = auth.uid() OR 
        auth.jwt() ->> 'role' = 'owner'
    );

CREATE POLICY "Only owners can insert employees"
    ON employees FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'owner');

CREATE POLICY "Only owners can update employees"
    ON employees FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'owner')
    WITH CHECK (auth.jwt() ->> 'role' = 'owner');

CREATE POLICY "Only owners can delete employees"
    ON employees FOR DELETE
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
-- (continuing 011_create_rls_policies.sql)

-- Menu items - public read
CREATE POLICY "Menu items are viewable by everyone"
    ON menu_items FOR SELECT
    USING (true);

CREATE POLICY "Only owners can manage menu items"
    ON menu_items FOR INSERT
    USING (auth.jwt() ->> 'role' = 'owner');

CREATE POLICY "Only owners can update menu items"
    ON menu_items FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'owner');

CREATE POLICY "Only owners can delete menu items"
    ON menu_items FOR DELETE
    USING (auth.jwt() ->> 'role' = 'owner');

-- Ingredients - staff can view
CREATE POLICY "Staff can view ingredients"
    ON ingredients FOR SELECT
    USING (
        auth.jwt() ->> 'role' IN ('owner', 'employee', 'device')
    );

CREATE POLICY "Only owners and stock staff can insert ingredients"
    ON ingredients FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'role' = 'owner' OR
        auth.jwt() ->> 'device_type' = 'stok'
    );

CREATE POLICY "Only owners and stock staff can update ingredients"
    ON ingredients FOR UPDATE
    USING (
        auth.jwt() ->> 'role' = 'owner' OR
        auth.jwt() ->> 'device_type' = 'stok'
    )
    WITH CHECK (
        auth.jwt() ->> 'role' = 'owner' OR
        auth.jwt() ->> 'device_type' = 'stok'
    );

CREATE POLICY "Only owners and stock staff can delete ingredients"
    ON ingredients FOR DELETE
    USING (
        auth.jwt() ->> 'role' = 'owner' OR
        auth.jwt() ->> 'device_type' = 'stok'
    );

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
    USING (true);

CREATE POLICY "Staff can update orders"
    ON orders FOR UPDATE
    USING (
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
    USING (true);

CREATE POLICY "Staff can update order items"
    ON order_items FOR UPDATE
    USING (
        auth.jwt() ->> 'role' IN ('owner', 'employee', 'device')
    );

-- ============= INVENTORY =============

-- Stock movements - staff only
CREATE POLICY "Staff can view stock movements"
    ON stock_movements FOR SELECT
    USING (
        auth.jwt() ->> 'role' IN ('owner', 'employee', 'device')
    );

CREATE POLICY "Stock staff can create movements"
    ON stock_movements FOR INSERT
    USING (
        auth.jwt() ->> 'role' = 'owner' OR
        auth.jwt() ->> 'device_type' = 'stok'
    );

-- Suppliers - staff only
CREATE POLICY "Staff can view suppliers"
    ON suppliers FOR SELECT
    USING (
        auth.jwt() ->> 'role' IN ('owner', 'employee', 'device')
    );

CREATE POLICY "Only owners can insert suppliers"
    ON suppliers FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'owner');

CREATE POLICY "Only owners can update suppliers"
    ON suppliers FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'owner')
    WITH CHECK (auth.jwt() ->> 'role' = 'owner');

CREATE POLICY "Only owners can delete suppliers"
    ON suppliers FOR DELETE
    USING (auth.jwt() ->> 'role' = 'owner');

-- ============= ATTENDANCE =============

-- Attendance - employees see own, owner sees all
CREATE POLICY "Employees view own attendance"
    ON attendance FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM employees WHERE user_id = auth.uid()
        ) OR
        auth.jwt() ->> 'role' = 'owner'
    );

CREATE POLICY "Employees can clock in/out"
    ON attendance FOR INSERT
    USING (
        employee_id IN (
            SELECT id FROM employees WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Employees can update own attendance"
    ON attendance FOR UPDATE
    USING (
        employee_id IN (
            SELECT id FROM employees WHERE user_id = auth.uid()
        ) OR
        auth.jwt() ->> 'role' = 'owner'
    );

-- ============= PAYROLL =============

-- Payroll - employees see own, owner sees all
CREATE POLICY "Employees view own payroll"
    ON payroll FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM employees WHERE user_id = auth.uid()
        ) OR
        auth.jwt() ->> 'role' = 'owner'
    );

CREATE POLICY "Only owner can insert payroll"
    ON payroll FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'owner');

CREATE POLICY "Only owner can update payroll"
    ON payroll FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'owner')
    WITH CHECK (auth.jwt() ->> 'role' = 'owner');

CREATE POLICY "Only owner can delete payroll"
    ON payroll FOR DELETE
    USING (auth.jwt() ->> 'role' = 'owner');

-- ============= CASH RECONCILIATION =============

-- Cash reconciliation - kasir and owner only
CREATE POLICY "Kasir and owner can view reconciliation"
    ON cash_reconciliation FOR SELECT
    USING (
        auth.jwt() ->> 'role' = 'owner' OR
        auth.jwt() ->> 'device_type' = 'kasir' OR
        kasir_id IN (
            SELECT id FROM employees WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Kasir can create reconciliation"
    ON cash_reconciliation FOR INSERT
    USING (
        auth.jwt() ->> 'device_type' = 'kasir'
    );

CREATE POLICY "Kasir can update own reconciliation"
    ON cash_reconciliation FOR UPDATE
    USING (
        auth.jwt() ->> 'device_type' = 'kasir' OR
        auth.jwt() ->> 'role' = 'owner'
    );

-- ============= PROMOS =============

-- Promos - public read
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

-- ============= NOTIFICATIONS =============

-- Notifications - recipients see own
CREATE POLICY "Recipients view own notifications"
    ON notifications FOR SELECT
    USING (
        recipient_id = auth.uid() OR
        recipient_id IN (
            SELECT id FROM employees WHERE user_id = auth.uid()
        ) OR
        auth.jwt() ->> 'role' = 'owner'
    );

CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT
    USING (
        auth.jwt() ->> 'role' IN ('owner', 'device')
    );

-- ============= SYSTEM SETTINGS =============

-- System settings
CREATE POLICY "Public settings are viewable"
    ON system_settings FOR SELECT
    USING (
        is_public = true OR
        auth.jwt() ->> 'role' = 'owner'
    );

CREATE POLICY "Only owner can insert settings"
    ON system_settings FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'owner');

CREATE POLICY "Only owner can update settings"
    ON system_settings FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'owner')
    WITH CHECK (auth.jwt() ->> 'role' = 'owner');

CREATE POLICY "Only owner can delete settings"
    ON system_settings FOR DELETE
    USING (auth.jwt() ->> 'role' = 'owner');

-- ============= DEVICE ACCOUNTS =============

-- Device accounts
CREATE POLICY "Devices can view own account"
    ON device_accounts FOR SELECT
    USING (
        id::text = auth.jwt() ->> 'device_id' OR
        auth.jwt() ->> 'role' = 'owner'
    );

CREATE POLICY "Only owner can insert devices"
    ON device_accounts FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'owner');

CREATE POLICY "Only owner can update devices"
    ON device_accounts FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'owner')
    WITH CHECK (auth.jwt() ->> 'role' = 'owner');

CREATE POLICY "Only owner can delete devices"
    ON device_accounts FOR DELETE
    USING (auth.jwt() ->> 'role' = 'owner');

-- ============= TABLES =============

-- Tables - public read
CREATE POLICY "Tables are public"
    ON tables FOR SELECT
    USING (true);

CREATE POLICY "Staff can update table status"
    ON tables FOR UPDATE
    USING (
        auth.jwt() ->> 'role' IN ('owner', 'employee', 'device')
    );

-- ============= AUDIT LOGS =============

-- Audit logs - owner only
CREATE POLICY "Only owner can view audit logs"
    ON audit_logs FOR SELECT
    USING (auth.jwt() ->> 'role' = 'owner');

-- System creates audit logs
CREATE POLICY "System creates audit logs"
    ON audit_logs FOR INSERT
    USING (true);

-- ============= TEMPORARY DEV POLICIES =============
-- Remove these in production!

-- Temporary allow all for development
-- CREATE POLICY "TEMP_DEV_ALLOW_ALL" ON menu_items FOR ALL USING (true);
-- CREATE POLICY "TEMP_DEV_ALLOW_ALL" ON orders FOR ALL USING (true);

-- Comments
COMMENT ON POLICY "Users can view their own profile" ON users IS 'Users can only see their own profile, except owners who can see all';
COMMENT ON POLICY "Menu items are viewable by everyone" ON menu_items IS 'Menu is public for customers to browse';
COMMENT ON POLICY "Staff can update orders" ON orders IS 'All staff can update order status';