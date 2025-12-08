-- Fix RLS policies for media_assets table
-- The issue is that the SELECT policy uses a subquery that might not work correctly
-- We'll make it more explicit and add a helper function if needed

-- Ensure uuid extension is enabled (if not already)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view org media" ON media_assets;
DROP POLICY IF EXISTS "Users can upload media" ON media_assets;
DROP POLICY IF EXISTS "Users can delete own media" ON media_assets;

-- Recreate with more explicit checks
-- Allow users to view all media assets in their organization
CREATE POLICY "Users can view org media"
  ON media_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.org_id = media_assets.org_id
    )
  );

-- Allow users to upload media to their organization
CREATE POLICY "Users can upload media"
  ON media_assets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.org_id = media_assets.org_id
    )
    AND uploaded_by = auth.uid()
  );

-- Allow users to delete media they uploaded in their organization
CREATE POLICY "Users can delete own media"
  ON media_assets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.org_id = media_assets.org_id
    )
    AND uploaded_by = auth.uid()
  );

-- Add index to help with RLS policy performance
CREATE INDEX IF NOT EXISTS idx_media_assets_org_id_uploaded_by 
  ON media_assets(org_id, uploaded_by);
