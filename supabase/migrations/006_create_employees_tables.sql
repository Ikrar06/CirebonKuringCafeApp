-- =====================================================
-- BATCH 2 - FILE 3: Employee Management Tables
-- Purpose: Attendance, payroll, leave management
-- Dependencies: Batch 1 (employees, users)
-- =====================================================

-- Attendance table
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Schedule
    scheduled_in TIME,
    scheduled_out TIME,
    shift_type VARCHAR(20) DEFAULT 'regular' 
        CHECK (shift_type IN ('regular', 'overtime', 'holiday', 'special')),
    
    -- Actual clock times
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    
    -- Break tracking
    break_start TIMESTAMPTZ,
    break_end TIMESTAMPTZ,
    total_break_minutes INTEGER DEFAULT 0,
    
    -- Overtime
    overtime_start TIMESTAMPTZ,
    overtime_end TIMESTAMPTZ,
    overtime_hours DECIMAL(4, 2) DEFAULT 0,
    overtime_reason TEXT,
    overtime_approved BOOLEAN DEFAULT false,
    overtime_approved_by UUID REFERENCES users(id),
    overtime_approved_at TIMESTAMPTZ,
    
    -- GPS validation
    clock_in_location POINT, -- PostgreSQL point type for lat/long
    clock_out_location POINT,
    clock_in_distance DECIMAL(10, 2), -- Distance from cafe in meters
    clock_out_distance DECIMAL(10, 2),
    
    -- Hours calculation
    regular_hours DECIMAL(4, 2) DEFAULT 0,
    total_hours DECIMAL(4, 2) DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'absent'
        CHECK (status IN ('present', 'absent', 'late', 'half_day', 'holiday', 'leave', 'sick')),
    
    -- Late/early tracking
    late_minutes INTEGER DEFAULT 0,
    early_leave_minutes INTEGER DEFAULT 0,
    
    -- Manual override
    is_manual_entry BOOLEAN DEFAULT false,
    manual_entry_reason TEXT,
    manual_entry_by UUID REFERENCES users(id),
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_attendance_per_day UNIQUE(employee_id, date),
    CONSTRAINT valid_clock_times CHECK (clock_out IS NULL OR clock_out > clock_in),
    CONSTRAINT valid_break_times CHECK (break_end IS NULL OR break_end > break_start)
);

-- Indexes for attendance
CREATE INDEX idx_attendance_employee ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date DESC);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_attendance_overtime ON attendance(overtime_hours) WHERE overtime_hours > 0;

-- Trigger for updated_at
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Leave requests table
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Leave details
    leave_type VARCHAR(20) NOT NULL
        CHECK (leave_type IN ('annual', 'sick', 'personal', 'unpaid', 'maternity', 'paternity')),
    
    -- Date range
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    
    -- Reason and documentation
    reason TEXT NOT NULL,
    attachment_url TEXT, -- For sick leave certificates, etc.
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    
    -- Approval
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    -- Emergency contact (for extended leave)
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_leave_dates CHECK (end_date >= start_date),
    CONSTRAINT valid_total_days CHECK (total_days > 0)
);

