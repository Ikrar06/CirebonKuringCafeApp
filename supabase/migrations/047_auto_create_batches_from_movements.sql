-- =====================================================
-- AUTO CREATE AND UPDATE STOCK BATCHES FROM MOVEMENTS
-- Purpose: Automatically create batch records for expiry tracking
-- Dependencies: stock_movements, stock_batches tables
-- =====================================================

-- Function to create or update batch when stock movement is recorded
CREATE OR REPLACE FUNCTION auto_manage_stock_batches()
RETURNS TRIGGER AS $$
DECLARE
    v_batch_id UUID;
    v_ingredient RECORD;
BEGIN
    -- Only process purchase movements with batch/expiry info
    IF NEW.movement_type = 'purchase' AND NEW.quantity > 0 THEN

        -- Get ingredient info
        SELECT * INTO v_ingredient FROM ingredients WHERE id = NEW.ingredient_id;

        -- Generate batch number if not provided
        IF NEW.batch_number IS NULL OR NEW.batch_number = '' THEN
            NEW.batch_number := 'BATCH-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS');
        END IF;

        -- Check if batch already exists (same ingredient + batch_number)
        SELECT id INTO v_batch_id
        FROM stock_batches
        WHERE ingredient_id = NEW.ingredient_id
        AND batch_number = NEW.batch_number;

        IF v_batch_id IS NOT NULL THEN
            -- Update existing batch
            UPDATE stock_batches
            SET
                remaining_quantity = remaining_quantity + NEW.quantity,
                initial_quantity = initial_quantity + NEW.quantity,
                updated_at = NOW()
            WHERE id = v_batch_id;

            RAISE NOTICE 'Updated existing batch % with quantity %', NEW.batch_number, NEW.quantity;
        ELSE
            -- Create new batch
            INSERT INTO stock_batches (
                ingredient_id,
                batch_number,
                supplier_id,
                initial_quantity,
                remaining_quantity,
                unit,
                unit_cost,
                received_date,
                manufacturing_date,
                expiry_date,
                is_active,
                is_expired
            ) VALUES (
                NEW.ingredient_id,
                NEW.batch_number,
                NEW.supplier_id,
                NEW.quantity,
                NEW.quantity,
                v_ingredient.unit,
                NEW.unit_cost,
                CURRENT_DATE,
                NEW.manufacturing_date,
                NEW.expiry_date,
                true,
                CASE
                    WHEN NEW.expiry_date IS NOT NULL AND NEW.expiry_date < CURRENT_DATE THEN true
                    ELSE false
                END
            );

            RAISE NOTICE 'Created new batch % with quantity %', NEW.batch_number, NEW.quantity;
        END IF;

    ELSIF NEW.movement_type IN ('usage', 'waste') AND NEW.quantity < 0 THEN
        -- For usage/waste, deduct from oldest batches (FIFO)
        -- This will be handled by a separate function if needed
        -- For now, just log it
        RAISE NOTICE 'Stock deducted via % movement: % units', NEW.movement_type, NEW.quantity;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-manage batches on stock movement
DROP TRIGGER IF EXISTS trigger_auto_manage_batches ON stock_movements;

CREATE TRIGGER trigger_auto_manage_batches
    BEFORE INSERT ON stock_movements
    FOR EACH ROW
    EXECUTE FUNCTION auto_manage_stock_batches();

-- Function to mark expired batches
CREATE OR REPLACE FUNCTION mark_expired_batches()
RETURNS void AS $$
BEGIN
    UPDATE stock_batches
    SET
        is_expired = true,
        is_active = false,
        updated_at = NOW()
    WHERE expiry_date IS NOT NULL
    AND expiry_date < CURRENT_DATE
    AND is_expired = false;

    RAISE NOTICE 'Marked expired batches';
END;
$$ LANGUAGE plpgsql;

-- Function to get batches for an ingredient ordered by expiry (earliest first)
CREATE OR REPLACE FUNCTION get_ingredient_batches(p_ingredient_id UUID)
RETURNS TABLE (
    id UUID,
    batch_number VARCHAR(50),
    supplier_name VARCHAR(100),
    initial_quantity DECIMAL(10, 3),
    remaining_quantity DECIMAL(10, 3),
    unit VARCHAR(20),
    unit_cost DECIMAL(10, 2),
    received_date DATE,
    manufacturing_date DATE,
    expiry_date DATE,
    days_until_expiry INTEGER,
    is_active BOOLEAN,
    is_expired BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sb.id,
        sb.batch_number,
        s.company_name as supplier_name,
        sb.initial_quantity,
        sb.remaining_quantity,
        sb.unit,
        sb.unit_cost,
        sb.received_date,
        sb.manufacturing_date,
        sb.expiry_date,
        CASE
            WHEN sb.expiry_date IS NOT NULL THEN
                EXTRACT(DAY FROM (sb.expiry_date - CURRENT_DATE))::INTEGER
            ELSE NULL
        END as days_until_expiry,
        sb.is_active,
        sb.is_expired
    FROM stock_batches sb
    LEFT JOIN suppliers s ON sb.supplier_id = s.id
    WHERE sb.ingredient_id = p_ingredient_id
    AND sb.remaining_quantity > 0
    ORDER BY
        CASE WHEN sb.expiry_date IS NULL THEN 1 ELSE 0 END, -- NULL expiry dates last
        sb.expiry_date ASC, -- Earliest expiry first
        sb.received_date ASC; -- Oldest received first (FIFO)
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION auto_manage_stock_batches() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_expired_batches() TO authenticated;
GRANT EXECUTE ON FUNCTION get_ingredient_batches(UUID) TO authenticated;

-- Comments
COMMENT ON FUNCTION auto_manage_stock_batches() IS
    'Automatically creates or updates batch records when purchase movements are recorded';

COMMENT ON FUNCTION mark_expired_batches() IS
    'Marks batches as expired based on expiry date';

COMMENT ON FUNCTION get_ingredient_batches(UUID) IS
    'Returns all batches for an ingredient ordered by expiry date (FIFO)';
