-- =====================================================
-- BATCH 2 - FILE 1: Orders and Payments Tables
-- Purpose: Create orders, order_items, and payment tracking
-- Dependencies: Batch 1 (users, menu_items)
-- =====================================================

-- Tables table (for QR codes and table management)
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number INTEGER UNIQUE NOT NULL,
    qr_code_id VARCHAR(50) UNIQUE NOT NULL,
    qr_code_url TEXT,
    
    -- Table configuration
    capacity INTEGER DEFAULT 4,
    zone VARCHAR(50), -- 'indoor', 'outdoor', 'vip'
    floor INTEGER DEFAULT 1,
    position_x INTEGER, -- For visual floor plan
    position_y INTEGER,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'available' 
        CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning', 'maintenance')),
    current_session_id UUID,
    occupied_since TIMESTAMPTZ,
    
    -- Settings
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tables
CREATE INDEX idx_tables_status ON tables(status);
CREATE INDEX idx_tables_number ON tables(table_number);
CREATE INDEX idx_tables_active ON tables(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Orders main table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(20) UNIQUE NOT NULL DEFAULT generate_order_number(),
    table_id UUID REFERENCES tables(id),
    session_id VARCHAR(100), -- For grouping multiple orders from same table session
    
    -- Customer information
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    customer_notes TEXT,
    
    -- Order details
    order_type VARCHAR(20) DEFAULT 'dine_in' 
        CHECK (order_type IN ('dine_in', 'takeaway', 'delivery')),
    status order_status DEFAULT 'pending_payment',
    
    -- Pricing
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    service_charge DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    
    -- Payment information
    payment_method payment_method,
    payment_status payment_status DEFAULT 'pending',
    payment_proof_url TEXT,
    payment_verified_at TIMESTAMPTZ,
    payment_verified_by UUID REFERENCES users(id),
    payment_reference VARCHAR(100), -- Transaction ID from payment gateway
    
    -- Promo/discount
    promo_code VARCHAR(50),
    promo_id UUID, -- Will reference promos table
    discount_percentage DECIMAL(5, 2),
    
    -- Timestamps for tracking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    preparing_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- Staff tracking
    processed_by UUID REFERENCES users(id), -- Kasir who verified payment
    prepared_by UUID REFERENCES users(id),  -- Kitchen staff
    delivered_by UUID REFERENCES users(id), -- Waiter
    
    -- Cancellation
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES users(id),
    
    -- Customer feedback
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    review TEXT,
    rated_at TIMESTAMPTZ,
    
    -- Metadata
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_amounts CHECK (
        subtotal >= 0 AND 
        total_amount >= 0 AND 
        tax_amount >= 0 AND 
        service_charge >= 0 AND 
        discount_amount >= 0
    ),
    CONSTRAINT valid_phone CHECK (customer_phone IS NULL OR customer_phone ~ '^\+?[0-9]{10,15}$')
);

-- Indexes for orders
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_table ON orders(table_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_session ON orders(session_id);

-- Trigger for updated_at
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Order items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id),
    
    -- Item details (denormalized for history)
    item_name VARCHAR(100) NOT NULL,
    item_price DECIMAL(10, 2) NOT NULL,
    
    -- Quantity and pricing
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    
    -- Customizations (JSON for flexibility)
    customizations JSONB, -- {"sugar": "50%", "ice": "less", "size": "large", "addons": ["extra_shot"]}
    customization_price DECIMAL(8, 2) DEFAULT 0,
    
    -- Subtotal
    subtotal DECIMAL(10, 2) NOT NULL,
    
    -- Special instructions
    notes TEXT,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'cancelled')),
    prepared_at TIMESTAMPTZ,
    served_at TIMESTAMPTZ,
    
    -- Kitchen tracking
    preparation_time INTEGER, -- Actual time in minutes
    prepared_by UUID REFERENCES users(id),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for order_items
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_menu ON order_items(menu_item_id);
CREATE INDEX idx_order_items_status ON order_items(status);

