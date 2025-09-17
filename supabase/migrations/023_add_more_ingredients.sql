-- =====================================================
-- ADD MORE INGREDIENTS
-- Purpose: Add more ingredients for complete menu recipes
-- Dependencies: ingredients table must exist
-- =====================================================

-- Add more ingredients for complete recipes
INSERT INTO ingredients (id, name, code, category, unit, unit_conversion, current_stock, min_stock_level, max_stock_level, unit_cost, is_active) VALUES
-- Vegetables & Fresh Produce
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Beras', 'ING006', 'Grains', 'gram', 1.0, 25000.0, 5000.0, 50000.0, 12.00, true),
('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Telur Ayam', 'ING007', 'Dairy', 'butir', 1.0, 200.0, 50.0, 500.0, 2500.00, true),
('6ba7b811-9dad-11d1-80b4-00c04fd430c8', 'Daging Ayam', 'ING008', 'Meat', 'gram', 1.0, 15000.0, 3000.0, 30000.0, 35.00, true),
('6ba7b812-9dad-11d1-80b4-00c04fd430c8', 'Mie', 'ING009', 'Grains', 'gram', 1.0, 8000.0, 2000.0, 20000.0, 15.00, true),
('6ba7b813-9dad-11d1-80b4-00c04fd430c8', 'Bawang Putih', 'ING010', 'Vegetables', 'gram', 1.0, 2000.0, 500.0, 5000.0, 25.00, true),
('6ba7b814-9dad-11d1-80b4-00c04fd430c8', 'Bawang Merah', 'ING011', 'Vegetables', 'gram', 1.0, 2000.0, 500.0, 5000.0, 20.00, true),
('6ba7b815-9dad-11d1-80b4-00c04fd430c8', 'Cabai', 'ING012', 'Spices', 'gram', 1.0, 1000.0, 200.0, 3000.0, 40.00, true),
('6ba7b816-9dad-11d1-80b4-00c04fd430c8', 'Sayuran Campur', 'ING013', 'Vegetables', 'gram', 1.0, 5000.0, 1000.0, 10000.0, 8.00, true),
('6ba7b817-9dad-11d1-80b4-00c04fd430c8', 'Kacang Tanah', 'ING014', 'Nuts', 'gram', 1.0, 3000.0, 500.0, 8000.0, 18.00, true),
('6ba7b818-9dad-11d1-80b4-00c04fd430c8', 'Tahu', 'ING015', 'Protein', 'potong', 1.0, 100.0, 20.0, 300.0, 2000.00, true),

-- Fruits
('6ba7b819-9dad-11d1-80b4-00c04fd430c8', 'Jeruk', 'ING016', 'Fruits', 'butir', 1.0, 150.0, 30.0, 400.0, 3000.00, true),
('6ba7b81a-9dad-11d1-80b4-00c04fd430c8', 'Lemon', 'ING017', 'Fruits', 'butir', 1.0, 80.0, 20.0, 200.0, 4000.00, true),
('6ba7b81b-9dad-11d1-80b4-00c04fd430c8', 'Pisang', 'ING018', 'Fruits', 'butir', 1.0, 120.0, 30.0, 300.0, 2500.00, true),
('6ba7b81c-9dad-11d1-80b4-00c04fd430c8', 'Apel', 'ING019', 'Fruits', 'butir', 1.0, 100.0, 25.0, 250.0, 5000.00, true),
('6ba7b81d-9dad-11d1-80b4-00c04fd430c8', 'Mangga', 'ING020', 'Fruits', 'butir', 1.0, 80.0, 20.0, 200.0, 6000.00, true),

-- Baking & Dessert Ingredients
('6ba7b81e-9dad-11d1-80b4-00c04fd430c8', 'Tepung Terigu', 'ING021', 'Flour', 'gram', 1.0, 10000.0, 2000.0, 25000.0, 8.00, true),
('6ba7b81f-9dad-11d1-80b4-00c04fd430c8', 'Cokelat Bubuk', 'ING022', 'Chocolate', 'gram', 1.0, 1000.0, 200.0, 3000.0, 45.00, true),
('6ba7b820-9dad-11d1-80b4-00c04fd430c8', 'Vanilla Extract', 'ING023', 'Flavoring', 'ml', 1.0, 500.0, 100.0, 1000.0, 85.00, true),
('6ba7b821-9dad-11d1-80b4-00c04fd430c8', 'Yogurt', 'ING024', 'Dairy', 'ml', 1.0, 2000.0, 500.0, 5000.0, 25.00, true),
('6ba7b822-9dad-11d1-80b4-00c04fd430c8', 'Gelatin', 'ING025', 'Others', 'gram', 1.0, 200.0, 50.0, 500.0, 120.00, true),

