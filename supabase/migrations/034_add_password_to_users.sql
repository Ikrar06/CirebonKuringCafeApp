-- =====================================================
-- Add password_hash field to users table for owner authentication
-- =====================================================

-- Add password_hash field to users table
ALTER TABLE users
ADD COLUMN password_hash TEXT;

-- Update existing owner with hashed password FIRST
-- Password: 'admin123' -> bcrypt hash
UPDATE users
SET password_hash = '$2b$10$KAcsV21FDDgrJ0wX94ld4.hxL2Lws/KlTzqXBZFq.8OfJYws/8aYu'
WHERE email = 'owner@cafe.com' AND role = 'owner';

-- Add constraint to ensure password is required for owner role
-- (Add this AFTER updating existing owners)
ALTER TABLE users
ADD CONSTRAINT check_owner_password
CHECK (
  (role = 'owner' AND password_hash IS NOT NULL) OR
  (role != 'owner')
);

-- Add comment for documentation
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password for owner and admin users';