-- Trigger for updated_at
CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Payment transactions table (for detailed payment tracking)
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_type VARCHAR(20) NOT NULL 
        CHECK (transaction_type IN ('payment', 'refund', 'partial_refund')),
    amount DECIMAL(10, 2) NOT NULL,
    payment_method payment_method NOT NULL,
    
    -- Gateway information
    gateway_name VARCHAR(50), -- 'xendit', 'midtrans', 'manual'
    gateway_transaction_id VARCHAR(100),
    gateway_response JSONB,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'success', 'failed', 'expired')),
    
    -- Proof for manual payments
    proof_image_url TEXT,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB
);

-- Indexes for payment_transactions
CREATE INDEX idx_payment_transactions_order ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_method ON payment_transactions(payment_method);

-- Function to calculate order totals
CREATE OR REPLACE FUNCTION calculate_order_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_subtotal DECIMAL(10, 2);
    v_tax_rate DECIMAL(5, 2) := 11; -- PPN 11%
    v_service_charge_rate DECIMAL(5, 2) := 5; -- Service charge 5%
BEGIN
    -- Calculate subtotal from order items
    SELECT COALESCE(SUM(subtotal), 0)
    INTO v_subtotal
    FROM order_items
    WHERE order_id = NEW.id;
    
    -- Update order totals
    NEW.subtotal := v_subtotal;
    NEW.tax_amount := v_subtotal * v_tax_rate / 100;
    NEW.service_charge := v_subtotal * v_service_charge_rate / 100;
    NEW.total_amount := v_subtotal + NEW.tax_amount + NEW.service_charge - COALESCE(NEW.discount_amount, 0);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update order totals
CREATE TRIGGER calculate_order_totals_trigger
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION calculate_order_totals();

-- Function to update order status based on items
CREATE OR REPLACE FUNCTION update_order_status_from_items()
RETURNS TRIGGER AS $$
DECLARE
    all_items_ready BOOLEAN;
    any_item_preparing BOOLEAN;
BEGIN
    -- Check if all items are ready
    SELECT 
        NOT EXISTS (SELECT 1 FROM order_items WHERE order_id = NEW.order_id AND status != 'ready'),
        EXISTS (SELECT 1 FROM order_items WHERE order_id = NEW.order_id AND status = 'preparing')
    INTO all_items_ready, any_item_preparing;
    
    -- Update order status accordingly
    IF all_items_ready THEN
        UPDATE orders SET status = 'ready' WHERE id = NEW.order_id;
    ELSIF any_item_preparing THEN
        UPDATE orders SET status = 'preparing' WHERE id = NEW.order_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on order_items to update order status
CREATE TRIGGER update_order_status_trigger
AFTER UPDATE OF status ON order_items
FOR EACH ROW EXECUTE FUNCTION update_order_status_from_items();

-- Insert sample tables
INSERT INTO tables (table_number, qr_code_id, capacity, zone) VALUES
    (1, 'QR001', 2, 'indoor'),
    (2, 'QR002', 4, 'indoor'),
    (3, 'QR003', 4, 'indoor'),
    (4, 'QR004', 6, 'indoor'),
    (5, 'QR005', 4, 'outdoor'),
    (6, 'QR006', 2, 'outdoor'),
    (7, 'QR007', 8, 'vip'),
    (8, 'QR008', 4, 'indoor'),
    (9, 'QR009', 4, 'indoor'),
    (10, 'QR010', 2, 'indoor');

-- Enable RLS
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Comments for documentation
COMMENT ON TABLE tables IS 'Restaurant tables with QR codes';
COMMENT ON TABLE orders IS 'Main orders table with payment and status tracking';
COMMENT ON TABLE order_items IS 'Individual items within an order';
COMMENT ON TABLE payment_transactions IS 'Detailed payment transaction history';