-- Migration: Blog Generation Queue System
-- Description: Adds queue management, approval workflow, and multi-platform publishing tracking
-- Date: 2025-01-16

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Blog Generation Queue Table
-- ============================================

CREATE TABLE IF NOT EXISTS blog_generation_queue (
  queue_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES blog_posts(post_id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(user_id) NOT NULL,
  
  -- Generation Request Details
  topic TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  target_audience TEXT,
  tone TEXT,
  word_count INTEGER,
  quality_level TEXT,
  custom_instructions TEXT,
  template_type TEXT,
  
  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'queued',
  -- queued, generating, generated, in_review, approved, rejected, scheduled, publishing, published, failed, cancelled
  
  -- Progress Tracking
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  current_stage TEXT,
  progress_updates JSONB DEFAULT '[]',
  
  -- Generation Results
  generated_content TEXT,
  generated_title TEXT,
  generation_metadata JSONB DEFAULT '{}',
  generation_error TEXT,
  
  -- Timing
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  generation_started_at TIMESTAMPTZ,
  generation_completed_at TIMESTAMPTZ,
  estimated_completion_at TIMESTAMPTZ,
  
  -- Priority (1 = highest, 10 = lowest)
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for blog_generation_queue
CREATE INDEX IF NOT EXISTS idx_blog_queue_org_id ON blog_generation_queue(org_id);
CREATE INDEX IF NOT EXISTS idx_blog_queue_status ON blog_generation_queue(status);
CREATE INDEX IF NOT EXISTS idx_blog_queue_created_by ON blog_generation_queue(created_by);
CREATE INDEX IF NOT EXISTS idx_blog_queue_priority ON blog_generation_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_blog_queue_post_id ON blog_generation_queue(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_queue_queued_at ON blog_generation_queue(queued_at);

-- ============================================
-- 2. Blog Approval Workflow Table
-- ============================================

CREATE TABLE IF NOT EXISTS blog_approvals (
  approval_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  queue_id UUID REFERENCES blog_generation_queue(queue_id) ON DELETE CASCADE,
  post_id UUID REFERENCES blog_posts(post_id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE NOT NULL,
  
  -- Approval Details
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending, approved, rejected, changes_requested
  
  -- Request Details
  requested_by UUID REFERENCES users(user_id) NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Review Details
  reviewed_by UUID REFERENCES users(user_id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  rejection_reason TEXT,
  
  -- Revision Tracking
  revision_number INTEGER DEFAULT 1,
  previous_approval_id UUID REFERENCES blog_approvals(approval_id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for blog_approvals
CREATE INDEX IF NOT EXISTS idx_blog_approvals_queue_id ON blog_approvals(queue_id);
CREATE INDEX IF NOT EXISTS idx_blog_approvals_post_id ON blog_approvals(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_approvals_status ON blog_approvals(status);
CREATE INDEX IF NOT EXISTS idx_blog_approvals_requested_by ON blog_approvals(requested_by);
CREATE INDEX IF NOT EXISTS idx_blog_approvals_reviewed_by ON blog_approvals(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_blog_approvals_requested_at ON blog_approvals(requested_at);

-- ============================================
-- 3. Platform Publishing Status Table
-- ============================================

CREATE TABLE IF NOT EXISTS blog_platform_publishing (
  publishing_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES blog_posts(post_id) ON DELETE CASCADE NOT NULL,
  queue_id UUID REFERENCES blog_generation_queue(queue_id) ON DELETE SET NULL,
  org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE NOT NULL,
  
  -- Platform Details
  platform TEXT NOT NULL CHECK (platform IN ('webflow', 'wordpress', 'shopify')),
  platform_post_id TEXT,
  platform_url TEXT,
  
  -- Publishing Status
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending, scheduled, publishing, published, failed, unpublished
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  
  -- Publishing Details
  published_by UUID REFERENCES users(user_id),
  publish_metadata JSONB DEFAULT '{}',
  
  -- Error Handling
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  
  -- Sync Status
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT CHECK (sync_status IN ('in_sync', 'out_of_sync', 'never_synced')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one publishing record per post+platform
  UNIQUE(post_id, platform)
);

-- Indexes for blog_platform_publishing
CREATE INDEX IF NOT EXISTS idx_blog_publishing_post_id ON blog_platform_publishing(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_publishing_queue_id ON blog_platform_publishing(queue_id);
CREATE INDEX IF NOT EXISTS idx_blog_publishing_platform ON blog_platform_publishing(platform);
CREATE INDEX IF NOT EXISTS idx_blog_publishing_status ON blog_platform_publishing(status);
CREATE INDEX IF NOT EXISTS idx_blog_publishing_scheduled_at ON blog_platform_publishing(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_blog_publishing_org_id ON blog_platform_publishing(org_id);

-- ============================================
-- 4. Enable Row Level Security
-- ============================================

ALTER TABLE blog_generation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_platform_publishing ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS Policies for blog_generation_queue
-- ============================================

CREATE POLICY "Users can view org queue items"
  ON blog_generation_queue FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create queue items"
  ON blog_generation_queue FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update own queue items or managers can update all"
  ON blog_generation_queue FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager', 'editor')
      )
    )
  );

CREATE POLICY "Users can delete own queue items or managers can delete all"
  ON blog_generation_queue FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager', 'editor')
      )
    )
  );

-- ============================================
-- 6. RLS Policies for blog_approvals
-- ============================================

CREATE POLICY "Users can view org approvals"
  ON blog_approvals FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Writers can request approval"
  ON blog_approvals FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND requested_by = auth.uid()
  );

CREATE POLICY "Managers can review approvals"
  ON blog_approvals FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'editor')
    )
  );

-- ============================================
-- 7. RLS Policies for blog_platform_publishing
-- ============================================

CREATE POLICY "Users can view org publishing status"
  ON blog_platform_publishing FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Managers can create publishing records"
  ON blog_platform_publishing FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'editor')
    )
  );

