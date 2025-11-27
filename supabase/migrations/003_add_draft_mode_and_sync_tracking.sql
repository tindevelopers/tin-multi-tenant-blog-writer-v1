-- Migration: Add draft mode and enhanced sync tracking to blog_platform_publishing
-- This allows publishing in draft mode vs published mode and tracks synchronization between platforms

-- Add is_draft column to track draft vs published mode
ALTER TABLE blog_platform_publishing 
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;

-- Add platform_draft_status to track draft status on the platform
ALTER TABLE blog_platform_publishing 
ADD COLUMN IF NOT EXISTS platform_draft_status TEXT CHECK (platform_draft_status IN ('draft', 'published', 'unknown'));

-- Enhance sync_status with more granular tracking
-- Update sync_status check constraint to include more states
ALTER TABLE blog_platform_publishing 
DROP CONSTRAINT IF EXISTS blog_platform_publishing_sync_status_check;

ALTER TABLE blog_platform_publishing 
ADD CONSTRAINT blog_platform_publishing_sync_status_check 
CHECK (sync_status IN ('in_sync', 'out_of_sync', 'never_synced', 'syncing', 'sync_failed'));

-- Add sync_metadata to store platform-specific sync information
ALTER TABLE blog_platform_publishing 
ADD COLUMN IF NOT EXISTS sync_metadata JSONB DEFAULT '{}';

-- Add last_platform_check_at to track when we last checked platform status
ALTER TABLE blog_platform_publishing 
ADD COLUMN IF NOT EXISTS last_platform_check_at TIMESTAMPTZ;

-- Add index for draft status queries
CREATE INDEX IF NOT EXISTS idx_blog_publishing_is_draft ON blog_platform_publishing(is_draft);
CREATE INDEX IF NOT EXISTS idx_blog_publishing_sync_status ON blog_platform_publishing(sync_status);

-- Update comments
COMMENT ON COLUMN blog_platform_publishing.is_draft IS 'Whether the item was published as a draft (true) or published immediately (false)';
COMMENT ON COLUMN blog_platform_publishing.platform_draft_status IS 'Current draft status on the platform: draft, published, or unknown';
COMMENT ON COLUMN blog_platform_publishing.sync_metadata IS 'Platform-specific sync information (e.g., platform item version, last modified time)';
COMMENT ON COLUMN blog_platform_publishing.last_platform_check_at IS 'Timestamp of last sync check with the platform';

