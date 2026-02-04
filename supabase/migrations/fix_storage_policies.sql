-- Fix Storage Policies for HURE Core
-- Run this in Supabase SQL Editor: https://hjridosuleevyjjeirbv.supabase.co/project/default/sql/new

-- 1. First, check if the documents bucket exists, create if not
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop existing policies to recreate them (if any)
DROP POLICY IF EXISTS "Allow public read access on documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update in documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete in documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update in documents" ON storage.objects;

-- 3. Create policy for public read access (anyone can view uploaded documents)
CREATE POLICY "Allow public read access on documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

-- 4. Create policy to allow anyone to upload documents (using anon key)
-- This is needed because users upload with the anon key
CREATE POLICY "Allow public upload to documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents');

-- 5. Create policy to allow updates (for upsert functionality)
CREATE POLICY "Allow public update in documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- 6. Create policy to allow deletes
CREATE POLICY "Allow authenticated delete in documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents');

-- Verify bucket exists and is public
SELECT id, name, public FROM storage.buckets WHERE id = 'documents';

-- Show all policies on storage.objects
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