-- Beverages
('6ba7b823-9dad-11d1-80b4-00c04fd430c8', 'Teh Celup', 'ING026', 'Tea', 'sachet', 1.0, 500.0, 100.0, 1000.0, 1500.00, true),
('6ba7b824-9dad-11d1-80b4-00c04fd430c8', 'Sirup Cokelat', 'ING027', 'Syrup', 'ml', 1.0, 1000.0, 200.0, 3000.0, 35.00, true),

-- Oils & Seasonings
('6ba7b825-9dad-11d1-80b4-00c04fd430c8', 'Minyak Goreng', 'ING028', 'Oil', 'ml', 1.0, 5000.0, 1000.0, 15000.0, 18.00, true),
('6ba7b826-9dad-11d1-80b4-00c04fd430c8', 'Garam', 'ING029', 'Seasoning', 'gram', 1.0, 2000.0, 500.0, 5000.0, 8.00, true),
('6ba7b827-9dad-11d1-80b4-00c04fd430c8', 'Kecap Manis', 'ING030', 'Sauce', 'ml', 1.0, 1500.0, 300.0, 4000.0, 22.00, true),
('6ba7b828-9dad-11d1-80b4-00c04fd430c8', 'Kentang', 'ING031', 'Vegetables', 'gram', 1.0, 8000.0, 2000.0, 20000.0, 12.00, true);

-- Add complete ingredient lists for popular menu items

-- Complete Cappuccino ingredients (update existing ones)
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
-- Espresso already exists
('a1b2c3d4-e5f6-4a5b-9c8d-123456789002', '0fbe9cfb-d52b-46e2-b934-02d90f16b8aa', 5, 'gram', 'Optional sweetener', false) -- Gula Pasir (optional)
ON CONFLICT (menu_item_id, ingredient_id) DO NOTHING;

-- Complete Mocha ingredients
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789005', '6ba7b81f-9dad-11d1-80b4-00c04fd430c8', 10, 'gram', 'Mix with milk', true), -- Cokelat Bubuk
('a1b2c3d4-e5f6-4a5b-9c8d-123456789005', '6ba7b827-9dad-11d1-80b4-00c04fd430c8', 15, 'ml', 'Chocolate syrup', true) -- Sirup Cokelat
ON CONFLICT (menu_item_id, ingredient_id) DO NOTHING;

-- Es Teh Manis complete
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789006', '6ba7b823-9dad-11d1-80b4-00c04fd430c8', 2, 'sachet', 'Steep in hot water', true) -- Teh Celup
ON CONFLICT (menu_item_id, ingredient_id) DO NOTHING;

-- Jus Jeruk complete
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789007', '6ba7b819-9dad-11d1-80b4-00c04fd430c8', 3, 'butir', 'Fresh squeezed', true), -- Jeruk
('a1b2c3d4-e5f6-4a5b-9c8d-123456789007', '0fbe9cfb-d52b-46e2-b934-02d90f16b8aa', 10, 'gram', 'Optional sweetener', false), -- Gula Pasir
('a1b2c3d4-e5f6-4a5b-9c8d-123456789007', '8491bf7a-20d4-4b1c-8c6f-666037e29b59', 150, 'gram', 'Serve chilled', true) -- Es Batu
ON CONFLICT (menu_item_id, ingredient_id) DO NOTHING;

-- Lemon Tea complete
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789008', '6ba7b823-9dad-11d1-80b4-00c04fd430c8', 1, 'sachet', 'Base tea', true), -- Teh Celup
('a1b2c3d4-e5f6-4a5b-9c8d-123456789008', '6ba7b81a-9dad-11d1-80b4-00c04fd430c8', 0.5, 'butir', 'Fresh lemon juice', true) -- Lemon
ON CONFLICT (menu_item_id, ingredient_id) DO NOTHING;

