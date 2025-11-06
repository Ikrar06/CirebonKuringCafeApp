-- Fix validate_attendance_location() to read cafe location from system_settings
-- instead of using hardcoded coordinates

CREATE OR REPLACE FUNCTION public.validate_attendance_location()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
   v_cafe_lat DECIMAL;
   v_cafe_lng DECIMAL;
   v_max_distance DECIMAL;
   v_distance DECIMAL;
   v_location_setting JSONB;
BEGIN
   -- Fetch cafe location from system_settings table
   SELECT value INTO v_location_setting
   FROM system_settings
   WHERE category = 'cafe' AND key = 'location'
   LIMIT 1;

   -- If setting not found, use default fallback
   IF v_location_setting IS NULL THEN
       v_cafe_lat := -6.7063803;
       v_cafe_lng := 108.5619729;
       v_max_distance := 200;
   ELSE
       v_cafe_lat := (v_location_setting->>'lat')::DECIMAL;
       v_cafe_lng := (v_location_setting->>'lng')::DECIMAL;
       v_max_distance := COALESCE((v_location_setting->>'radius')::DECIMAL, 200);
   END IF;

   -- Validate clock in location
   IF NEW.clock_in_location IS NOT NULL THEN
       -- Parse location - handle both TEXT "lat,lng" and POINT types
       DECLARE
           v_location_str TEXT;
           v_location_parts TEXT[];
           v_employee_lat DECIMAL;
           v_employee_lng DECIMAL;
       BEGIN
           -- Convert to TEXT
           v_location_str := NEW.clock_in_location::TEXT;

           -- Remove parentheses if POINT format "(x,y)"
           v_location_str := TRIM(BOTH '()' FROM v_location_str);

           -- Split by comma
           v_location_parts := string_to_array(v_location_str, ',');

           -- Parse coordinates
           v_employee_lat := TRIM(v_location_parts[1])::DECIMAL;
           v_employee_lng := TRIM(v_location_parts[2])::DECIMAL;

           v_distance := calculate_distance(
               v_cafe_lat, v_cafe_lng,
               v_employee_lat, v_employee_lng
           );

           NEW.clock_in_distance := v_distance;

           IF v_distance > v_max_distance THEN
               RAISE EXCEPTION 'Clock in location is too far from cafe (% meters). Maximum allowed: % meters',
                   ROUND(v_distance, 2), v_max_distance
                   USING ERRCODE = 'P0001';
           END IF;
       END;
   END IF;

   -- Validate clock out location
   IF NEW.clock_out_location IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.clock_out_location IS NULL) THEN
       -- Parse location - handle both TEXT "lat,lng" and POINT types
       DECLARE
           v_location_str TEXT;
           v_location_parts TEXT[];
           v_employee_lat DECIMAL;
           v_employee_lng DECIMAL;
       BEGIN
           -- Convert to TEXT
           v_location_str := NEW.clock_out_location::TEXT;

           -- Remove parentheses if POINT format "(x,y)"
           v_location_str := TRIM(BOTH '()' FROM v_location_str);

           -- Split by comma
           v_location_parts := string_to_array(v_location_str, ',');

           -- Parse coordinates
           v_employee_lat := TRIM(v_location_parts[1])::DECIMAL;
           v_employee_lng := TRIM(v_location_parts[2])::DECIMAL;

           v_distance := calculate_distance(
               v_cafe_lat, v_cafe_lng,
               v_employee_lat, v_employee_lng
           );

           NEW.clock_out_distance := v_distance;

           IF v_distance > v_max_distance THEN
               RAISE EXCEPTION 'Clock out location is too far from cafe (% meters). Maximum allowed: % meters',
                   ROUND(v_distance, 2), v_max_distance
                   USING ERRCODE = 'P0001';
           END IF;
       END;
   END IF;

   RETURN NEW;
END;
$function$;

-- Ensure the trigger is still active (recreate if needed)
DROP TRIGGER IF EXISTS validate_attendance_location_trigger ON attendance;

CREATE TRIGGER validate_attendance_location_trigger
BEFORE INSERT OR UPDATE ON attendance
FOR EACH ROW
EXECUTE FUNCTION validate_attendance_location();
