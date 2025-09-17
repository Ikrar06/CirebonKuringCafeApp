-- =====================================================
-- NUCLEAR CLEANUP - REMOVE ALL TRACES OF RECIPES
-- Purpose: Aggressively remove ALL references to recipes table
-- =====================================================

-- Drop ALL functions that might reference recipes
DO $$
DECLARE
    func_name text;
BEGIN
    -- Drop all functions containing "recipe" in name or definition
    FOR func_name IN
        SELECT p.proname
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND (
            p.proname ILIKE '%recipe%' OR
            p.proname ILIKE '%cost%' OR
            p.proname ILIKE '%ingredient%' OR
            pg_get_functiondef(p.oid) ILIKE '%recipes%'
        )
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_name || ' CASCADE';
        RAISE NOTICE 'Dropped function: %', func_name;
    END LOOP;
END;
$$;

-- Drop all triggers that might reference recipes
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN
        SELECT schemaname, tablename, triggername
        FROM pg_triggers
        WHERE schemaname = 'public'
        AND (
            triggername ILIKE '%recipe%' OR
            triggername ILIKE '%cost%' OR
            triggername ILIKE '%ingredient%'
        )
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_rec.triggername || ' ON ' || trigger_rec.tablename || ' CASCADE';
        RAISE NOTICE 'Dropped trigger: % on %', trigger_rec.triggername, trigger_rec.tablename;
    END LOOP;
END;
$$;

-- Drop all views that might reference recipes
DO $$
DECLARE
    view_name text;
BEGIN
    FOR view_name IN
        SELECT viewname
        FROM pg_views
        WHERE schemaname = 'public'
        AND (
            viewname ILIKE '%recipe%' OR
            viewname ILIKE '%ingredient%' OR
            viewname ILIKE '%menu%'
        )
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || view_name || ' CASCADE';
        RAISE NOTICE 'Dropped view: %', view_name;
    END LOOP;
END;
$$;

-- Now create clean functions from scratch
CREATE FUNCTION calculate_menu_item_ingredient_cost(menu_id UUID)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
    total_cost DECIMAL(10,2) := 0;
BEGIN
    -- Simple calculation using menu_item_ingredients
    SELECT COALESCE(SUM(mii.quantity_needed * i.unit_cost), 0)
    INTO total_cost
    FROM menu_item_ingredients mii
    JOIN ingredients i ON mii.ingredient_id = i.id
    WHERE mii.menu_item_id = menu_id;

    RETURN total_cost;
END;
$$;

CREATE FUNCTION check_menu_item_availability(menu_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    is_available BOOLEAN := TRUE;
    ingredient_rec RECORD;
BEGIN
    -- Check if all required ingredients are available
    FOR ingredient_rec IN
        SELECT mii.quantity_needed, i.current_stock, i.min_stock_level
        FROM menu_item_ingredients mii
        JOIN ingredients i ON mii.ingredient_id = i.id
        WHERE mii.menu_item_id = menu_id
        AND mii.is_required = true
    LOOP
        IF ingredient_rec.current_stock < ingredient_rec.quantity_needed THEN
            is_available := FALSE;
            EXIT;
        END IF;
    END LOOP;

    RETURN is_available;
END;
$$;

-- Simple trigger function that only updates menu cost
CREATE FUNCTION update_menu_cost_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_menu_item_id UUID;
    v_new_cost DECIMAL(10,2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_menu_item_id := OLD.menu_item_id;
    ELSE
        v_menu_item_id := NEW.menu_item_id;
    END IF;

    -- Calculate and update cost
    v_new_cost := calculate_menu_item_ingredient_cost(v_menu_item_id);

    UPDATE menu_items
    SET cost_price = v_new_cost,
        updated_at = NOW()
    WHERE id = v_menu_item_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger
CREATE TRIGGER update_menu_cost_on_ingredient_change
    AFTER INSERT OR UPDATE OR DELETE ON menu_item_ingredients
    FOR EACH ROW EXECUTE FUNCTION update_menu_cost_trigger();

-- Update all menu item costs
UPDATE menu_items
SET cost_price = calculate_menu_item_ingredient_cost(id),
    updated_at = NOW()
WHERE EXISTS (
    SELECT 1 FROM menu_item_ingredients mii
    WHERE mii.menu_item_id = menu_items.id
);

-- Test the functions work
SELECT
    'Final Test' as test_name,
    COUNT(*) as menu_items_updated
FROM menu_items
WHERE cost_price IS NOT NULL;

-- Show sample calculation
SELECT
    'Sample Calculation' as test_name,
    mi.name,
    mi.base_price,
    calculate_menu_item_ingredient_cost(mi.id) as ingredient_cost,
    check_menu_item_availability(mi.id) as is_available
FROM menu_items mi
WHERE EXISTS (
    SELECT 1 FROM menu_item_ingredients mii
    WHERE mii.menu_item_id = mi.id
)
LIMIT 3;

COMMENT ON FUNCTION calculate_menu_item_ingredient_cost(UUID) IS 'Clean function to calculate ingredient costs';
COMMENT ON FUNCTION check_menu_item_availability(UUID) IS 'Clean function to check ingredient availability';
COMMENT ON FUNCTION update_menu_cost_trigger() IS 'Clean trigger function for cost updates';