-- Create tables table migration

-- Create tables table
CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number VARCHAR(50) NOT NULL UNIQUE,
    qr_code_id VARCHAR(255) NOT NULL UNIQUE,
    qr_code_url TEXT,
    capacity VARCHAR(50) NOT NULL,
    zone VARCHAR(100) NOT NULL,
    floor VARCHAR(50) NOT NULL,
    position_x DECIMAL(10,3),
    position_y DECIMAL(10,3),
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance')),
    current_session_id UUID,
    occupied_since TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tables_number ON tables(table_number);
CREATE INDEX IF NOT EXISTS idx_tables_qr_code ON tables(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status);
CREATE INDEX IF NOT EXISTS idx_tables_active ON tables(is_active);
CREATE INDEX IF NOT EXISTS idx_tables_zone ON tables(zone);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tables_updated_at
    BEFORE UPDATE ON tables
    FOR EACH ROW
    EXECUTE FUNCTION update_tables_updated_at();

-- Enable Row Level Security
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access to tables" ON tables
    FOR SELECT USING (true);