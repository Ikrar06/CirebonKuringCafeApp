-- Insert sample menu data

-- Get category IDs for reference
DO $$
DECLARE
    coffee_cat_id UUID;
    non_coffee_cat_id UUID;
    food_cat_id UUID;
    snacks_cat_id UUID;
    desserts_cat_id UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO coffee_cat_id FROM menu_categories WHERE slug = 'coffee';
    SELECT id INTO non_coffee_cat_id FROM menu_categories WHERE slug = 'non-coffee';
    SELECT id INTO food_cat_id FROM menu_categories WHERE slug = 'food';
    SELECT id INTO snacks_cat_id FROM menu_categories WHERE slug = 'snacks';
    SELECT id INTO desserts_cat_id FROM menu_categories WHERE slug = 'desserts';

    -- Insert menu items with fixed UUIDs for consistency with customization data
    INSERT INTO menu_items (id, category_id, name, slug, description, base_price, cost_price, tax_rate, image_url, thumbnail_url, requires_stock, estimated_prep_time, is_available, available_from, available_until, daily_limit, current_daily_count, calories, is_vegetarian, is_vegan, is_gluten_free, is_spicy, spicy_level, allergens, total_orders, total_revenue, average_rating, rating_count, created_at, updated_at) VALUES
    -- Coffee items
    ('a1b2c3d4-e5f6-4a5b-9c8d-123456789002', coffee_cat_id, 'Cappuccino', 'cappuccino', 'Espresso dengan susu yang dikukus dan foam susu yang lembut', 20000, 12000, 11.00, null, null, true, 8, true, null, null, 0, 0, 120, true, false, true, false, null, '{"milk"}', 0, 0.00, null, 0, NOW(), NOW()),
    ('a1b2c3d4-e5f6-4a5b-9c8d-123456789003', coffee_cat_id, 'Latte', 'latte', 'Espresso dengan susu steamed, foam tipis', 22000, 13000, 11.00, null, null, true, 8, true, null, null, 0, 0, 140, true, false, true, false, null, '{"milk"}', 0, 0.00, null, 0, NOW(), NOW()),
    ('a1b2c3d4-e5f6-4a5b-9c8d-123456789004', coffee_cat_id, 'Americano', 'americano', 'Espresso dengan air panas', 15000, 8000, 11.00, null, null, true, 5, true, null, null, 0, 0, 10, true, true, true, false, null, '{}', 0, 0.00, null, 0, NOW(), NOW()),
    ('a1b2c3d4-e5f6-4a5b-9c8d-123456789005', coffee_cat_id, 'Espresso', 'espresso', 'Single shot kopi murni', 12000, 6000, 11.00, null, null, true, 3, true, null, null, 0, 0, 5, true, true, true, false, null, '{}', 0, 0.00, null, 0, NOW(), NOW()),

    -- Non-Coffee items
    ('a1b2c3d4-e5f6-4a5b-9c8d-123456789006', non_coffee_cat_id, 'Es Teh Manis', 'es-teh-manis', 'Teh manis segar dengan es', 8000, 3000, 11.00, null, null, true, 3, true, null, null, 0, 0, 80, true, true, true, false, null, '{}', 0, 0.00, null, 0, NOW(), NOW()),
    ('a1b2c3d4-e5f6-4a5b-9c8d-123456789007', non_coffee_cat_id, 'Jus Jeruk', 'jus-jeruk', 'Jus jeruk segar', 12000, 8000, 11.00, null, null, true, 5, true, null, null, 0, 0, 60, true, true, true, false, null, '{}', 0, 0.00, null, 0, NOW(), NOW()),
    ('a1b2c3d4-e5f6-4a5b-9c8d-123456789008', non_coffee_cat_id, 'Chocolate', 'chocolate', 'Minuman coklat hangat', 15000, 10000, 11.00, null, null, true, 5, true, null, null, 0, 0, 200, true, false, true, false, null, '{"milk"}', 0, 0.00, null, 0, NOW(), NOW()),

    -- Food items
    ('a1b2c3d4-e5f6-4a5b-9c8d-123456789010', food_cat_id, 'Nasi Goreng Ayam', 'nasi-goreng-ayam', 'Nasi goreng dengan ayam dan sayuran', 25000, 18000, 11.00, null, null, true, 15, true, null, null, 0, 0, 450, false, false, true, true, 2, '{}', 0, 0.00, null, 0, NOW(), NOW()),
    ('a1b2c3d4-e5f6-4a5b-9c8d-123456789011', food_cat_id, 'Mie Goreng', 'mie-goreng', 'Mie goreng dengan sayuran', 20000, 12000, 11.00, null, null, true, 12, true, null, null, 0, 0, 380, false, false, false, true, 1, '{"gluten"}', 0, 0.00, null, 0, NOW(), NOW()),
    ('a1b2c3d4-e5f6-4a5b-9c8d-123456789012', food_cat_id, 'Sandwich Club', 'sandwich-club', 'Sandwich dengan isi lengkap', 18000, 12000, 11.00, null, null, true, 8, true, null, null, 0, 0, 320, false, false, false, false, null, '{"gluten"}', 0, 0.00, null, 0, NOW(), NOW()),

    -- Snacks
    ('a1b2c3d4-e5f6-4a5b-9c8d-123456789013', snacks_cat_id, 'French Fries', 'french-fries', 'Kentang goreng renyah', 12000, 6000, 11.00, null, null, true, 8, true, null, null, 0, 0, 250, true, true, true, false, null, '{}', 0, 0.00, null, 0, NOW(), NOW()),
    ('a1b2c3d4-e5f6-4a5b-9c8d-123456789014', snacks_cat_id, 'Pisang Goreng', 'pisang-goreng', 'Pisang goreng crispy', 10000, 4000, 11.00, null, null, true, 10, true, null, null, 0, 0, 200, true, true, false, false, null, '{"gluten"}', 0, 0.00, null, 0, NOW(), NOW()),

    -- Desserts
    ('a1b2c3d4-e5f6-4a5b-9c8d-123456789015', desserts_cat_id, 'Es Krim Vanilla', 'es-krim-vanilla', 'Es krim vanilla premium', 15000, 8000, 11.00, null, null, true, 2, true, null, null, 0, 0, 180, true, false, true, false, null, '{"milk"}', 0, 0.00, null, 0, NOW(), NOW()),
    ('a1b2c3d4-e5f6-4a5b-9c8d-123456789016', desserts_cat_id, 'Tiramisu', 'tiramisu', 'Dessert khas Italia', 25000, 15000, 11.00, null, null, true, 5, true, null, null, 0, 0, 280, true, false, false, false, null, '{"milk", "gluten"}', 0, 0.00, null, 0, NOW(), NOW());

END $$;