-- =====================================================
-- SIMPLE AND SAFE RECIPES CLEANUP
-- Purpose: Simple cleanup without complex queries
-- =====================================================

-- Drop specific functions we know exist
DROP FUNCTION IF EXISTS calculate_menu_item_ingredient_cost(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_menu_item_availability(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_menu_cost() CASCADE;
DROP FUNCTION IF EXISTS calculate_menu_item_cost(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_menu_cost_from_ingredients() CASCADE;
DROP FUNCTION IF EXISTS update_menu_cost_trigger() CASCADE;

-- Drop specific triggers we know might exist
DROP TRIGGER IF EXISTS update_menu_cost_on_ingredient_change ON menu_item_ingredients;
DROP TRIGGER IF EXISTS update_menu_cost_on_recipe_change ON recipes;

-- Drop specific views we know might exist
DROP VIEW IF EXISTS v_menu_with_ingredients CASCADE;
DROP VIEW IF EXISTS v_recipe_costs CASCADE;
DROP VIEW IF EXISTS v_menu_with_recipes CASCADE;

-- Now create clean, simple functions
CREATE OR REPLACE FUNCTION calculate_menu_item_ingredient_cost(menu_id UUID)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
    total_cost DECIMAL(10,2) := 0;
BEGIN
    -- Simple calculation - no complex queries
    SELECT COALESCE(SUM(mii.quantity_needed * COALESCE(i.unit_cost, 0)), 0)
    INTO total_cost
    FROM menu_item_ingredients mii
    LEFT JOIN ingredients i ON mii.ingredient_id = i.id
    WHERE mii.menu_item_id = menu_id;

    RETURN total_cost;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 0; -- Return 0 if any error occurs
END;
$$;

CREATE OR REPLACE FUNCTION check_menu_item_availability(menu_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    is_available BOOLEAN := TRUE;
    ingredient_count INTEGER := 0;
    available_count INTEGER := 0;
BEGIN
    -- Count total required ingredients
    SELECT COUNT(*)
    INTO ingredient_count
    FROM menu_item_ingredients mii
    WHERE mii.menu_item_id = menu_id
    AND mii.is_required = true;

    -- If no required ingredients, item is available
    IF ingredient_count = 0 THEN
        RETURN TRUE;
    END IF;

    -- Count available ingredients
    SELECT COUNT(*)
    INTO available_count
    FROM menu_item_ingredients mii
    LEFT JOIN ingredients i ON mii.ingredient_id = i.id
    WHERE mii.menu_item_id = menu_id
    AND mii.is_required = true
    AND COALESCE(i.current_stock, 0) >= mii.quantity_needed;

    -- Item is available if all required ingredients are available
    RETURN available_count = ingredient_count;

EXCEPTION
    WHEN OTHERS THEN
        RETURN TRUE; -- Return true if any error occurs
END;
$$;

-- Create a simple trigger function
CREATE OR REPLACE FUNCTION update_menu_cost_simple()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_menu_item_id UUID;
    v_new_cost DECIMAL(10,2);
BEGIN
    -- Get menu item ID
    IF TG_OP = 'DELETE' THEN
        v_menu_item_id := OLD.menu_item_id;
    ELSE
        v_menu_item_id := NEW.menu_item_id;
    END IF;

    -- Calculate new cost
    BEGIN
        v_new_cost := calculate_menu_item_ingredient_cost(v_menu_item_id);

        -- Update menu item
        UPDATE menu_items
        SET cost_price = v_new_cost,
            updated_at = NOW()
        WHERE id = v_menu_item_id;

    EXCEPTION
        WHEN OTHERS THEN
            -- Log error but don't fail the transaction
            RAISE WARNING 'Could not update menu cost for item %: %', v_menu_item_id, SQLERRM;
    END;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create the trigger
CREATE TRIGGER update_menu_cost_on_ingredient_change
    AFTER INSERT OR UPDATE OR DELETE ON menu_item_ingredients
    FOR EACH ROW EXECUTE FUNCTION update_menu_cost_simple();

-- Update existing menu items (with error handling)
DO $$
DECLARE
    menu_item_rec RECORD;
    v_cost DECIMAL(10,2);
BEGIN
    FOR menu_item_rec IN
        SELECT DISTINCT mi.id, mi.name
        FROM menu_items mi
        WHERE EXISTS (
            SELECT 1 FROM menu_item_ingredients mii
            WHERE mii.menu_item_id = mi.id
        )
    LOOP
        BEGIN
            v_cost := calculate_menu_item_ingredient_cost(menu_item_rec.id);

            UPDATE menu_items
            SET cost_price = v_cost,
                updated_at = NOW()
            WHERE id = menu_item_rec.id;

            RAISE NOTICE 'Updated cost for %: %', menu_item_rec.name, v_cost;

        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to update cost for %: %', menu_item_rec.name, SQLERRM;
        END;
    END LOOP;
END;
$$;

-- Test the functions
SELECT
    'Migration Complete' as status,
    COUNT(*) as menu_items_with_ingredients
FROM menu_item_ingredients;

-- Test sample calculations
SELECT
    'Function Test' as test_type,
    mi.name as menu_item,
    mi.base_price,
    calculate_menu_item_ingredient_cost(mi.id) as ingredient_cost,
    check_menu_item_availability(mi.id) as is_available
FROM menu_items mi
WHERE EXISTS (
    SELECT 1 FROM menu_item_ingredients mii
    WHERE mii.menu_item_id = mi.id
)
LIMIT 3;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_menu_item_ingredient_cost(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_menu_item_availability(UUID) TO authenticated;

COMMENT ON FUNCTION calculate_menu_item_ingredient_cost(UUID) IS 'Calculates ingredient cost for menu items - safe version';
COMMENT ON FUNCTION check_menu_item_availability(UUID) IS 'Checks ingredient availability - safe version';
COMMENT ON FUNCTION update_menu_cost_simple() IS 'Simple trigger function for menu cost updates';