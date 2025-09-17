-- =====================================================
-- BATCH 1 - FILE 1: Initial Database Setup
-- Purpose: Setup database extensions, basic configurations
-- Author: Cafe Management System
-- Date: 2024
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- For UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- For encryption
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gist";     -- For exclusion constraints
CREATE EXTENSION IF NOT EXISTS "cube";           -- For location calculations
CREATE EXTENSION IF NOT EXISTS "earthdistance";  -- For GPS distance calculations

-- Create custom types that will be used across tables
CREATE TYPE user_role AS ENUM (
    'owner',
    'employee', 
    'device',
    'customer'
);

CREATE TYPE employee_position AS ENUM (
    'kasir',
    'dapur',
    'pelayan',
    'stok'
);

CREATE TYPE order_status AS ENUM (
    'pending_payment',
    'payment_verification',
    'confirmed',
    'preparing',
    'ready',
    'delivered',
    'completed',
    'cancelled'
);

CREATE TYPE payment_method AS ENUM (
    'cash',
    'qris',
    'transfer',
    'card'
);

CREATE TYPE payment_status AS ENUM (
    'pending',
    'processing',
    'verified',
    'failed',
    'refunded'
);

CREATE TYPE salary_type AS ENUM (
    'monthly',
    'daily',
    'hourly'
);

CREATE TYPE promo_type AS ENUM (
    'percentage',
    'fixed_amount',
    'buy_get',
    'bundle',
    'happy_hour',
    'member'
);

-- Create schema for better organization (optional)
CREATE SCHEMA IF NOT EXISTS cafe;

-- Set default search path
SET search_path TO public, cafe;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate distance between two points (for GPS attendance)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 FLOAT, 
    lon1 FLOAT, 
    lat2 FLOAT, 
    lon2 FLOAT
) RETURNS FLOAT AS $$
BEGIN
    -- Returns distance in meters using Haversine formula
    RETURN earth_distance(
        ll_to_earth(lat1, lon1),
        ll_to_earth(lat2, lon2)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    today_date TEXT;
    order_count INT;
    new_order_number TEXT;
BEGIN
    today_date := TO_CHAR(CURRENT_DATE, 'YYMMDD');
    
    SELECT COUNT(*) + 1 INTO order_count
    FROM orders
    WHERE DATE(created_at) = CURRENT_DATE;
    
    new_order_number := 'ORD' || today_date || LPAD(order_count::TEXT, 4, '0');
    
    RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate employee code
CREATE OR REPLACE FUNCTION generate_employee_code()
RETURNS TEXT AS $$
DECLARE
    emp_count INT;
    new_code TEXT;
BEGIN
    SELECT COUNT(*) + 1 INTO emp_count FROM employees;
    new_code := 'EMP' || LPAD(emp_count::TEXT, 3, '0');
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON SCHEMA public IS 'Cafe Management System Database';