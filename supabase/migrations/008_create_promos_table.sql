-- =====================================================
-- BATCH 3 - FILE 2: Promotions and Discounts
-- Purpose: Create flexible promotion system
-- Dependencies: Batch 1 & 2 (menu_items, orders)
-- =====================================================

-- Promotions/discounts table
CREATE TABLE promos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic information
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE,
    description TEXT,
    
    -- Promo type and value
    promo_type promo_type NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL, -- Percentage or fixed amount
    max_discount_amount DECIMAL(10, 2), -- Max discount for percentage promos
    
    -- Conditions
    min_purchase_amount DECIMAL(10, 2),
    applicable_categories UUID[], -- Array of category IDs
    applicable_items UUID[], -- Array of menu item IDs
    
    -- Buy X Get Y configuration
    buy_quantity INTEGER, -- For buy_get type
    buy_items UUID[], -- Items that must be bought
    get_quantity INTEGER, -- How many free items
    get_items UUID[], -- Items that are free
    get_discount_percentage DECIMAL(5, 2), -- Discount on get items (100 = free)
    
    -- Bundle configuration
    bundle_items UUID[], -- Items in bundle
    bundle_price DECIMAL(10, 2), -- Bundle total price
    
    -- Validity period
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    
    -- Time restrictions
    valid_days INTEGER[], -- 1=Monday, 7=Sunday
    valid_from_time TIME,
    valid_until_time TIME,
    
    -- Usage limits
    max_uses_total INTEGER,
    max_uses_per_customer INTEGER,
    current_uses INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT false,
    
    -- Stacking rules
    is_stackable BOOLEAN DEFAULT false,
    excluded_promos UUID[], -- Cannot be used with these promos
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Indexes for promos
CREATE INDEX idx_promos_code ON promos(code);
CREATE INDEX idx_promos_active ON promos(is_active);
CREATE INDEX idx_promos_valid ON promos(valid_from, valid_until);
CREATE INDEX idx_promos_type ON promos(promo_type);

-- Trigger for updated_at
CREATE TRIGGER update_promos_updated_at BEFORE UPDATE ON promos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Promo usage tracking
CREATE TABLE promo_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_id UUID REFERENCES promos(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Customer tracking
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    customer_session_id VARCHAR(100),
    
    -- Usage details
    discount_amount DECIMAL(10, 2) NOT NULL,
    
    -- Metadata
    used_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_promo_per_order UNIQUE(promo_id, order_id)
);

-- Indexes for promo_usage
CREATE INDEX idx_promo_usage_promo ON promo_usage(promo_id);
CREATE INDEX idx_promo_usage_order ON promo_usage(order_id);
CREATE INDEX idx_promo_usage_customer ON promo_usage(customer_phone);
CREATE INDEX idx_promo_usage_date ON promo_usage(used_at);

-- Function to validate and apply promo
CREATE OR REPLACE FUNCTION apply_promo_to_order(
    p_order_id UUID,
    p_promo_code VARCHAR
) RETURNS JSONB AS $$
DECLARE
    v_promo RECORD;
    v_order RECORD;
    v_discount DECIMAL(10, 2) := 0;
    v_customer_uses INTEGER;
    v_current_time TIME;
    v_current_day INTEGER;
BEGIN
    -- Get promo details
    SELECT * INTO v_promo
    FROM promos
    WHERE code = p_promo_code
        AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Promo code not found');
    END IF;
    
    -- Get order details
    SELECT * INTO v_order
    FROM orders
    WHERE id = p_order_id;
    
    -- Check validity period
    IF v_promo.valid_from IS NOT NULL AND NOW() < v_promo.valid_from THEN
        RETURN jsonb_build_object('success', false, 'message', 'Promo not yet valid');
    END IF;
    
    IF v_promo.valid_until IS NOT NULL AND NOW() > v_promo.valid_until THEN
        RETURN jsonb_build_object('success', false, 'message', 'Promo has expired');
    END IF;
    
    -- Check time restrictions
    v_current_time := CURRENT_TIME;
    IF v_promo.valid_from_time IS NOT NULL AND v_current_time < v_promo.valid_from_time THEN
        RETURN jsonb_build_object('success', false, 'message', 'Promo not valid at this time');
    END IF;
    
    IF v_promo.valid_until_time IS NOT NULL AND v_current_time > v_promo.valid_until_time THEN
        RETURN jsonb_build_object('success', false, 'message', 'Promo not valid at this time');
    END IF;
    
    -- Check day restrictions
    v_current_day := EXTRACT(DOW FROM CURRENT_DATE);
    IF v_promo.valid_days IS NOT NULL AND NOT (v_current_day = ANY(v_promo.valid_days)) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Promo not valid today');
    END IF;
    
    -- Check minimum purchase
    IF v_promo.min_purchase_amount IS NOT NULL AND v_order.subtotal < v_promo.min_purchase_amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Minimum purchase not met');
    END IF;
    
    -- Check usage limits
    IF v_promo.max_uses_total IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses_total THEN
        RETURN jsonb_build_object('success', false, 'message', 'Promo usage limit reached');
    END IF;
    
    -- Check per-customer usage
    IF v_promo.max_uses_per_customer IS NOT NULL THEN
        SELECT COUNT(*) INTO v_customer_uses
        FROM promo_usage
        WHERE promo_id = v_promo.id
            AND customer_phone = v_order.customer_phone;
        
        IF v_customer_uses >= v_promo.max_uses_per_customer THEN
            RETURN jsonb_build_object('success', false, 'message', 'You have already used this promo');
        END IF;
    END IF;
    
    -- Calculate discount based on promo type
    CASE v_promo.promo_type
        WHEN 'percentage' THEN
            v_discount := v_order.subtotal * v_promo.discount_value / 100;
            IF v_promo.max_discount_amount IS NOT NULL THEN
                v_discount := LEAST(v_discount, v_promo.max_discount_amount);
            END IF;
        
        WHEN 'fixed_amount' THEN
            v_discount := v_promo.discount_value;
        
        -- Other promo types would need more complex logic
        ELSE
            v_discount := 0;
    END CASE;
    
    -- Update order with discount
    UPDATE orders
    SET discount_amount = v_discount,
        promo_id = v_promo.id,
        promo_code = v_promo.code
    WHERE id = p_order_id;
    
    -- Record usage
    INSERT INTO promo_usage (promo_id, order_id, customer_phone, discount_amount)
    VALUES (v_promo.id, p_order_id, v_order.customer_phone, v_discount);
    
    -- Update promo usage count
    UPDATE promos
    SET current_uses = current_uses + 1
    WHERE id = v_promo.id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'discount_amount', v_discount,
        'message', 'Promo applied successfully'
    );
END;
$$ LANGUAGE plpgsql;

-- Insert sample promos
INSERT INTO promos (name, code, description, promo_type, discount_value, min_purchase_amount, is_active) VALUES
    ('Grand Opening', 'OPENING20', 'Grand opening 20% discount', 'percentage', 20, 50000, true),
    ('Coffee Monday', 'COFFEE10', 'Monday coffee discount', 'percentage', 10, NULL, true),
    ('Lunch Bundle', 'LUNCH', 'Lunch time special', 'fixed_amount', 10000, 75000, true);

-- Enable RLS
ALTER TABLE promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_usage ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE promos IS 'Promotional campaigns and discounts';
COMMENT ON TABLE promo_usage IS 'Track promo usage per order';