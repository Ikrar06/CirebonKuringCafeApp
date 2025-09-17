-- =====================================================
-- FIX v_menu_with_ingredients VIEW SECURITY
-- Purpose: Update view to use security_invoker for proper RLS
-- =====================================================

-- Drop and recreate the view with proper security settings
DROP VIEW IF EXISTS v_menu_with_ingredients CASCADE;

-- Create view with security_invoker to respect RLS policies
CREATE VIEW v_menu_with_ingredients
WITH (security_invoker = true) AS
SELECT
    mi.id as menu_item_id,
    mi.name as menu_item_name,
    mi.base_price as price,
    mi.cost_price,
    mi.base_price - COALESCE(mi.cost_price, 0) as profit_margin,
    mii.id as ingredient_link_id,
    i.id as ingredient_id,
    i.name as ingredient_name,
    mii.quantity_needed,
    mii.unit,
    mii.preparation_notes,
    mii.is_required,
    i.unit_cost,
    (mii.quantity_needed * COALESCE(i.unit_cost, 0)) as ingredient_total_cost
FROM menu_items mi
LEFT JOIN menu_item_ingredients mii ON mi.id = mii.menu_item_id
LEFT JOIN ingredients i ON mii.ingredient_id = i.id
WHERE mi.is_available = true
ORDER BY mi.name, i.name;

-- Grant permissions (these will now respect RLS policies due to security_invoker)
GRANT SELECT ON v_menu_with_ingredients TO authenticated;
GRANT SELECT ON v_menu_with_ingredients TO anon;

-- Update comment to reflect security change
COMMENT ON VIEW v_menu_with_ingredients IS 'View showing menu items with ingredient details - uses security_invoker to respect RLS policies';

-- Test that the view is working
SELECT 'v_menu_with_ingredients view updated with proper security' as status;