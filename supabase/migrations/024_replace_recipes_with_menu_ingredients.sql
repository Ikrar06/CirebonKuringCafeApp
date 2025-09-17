-- =====================================================
-- REPLACE RECIPES TABLE WITH MENU_ITEM_INGREDIENTS
-- Purpose: Drop old recipes table and use comprehensive menu_item_ingredients system
-- Dependencies: menu_item_ingredients table must exist from migration 021
-- =====================================================

-- Drop existing recipes table if it exists
DROP TABLE IF EXISTS recipes CASCADE;

-- Verify our menu_item_ingredients system is working
-- Show sample data to confirm the system is operational
SELECT
    'Menu-Ingredient System Test' as test_name,
    mi.name as menu_item,
    i.name as ingredient,
    mii.quantity_needed,
    mii.unit,
    mii.preparation_notes
FROM menu_item_ingredients mii
JOIN menu_items mi ON mii.menu_item_id = mi.id
JOIN ingredients i ON mii.ingredient_id = i.id
WHERE mi.name IN ('Cappuccino', 'Nasi Goreng Ayam', 'Es Teh Manis')
ORDER BY mi.name, mii.created_at
LIMIT 10;

-- Test cost calculation function
SELECT
    'Cost Calculation Test' as test_name,
    mi.name as menu_item,
    calculate_menu_item_ingredient_cost(mi.id) as calculated_ingredient_cost,
    mi.cost_price as menu_cost_price,
    check_menu_item_availability(mi.id) as is_available
FROM menu_items mi
WHERE mi.name IN ('Cappuccino', 'Latte', 'Mocha')
ORDER BY mi.name;

-- Show ingredient stock levels
SELECT
    'Ingredient Stock Test' as test_name,
    i.name as ingredient,
    i.current_stock,
    i.min_stock_level,
    i.unit,
    CASE
        WHEN i.current_stock > i.min_stock_level THEN 'Available'
        ELSE 'Low Stock'
    END as stock_status
FROM ingredients i
WHERE i.name IN ('Kopi Arabica', 'Susu Full Cream', 'Gula Pasir', 'Es Batu')
ORDER BY i.name;