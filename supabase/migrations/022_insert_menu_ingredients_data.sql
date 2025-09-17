-- =====================================================
-- INSERT MENU INGREDIENTS RELATIONSHIPS
-- Purpose: Add sample data linking menu items to ingredients
-- Dependencies: menu_item_ingredients table must exist
-- =====================================================

-- Insert ingredients relationships for coffee drinks
-- Espresso (a1b2c3d4-e5f6-4a5b-9c8d-123456789001)
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789001', 'bd11ffd1-c336-422a-9121-dced110389f4', 18, 'gram', 'Grind fresh before brewing', true); -- Kopi Arabica

-- Cappuccino (a1b2c3d4-e5f6-4a5b-9c8d-123456789002)
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789002', 'bd11ffd1-c336-422a-9121-dced110389f4', 18, 'gram', 'Double shot espresso base', true), -- Kopi Arabica
('a1b2c3d4-e5f6-4a5b-9c8d-123456789002', '30dfb172-fcf3-4031-aaa8-8c68dfba15e3', 150, 'ml', 'Steam to 65-70°C', true); -- Susu Full Cream

-- Latte (a1b2c3d4-e5f6-4a5b-9c8d-123456789003)
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789003', 'bd11ffd1-c336-422a-9121-dced110389f4', 18, 'gram', 'Double shot espresso base', true), -- Kopi Arabica
('a1b2c3d4-e5f6-4a5b-9c8d-123456789003', '30dfb172-fcf3-4031-aaa8-8c68dfba15e3', 200, 'ml', 'More milk than cappuccino', true); -- Susu Full Cream

-- Americano (a1b2c3d4-e5f6-4a5b-9c8d-123456789004)
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789004', 'bd11ffd1-c336-422a-9121-dced110389f4', 18, 'gram', 'Double shot espresso', true); -- Kopi Arabica

-- Mocha (a1b2c3d4-e5f6-4a5b-9c8d-123456789005)
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789005', 'bd11ffd1-c336-422a-9121-dced110389f4', 18, 'gram', 'Espresso base', true), -- Kopi Arabica
('a1b2c3d4-e5f6-4a5b-9c8d-123456789005', '30dfb172-fcf3-4031-aaa8-8c68dfba15e3', 180, 'ml', 'Steamed milk', true), -- Susu Full Cream
('a1b2c3d4-e5f6-4a5b-9c8d-123456789005', '0fbe9cfb-d52b-46e2-b934-02d90f16b8aa', 15, 'gram', 'For chocolate syrup', true); -- Gula Pasir

-- Es Teh Manis (a1b2c3d4-e5f6-4a5b-9c8d-123456789006)
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789006', '0fbe9cfb-d52b-46e2-b934-02d90f16b8aa', 20, 'gram', 'Dissolve in hot tea first', true), -- Gula Pasir
('a1b2c3d4-e5f6-4a5b-9c8d-123456789006', '8491bf7a-20d4-4b1c-8c6f-666037e29b59', 200, 'gram', 'Add after tea cools down', true); -- Es Batu

-- Lemon Tea (a1b2c3d4-e5f6-4a5b-9c8d-123456789008)
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789008', '0fbe9cfb-d52b-46e2-b934-02d90f16b8aa', 15, 'gram', 'Light sweetening', true); -- Gula Pasir

-- Chocolate Milkshake (a1b2c3d4-e5f6-4a5b-9c8d-123456789009)
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789009', '30dfb172-fcf3-4031-aaa8-8c68dfba15e3', 250, 'ml', 'Blend with ice', true), -- Susu Full Cream
('a1b2c3d4-e5f6-4a5b-9c8d-123456789009', '0fbe9cfb-d52b-46e2-b934-02d90f16b8aa', 25, 'gram', 'For sweetness', true), -- Gula Pasir
('a1b2c3d4-e5f6-4a5b-9c8d-123456789009', '8491bf7a-20d4-4b1c-8c6f-666037e29b59', 150, 'gram', 'For texture', true); -- Es Batu

-- Add some ingredients for food items (using existing ingredients)
-- Nasi Goreng Ayam (a1b2c3d4-e5f6-4a5b-9c8d-123456789010)
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789010', '0fbe9cfb-d52b-46e2-b934-02d90f16b8aa', 5, 'gram', 'For seasoning', true); -- Gula Pasir

