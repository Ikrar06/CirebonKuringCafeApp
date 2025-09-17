-- =====================================================
-- MENU INGREDIENTS RELATIONSHIP
-- Purpose: Create relationship between menu items and ingredients
-- Dependencies: menu_items and ingredients tables must exist
-- =====================================================

-- Create junction table for menu items and ingredients
CREATE TABLE menu_item_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,

    -- Quantity needed per serving
    quantity_needed DECIMAL(10, 3) NOT NULL,
    unit VARCHAR(20) NOT NULL, -- Should match ingredient unit

    -- Notes for preparation
    preparation_notes TEXT,

    -- Is this ingredient optional or required
    is_required BOOLEAN DEFAULT true,

    -- For recipes with alternatives (e.g., sugar OR honey)
    alternative_group VARCHAR(50), -- Ingredients with same group are alternatives

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_menu_ingredient UNIQUE(menu_item_id, ingredient_id),
    CONSTRAINT positive_quantity CHECK (quantity_needed > 0)
);

-- Indexes
CREATE INDEX idx_menu_item_ingredients_menu ON menu_item_ingredients(menu_item_id);
CREATE INDEX idx_menu_item_ingredients_ingredient ON menu_item_ingredients(ingredient_id);
CREATE INDEX idx_menu_item_ingredients_required ON menu_item_ingredients(is_required);

-- Trigger for updated_at
CREATE TRIGGER update_menu_item_ingredients_updated_at
    BEFORE UPDATE ON menu_item_ingredients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get total ingredient cost for a menu item
CREATE OR REPLACE FUNCTION calculate_menu_item_ingredient_cost(p_menu_item_id UUID)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    total_cost DECIMAL(10, 2) := 0;
    ingredient_record RECORD;
BEGIN
    FOR ingredient_record IN
        SELECT
            mii.quantity_needed,
            i.unit_cost,
            i.unit_conversion
        FROM menu_item_ingredients mii
        JOIN ingredients i ON mii.ingredient_id = i.id
        WHERE mii.menu_item_id = p_menu_item_id
        AND mii.is_required = true
        AND i.is_active = true
    LOOP
        -- Calculate cost: quantity * unit_cost * conversion_factor
        total_cost := total_cost + (
            ingredient_record.quantity_needed *
            ingredient_record.unit_cost *
            ingredient_record.unit_conversion
        );
    END LOOP;

    RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- Function to check if menu item can be made (has ingredients in stock)
CREATE OR REPLACE FUNCTION check_menu_item_availability(p_menu_item_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    ingredient_record RECORD;
    required_quantity DECIMAL(10, 3);
    available_quantity DECIMAL(10, 3);
BEGIN
    FOR ingredient_record IN
        SELECT
            mii.quantity_needed,
            i.current_stock,
            i.min_stock_level,
            i.name as ingredient_name
        FROM menu_item_ingredients mii
        JOIN ingredients i ON mii.ingredient_id = i.id
        WHERE mii.menu_item_id = p_menu_item_id
        AND mii.is_required = true
        AND i.is_active = true
    LOOP
        required_quantity := ingredient_record.quantity_needed;
        available_quantity := ingredient_record.current_stock;

        -- Check if we have enough stock
        IF available_quantity < required_quantity THEN
            RETURN false;
        END IF;

        -- Check if using this would go below minimum stock
        IF (available_quantity - required_quantity) < ingredient_record.min_stock_level THEN
            RETURN false;
        END IF;
    END LOOP;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE menu_item_ingredients ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Menu item ingredients are public"
    ON menu_item_ingredients FOR SELECT
    USING (true);

CREATE POLICY "Only staff can manage menu item ingredients"
    ON menu_item_ingredients FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' IN ('owner', 'employee'));

CREATE POLICY "Only staff can update menu item ingredients"
    ON menu_item_ingredients FOR UPDATE
    USING (auth.jwt() ->> 'role' IN ('owner', 'employee'))
    WITH CHECK (auth.jwt() ->> 'role' IN ('owner', 'employee'));

CREATE POLICY "Only staff can delete menu item ingredients"
    ON menu_item_ingredients FOR DELETE
    USING (auth.jwt() ->> 'role' IN ('owner', 'employee'));

-- Comments
COMMENT ON TABLE menu_item_ingredients IS 'Junction table linking menu items to their required ingredients';
COMMENT ON FUNCTION calculate_menu_item_ingredient_cost(UUID) IS 'Calculate total ingredient cost for a menu item';
COMMENT ON FUNCTION check_menu_item_availability(UUID) IS 'Check if menu item can be made based on ingredient availability';