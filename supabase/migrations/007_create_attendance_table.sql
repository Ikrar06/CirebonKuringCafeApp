-- =====================================================
-- BATCH 3 - FILE 1: Additional Attendance & Notifications
-- Purpose: GPS attendance validation and notification system
-- Dependencies: Batch 1 & 2 (users, employees)
-- =====================================================

-- Notification logs table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Recipient
    recipient_type VARCHAR(20) NOT NULL 
        CHECK (recipient_type IN ('owner', 'employee', 'customer', 'device')),
    recipient_id UUID, -- User or employee ID
    
    -- Channel and content
    channel VARCHAR(20) NOT NULL 
        CHECK (channel IN ('telegram', 'email', 'push', 'in_app', 'sms')),
    
    title VARCHAR(200),
    message TEXT NOT NULL,
    
    -- Telegram specific
    telegram_chat_id VARCHAR(50),
    telegram_message_id VARCHAR(50),
    
    -- Email specific
    email_address VARCHAR(255),
    email_subject VARCHAR(200),
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'cancelled')),
    
    -- Timestamps
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    -- Error handling
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Priority and scheduling
    priority VARCHAR(10) DEFAULT 'normal'
        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    scheduled_for TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- Indexes for notifications
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for) WHERE scheduled_for IS NOT NULL;

-- System settings table
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false, -- Can be accessed by non-owners
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT unique_setting_key UNIQUE(category, key)
);

-- Indexes for system_settings
CREATE INDEX idx_system_settings_category ON system_settings(category);
CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_public ON system_settings(is_public);

-- Trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Who performed the action
    user_id UUID REFERENCES users(id),
    user_role user_role,
    employee_id UUID REFERENCES employees(id),
    device_id UUID REFERENCES device_accounts(id),
    
    -- What was done
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', etc
    entity_type VARCHAR(50), -- 'order', 'menu_item', 'employee', etc
    entity_id UUID,
    
    -- Changes made
    old_values JSONB,
    new_values JSONB,
    
    -- Request information
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(20),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Customer sessions table (for tracking customer ordering sessions)
CREATE TABLE customer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) UNIQUE NOT NULL,
    table_id UUID REFERENCES tables(id),
    
    -- Customer info (optional)
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    
    -- Session tracking
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    
    -- Device info
    user_agent TEXT,
    ip_address INET,
    device_type VARCHAR(20),
    
    -- Order tracking
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(12, 2) DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for customer_sessions
CREATE INDEX idx_customer_sessions_table ON customer_sessions(table_id);
CREATE INDEX idx_customer_sessions_active ON customer_sessions(is_active);
CREATE INDEX idx_customer_sessions_session ON customer_sessions(session_id);

-- Insert default system settings
INSERT INTO system_settings (category, key, value, description, is_public) VALUES
    ('cafe', 'info', '{"name": "Cafe Digital", "address": "Jl. Example No. 1", "phone": "081234567890", "email": "info@cafe.com"}', 'Cafe basic information', true),
    ('cafe', 'location', '{"lat": -3.9868, "lng": 122.5149, "radius": 100}', 'Cafe GPS location for attendance', false),
    ('cafe', 'operating_hours', '{"monday": {"open": "07:00", "close": "22:00"}, "tuesday": {"open": "07:00", "close": "22:00"}}', 'Operating hours', true),
    ('payment', 'methods', '{"cash": true, "qris": true, "transfer": true, "card": false}', 'Accepted payment methods', true),
    ('payment', 'qris_info', '{"merchant_name": "Cafe Digital", "nmid": "ID1234567890"}', 'QRIS configuration', false),
    ('payment', 'bank_accounts', '[{"bank": "BCA", "account": "1234567890", "name": "PT Cafe Digital"}, {"bank": "Mandiri", "account": "0987654321", "name": "PT Cafe Digital"}]', 'Bank accounts for transfer', true),
    ('tax', 'rates', '{"ppn": 11, "service": 5}', 'Tax and service charge rates', false),
    ('telegram', 'bot_config', '{"bot_token": "", "bot_username": ""}', 'Telegram bot configuration', false),
    ('attendance', 'rules', '{"max_distance": 100, "late_tolerance": 15, "break_duration": 30}', 'Attendance rules', false),
    ('inventory', 'alerts', '{"low_stock_percentage": 20, "expiry_warning_days": 7}', 'Inventory alert settings', false);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_recipient_type VARCHAR,
    p_recipient_id UUID,
    p_channel VARCHAR,
    p_title VARCHAR,
    p_message TEXT,
    p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_telegram_chat_id VARCHAR(50);
    v_email VARCHAR(255);
BEGIN
    -- Get recipient contact based on type
    IF p_recipient_type = 'employee' AND p_channel = 'telegram' THEN
        SELECT telegram_chat_id INTO v_telegram_chat_id
        FROM employees WHERE id = p_recipient_id;
    END IF;
    
    -- Insert notification
    INSERT INTO notifications (
        recipient_type,
        recipient_id,
        channel,
        title,
        message,
        telegram_chat_id,
        email_address,
        metadata
    ) VALUES (
        p_recipient_type,
        p_recipient_id,
        p_channel,
        p_title,
        p_message,
        v_telegram_chat_id,
        v_email,
        p_metadata
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log audit
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values
    ) VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id
            ELSE NEW.id
        END,
        CASE 
            WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD)
            ELSE NULL
        END,
        CASE 
            WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW)
            ELSE NULL
        END
    );
    
    RETURN CASE 
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_sessions ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE notifications IS 'Notification queue for all channels';
COMMENT ON TABLE system_settings IS 'System configuration settings';
COMMENT ON TABLE audit_logs IS 'Audit trail for all system actions';
COMMENT ON TABLE customer_sessions IS 'Customer ordering session tracking';