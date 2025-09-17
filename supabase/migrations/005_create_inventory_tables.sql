-- =====================================================
-- BATCH 2 - FILE 2: Inventory Management Tables
-- Purpose: Stock movements, suppliers, purchase orders
-- Dependencies: Batch 1 (ingredients, users)
-- =====================================================

-- Suppliers table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Company information
    company_name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    
    -- Contact details
    phone_primary VARCHAR(20) NOT NULL,
    phone_secondary VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(50),
    
    -- Business information
    business_type VARCHAR(50), -- 'distributor', 'manufacturer', 'farmer'
    tax_id VARCHAR(50), -- NPWP
    
    -- Payment terms
    payment_terms VARCHAR(50), -- 'cash', 'credit_30', 'credit_60'
    payment_methods TEXT[], -- ['transfer', 'cash', 'check']
    bank_account VARCHAR(100),
    bank_name VARCHAR(50),
    
    -- Rating and performance
    delivery_rating DECIMAL(3, 2) CHECK (delivery_rating BETWEEN 0 AND 5),
    quality_rating DECIMAL(3, 2) CHECK (quality_rating BETWEEN 0 AND 5),
    price_rating DECIMAL(3, 2) CHECK (price_rating BETWEEN 0 AND 5),
    total_purchases DECIMAL(12, 2) DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_preferred BOOLEAN DEFAULT false,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Indexes for suppliers
CREATE INDEX idx_suppliers_active ON suppliers(is_active);
CREATE INDEX idx_suppliers_preferred ON suppliers(is_preferred);
CREATE INDEX idx_suppliers_name ON suppliers(company_name);

-- Trigger for updated_at
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Stock movements table (tracks all inventory changes)
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
    
    -- Movement details
    movement_type VARCHAR(20) NOT NULL 
        CHECK (movement_type IN ('purchase', 'usage', 'waste', 'adjustment', 'initial', 'return')),
    quantity DECIMAL(10, 3) NOT NULL, -- Positive for IN, Negative for OUT
    
    -- Reference to source
    reference_type VARCHAR(30), -- 'purchase_order', 'order', 'manual', 'recipe'
    reference_id UUID, -- ID of the source document
    
    -- Cost tracking
    unit_cost DECIMAL(10, 2),
    total_cost DECIMAL(12, 2),
    
    -- Stock levels snapshot
    stock_before DECIMAL(10, 3),
    stock_after DECIMAL(10, 3),
    
    -- For purchases
    supplier_id UUID REFERENCES suppliers(id),
    batch_number VARCHAR(50),
    manufacturing_date DATE,
    expiry_date DATE,
    
    -- Reason and notes
    reason TEXT, -- For adjustments and waste
    notes TEXT,
    
    -- Who performed the action
    performed_by UUID REFERENCES users(id),
    device_id UUID REFERENCES device_accounts(id),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for stock_movements
CREATE INDEX idx_stock_movements_ingredient ON stock_movements(ingredient_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at DESC);
CREATE INDEX idx_stock_movements_supplier ON stock_movements(supplier_id);
CREATE INDEX idx_stock_movements_expiry ON stock_movements(expiry_date);

-- Purchase orders table
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(30) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    
    -- Dates
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery DATE,
    actual_delivery DATE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'confirmed', 'partial_received', 'received', 'cancelled')),
    
    -- Financial
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Payment
    payment_status VARCHAR(20) DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
    payment_due_date DATE,
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    paid_date DATE,
    payment_reference VARCHAR(100),
    
    -- Staff actions
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    received_by UUID REFERENCES users(id),
    received_at TIMESTAMPTZ,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for purchase_orders
CREATE INDEX idx_purchase_orders_number ON purchase_orders(po_number);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_date ON purchase_orders(order_date DESC);

