-- Migration: Add organization logo support
-- This migration adds support for organization logos and company names

-- Add logo_url column to organizations table (optional, can also use settings JSONB)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Update settings JSONB to include company_name and logo_url if not already present
-- This ensures backward compatibility with existing organizations
UPDATE organizations
SET settings = COALESCE(settings, '{}'::jsonb) || 
  jsonb_build_object(
    'company_name', COALESCE((settings->>'company_name'), name),
    'logo_url', COALESCE((settings->>'logo_url'), logo_url)
  )
WHERE settings IS NULL OR settings = '{}'::jsonb;

-- Create storage bucket for organization logos (if it doesn't exist)
-- Note: This requires the storage extension to be enabled
-- Run this manually in Supabase Dashboard > Storage if needed:
-- CREATE BUCKET IF NOT EXISTS 'organization-logos' WITH (
--   public = true,
--   file_size_limit = 5242880, -- 5MB
--   allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
-- );

-- Create storage policy for organization logos
-- Users can upload logos for their own organization
CREATE POLICY IF NOT EXISTS "Users can upload logos for their organization"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'organization-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT org_id::text FROM organizations
    WHERE org_id IN (
      SELECT org_id FROM users 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  )
);

-- Users can view logos for their organization
CREATE POLICY IF NOT EXISTS "Users can view logos for their organization"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'organization-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT org_id::text FROM organizations
    WHERE org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  )
);

-- Users can update logos for their organization
CREATE POLICY IF NOT EXISTS "Users can update logos for their organization"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'organization-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT org_id::text FROM organizations
    WHERE org_id IN (
      SELECT org_id FROM users 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  )
);

-- Users can delete logos for their organization
CREATE POLICY IF NOT EXISTS "Users can delete logos for their organization"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'organization-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT org_id::text FROM organizations
    WHERE org_id IN (
      SELECT org_id FROM users 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  )
);

