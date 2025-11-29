-- Migration: Ensure draft mode columns exist in blog_platform_publishing
-- This is a safety check to ensure columns exist even if migration 003 wasn't applied

-- Add is_draft column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_platform_publishing' 
    AND column_name = 'is_draft'
  ) THEN
    ALTER TABLE blog_platform_publishing 
    ADD COLUMN is_draft BOOLEAN DEFAULT false;
    
    COMMENT ON COLUMN blog_platform_publishing.is_draft IS 'Whether the item was published as a draft (true) or published immediately (false)';
  END IF;
END $$;

-- Add platform_draft_status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_platform_publishing' 
    AND column_name = 'platform_draft_status'
  ) THEN
    ALTER TABLE blog_platform_publishing 
    ADD COLUMN platform_draft_status TEXT CHECK (platform_draft_status IN ('draft', 'published', 'unknown'));
    
    COMMENT ON COLUMN blog_platform_publishing.platform_draft_status IS 'Current draft status on the platform: draft, published, or unknown';
  END IF;
END $$;

-- Add sync_metadata column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_platform_publishing' 
    AND column_name = 'sync_metadata'
  ) THEN
    ALTER TABLE blog_platform_publishing 
    ADD COLUMN sync_metadata JSONB DEFAULT '{}';
    
    COMMENT ON COLUMN blog_platform_publishing.sync_metadata IS 'Platform-specific sync information (e.g., platform item version, last modified time)';
  END IF;
END $$;

-- Add last_platform_check_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_platform_publishing' 
    AND column_name = 'last_platform_check_at'
  ) THEN
    ALTER TABLE blog_platform_publishing 
    ADD COLUMN last_platform_check_at TIMESTAMPTZ;
    
    COMMENT ON COLUMN blog_platform_publishing.last_platform_check_at IS 'Timestamp of last sync check with the platform';
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_blog_publishing_is_draft ON blog_platform_publishing(is_draft);
CREATE INDEX IF NOT EXISTS idx_blog_publishing_sync_status ON blog_platform_publishing(sync_status);

