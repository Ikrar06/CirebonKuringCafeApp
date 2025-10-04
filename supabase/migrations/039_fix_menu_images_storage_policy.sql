-- Fix menu-images storage bucket RLS policies

-- First, check if bucket exists, if not create it
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Drop ALL existing policies on storage.objects for menu-images
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    END LOOP;
END $$;

-- Create comprehensive policies

-- 1. Allow ANYONE (public + authenticated) to SELECT/read images
CREATE POLICY "Anyone can read menu-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-images');

-- 2. Allow ANYONE (including anon) to INSERT - untuk testing
CREATE POLICY "Anyone can upload to menu-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'menu-images');

-- 3. Allow ANYONE to UPDATE
CREATE POLICY "Anyone can update menu-images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'menu-images')
WITH CHECK (bucket_id = 'menu-images');

-- 4. Allow ANYONE to DELETE
CREATE POLICY "Anyone can delete menu-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'menu-images');

-- Verify bucket settings
UPDATE storage.buckets
SET
  public = true,
  avif_autodetection = false
WHERE id = 'menu-images';
