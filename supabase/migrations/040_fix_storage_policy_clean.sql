-- Clean fix for storage policies

-- Step 1: Drop ALL existing policies for menu-images (use DROP IF EXISTS to avoid errors)
DROP POLICY IF EXISTS "Public read access to menu-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to menu-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update menu-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete menu-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read menu-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to menu-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update menu-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete menu-images" ON storage.objects;
DROP POLICY IF EXISTS "menu-images-select" ON storage.objects;
DROP POLICY IF EXISTS "menu-images-insert" ON storage.objects;
DROP POLICY IF EXISTS "menu-images-update" ON storage.objects;
DROP POLICY IF EXISTS "menu-images-delete" ON storage.objects;

-- Step 2: Create NEW simple policies
CREATE POLICY "menu-images-select"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-images');

CREATE POLICY "menu-images-insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'menu-images');

CREATE POLICY "menu-images-update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'menu-images');

CREATE POLICY "menu-images-delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'menu-images');

-- Step 3: Ensure bucket is public
UPDATE storage.buckets
SET public = true
WHERE id = 'menu-images';
