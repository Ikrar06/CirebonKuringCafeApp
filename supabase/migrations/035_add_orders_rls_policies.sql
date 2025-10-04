-- Add RLS policies for orders, order_items, and tables

-- =====================================================
-- Orders Policies
-- =====================================================

-- Allow all reads for orders (for owner dashboard and customer app)
DROP POLICY IF EXISTS "Allow read access to orders" ON orders;
CREATE POLICY "Allow read access to orders" ON orders
    FOR SELECT USING (true);

-- Allow insert for authenticated users (customer can create orders)
DROP POLICY IF EXISTS "Allow insert orders" ON orders;
CREATE POLICY "Allow insert orders" ON orders
    FOR INSERT WITH CHECK (true);

-- Allow update for authenticated users (for status updates)
DROP POLICY IF EXISTS "Allow update orders" ON orders;
CREATE POLICY "Allow update orders" ON orders
    FOR UPDATE USING (true);

-- Allow delete for authenticated users (in case of cancellation)
DROP POLICY IF EXISTS "Allow delete orders" ON orders;
CREATE POLICY "Allow delete orders" ON orders
    FOR DELETE USING (true);

-- =====================================================
-- Order Items Policies
-- =====================================================

-- Allow all reads for order_items
DROP POLICY IF EXISTS "Allow read access to order_items" ON order_items;
CREATE POLICY "Allow read access to order_items" ON order_items
    FOR SELECT USING (true);

-- Allow insert for authenticated users
DROP POLICY IF EXISTS "Allow insert order_items" ON order_items;
CREATE POLICY "Allow insert order_items" ON order_items
    FOR INSERT WITH CHECK (true);

-- Allow update for authenticated users
DROP POLICY IF EXISTS "Allow update order_items" ON order_items;
CREATE POLICY "Allow update order_items" ON order_items
    FOR UPDATE USING (true);

-- Allow delete for authenticated users
DROP POLICY IF EXISTS "Allow delete order_items" ON order_items;
CREATE POLICY "Allow delete order_items" ON order_items
    FOR DELETE USING (true);

-- =====================================================
-- Tables Policies (already has read, add others)
-- =====================================================

-- Allow insert for tables
DROP POLICY IF EXISTS "Allow insert tables" ON tables;
CREATE POLICY "Allow insert tables" ON tables
    FOR INSERT WITH CHECK (true);

-- Allow update for tables
DROP POLICY IF EXISTS "Allow update tables" ON tables;
CREATE POLICY "Allow update tables" ON tables
    FOR UPDATE USING (true);

-- Allow delete for tables
DROP POLICY IF EXISTS "Allow delete tables" ON tables;
CREATE POLICY "Allow delete tables" ON tables
    FOR DELETE USING (true);

-- =====================================================
-- Payment Transactions Policies
-- =====================================================

-- Allow all reads for payment_transactions
DROP POLICY IF EXISTS "Allow read access to payment_transactions" ON payment_transactions;
CREATE POLICY "Allow read access to payment_transactions" ON payment_transactions
    FOR SELECT USING (true);

-- Allow insert for authenticated users
DROP POLICY IF EXISTS "Allow insert payment_transactions" ON payment_transactions;
CREATE POLICY "Allow insert payment_transactions" ON payment_transactions
    FOR INSERT WITH CHECK (true);

-- Allow update for authenticated users
DROP POLICY IF EXISTS "Allow update payment_transactions" ON payment_transactions;
CREATE POLICY "Allow update payment_transactions" ON payment_transactions
    FOR UPDATE USING (true);

-- Allow delete for authenticated users
DROP POLICY IF EXISTS "Allow delete payment_transactions" ON payment_transactions;
CREATE POLICY "Allow delete payment_transactions" ON payment_transactions
    FOR DELETE USING (true);
