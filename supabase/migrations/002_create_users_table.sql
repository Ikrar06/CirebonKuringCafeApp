-- =====================================================
-- BATCH 1 - FILE 2: Users and Authentication Tables
-- Purpose: Create users, employees, and device accounts
-- Dependencies: 001_initial_schema.sql
-- =====================================================

-- Main users table (integrated with Supabase Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'customer',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Create index for performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- Trigger for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Employees table (extends users for employee-specific data)
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Authentication
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    must_change_password BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    
    -- Personal Information
    employee_code VARCHAR(20) UNIQUE NOT NULL DEFAULT generate_employee_code(),
    full_name VARCHAR(100) NOT NULL,
    position employee_position NOT NULL,
    phone_number VARCHAR(20),
    address TEXT,
    emergency_contact VARCHAR(100),
    emergency_phone VARCHAR(20),
    
    -- Telegram Integration
    telegram_chat_id VARCHAR(50),
    telegram_notifications_enabled BOOLEAN DEFAULT true,
    
    -- Salary Information
    salary_type salary_type NOT NULL DEFAULT 'monthly',
    salary_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    overtime_rate DECIMAL(5, 2) DEFAULT 1.5,
    
    -- Employment Details
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    employment_status VARCHAR(20) DEFAULT 'active' 
        CHECK (employment_status IN ('active', 'inactive', 'suspended', 'terminated')),
    contract_end_date DATE,
    
    -- Leave Balance
    annual_leave_balance INTEGER DEFAULT 12,
    sick_leave_balance INTEGER DEFAULT 30,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT valid_phone CHECK (phone_number ~ '^\+?[0-9]{10,15}$'),
    CONSTRAINT valid_salary CHECK (salary_amount >= 0),
    CONSTRAINT valid_overtime_rate CHECK (overtime_rate >= 1)
);

-- Indexes for employees
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_position ON employees(position);
CREATE INDEX idx_employees_telegram ON employees(telegram_chat_id);
CREATE INDEX idx_employees_username ON employees(username);
CREATE INDEX idx_employees_status ON employees(employment_status);

-- Trigger for updated_at
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Device accounts table (for tablets)
CREATE TABLE device_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_code VARCHAR(20) UNIQUE NOT NULL,
    device_type employee_position NOT NULL, -- kasir, dapur, pelayan, stok
    device_name VARCHAR(50) NOT NULL,
    location VARCHAR(100),
    
    -- Device Information
    device_model VARCHAR(50),
    android_version VARCHAR(20),
    app_version VARCHAR(20),
    last_update_check TIMESTAMPTZ,
    
    -- Authentication
    device_token TEXT UNIQUE, -- For push notifications
    api_key TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64'),
    
    -- Current Session (for kasir/stok that need employee login)
    current_employee_id UUID REFERENCES employees(id),
    employee_login_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_active TIMESTAMPTZ,
    battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_device_code CHECK (device_code ~ '^device_[a-z]+_[0-9]{2}$')
);

-- Indexes for device_accounts
CREATE INDEX idx_device_accounts_type ON device_accounts(device_type);
CREATE INDEX idx_device_accounts_active ON device_accounts(is_active);
CREATE INDEX idx_device_accounts_employee ON device_accounts(current_employee_id);

-- Trigger for updated_at
CREATE TRIGGER update_device_accounts_updated_at BEFORE UPDATE ON device_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Device login sessions (for tracking kasir/stok accountability)
CREATE TABLE device_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES device_accounts(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    
    -- Session timing
    login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logout_at TIMESTAMPTZ,
    session_duration INTERVAL GENERATED ALWAYS AS (logout_at - login_at) STORED,
    
    -- Activity Summary
    transactions_processed INTEGER DEFAULT 0,
    total_amount_handled DECIMAL(12, 2) DEFAULT 0,
    
    -- Cash reconciliation (for kasir)
    starting_cash DECIMAL(12, 2),
    ending_cash DECIMAL(12, 2),
    cash_variance DECIMAL(12, 2),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_session CHECK (logout_at IS NULL OR logout_at > login_at)
);

-- Indexes for device_sessions
CREATE INDEX idx_device_sessions_device ON device_sessions(device_id);
CREATE INDEX idx_device_sessions_employee ON device_sessions(employee_id);
CREATE INDEX idx_device_sessions_login ON device_sessions(login_at DESC);

-- Insert default owner account
INSERT INTO users (email, role) 
VALUES ('owner@cafe.com', 'owner');

-- Insert default device accounts
INSERT INTO device_accounts (device_code, device_type, device_name, location) VALUES
    ('device_kasir_01', 'kasir', 'Kasir Counter 1', 'Front Counter'),
    ('device_kasir_02', 'kasir', 'Kasir Counter 2', 'Front Counter'),
    ('device_dapur_01', 'dapur', 'Kitchen Display', 'Kitchen'),
    ('device_pelayan_01', 'pelayan', 'Waiter Tablet 1', 'Dining Area'),
    ('device_pelayan_02', 'pelayan', 'Waiter Tablet 2', 'Dining Area'),
    ('device_stok_01', 'stok', 'Inventory Tablet', 'Storage Room');

-- Comments for documentation
COMMENT ON TABLE users IS 'Main users table for authentication';
COMMENT ON TABLE employees IS 'Employee specific information and settings';
COMMENT ON TABLE device_accounts IS 'Tablet device accounts for different roles';
COMMENT ON TABLE device_sessions IS 'Track employee sessions on devices';