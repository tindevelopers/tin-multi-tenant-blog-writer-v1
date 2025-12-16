-- FIX: Organization Logos Storage Bucket and RLS Policies
-- Run this in Supabase SQL Editor to enable logo uploads
-- Date: 2025-01-28

-- Step 1: Ensure the bucket exists (run this in Supabase Dashboard > Storage if needed)
-- The bucket should be created with: Name: organization-logos, Public: true

-- Step 2: Drop existing policies (they may have been created incorrectly)
DROP POLICY IF EXISTS "Users can upload logos for their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can view logos for their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can update logos for their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete logos for their organization" ON storage.objects;

-- Step 3: Create new policies with correct syntax

-- Allow authenticated users to upload logos to their organization's folder
CREATE POLICY "org_logos_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organization-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT org_id::text FROM users WHERE user_id = auth.uid()
  )
);

-- Allow anyone to view organization logos (public bucket)
CREATE POLICY "org_logos_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'organization-logos');

-- Allow users to update logos in their organization's folder
CREATE POLICY "org_logos_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'organization-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT org_id::text FROM users WHERE user_id = auth.uid()
  )
);

-- Allow users to delete logos in their organization's folder
CREATE POLICY "org_logos_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'organization-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT org_id::text FROM users WHERE user_id = auth.uid()
  )
);

-- Verify policies were created:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE 'org_logos%';
