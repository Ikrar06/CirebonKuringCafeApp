-- =====================================================
-- CREATE RATINGS TABLE
-- Purpose: Store customer ratings and feedback for orders
-- =====================================================

-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    comment TEXT,

    -- Detailed aspect ratings (optional)
    food_quality INTEGER CHECK (food_quality >= 1 AND food_quality <= 5),
    service_quality INTEGER CHECK (service_quality >= 1 AND service_quality <= 5),
    cleanliness INTEGER CHECK (cleanliness >= 1 AND cleanliness <= 5),
    speed INTEGER CHECK (speed >= 1 AND speed <= 5),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint to prevent multiple ratings per order
    UNIQUE(order_id)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_ratings_order_id ON ratings(order_id);
CREATE INDEX IF NOT EXISTS idx_ratings_overall_rating ON ratings(overall_rating);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at DESC);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS ratings_updated_at ON ratings;
CREATE TRIGGER ratings_updated_at
    BEFORE UPDATE ON ratings
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Add RLS policies
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to ratings" ON ratings;
DROP POLICY IF EXISTS "Allow public insert access to ratings" ON ratings;
DROP POLICY IF EXISTS "Prevent updates to ratings" ON ratings;
DROP POLICY IF EXISTS "Prevent deletes to ratings" ON ratings;

-- Policy: Allow anyone to read ratings (for public display if needed)
CREATE POLICY "Allow public read access to ratings" ON ratings
    FOR SELECT USING (true);

-- Policy: Allow anyone to insert ratings (customers can rate their orders)
CREATE POLICY "Allow public insert access to ratings" ON ratings
    FOR INSERT WITH CHECK (true);

-- Policy: Prevent updates and deletes (ratings should be immutable)
CREATE POLICY "Prevent updates to ratings" ON ratings
    FOR UPDATE USING (false);

CREATE POLICY "Prevent deletes to ratings" ON ratings
    FOR DELETE USING (false);

-- Add column to orders table to track if order has been rated
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'rated'
    ) THEN
        ALTER TABLE orders ADD COLUMN rated BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add index for rated column
CREATE INDEX IF NOT EXISTS idx_orders_rated ON orders(rated);

-- Update existing orders to mark as unrated
UPDATE orders SET rated = false WHERE rated IS NULL;

-- Create a view for rating statistics with proper security
CREATE OR REPLACE VIEW rating_statistics
WITH (security_invoker = true) AS
SELECT
    AVG(overall_rating::DECIMAL) as average_overall_rating,
    AVG(food_quality::DECIMAL) as average_food_quality,
    AVG(service_quality::DECIMAL) as average_service_quality,
    AVG(cleanliness::DECIMAL) as average_cleanliness,
    AVG(speed::DECIMAL) as average_speed,
    COUNT(*) as total_ratings,
    COUNT(CASE WHEN overall_rating = 5 THEN 1 END) as five_star_ratings,
    COUNT(CASE WHEN overall_rating = 4 THEN 1 END) as four_star_ratings,
    COUNT(CASE WHEN overall_rating = 3 THEN 1 END) as three_star_ratings,
    COUNT(CASE WHEN overall_rating = 2 THEN 1 END) as two_star_ratings,
    COUNT(CASE WHEN overall_rating = 1 THEN 1 END) as one_star_ratings
FROM ratings
WHERE created_at >= NOW() - INTERVAL '30 days'; -- Last 30 days

-- Add RLS policy for the view access (inherits from ratings table policies)
-- Since we use security_invoker = true, the view will respect the ratings table RLS policies

-- Function to get order rating summary
CREATE OR REPLACE FUNCTION get_order_rating_summary(p_order_id UUID)
RETURNS JSON AS $$
DECLARE
    rating_data JSON;
BEGIN
    SELECT row_to_json(r.*) INTO rating_data
    FROM (
        SELECT
            r.overall_rating,
            r.comment,
            r.food_quality,
            r.service_quality,
            r.cleanliness,
            r.speed,
            r.created_at,
            o.customer_name,
            t.table_number
        FROM ratings r
        JOIN orders o ON r.order_id = o.id
        LEFT JOIN tables t ON o.table_id = t.id
        WHERE r.order_id = p_order_id
    ) r;

    RETURN COALESCE(rating_data, '{}');
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT 'Ratings table created successfully' as status;

COMMENT ON TABLE ratings IS 'Customer ratings and feedback for completed orders';
COMMENT ON COLUMN ratings.overall_rating IS 'Overall rating from 1-5 stars';
COMMENT ON COLUMN ratings.comment IS 'Optional customer feedback text';
COMMENT ON COLUMN ratings.food_quality IS 'Rating for food quality (1-5)';
COMMENT ON COLUMN ratings.service_quality IS 'Rating for service quality (1-5)';
COMMENT ON COLUMN ratings.cleanliness IS 'Rating for cleanliness (1-5)';
COMMENT ON COLUMN ratings.speed IS 'Rating for speed of service (1-5)';