-- Nasi Goreng Ayam complete
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789010', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 200, 'gram', 'Cook rice first', true), -- Beras
('a1b2c3d4-e5f6-4a5b-9c8d-123456789010', '6ba7b811-9dad-11d1-80b4-00c04fd430c8', 150, 'gram', 'Diced chicken', true), -- Daging Ayam
('a1b2c3d4-e5f6-4a5b-9c8d-123456789010', '6ba7b810-9dad-11d1-80b4-00c04fd430c8', 1, 'butir', 'Scrambled', true), -- Telur Ayam
('a1b2c3d4-e5f6-4a5b-9c8d-123456789010', '6ba7b813-9dad-11d1-80b4-00c04fd430c8', 10, 'gram', 'Minced', true), -- Bawang Putih
('a1b2c3d4-e5f6-4a5b-9c8d-123456789010', '6ba7b814-9dad-11d1-80b4-00c04fd430c8', 15, 'gram', 'Sliced thin', true), -- Bawang Merah
('a1b2c3d4-e5f6-4a5b-9c8d-123456789010', '6ba7b815-9dad-11d1-80b4-00c04fd430c8', 5, 'gram', 'Sliced', true), -- Cabai
('a1b2c3d4-e5f6-4a5b-9c8d-123456789010', '6ba7b825-9dad-11d1-80b4-00c04fd430c8', 30, 'ml', 'For frying', true), -- Minyak Goreng
('a1b2c3d4-e5f6-4a5b-9c8d-123456789010', '6ba7b826-9dad-11d1-80b4-00c04fd430c8', 3, 'gram', 'Seasoning', true), -- Garam
('a1b2c3d4-e5f6-4a5b-9c8d-123456789010', '6ba7b827-9dad-11d1-80b4-00c04fd430c8', 20, 'ml', 'Sweet soy sauce', true) -- Kecap Manis
ON CONFLICT (menu_item_id, ingredient_id) DO NOTHING;

-- Mie Goreng complete
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789011', '6ba7b812-9dad-11d1-80b4-00c04fd430c8', 150, 'gram', 'Boil first', true), -- Mie
('a1b2c3d4-e5f6-4a5b-9c8d-123456789011', '6ba7b810-9dad-11d1-80b4-00c04fd430c8', 1, 'butir', 'Scrambled', true), -- Telur Ayam
('a1b2c3d4-e5f6-4a5b-9c8d-123456789011', '6ba7b816-9dad-11d1-80b4-00c04fd430c8', 100, 'gram', 'Mixed vegetables', true), -- Sayuran Campur
('a1b2c3d4-e5f6-4a5b-9c8d-123456789011', '6ba7b813-9dad-11d1-80b4-00c04fd430c8', 8, 'gram', 'Minced', true), -- Bawang Putih
('a1b2c3d4-e5f6-4a5b-9c8d-123456789011', '6ba7b825-9dad-11d1-80b4-00c04fd430c8', 25, 'ml', 'For frying', true), -- Minyak Goreng
('a1b2c3d4-e5f6-4a5b-9c8d-123456789011', '6ba7b827-9dad-11d1-80b4-00c04fd430c8', 15, 'ml', 'Sweet soy sauce', true) -- Kecap Manis
ON CONFLICT (menu_item_id, ingredient_id) DO NOTHING;

-- Gado-gado complete
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789012', '6ba7b816-9dad-11d1-80b4-00c04fd430c8', 200, 'gram', 'Blanched vegetables', true), -- Sayuran Campur
('a1b2c3d4-e5f6-4a5b-9c8d-123456789012', '6ba7b817-9dad-11d1-80b4-00c04fd430c8', 50, 'gram', 'For peanut sauce', true), -- Kacang Tanah
('a1b2c3d4-e5f6-4a5b-9c8d-123456789012', '6ba7b818-9dad-11d1-80b4-00c04fd430c8', 3, 'potong', 'Fried tofu', true), -- Tahu
('a1b2c3d4-e5f6-4a5b-9c8d-123456789012', '6ba7b810-9dad-11d1-80b4-00c04fd430c8', 1, 'butir', 'Hard boiled', true), -- Telur Ayam
('a1b2c3d4-e5f6-4a5b-9c8d-123456789012', '6ba7b815-9dad-11d1-80b4-00c04fd430c8', 3, 'gram', 'For spice', true) -- Cabai
ON CONFLICT (menu_item_id, ingredient_id) DO NOTHING;

