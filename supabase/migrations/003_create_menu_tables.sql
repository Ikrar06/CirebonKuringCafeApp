-- =====================================================
-- BATCH 1 - FILE 3: Menu Management Tables
-- Purpose: Create menu categories, items, customizations, and ingredients
-- Dependencies: 001_initial_schema.sql, 002_create_users_table.sql
-- =====================================================

-- Menu categories table
CREATE TABLE menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Availability settings
    available_from TIME,
    available_until TIME,
    available_days INTEGER[], -- 1=Monday, 7=Sunday
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Indexes for menu_categories
CREATE INDEX idx_menu_categories_slug ON menu_categories(slug);
CREATE INDEX idx_menu_categories_active ON menu_categories(is_active);
CREATE INDEX idx_menu_categories_order ON menu_categories(display_order);

-- Trigger for updated_at
CREATE TRIGGER update_menu_categories_updated_at BEFORE UPDATE ON menu_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ingredients master table (for stock tracking)
CREATE TABLE ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE,
    category VARCHAR(50),
    
    -- Unit information
    unit VARCHAR(20) NOT NULL, -- gram, ml, piece, etc
    unit_conversion DECIMAL(10, 4) DEFAULT 1, -- Conversion to base unit
    
    -- Stock levels
    current_stock DECIMAL(10, 3) DEFAULT 0,
    min_stock_level DECIMAL(10, 3) DEFAULT 0,
    max_stock_level DECIMAL(10, 3),
    reorder_point DECIMAL(10, 3),
    reorder_quantity DECIMAL(10, 3),
    
    -- Cost information
    unit_cost DECIMAL(10, 2) DEFAULT 0,
    last_purchase_price DECIMAL(10, 2),
    average_cost DECIMAL(10, 2),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_stock CHECK (current_stock >= 0),
    CONSTRAINT valid_unit_cost CHECK (unit_cost >= 0)
);

-- Indexes for ingredients
CREATE INDEX idx_ingredients_code ON ingredients(code);
CREATE INDEX idx_ingredients_category ON ingredients(category);
CREATE INDEX idx_ingredients_active ON ingredients(is_active);
CREATE INDEX idx_ingredients_stock ON ingredients(current_stock);

-- Trigger for updated_at
CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON ingredients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Menu items table
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
    
    -- Basic information
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    
    -- Pricing
    base_price DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2), -- Calculated from ingredients
    tax_rate DECIMAL(5, 2) DEFAULT 11, -- PPN 11%
    
    -- Images
    image_url TEXT,
    thumbnail_url TEXT,
    
    -- Stock & preparation
    requires_stock BOOLEAN DEFAULT true,
    estimated_prep_time INTEGER DEFAULT 15, -- in minutes
    
    -- Availability
    is_available BOOLEAN DEFAULT true,
    available_from TIME,
    available_until TIME,
    daily_limit INTEGER,
    current_daily_count INTEGER DEFAULT 0,
    
    -- Nutritional info (optional)
    calories INTEGER,
    is_vegetarian BOOLEAN DEFAULT false,
    is_vegan BOOLEAN DEFAULT false,
    is_gluten_free BOOLEAN DEFAULT false,
    is_spicy BOOLEAN DEFAULT false,
    spicy_level INTEGER CHECK (spicy_level BETWEEN 0 AND 5),
    allergens TEXT[], -- ['nuts', 'dairy', 'seafood', etc]
    
    -- Analytics
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0,
    average_rating DECIMAL(3, 2),
    rating_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT valid_price CHECK (base_price > 0),
    CONSTRAINT valid_rating CHECK (average_rating IS NULL OR (average_rating >= 0 AND average_rating <= 5))
);

-- Indexes for menu_items
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_slug ON menu_items(slug);
CREATE INDEX idx_menu_items_available ON menu_items(is_available);
CREATE INDEX idx_menu_items_price ON menu_items(base_price);

-- Trigger for updated_at
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Recipe table (links menu items to ingredients)
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity DECIMAL(10, 3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_quantity CHECK (quantity > 0),
    CONSTRAINT unique_recipe_item UNIQUE(menu_item_id, ingredient_id)
);

