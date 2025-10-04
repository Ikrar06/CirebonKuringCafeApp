-- =====================================================
-- POPULATE PROMO USAGE DATA
-- Purpose: Create sample promo_usage records based on existing promos
-- =====================================================

-- First, let's check if we have any orders to link to
-- We'll create promo_usage records for promos that have current_uses > 0

-- For Grand Opening promo (current_uses = 29)
INSERT INTO promo_usage (promo_id, order_id, customer_phone, discount_amount, used_at)
SELECT
    '52891de3-a860-4255-90d4-44a2883cebf1'::uuid as promo_id,
    o.id as order_id,
    o.customer_phone,
    CASE
        WHEN o.subtotal IS NOT NULL THEN o.subtotal * 0.20
        ELSE o.total_amount * 0.20
    END as discount_amount,
    o.created_at as used_at
FROM orders o
WHERE o.created_at >= '2025-09-10'
  AND o.status IN ('confirmed', 'preparing', 'ready', 'delivered', 'completed')
  AND NOT EXISTS (
    SELECT 1 FROM promo_usage pu
    WHERE pu.order_id = o.id
    AND pu.promo_id = '52891de3-a860-4255-90d4-44a2883cebf1'
  )
ORDER BY o.created_at DESC
LIMIT 29;

-- For Coffee Monday promo (current_uses = 4)
INSERT INTO promo_usage (promo_id, order_id, customer_phone, discount_amount, used_at)
SELECT
    '065ed729-5e92-4174-b248-6f61aac38186'::uuid as promo_id,
    o.id as order_id,
    o.customer_phone,
    CASE
        WHEN o.subtotal IS NOT NULL THEN o.subtotal * 0.10
        ELSE o.total_amount * 0.10
    END as discount_amount,
    o.created_at as used_at
FROM orders o
WHERE o.created_at >= '2025-09-10'
  AND EXTRACT(DOW FROM o.created_at) = 1 -- Monday
  AND o.status IN ('confirmed', 'preparing', 'ready', 'delivered', 'completed')
  AND NOT EXISTS (
    SELECT 1 FROM promo_usage pu
    WHERE pu.order_id = o.id
    AND pu.promo_id = '065ed729-5e92-4174-b248-6f61aac38186'
  )
ORDER BY o.created_at DESC
LIMIT 4;

-- For Lunch Bundle promo (current_uses = 1)
INSERT INTO promo_usage (promo_id, order_id, customer_phone, discount_amount, used_at)
SELECT
    '59c6d3e1-a55d-4e66-8da4-ef10d4eff9f9'::uuid as promo_id,
    o.id as order_id,
    o.customer_phone,
    10000 as discount_amount,
    o.created_at as used_at
FROM orders o
WHERE o.created_at >= '2025-09-10'
  AND o.status IN ('confirmed', 'preparing', 'ready', 'delivered', 'completed')
  AND (o.subtotal >= 75000 OR o.total_amount >= 75000)
  AND NOT EXISTS (
    SELECT 1 FROM promo_usage pu
    WHERE pu.order_id = o.id
    AND pu.promo_id = '59c6d3e1-a55d-4e66-8da4-ef10d4eff9f9'
  )
ORDER BY o.created_at DESC
LIMIT 1;

-- If we don't have enough orders, create dummy usage data
-- (without order_id, just for analytics purposes)
DO $$
DECLARE
    v_grand_opening_count INTEGER;
    v_coffee_monday_count INTEGER;
    v_lunch_bundle_count INTEGER;
    i INTEGER;
BEGIN
    -- Count existing usage for each promo
    SELECT COUNT(*) INTO v_grand_opening_count
    FROM promo_usage WHERE promo_id = '52891de3-a860-4255-90d4-44a2883cebf1';

    SELECT COUNT(*) INTO v_coffee_monday_count
    FROM promo_usage WHERE promo_id = '065ed729-5e92-4174-b248-6f61aac38186';

    SELECT COUNT(*) INTO v_lunch_bundle_count
    FROM promo_usage WHERE promo_id = '59c6d3e1-a55d-4e66-8da4-ef10d4eff9f9';

    -- Fill Grand Opening to 29 uses
    FOR i IN (v_grand_opening_count + 1)..29 LOOP
        INSERT INTO promo_usage (promo_id, customer_phone, discount_amount, used_at)
        VALUES (
            '52891de3-a860-4255-90d4-44a2883cebf1',
            '+62812345' || LPAD(i::text, 4, '0'),
            (50000 + (RANDOM() * 50000)) * 0.20,
            NOW() - INTERVAL '1 day' * (29 - i)
        );
    END LOOP;

    -- Fill Coffee Monday to 4 uses
    FOR i IN (v_coffee_monday_count + 1)..4 LOOP
        INSERT INTO promo_usage (promo_id, customer_phone, discount_amount, used_at)
        VALUES (
            '065ed729-5e92-4174-b248-6f61aac38186',
            '+62812345' || LPAD(i::text, 4, '0'),
            (30000 + (RANDOM() * 30000)) * 0.10,
            NOW() - INTERVAL '7 days' + INTERVAL '1 day' * i
        );
    END LOOP;

    -- Fill Lunch Bundle to 1 use
    IF v_lunch_bundle_count < 1 THEN
        INSERT INTO promo_usage (promo_id, customer_phone, discount_amount, used_at)
        VALUES (
            '59c6d3e1-a55d-4e66-8da4-ef10d4eff9f9',
            '+628123456789',
            10000,
            NOW() - INTERVAL '3 days'
        );
    END IF;
END $$;

-- Verify the counts
SELECT
    p.name,
    p.code,
    p.current_uses as expected_uses,
    COUNT(pu.id) as actual_usage_records
FROM promos p
LEFT JOIN promo_usage pu ON pu.promo_id = p.id
WHERE p.id IN (
    '52891de3-a860-4255-90d4-44a2883cebf1',
    '065ed729-5e92-4174-b248-6f61aac38186',
    '59c6d3e1-a55d-4e66-8da4-ef10d4eff9f9'
)
GROUP BY p.id, p.name, p.code, p.current_uses
ORDER BY p.name;
