-- Migration: Add published_domain column to webflow_structure_scans
-- Description: Store the published domain for each Webflow site scan to enable correct URL generation
-- Date: 2025-01-16

-- ============================================
-- Add published_domain column
-- ============================================

ALTER TABLE webflow_structure_scans
ADD COLUMN IF NOT EXISTS published_domain TEXT;

-- Add comment
COMMENT ON COLUMN webflow_structure_scans.published_domain IS 'The published domain (custom domain or webflow.io domain) for the site, used to generate correct URLs for internal links';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_webflow_scans_published_domain 
ON webflow_structure_scans(published_domain) 
WHERE published_domain IS NOT NULL;

