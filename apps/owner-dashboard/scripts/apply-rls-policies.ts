// Script to apply RLS policies for orders tables
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyPolicies() {
  console.log('Applying RLS policies...')

  const sql = `
    -- Orders Policies
    DROP POLICY IF EXISTS "Allow read access to orders" ON orders;
    CREATE POLICY "Allow read access to orders" ON orders FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Allow insert orders" ON orders;
    CREATE POLICY "Allow insert orders" ON orders FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow update orders" ON orders;
    CREATE POLICY "Allow update orders" ON orders FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Allow delete orders" ON orders;
    CREATE POLICY "Allow delete orders" ON orders FOR DELETE USING (true);

    -- Order Items Policies
    DROP POLICY IF EXISTS "Allow read access to order_items" ON order_items;
    CREATE POLICY "Allow read access to order_items" ON order_items FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Allow insert order_items" ON order_items;
    CREATE POLICY "Allow insert order_items" ON order_items FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow update order_items" ON order_items;
    CREATE POLICY "Allow update order_items" ON order_items FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Allow delete order_items" ON order_items;
    CREATE POLICY "Allow delete order_items" ON order_items FOR DELETE USING (true);

    -- Tables Policies
    DROP POLICY IF EXISTS "Allow insert tables" ON tables;
    CREATE POLICY "Allow insert tables" ON tables FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow update tables" ON tables;
    CREATE POLICY "Allow update tables" ON tables FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Allow delete tables" ON tables;
    CREATE POLICY "Allow delete tables" ON tables FOR DELETE USING (true);

    -- Payment Transactions Policies
    DROP POLICY IF EXISTS "Allow read access to payment_transactions" ON payment_transactions;
    CREATE POLICY "Allow read access to payment_transactions" ON payment_transactions FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Allow insert payment_transactions" ON payment_transactions;
    CREATE POLICY "Allow insert payment_transactions" ON payment_transactions FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow update payment_transactions" ON payment_transactions;
    CREATE POLICY "Allow update payment_transactions" ON payment_transactions FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Allow delete payment_transactions" ON payment_transactions;
    CREATE POLICY "Allow delete payment_transactions" ON payment_transactions FOR DELETE USING (true);
  `

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      console.error('Error applying policies:', error)
      throw error
    }

    console.log('✅ RLS policies applied successfully!')
  } catch (error) {
    console.error('Failed to apply policies:', error)
    throw error
  }
}

applyPolicies()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed:', error)
    process.exit(1)
  })