-- Pisang Goreng complete
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789015', '6ba7b81b-9dad-11d1-80b4-00c04fd430c8', 3, 'butir', 'Ripe bananas', true), -- Pisang
('a1b2c3d4-e5f6-4a5b-9c8d-123456789015', '6ba7b81e-9dad-11d1-80b4-00c04fd430c8', 100, 'gram', 'For batter', true), -- Tepung Terigu
('a1b2c3d4-e5f6-4a5b-9c8d-123456789015', '6ba7b825-9dad-11d1-80b4-00c04fd430c8', 200, 'ml', 'For deep frying', true), -- Minyak Goreng
('a1b2c3d4-e5f6-4a5b-9c8d-123456789015', '0fbe9cfb-d52b-46e2-b934-02d90f16b8aa', 15, 'gram', 'Sweet batter', true) -- Gula Pasir
ON CONFLICT (menu_item_id, ingredient_id) DO NOTHING;

-- French Fries complete
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789018', '6ba7b828-9dad-11d1-80b4-00c04fd430c8', 300, 'gram', 'Cut into fries', true), -- Kentang
('a1b2c3d4-e5f6-4a5b-9c8d-123456789018', '6ba7b825-9dad-11d1-80b4-00c04fd430c8', 300, 'ml', 'For deep frying', true), -- Minyak Goreng
('a1b2c3d4-e5f6-4a5b-9c8d-123456789018', '6ba7b826-9dad-11d1-80b4-00c04fd430c8', 5, 'gram', 'Seasoning', true) -- Garam
ON CONFLICT (menu_item_id, ingredient_id) DO NOTHING;

-- Brownies complete
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789020', '6ba7b81e-9dad-11d1-80b4-00c04fd430c8', 120, 'gram', 'All purpose flour', true), -- Tepung Terigu
('a1b2c3d4-e5f6-4a5b-9c8d-123456789020', '6ba7b81f-9dad-11d1-80b4-00c04fd430c8', 50, 'gram', 'Cocoa powder', true), -- Cokelat Bubuk
('a1b2c3d4-e5f6-4a5b-9c8d-123456789020', '6ba7b810-9dad-11d1-80b4-00c04fd430c8', 2, 'butir', 'For binding', true), -- Telur Ayam
('a1b2c3d4-e5f6-4a5b-9c8d-123456789020', '30dfb172-fcf3-4031-aaa8-8c68dfba15e3', 80, 'ml', 'Moisture', true), -- Susu Full Cream
('a1b2c3d4-e5f6-4a5b-9c8d-123456789020', '6ba7b823-9dad-11d1-80b4-00c04fd430c8', 3, 'ml', 'Flavor enhancer', true) -- Vanilla Extract
ON CONFLICT (menu_item_id, ingredient_id) DO NOTHING;

-- Fruit Salad complete
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789022', '6ba7b819-9dad-11d1-80b4-00c04fd430c8', 1, 'butir', 'Fresh orange segments', true), -- Jeruk
('a1b2c3d4-e5f6-4a5b-9c8d-123456789022', '6ba7b81c-9dad-11d1-80b4-00c04fd430c8', 1, 'butir', 'Diced apple', true), -- Apel
('a1b2c3d4-e5f6-4a5b-9c8d-123456789022', '6ba7b81d-9dad-11d1-80b4-00c04fd430c8', 0.5, 'butir', 'Mango chunks', true), -- Mangga
('a1b2c3d4-e5f6-4a5b-9c8d-123456789022', '6ba7b821-9dad-11d1-80b4-00c04fd430c8', 100, 'ml', 'Yogurt dressing', true) -- Yogurt
ON CONFLICT (menu_item_id, ingredient_id) DO NOTHING;