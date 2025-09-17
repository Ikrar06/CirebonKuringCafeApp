-- =====================================================
-- CORRECTED FINAL CLEANUP RECIPES TABLE DEPENDENCIES
-- Purpose: Final safe cleanup with correct column names
-- =====================================================

-- Drop all existing functions completely to start fresh
DROP FUNCTION IF EXISTS calculate_menu_item_ingredient_cost(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_menu_item_availability(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_menu_cost() CASCADE;
DROP FUNCTION IF EXISTS calculate_menu_item_cost(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_menu_cost_from_ingredients() CASCADE;

-- Drop any existing triggers
DROP TRIGGER IF EXISTS update_menu_cost_on_ingredient_change ON menu_item_ingredients;

-- Create fresh functions with correct signatures
CREATE FUNCTION calculate_menu_item_ingredient_cost(menu_id UUID)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
    total_cost DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(mii.quantity_needed * i.unit_cost), 0)
    INTO total_cost
    FROM menu_item_ingredients mii
    JOIN ingredients i ON mii.ingredient_id = i.id
    WHERE mii.menu_item_id = menu_id;

    RETURN total_cost;
END;
$$;

-- Create availability check function
CREATE FUNCTION check_menu_item_availability(menu_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    is_available BOOLEAN := TRUE;
    ingredient_record RECORD;
BEGIN
    -- Check if all required ingredients are available
    FOR ingredient_record IN
        SELECT mii.quantity_needed, i.current_stock, i.min_stock_level
        FROM menu_item_ingredients mii
        JOIN ingredients i ON mii.ingredient_id = i.id
        WHERE mii.menu_item_id = menu_id
        AND mii.is_required = true
    LOOP
        -- If any required ingredient is below minimum stock, item is unavailable
        IF ingredient_record.current_stock < ingredient_record.quantity_needed
           OR ingredient_record.current_stock <= ingredient_record.min_stock_level THEN
            is_available := FALSE;
            EXIT;
        END IF;
    END LOOP;

    RETURN is_available;
END;
$$;

-- Create trigger function for menu_item_ingredients
CREATE FUNCTION update_menu_cost_from_ingredients()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_menu_item_id UUID;
    v_new_cost DECIMAL(10,2);
BEGIN
    -- Get the menu_item_id from the trigger
    IF TG_OP = 'DELETE' THEN
        v_menu_item_id := OLD.menu_item_id;
    ELSE
        v_menu_item_id := NEW.menu_item_id;
    END IF;

    -- Calculate new cost
    v_new_cost := calculate_menu_item_ingredient_cost(v_menu_item_id);

    -- Update menu item cost
    UPDATE menu_items
    SET cost_price = v_new_cost,
        updated_at = NOW()
    WHERE id = v_menu_item_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on menu_item_ingredients table
CREATE TRIGGER update_menu_cost_on_ingredient_change
    AFTER INSERT OR UPDATE OR DELETE ON menu_item_ingredients
    FOR EACH ROW EXECUTE FUNCTION update_menu_cost_from_ingredients();

-- Drop any problematic views safely
DROP VIEW IF EXISTS v_recipe_costs CASCADE;
DROP VIEW IF EXISTS v_menu_with_recipes CASCADE;
DROP VIEW IF EXISTS v_menu_with_ingredients CASCADE;

-- Create new view using correct column names (base_price not price)
CREATE VIEW v_menu_with_ingredients AS
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

-- Grant permissions
GRANT SELECT ON v_menu_with_ingredients TO authenticated;
GRANT SELECT ON v_menu_with_ingredients TO anon;

-- Update menu costs for existing items
UPDATE menu_items
SET cost_price = calculate_menu_item_ingredient_cost(id),
    updated_at = NOW()
WHERE id IN (
    SELECT DISTINCT menu_item_id
    FROM menu_item_ingredients
);

-- Test the migration works
SELECT
    'Migration Complete' as status,
    COUNT(*) as total_ingredient_links,
    COUNT(DISTINCT menu_item_id) as unique_menu_items
FROM menu_item_ingredients;

-- Test functions with correct column names
SELECT
    'Functions Working' as test_type,
    mi.name as menu_item,
    mi.base_price as menu_price,
    calculate_menu_item_ingredient_cost(mi.id) as ingredient_cost,
    check_menu_item_availability(mi.id) as is_available
FROM menu_items mi
WHERE EXISTS (
    SELECT 1 FROM menu_item_ingredients mii
    WHERE mii.menu_item_id = mi.id
)
LIMIT 3;

COMMENT ON FUNCTION calculate_menu_item_ingredient_cost(UUID) IS 'Calculates ingredient cost for menu item using menu_item_ingredients table';
COMMENT ON FUNCTION check_menu_item_availability(UUID) IS 'Checks ingredient availability for menu item';
COMMENT ON FUNCTION update_menu_cost_from_ingredients() IS 'Updates menu cost when ingredients change';
COMMENT ON VIEW v_menu_with_ingredients IS 'View showing menu items with ingredient details using correct column names';