-- Trigger for updated_at
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Purchase order items table
CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES ingredients(id),
    
    -- Quantities
    quantity DECIMAL(10, 3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    
    -- Financial
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 11,
    tax_amount DECIMAL(10, 2),
    total DECIMAL(10, 2) NOT NULL,
    
    -- Receiving
    delivered_quantity DECIMAL(10, 3) DEFAULT 0,
    received_date DATE,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for purchase_order_items
CREATE INDEX idx_po_items_po ON purchase_order_items(po_id);
CREATE INDEX idx_po_items_ingredient ON purchase_order_items(ingredient_id);

-- Stock batches table (for FIFO tracking)
CREATE TABLE stock_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
    
    -- Batch information
    batch_number VARCHAR(50) NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    purchase_order_id UUID REFERENCES purchase_orders(id),
    
    -- Quantities
    initial_quantity DECIMAL(10, 3) NOT NULL,
    remaining_quantity DECIMAL(10, 3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    
    -- Cost
    unit_cost DECIMAL(10, 2) NOT NULL,
    
    -- Dates
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    manufacturing_date DATE,
    expiry_date DATE,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_expired BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_quantities CHECK (remaining_quantity >= 0 AND remaining_quantity <= initial_quantity)
);

-- Indexes for stock_batches
CREATE INDEX idx_stock_batches_ingredient ON stock_batches(ingredient_id);
CREATE INDEX idx_stock_batches_expiry ON stock_batches(expiry_date);
CREATE INDEX idx_stock_batches_active ON stock_batches(is_active);
CREATE INDEX idx_stock_batches_batch ON stock_batches(batch_number);

-- Trigger for updated_at
CREATE TRIGGER update_stock_batches_updated_at BEFORE UPDATE ON stock_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update ingredient stock after movement
CREATE OR REPLACE FUNCTION update_ingredient_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Update current stock in ingredients table
    UPDATE ingredients
    SET current_stock = current_stock + NEW.quantity
    WHERE id = NEW.ingredient_id;
    
    -- Set stock_after in the movement record
    SELECT current_stock INTO NEW.stock_after
    FROM ingredients
    WHERE id = NEW.ingredient_id;
    
    -- Set stock_before (stock_after - quantity)
    NEW.stock_before := NEW.stock_after - NEW.quantity;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stock on movement
CREATE TRIGGER update_stock_on_movement
BEFORE INSERT ON stock_movements
FOR EACH ROW EXECUTE FUNCTION update_ingredient_stock();

-- Function to deduct ingredients when order is confirmed
CREATE OR REPLACE FUNCTION deduct_ingredients_from_order()
RETURNS TRIGGER AS $$
DECLARE
    v_recipe RECORD;
    v_menu_item RECORD;
BEGIN
    -- Only process if order status changes to 'confirmed'
    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
        -- Loop through order items
        FOR v_menu_item IN 
            SELECT * FROM order_items WHERE order_id = NEW.id
        LOOP
            -- Loop through recipe ingredients
            FOR v_recipe IN 
                SELECT r.*, i.name as ingredient_name
                FROM recipes r
                JOIN ingredients i ON r.ingredient_id = i.id
                WHERE r.menu_item_id = v_menu_item.menu_item_id
            LOOP
                -- Create stock movement for usage
                INSERT INTO stock_movements (
                    ingredient_id,
                    movement_type,
                    quantity,
                    reference_type,
                    reference_id,
                    reason,
                    performed_by
                ) VALUES (
                    v_recipe.ingredient_id,
                    'usage',
                    -(v_recipe.quantity * v_menu_item.quantity), -- Negative for deduction
                    'order',
                    NEW.id,
                    'Order #' || NEW.order_number || ' - ' || v_menu_item.item_name,
                    NEW.processed_by
                );
            END LOOP;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to deduct ingredients on order confirmation
CREATE TRIGGER deduct_ingredients_on_order_confirm
AFTER UPDATE OF status ON orders
FOR EACH ROW EXECUTE FUNCTION deduct_ingredients_from_order();

-- Function to generate PO number
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TEXT AS $$
DECLARE
    po_count INT;
    new_po_number TEXT;
BEGIN
    SELECT COUNT(*) + 1 INTO po_count FROM purchase_orders;
    new_po_number := 'PO' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || LPAD(po_count::TEXT, 4, '0');
    RETURN new_po_number;
END;
$$ LANGUAGE plpgsql;

-- Set default PO number
ALTER TABLE purchase_orders ALTER COLUMN po_number SET DEFAULT generate_po_number();

-- Insert sample suppliers
INSERT INTO suppliers (company_name, contact_person, phone_primary, email, payment_terms) VALUES
    ('PT Kopi Nusantara', 'Budi Santoso', '08123456789', 'budi@kopinusantara.com', 'credit_30'),
    ('CV Dairy Fresh', 'Siti Aminah', '08234567890', 'siti@dairyfresh.com', 'cash'),
    ('PT Sugar Indonesia', 'Ahmad Wijaya', '08345678901', 'ahmad@sugarindo.com', 'credit_30');

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;

-- Comments for documentation
COMMENT ON TABLE suppliers IS 'Supplier/vendor information';
COMMENT ON TABLE stock_movements IS 'Track all inventory movements in and out';
COMMENT ON TABLE purchase_orders IS 'Purchase orders to suppliers';
COMMENT ON TABLE purchase_order_items IS 'Items in purchase orders';
COMMENT ON TABLE stock_batches IS 'Batch tracking for FIFO and expiry';