CREATE POLICY "Managers can update publishing status"
  ON blog_platform_publishing FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'editor')
    )
  );

-- ============================================
-- 8. Triggers for updated_at
-- ============================================

CREATE TRIGGER update_blog_queue_updated_at 
  BEFORE UPDATE ON blog_generation_queue
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_approvals_updated_at 
  BEFORE UPDATE ON blog_approvals
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_publishing_updated_at 
  BEFORE UPDATE ON blog_platform_publishing
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. Helper Functions
-- ============================================

-- Function to get queue statistics
CREATE OR REPLACE FUNCTION get_queue_stats(p_org_id UUID)
RETURNS TABLE (
  queued_count BIGINT,
  generating_count BIGINT,
  generated_count BIGINT,
  in_review_count BIGINT,
  approved_count BIGINT,
  published_count BIGINT,
  failed_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'queued') as queued_count,
    COUNT(*) FILTER (WHERE status = 'generating') as generating_count,
    COUNT(*) FILTER (WHERE status = 'generated') as generated_count,
    COUNT(*) FILTER (WHERE status = 'in_review') as in_review_count,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'published') as published_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count
  FROM blog_generation_queue
  WHERE org_id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending approvals count
CREATE OR REPLACE FUNCTION get_pending_approvals_count(p_org_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM blog_approvals
    WHERE org_id = p_org_id
    AND status = 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. Comments for Documentation
-- ============================================

COMMENT ON TABLE blog_generation_queue IS 'Tracks blog generation requests and their status through the generation pipeline';
COMMENT ON TABLE blog_approvals IS 'Manages approval workflow from writer to manager';
COMMENT ON TABLE blog_platform_publishing IS 'Tracks publishing status for each blog post across multiple platforms (Webflow, WordPress, Shopify)';

COMMENT ON COLUMN blog_generation_queue.status IS 'Current status: queued, generating, generated, in_review, approved, rejected, scheduled, publishing, published, failed, cancelled';
COMMENT ON COLUMN blog_generation_queue.priority IS 'Priority level: 1 (highest) to 10 (lowest)';
COMMENT ON COLUMN blog_approvals.status IS 'Approval status: pending, approved, rejected, changes_requested';
COMMENT ON COLUMN blog_platform_publishing.platform IS 'Platform name: webflow, wordpress, or shopify';
COMMENT ON COLUMN blog_platform_publishing.status IS 'Publishing status: pending, scheduled, publishing, published, failed, unpublished';