-- Indexes for leave_requests
CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- Trigger for updated_at
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Payroll records table
CREATE TABLE payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Period
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year >= 2024),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Attendance summary
    total_days INTEGER,
    present_days INTEGER,
    absent_days INTEGER,
    leave_days INTEGER,
    holiday_days INTEGER,
    late_days INTEGER,
    
    -- Hours worked
    regular_hours DECIMAL(6, 2),
    overtime_hours DECIMAL(6, 2),
    
    -- Earnings
    basic_salary DECIMAL(12, 2),
    overtime_pay DECIMAL(10, 2),
    holiday_pay DECIMAL(10, 2),
    allowances DECIMAL(10, 2),
    bonus DECIMAL(10, 2),
    gross_salary DECIMAL(12, 2),
    
    -- Deductions
    tax_deduction DECIMAL(10, 2),
    insurance_deduction DECIMAL(10, 2),
    loan_deduction DECIMAL(10, 2),
    late_deduction DECIMAL(10, 2),
    absence_deduction DECIMAL(10, 2),
    -- (continuing 006_create_employees_tables.sql)
    other_deductions DECIMAL(10, 2),
    total_deductions DECIMAL(10, 2),
    
    -- Net payment
    net_salary DECIMAL(12, 2),
    
    -- Payment details
    payment_method VARCHAR(30) DEFAULT 'transfer'
        CHECK (payment_method IN ('transfer', 'cash', 'check')),
    payment_date DATE,
    payment_reference VARCHAR(100),
    payment_status VARCHAR(20) DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed')),
    
    -- Documentation
    payslip_url TEXT,
    
    -- Processing
    generated_at TIMESTAMPTZ,
    generated_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_payroll_per_month UNIQUE(employee_id, month, year),
    CONSTRAINT valid_amounts CHECK (
        gross_salary >= 0 AND 
        total_deductions >= 0 AND 
        net_salary >= 0
    )
);

-- Indexes for payroll
CREATE INDEX idx_payroll_employee ON payroll(employee_id);
CREATE INDEX idx_payroll_period ON payroll(year DESC, month DESC);
CREATE INDEX idx_payroll_status ON payroll(payment_status);

-- Trigger for updated_at
CREATE TRIGGER update_payroll_updated_at BEFORE UPDATE ON payroll
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Shift schedule table
CREATE TABLE shift_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Schedule details
    date DATE NOT NULL,
    shift_start TIME NOT NULL,
    shift_end TIME NOT NULL,
    
    -- Break time
    break_duration INTEGER DEFAULT 30, -- minutes
    
    -- Type
    shift_type VARCHAR(20) DEFAULT 'regular'
        CHECK (shift_type IN ('regular', 'overtime', 'holiday', 'special')),
    
    -- Status
    is_confirmed BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    
    -- Swap request
    swap_requested_with UUID REFERENCES employees(id),
    swap_approved BOOLEAN,
    swap_approved_by UUID REFERENCES users(id),
    swap_approved_at TIMESTAMPTZ,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT unique_shift_per_employee_per_day UNIQUE(employee_id, date),
    CONSTRAINT valid_shift_times CHECK (shift_end > shift_start)
);

-- Indexes for shift_schedules
CREATE INDEX idx_shift_schedules_employee ON shift_schedules(employee_id);
CREATE INDEX idx_shift_schedules_date ON shift_schedules(date);
CREATE INDEX idx_shift_schedules_published ON shift_schedules(is_published);

-- Trigger for updated_at
CREATE TRIGGER update_shift_schedules_updated_at BEFORE UPDATE ON shift_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Overtime requests table
CREATE TABLE overtime_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Request details
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    hours DECIMAL(4, 2) NOT NULL,
    
    -- Reason
    reason TEXT NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    
    -- Approval
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    -- Link to actual attendance
    attendance_id UUID REFERENCES attendance(id),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_overtime_times CHECK (end_time > start_time),
    CONSTRAINT valid_hours CHECK (hours > 0 AND hours <= 12) -- Max 12 hours overtime
);

-- Indexes for overtime_requests
CREATE INDEX idx_overtime_requests_employee ON overtime_requests(employee_id);
CREATE INDEX idx_overtime_requests_date ON overtime_requests(date);
CREATE INDEX idx_overtime_requests_status ON overtime_requests(status);

-- Trigger for updated_at
CREATE TRIGGER update_overtime_requests_updated_at BEFORE UPDATE ON overtime_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION calculate_attendance_hours()
RETURNS TRIGGER AS $$
DECLARE
    v_scheduled_hours DECIMAL(4, 2);
    v_actual_hours DECIMAL(4, 2);
    v_break_hours DECIMAL(4, 2);
    v_clock_in_time TIME;
    v_clock_out_time TIME;