-- Mie Goreng (a1b2c3d4-e5f6-4a5b-9c8d-123456789011)
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789011', '0fbe9cfb-d52b-46e2-b934-02d90f16b8aa', 5, 'gram', 'For sweet soy sauce', true); -- Gula Pasir

-- Es Krim Vanilla (a1b2c3d4-e5f6-4a5b-9c8d-123456789019)
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789019', '30dfb172-fcf3-4031-aaa8-8c68dfba15e3', 200, 'ml', 'Main ingredient', true), -- Susu Full Cream
('a1b2c3d4-e5f6-4a5b-9c8d-123456789019', '0fbe9cfb-d52b-46e2-b934-02d90f16b8aa', 30, 'gram', 'For sweetness', true); -- Gula Pasir

-- Puding Cokelat (a1b2c3d4-e5f6-4a5b-9c8d-123456789021)
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789021', '30dfb172-fcf3-4031-aaa8-8c68dfba15e3', 250, 'ml', 'Base liquid', true), -- Susu Full Cream
('a1b2c3d4-e5f6-4a5b-9c8d-123456789021', '0fbe9cfb-d52b-46e2-b934-02d90f16b8aa', 25, 'gram', 'Sweetener', true); -- Gula Pasir

-- Fruit Salad (a1b2c3d4-e5f6-4a5b-9c8d-123456789022)
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_needed, unit, preparation_notes, is_required) VALUES
('a1b2c3d4-e5f6-4a5b-9c8d-123456789022', '30dfb172-fcf3-4031-aaa8-8c68dfba15e3', 50, 'ml', 'For yogurt dressing', true), -- Susu Full Cream
('a1b2c3d4-e5f6-4a5b-9c8d-123456789022', '0fbe9cfb-d52b-46e2-b934-02d90f16b8aa', 10, 'gram', 'Light sweetening', true); -- Gula Pasir

-- Update sample stock levels for ingredients to test availability
UPDATE ingredients SET
    current_stock = 5000.000,
    min_stock_level = 500.000,
    max_stock_level = 10000.000
WHERE id = 'bd11ffd1-c336-422a-9121-dced110389f4'; -- Kopi Arabica

UPDATE ingredients SET
    current_stock = 8000.000,
    min_stock_level = 1000.000,
    max_stock_level = 15000.000
WHERE id = 'b68d7074-27dc-4980-9b63-8d761dd973e9'; -- Kopi Robusta

UPDATE ingredients SET
    current_stock = 10000.000,
    min_stock_level = 1500.000,
    max_stock_level = 20000.000
WHERE id = '30dfb172-fcf3-4031-aaa8-8c68dfba15e3'; -- Susu Full Cream

UPDATE ingredients SET
    current_stock = 3000.000,
    min_stock_level = 500.000,
    max_stock_level = 8000.000
WHERE id = '0fbe9cfb-d52b-46e2-b934-02d90f16b8aa'; -- Gula Pasir

UPDATE ingredients SET
    current_stock = 15000.000,
    min_stock_level = 2000.000,
    max_stock_level = 30000.000
WHERE id = '8491bf7a-20d4-4b1c-8c6f-666037e29b59'; -- Es Batu

-- Test the functions
-- Calculate ingredient cost for Cappuccino
SELECT
    mi.name,
    calculate_menu_item_ingredient_cost(mi.id) as ingredient_cost,
    mi.cost_price as listed_cost_price,
    check_menu_item_availability(mi.id) as can_be_made
FROM menu_items mi
WHERE mi.id = 'a1b2c3d4-e5f6-4a5b-9c8d-123456789002';

-- Show ingredients for all coffee items
SELECT
    mi.name as menu_item,
    i.name as ingredient,
    mii.quantity_needed,
    mii.unit,
    mii.preparation_notes,
    i.current_stock,
    i.unit_cost
FROM menu_item_ingredients mii
JOIN menu_items mi ON mii.menu_item_id = mi.id
JOIN ingredients i ON mii.ingredient_id = i.id
WHERE mi.category_id = '5b438a06-7f62-48d1-b4b9-5f2d5f71e01c'
ORDER BY mi.name, mii.created_at;