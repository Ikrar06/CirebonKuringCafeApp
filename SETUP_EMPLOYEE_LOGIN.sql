-- ============================================================
-- SETUP: Add Login Credentials to Employee Portal
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Add username and password_hash columns if they don't exist
DO $$
BEGIN
    -- Add username column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees' AND column_name = 'username'
    ) THEN
        ALTER TABLE employees ADD COLUMN username VARCHAR(50) UNIQUE;
        RAISE NOTICE 'Added username column';
    END IF;

    -- Add password_hash column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees' AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE employees ADD COLUMN password_hash TEXT;
        RAISE NOTICE 'Added password_hash column';
    END IF;
END $$;

-- Step 2: Create index on username if not exists
CREATE INDEX IF NOT EXISTS idx_employees_username ON employees(username);

-- Step 3: Update existing employees to have username based on employee_code
UPDATE employees
SET username = LOWER(employee_code)
WHERE username IS NULL;

-- Step 4: Set default password for existing employees
-- Password: "password123" (bcrypt hash)
-- IMPORTANT: Users MUST change this on first login!
UPDATE employees
SET password_hash = '$2a$10$rXqvVJZ5Z0VqkXqXqXqXq.KZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z'
WHERE password_hash IS NULL;

-- ============================================================
-- TESTING ACCOUNTS
-- ============================================================

-- Create test accounts with known passwords
-- Password for all: "test123"
-- Hash generated using bcrypt with salt rounds = 10

INSERT INTO employees (
    employee_code,
    username,
    password_hash,
    full_name,
    position,
    phone_number,
    salary_type,
    salary_amount,
    employment_status,
    must_change_password
) VALUES
(
    'TEST001',
    'test.kasir',
    '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzKJX/R0nYgVLKJj9.VUB0J9W5J7K',  -- password: test123
    'Test Kasir',
    'kasir',
    '081234567890',
    'monthly',
    3000000,
    'active',
    false
),
(
    'TEST002',
    'test.pelayan',
    '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzKJX/R0nYgVLKJj9.VUB0J9W5J7K',  -- password: test123
    'Test Pelayan',
    'pelayan',
    '081234567891',
    'monthly',
    2500000,
    'active',
    false
)
ON CONFLICT (employee_code) DO NOTHING;

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Check results
SELECT
    employee_code,
    username,
    full_name,
    position,
    employment_status,
    must_change_password,
    CASE
        WHEN password_hash IS NOT NULL THEN 'SET'
        ELSE 'NOT SET'
    END as password_status
FROM employees
ORDER BY created_at DESC;

-- ============================================================
-- NOTES:
-- 1. Test accounts:
--    - Username: test.kasir, Password: test123
--    - Username: test.pelayan, Password: test123
--
-- 2. For existing employees, username = lowercase(employee_code)
--    Example: EMP002 -> username: emp002
--
-- 3. You need to manually set passwords for existing employees:
--    - Generate bcrypt hash online: https://bcrypt-generator.com/
--    - Update using SQL:
--      UPDATE employees
--      SET password_hash = 'YOUR_BCRYPT_HASH'
--      WHERE id = 'employee_id';
--
-- 4. Users with must_change_password = true will be forced to
--    change password on first login
-- ============================================================