BEGIN
    -- Calculate scheduled hours
    IF NEW.scheduled_out IS NOT NULL AND NEW.scheduled_in IS NOT NULL THEN
        v_scheduled_hours := EXTRACT(EPOCH FROM (NEW.scheduled_out - NEW.scheduled_in)) / 3600;
    ELSE
        v_scheduled_hours := 8; -- Default 8 hours
    END IF;
    
    -- Calculate actual hours worked
    IF NEW.clock_out IS NOT NULL AND NEW.clock_in IS NOT NULL THEN
        v_actual_hours := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600;
        
        -- Subtract break time
        IF NEW.break_end IS NOT NULL AND NEW.break_start IS NOT NULL THEN
            v_break_hours := EXTRACT(EPOCH FROM (NEW.break_end - NEW.break_start)) / 3600;
            v_actual_hours := v_actual_hours - v_break_hours;
            NEW.total_break_minutes := v_break_hours * 60;
        END IF;
        
        -- Calculate regular and overtime hours
        IF v_actual_hours > v_scheduled_hours THEN
            NEW.regular_hours := v_scheduled_hours;
            NEW.overtime_hours := v_actual_hours - v_scheduled_hours;
        ELSE
            NEW.regular_hours := v_actual_hours;
            NEW.overtime_hours := 0;
        END IF;
        
        NEW.total_hours := v_actual_hours;
        
        -- Calculate late minutes
        IF NEW.scheduled_in IS NOT NULL AND NEW.clock_in IS NOT NULL THEN
            -- Extract time from timestamptz
            v_clock_in_time := NEW.clock_in::TIME;
            
            IF v_clock_in_time > NEW.scheduled_in THEN
                NEW.late_minutes := EXTRACT(EPOCH FROM (v_clock_in_time - NEW.scheduled_in)) / 60;
                NEW.status := 'late';
            ELSE
                NEW.status := 'present';
            END IF;
        END IF;
        
        -- Calculate early leave minutes
        IF NEW.scheduled_out IS NOT NULL AND NEW.clock_out IS NOT NULL THEN
            -- Extract time from timestamptz
            v_clock_out_time := NEW.clock_out::TIME;
            
            IF v_clock_out_time < NEW.scheduled_out THEN
                NEW.early_leave_minutes := EXTRACT(EPOCH FROM (NEW.scheduled_out - v_clock_out_time)) / 60;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate hours on attendance update
CREATE TRIGGER calculate_attendance_hours_trigger
BEFORE INSERT OR UPDATE ON attendance
FOR EACH ROW EXECUTE FUNCTION calculate_attendance_hours();

-- Function to validate GPS location for attendance
CREATE OR REPLACE FUNCTION validate_attendance_location()
RETURNS TRIGGER AS $$
DECLARE
    v_cafe_location POINT := POINT(-3.9868, 122.5149); -- Cafe location (Kendari example)
    v_max_distance DECIMAL := 100; -- 100 meters
    v_distance DECIMAL;
BEGIN
    -- Check clock in location
    IF NEW.clock_in_location IS NOT NULL THEN
        v_distance := calculate_distance(
            v_cafe_location[0], v_cafe_location[1],
            NEW.clock_in_location[0], NEW.clock_in_location[1]
        );
        NEW.clock_in_distance := v_distance;
        
        IF v_distance > v_max_distance THEN
            RAISE EXCEPTION 'Clock in location is too far from cafe (% meters)', v_distance;
        END IF;
    END IF;
    
    -- Check clock out location
    IF NEW.clock_out_location IS NOT NULL THEN
        v_distance := calculate_distance(
            v_cafe_location[0], v_cafe_location[1],
            NEW.clock_out_location[0], NEW.clock_out_location[1]
        );
        NEW.clock_out_distance := v_distance;
        
        IF v_distance > v_max_distance THEN
            RAISE EXCEPTION 'Clock out location is too far from cafe (% meters)', v_distance;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate location on attendance
CREATE TRIGGER validate_attendance_location_trigger
BEFORE INSERT OR UPDATE ON attendance
FOR EACH ROW EXECUTE FUNCTION validate_attendance_location();

