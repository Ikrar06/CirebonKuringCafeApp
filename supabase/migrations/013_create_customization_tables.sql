-- Create menu customization tables migration

-- Create customization groups table
CREATE TABLE IF NOT EXISTS menu_customization_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_name VARCHAR(255) NOT NULL,
    group_type VARCHAR(50) NOT NULL CHECK (group_type IN ('single', 'multiple')),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customization options table
CREATE TABLE IF NOT EXISTS menu_customization_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_name VARCHAR(255) NOT NULL,
    group_id UUID REFERENCES menu_customization_groups(id) ON DELETE CASCADE,
    price_adjustment DECIMAL(10,2) DEFAULT 0.00,
    is_default BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
    ingredient_quantity DECIMAL(10,3) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customization_groups_menu_item ON menu_customization_groups(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_customization_groups_order ON menu_customization_groups(display_order);
CREATE INDEX IF NOT EXISTS idx_customization_options_group ON menu_customization_options(group_id);
CREATE INDEX IF NOT EXISTS idx_customization_options_order ON menu_customization_options(display_order);
CREATE INDEX IF NOT EXISTS idx_customization_options_available ON menu_customization_options(is_available);

-- Add updated_at trigger for groups table
CREATE OR REPLACE FUNCTION update_menu_customization_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_menu_customization_groups_updated_at
    BEFORE UPDATE ON menu_customization_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_menu_customization_groups_updated_at();

-- Add updated_at trigger for options table
CREATE OR REPLACE FUNCTION update_menu_customization_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_menu_customization_options_updated_at
    BEFORE UPDATE ON menu_customization_options
    FOR EACH ROW
    EXECUTE FUNCTION update_menu_customization_options_updated_at();

-- Enable Row Level Security
ALTER TABLE menu_customization_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_customization_options ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reading (allow all authenticated and anonymous users to read)
CREATE POLICY "Allow read access to customization groups" ON menu_customization_groups
    FOR SELECT USING (true);

CREATE POLICY "Allow read access to customization options" ON menu_customization_options
    FOR SELECT USING (true);

-- Create RLS policies for writing (restrict to authenticated users)
CREATE POLICY "Allow insert customization groups for authenticated users" ON menu_customization_groups
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update customization groups for authenticated users" ON menu_customization_groups
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete customization groups for authenticated users" ON menu_customization_groups
    FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert customization options for authenticated users" ON menu_customization_options
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update customization options for authenticated users" ON menu_customization_options
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete customization options for authenticated users" ON menu_customization_options
    FOR DELETE USING (auth.role() = 'authenticated');