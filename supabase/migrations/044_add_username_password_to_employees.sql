-- Add username and password_hash columns to employees table if they don't exist

DO $$
BEGIN
    -- Add username column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees' AND column_name = 'username'
    ) THEN
        ALTER TABLE employees ADD COLUMN username VARCHAR(50) UNIQUE;
    END IF;

    -- Add password_hash column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees' AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE employees ADD COLUMN password_hash TEXT;
    END IF;
END $$;

-- Create index on username if not exists
CREATE INDEX IF NOT EXISTS idx_employees_username ON employees(username);

-- Update existing employees to have username based on employee_code (temporary)
-- Password will need to be set manually for each employee
UPDATE employees
SET username = LOWER(employee_code)
WHERE username IS NULL;

-- Now make username NOT NULL
ALTER TABLE employees ALTER COLUMN username SET NOT NULL;

-- Add comment
COMMENT ON COLUMN employees.username IS 'Username for employee login (unique)';
COMMENT ON COLUMN employees.password_hash IS 'Bcrypt hashed password';