-- Indexes for recipes
CREATE INDEX idx_recipes_menu_item ON recipes(menu_item_id);
CREATE INDEX idx_recipes_ingredient ON recipes(ingredient_id);

-- Menu customization groups (e.g., "Sugar Level", "Ice Level", "Size")
CREATE TABLE menu_customization_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    
    group_name VARCHAR(50) NOT NULL, -- "Sugar Level", "Ice Level", "Size", "Add-ons"
    group_type VARCHAR(20) NOT NULL CHECK (group_type IN ('single', 'multiple')),
    is_required BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for customization groups
CREATE INDEX idx_customization_groups_menu ON menu_customization_groups(menu_item_id);
CREATE INDEX idx_customization_groups_order ON menu_customization_groups(display_order);

-- Menu customization options
CREATE TABLE menu_customization_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES menu_customization_groups(id) ON DELETE CASCADE,
    
    option_name VARCHAR(50) NOT NULL, -- "0%", "25%", "50%", "Regular", "Large", etc
    price_adjustment DECIMAL(8, 2) DEFAULT 0, -- Additional price
    is_default BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    
    -- For add-ons that use ingredients
    ingredient_id UUID REFERENCES ingredients(id),
    ingredient_quantity DECIMAL(10, 3),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for customization options
CREATE INDEX idx_customization_options_group ON menu_customization_options(group_id);
CREATE INDEX idx_customization_options_order ON menu_customization_options(display_order);
CREATE INDEX idx_customization_options_available ON menu_customization_options(is_available);

-- Function to calculate menu item cost from ingredients
CREATE OR REPLACE FUNCTION calculate_menu_cost(menu_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_cost DECIMAL(10, 2) := 0;
BEGIN
    SELECT COALESCE(SUM(r.quantity * i.unit_cost), 0)
    INTO total_cost
    FROM recipes r
    JOIN ingredients i ON r.ingredient_id = i.id
    WHERE r.menu_item_id = menu_id;
    
    RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- Function to update menu cost when recipe changes
CREATE OR REPLACE FUNCTION update_menu_cost()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE menu_items
    SET cost_price = calculate_menu_cost(NEW.menu_item_id)
    WHERE id = NEW.menu_item_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update cost when recipe changes
CREATE TRIGGER update_menu_cost_on_recipe_change
AFTER INSERT OR UPDATE OR DELETE ON recipes
FOR EACH ROW EXECUTE FUNCTION update_menu_cost();

-- Insert sample categories
INSERT INTO menu_categories (name, slug, description, display_order) VALUES
    ('Coffee', 'coffee', 'Berbagai jenis kopi', 1),
    ('Non-Coffee', 'non-coffee', 'Minuman non-kopi', 2),
    ('Food', 'food', 'Makanan', 3),
    ('Snacks', 'snacks', 'Camilan', 4),
    ('Desserts', 'desserts', 'Pencuci mulut', 5);

-- Insert sample ingredients
INSERT INTO ingredients (name, code, category, unit, unit_cost) VALUES
    ('Kopi Arabica', 'ING001', 'Coffee', 'gram', 500),
    ('Kopi Robusta', 'ING002', 'Coffee', 'gram', 400),
    ('Susu Full Cream', 'ING003', 'Dairy', 'ml', 50),
    ('Gula Pasir', 'ING004', 'Sweetener', 'gram', 20),
    ('Es Batu', 'ING005', 'Others', 'gram', 5);

-- Comments for documentation
COMMENT ON TABLE menu_categories IS 'Menu categories for organizing items';
COMMENT ON TABLE menu_items IS 'Individual menu items with pricing and availability';
COMMENT ON TABLE ingredients IS 'Raw materials inventory for menu items';
COMMENT ON TABLE recipes IS 'Links menu items to their ingredients';
COMMENT ON TABLE menu_customization_groups IS 'Customization groups like sugar level, ice level';
COMMENT ON TABLE menu_customization_options IS 'Options within each customization group';