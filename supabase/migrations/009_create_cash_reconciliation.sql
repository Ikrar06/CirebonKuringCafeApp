-- =====================================================
-- BATCH 3 - FILE 3: Cash Reconciliation (FIXED)
-- Purpose: Daily cash management and tracking
-- Dependencies: Batch 1 & 2 (users, orders, device_sessions)
-- =====================================================

-- Cash reconciliation table
CREATE TABLE cash_reconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Session reference
    device_session_id UUID REFERENCES device_sessions(id),
    device_id UUID REFERENCES device_accounts(id),
    kasir_id UUID REFERENCES employees(id),
    
    -- Date and shift
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift VARCHAR(20) DEFAULT 'regular'
        CHECK (shift IN ('morning', 'afternoon', 'evening', 'regular')),
    
    -- Starting cash (modal)
    starting_cash DECIMAL(12, 2) NOT NULL DEFAULT 500000,
    
    -- System calculated (from orders)
    system_cash_sales DECIMAL(12, 2) DEFAULT 0,
    system_cash_returns DECIMAL(12, 2) DEFAULT 0,
    system_expected_cash DECIMAL(12, 2) GENERATED ALWAYS AS 
        (starting_cash + system_cash_sales - system_cash_returns) STORED,
    
    -- Actual count
    actual_cash DECIMAL(12, 2),
    
    -- Denomination breakdown
    denomination_breakdown JSONB, -- {"100000": 5, "50000": 10, "20000": 20, ...}
    
    -- Variance (calculated, not generated)
    variance DECIMAL(12, 2) GENERATED ALWAYS AS 
        (actual_cash - (starting_cash + system_cash_sales - system_cash_returns)) STORED,
    
    -- Variance percentage (calculated differently to avoid referencing variance)
    variance_percentage DECIMAL(5, 2) GENERATED ALWAYS AS 
        (CASE 
            WHEN (starting_cash + system_cash_sales - system_cash_returns) > 0 
            THEN ((actual_cash - (starting_cash + system_cash_sales - system_cash_returns)) / (starting_cash + system_cash_sales - system_cash_returns)) * 100
            ELSE 0
        END) STORED,
    
    -- Status
    status VARCHAR(20) DEFAULT 'open'
        CHECK (status IN ('open', 'closed', 'verified', 'discrepancy')),
    
    -- Variance handling
    variance_reason TEXT,
    variance_approved BOOLEAN DEFAULT false,
    variance_approved_by UUID REFERENCES users(id),
    variance_approved_at TIMESTAMPTZ,
    
    -- Timestamps
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alternative: If still error, use simpler version without generated columns
-- DROP TABLE IF EXISTS cash_reconciliation CASCADE;
-- CREATE TABLE cash_reconciliation (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     
--     -- Session reference
--     device_session_id UUID REFERENCES device_sessions(id),
--     device_id UUID REFERENCES device_accounts(id),
--     kasir_id UUID REFERENCES employees(id),
--     
--     -- Date and shift
--     date DATE NOT NULL DEFAULT CURRENT_DATE,
--     shift VARCHAR(20) DEFAULT 'regular'
--         CHECK (shift IN ('morning', 'afternoon', 'evening', 'regular')),
--     
--     -- Starting cash (modal)
--     starting_cash DECIMAL(12, 2) NOT NULL DEFAULT 500000,
--     
--     -- System calculated (from orders)
--     system_cash_sales DECIMAL(12, 2) DEFAULT 0,
--     system_cash_returns DECIMAL(12, 2) DEFAULT 0,
--     
--     -- Actual count
--     actual_cash DECIMAL(12, 2),
--     
--     -- Denomination breakdown
--     denomination_breakdown JSONB,
--     
--     -- Variance (will be calculated in application/function)
--     variance DECIMAL(12, 2),
--     variance_percentage DECIMAL(5, 2),
--     
--     -- Status
--     status VARCHAR(20) DEFAULT 'open'
--         CHECK (status IN ('open', 'closed', 'verified', 'discrepancy')),
--     
--     -- Variance handling
--     variance_reason TEXT,
--     variance_approved BOOLEAN DEFAULT false,
--     variance_approved_by UUID REFERENCES users(id),
--     variance_approved_at TIMESTAMPTZ,
--     
--     -- Timestamps
--     opened_at TIMESTAMPTZ DEFAULT NOW(),
--     closed_at TIMESTAMPTZ,
--     
--     -- Notes
--     notes TEXT,
--     
--     -- Metadata
--     created_at TIMESTAMPTZ DEFAULT NOW(),
--     updated_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- Indexes for cash_reconciliation
CREATE INDEX idx_cash_reconciliation_date ON cash_reconciliation(date DESC);
CREATE INDEX idx_cash_reconciliation_kasir ON cash_reconciliation(kasir_id);
CREATE INDEX idx_cash_reconciliation_device ON cash_reconciliation(device_id);
CREATE INDEX idx_cash_reconciliation_status ON cash_reconciliation(status);

-- Trigger for updated_at
CREATE TRIGGER update_cash_reconciliation_updated_at BEFORE UPDATE ON cash_reconciliation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Daily analytics summary
CREATE TABLE daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE UNIQUE NOT NULL,
    
    -- Order metrics
    total_orders INTEGER DEFAULT 0,
    completed_orders INTEGER DEFAULT 0,
    cancelled_orders INTEGER DEFAULT 0,
    
    -- Revenue metrics
    gross_revenue DECIMAL(12, 2) DEFAULT 0,
    net_revenue DECIMAL(12, 2) DEFAULT 0,
    total_tax DECIMAL(10, 2) DEFAULT 0,
    total_service_charge DECIMAL(10, 2) DEFAULT 0,
    total_discounts DECIMAL(10, 2) DEFAULT 0,
    
    -- Payment breakdown
    cash_orders INTEGER DEFAULT 0,
    cash_amount DECIMAL(12, 2) DEFAULT 0,
    qris_orders INTEGER DEFAULT 0,
    qris_amount DECIMAL(12, 2) DEFAULT 0,
    transfer_orders INTEGER DEFAULT 0,
    transfer_amount DECIMAL(12, 2) DEFAULT 0,
    
    -- Average metrics
    avg_order_value DECIMAL(10, 2),
    avg_preparation_time INTEGER, -- minutes
    avg_table_turnover INTEGER, -- minutes
    
    -- Customer metrics
    total_customers INTEGER DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0,
    avg_rating DECIMAL(3, 2),
    
    -- Peak analysis
    peak_hour INTEGER, -- 0-23
    peak_hour_orders INTEGER,
    
    -- Staff metrics
    total_staff_hours DECIMAL(6, 2),
    overtime_hours DECIMAL(6, 2),
    labor_cost DECIMAL(12, 2),
    
    -- Inventory metrics
    total_stock_value DECIMAL(12, 2),
    waste_value DECIMAL(10, 2),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for daily_analytics
CREATE INDEX idx_daily_analytics_date ON daily_analytics(date DESC);

-- Trigger for updated_at
CREATE TRIGGER update_daily_analytics_updated_at BEFORE UPDATE ON daily_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to close cash reconciliation (updated to calculate variance)
CREATE OR REPLACE FUNCTION close_cash_reconciliation(
    p_reconciliation_id UUID,
    p_actual_cash DECIMAL,
    p_denomination_breakdown JSONB,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_reconciliation RECORD;
    v_expected_cash DECIMAL;
    v_variance DECIMAL;
    v_variance_pct DECIMAL;
    v_status VARCHAR(20);
BEGIN
    -- Get reconciliation record
    SELECT * INTO v_reconciliation
    FROM cash_reconciliation
    WHERE id = p_reconciliation_id AND status = 'open';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Reconciliation not found or already closed');
    END IF;
    
    -- Calculate expected cash and variance
    v_expected_cash := v_reconciliation.starting_cash + 
                       v_reconciliation.system_cash_sales - 
                       v_reconciliation.system_cash_returns;
    v_variance := p_actual_cash - v_expected_cash;
    
    -- Calculate percentage
    IF v_expected_cash > 0 THEN
        v_variance_pct := (v_variance / v_expected_cash) * 100;
    ELSE
        v_variance_pct := 0;
    END IF;
    
    -- Determine status based on variance
    IF ABS(v_variance) <= 10000 THEN -- Tolerance: Rp 10,000
        v_status := 'closed';
    ELSE
        v_status := 'discrepancy';
    END IF;
    
    -- Update reconciliation
    UPDATE cash_reconciliation
    SET actual_cash = p_actual_cash,
        denomination_breakdown = p_denomination_breakdown,
        status = v_status,
        closed_at = NOW(),
        notes = p_notes
    WHERE id = p_reconciliation_id;
    
    -- Create notification if discrepancy
    IF v_status = 'discrepancy' THEN
        PERFORM create_notification(
            'owner',
            NULL,
            'telegram',
            'Cash Discrepancy Alert',
            format('Cash variance of Rp %s detected for %s', 
                   v_variance, v_reconciliation.date),
            jsonb_build_object('reconciliation_id', p_reconciliation_id)
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'variance', v_variance,
        'variance_percentage', v_variance_pct,
        'status', v_status
    );
END;
$$ LANGUAGE plpgsql;

-- Function to generate daily analytics
CREATE OR REPLACE FUNCTION generate_daily_analytics(p_date DATE)
RETURNS UUID AS $$
DECLARE
    v_analytics_id UUID;
BEGIN
    -- Insert or update daily analytics
    INSERT INTO daily_analytics (date)
    VALUES (p_date)
    ON CONFLICT (date) DO UPDATE SET updated_at = NOW()
    RETURNING id INTO v_analytics_id;
    
    -- Update order metrics
    UPDATE daily_analytics
    SET (total_orders, completed_orders, cancelled_orders, gross_revenue, total_discounts) = (
        SELECT 
            COUNT(*),
            COUNT(*) FILTER (WHERE status = 'completed'),
            COUNT(*) FILTER (WHERE status = 'cancelled'),
            COALESCE(SUM(total_amount), 0),
            COALESCE(SUM(discount_amount), 0)
        FROM orders
        WHERE DATE(created_at) = p_date
    )
    WHERE id = v_analytics_id;
    
    -- Update payment breakdown
    UPDATE daily_analytics
    SET (cash_orders, cash_amount, qris_orders, qris_amount, transfer_orders, transfer_amount) = (
        SELECT 
            COUNT(*) FILTER (WHERE payment_method = 'cash'),
            COALESCE(SUM(total_amount) FILTER (WHERE payment_method = 'cash'), 0),
            COUNT(*) FILTER (WHERE payment_method = 'qris'),
            COALESCE(SUM(total_amount) FILTER (WHERE payment_method = 'qris'), 0),
            COUNT(*) FILTER (WHERE payment_method = 'transfer'),
            COALESCE(SUM(total_amount) FILTER (WHERE payment_method = 'transfer'), 0)
        FROM orders
        WHERE DATE(created_at) = p_date AND status = 'completed'
    )
    WHERE id = v_analytics_id;
    
    -- Calculate averages
    UPDATE daily_analytics
    SET avg_order_value = CASE 
            WHEN total_orders > 0 THEN gross_revenue / total_orders
            ELSE 0
        END
    WHERE id = v_analytics_id;
    
    RETURN v_analytics_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE cash_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE cash_reconciliation IS 'Daily cash drawer reconciliation';
COMMENT ON TABLE daily_analytics IS 'Pre-calculated daily business metrics';