-- Function to calculate monthly payroll
CREATE OR REPLACE FUNCTION calculate_monthly_payroll(
    p_employee_id UUID,
    p_month INTEGER,
    p_year INTEGER
) RETURNS UUID AS $$
DECLARE
    v_employee RECORD;
    v_attendance_summary RECORD;
    v_payroll_id UUID;
    v_basic_salary DECIMAL(12, 2);
    v_overtime_pay DECIMAL(10, 2);
    v_deductions DECIMAL(10, 2) := 0;
BEGIN
    -- Get employee details
    SELECT * INTO v_employee FROM employees WHERE id = p_employee_id;
    
    -- Get attendance summary for the month
    SELECT 
        COUNT(DISTINCT date) as total_days,
        COUNT(DISTINCT date) FILTER (WHERE status = 'present') as present_days,
        COUNT(DISTINCT date) FILTER (WHERE status = 'absent') as absent_days,
        COUNT(DISTINCT date) FILTER (WHERE status IN ('leave', 'sick')) as leave_days,
        SUM(regular_hours) as total_regular_hours,
        SUM(overtime_hours) as total_overtime_hours,
        SUM(late_minutes) as total_late_minutes
    INTO v_attendance_summary
    FROM attendance
    WHERE employee_id = p_employee_id
        AND EXTRACT(MONTH FROM date) = p_month
        AND EXTRACT(YEAR FROM date) = p_year;
    
    -- Calculate basic salary based on salary type
    IF v_employee.salary_type = 'monthly' THEN
        v_basic_salary := v_employee.salary_amount;
        -- Deduct for absences
        IF v_attendance_summary.absent_days > 0 THEN
            v_deductions := v_deductions + (v_basic_salary / 30 * v_attendance_summary.absent_days);
        END IF;
    ELSIF v_employee.salary_type = 'daily' THEN
        v_basic_salary := v_employee.salary_amount * v_attendance_summary.present_days;
    ELSIF v_employee.salary_type = 'hourly' THEN
        v_basic_salary := v_employee.salary_amount * v_attendance_summary.total_regular_hours;
    END IF;
    
    -- Calculate overtime pay
    v_overtime_pay := v_employee.salary_amount / 173 * v_employee.overtime_rate * v_attendance_summary.total_overtime_hours;
    
    -- Calculate late deductions (example: 1% per 30 minutes late)
    IF v_attendance_summary.total_late_minutes > 0 THEN
        v_deductions := v_deductions + (v_basic_salary * 0.01 * (v_attendance_summary.total_late_minutes / 30));
    END IF;
    
    -- Insert payroll record
    INSERT INTO payroll (
        employee_id,
        month,
        year,
        period_start,
        period_end,
        total_days,
        present_days,
        absent_days,
        leave_days,
        regular_hours,
        overtime_hours,
        basic_salary,
        overtime_pay,
        gross_salary,
        total_deductions,
        net_salary,
        payment_status
    ) VALUES (
        p_employee_id,
        p_month,
        p_year,
        DATE(p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-01'),
        (DATE(p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-01') + INTERVAL '1 month - 1 day')::DATE,
        v_attendance_summary.total_days,
        v_attendance_summary.present_days,
        v_attendance_summary.absent_days,
        v_attendance_summary.leave_days,
        v_attendance_summary.total_regular_hours,
        v_attendance_summary.total_overtime_hours,
        v_basic_salary,
        v_overtime_pay,
        v_basic_salary + v_overtime_pay,
        v_deductions,
        v_basic_salary + v_overtime_pay - v_deductions,
        'pending'
    ) RETURNING id INTO v_payroll_id;
    
    RETURN v_payroll_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_requests ENABLE ROW LEVEL SECURITY;

-- Comments for documentation
COMMENT ON TABLE attendance IS 'Daily attendance tracking with GPS validation';
COMMENT ON TABLE leave_requests IS 'Employee leave requests and approvals';
COMMENT ON TABLE payroll IS 'Monthly payroll records';
COMMENT ON TABLE shift_schedules IS 'Employee shift scheduling';
COMMENT ON TABLE overtime_requests IS 'Overtime work requests and approvals';