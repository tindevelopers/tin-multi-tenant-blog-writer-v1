-- Migration: Image Generation Queue System
-- Description: Adds queue management for image generation requests
-- Date: 2025-01-16

-- ============================================
-- 1. Image Generation Queue Table
-- ============================================

CREATE TABLE IF NOT EXISTS image_generation_queue (
  queue_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES users(user_id) NOT NULL,
  
  -- Generation Request Details
  prompt TEXT NOT NULL,
  style TEXT DEFAULT 'photographic',
  aspect_ratio TEXT DEFAULT '16:9',
  quality TEXT DEFAULT 'high',
  type TEXT NOT NULL DEFAULT 'featured', -- 'featured' or 'section'
  blog_topic TEXT,
  keywords TEXT[] DEFAULT '{}',
  section_title TEXT,
  position INTEGER, -- For section images
  
  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'queued',
  -- queued, generating, generated, failed, cancelled
  
  -- Progress Tracking
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  current_stage TEXT,
  progress_updates JSONB DEFAULT '[]',
  
  -- Generation Results
  generated_image_url TEXT,
  generated_image_id TEXT,
  image_width INTEGER,
  image_height INTEGER,
  image_format TEXT,
  alt_text TEXT,
  quality_score DECIMAL(5,2),
  safety_score DECIMAL(5,2),
  asset_id UUID REFERENCES media_assets(asset_id) ON DELETE SET NULL,
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

-- Indexes for image_generation_queue
CREATE INDEX IF NOT EXISTS idx_image_queue_org_id ON image_generation_queue(org_id);
CREATE INDEX IF NOT EXISTS idx_image_queue_status ON image_generation_queue(status);
CREATE INDEX IF NOT EXISTS idx_image_queue_created_by ON image_generation_queue(created_by);
CREATE INDEX IF NOT EXISTS idx_image_queue_priority ON image_generation_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_image_queue_type ON image_generation_queue(type);
CREATE INDEX IF NOT EXISTS idx_image_queue_queued_at ON image_generation_queue(queued_at);

-- ============================================
-- 2. RLS Policies for image_generation_queue
-- ============================================

ALTER TABLE image_generation_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view queue items from their organization
CREATE POLICY "Users can view queue items from their organization"
  ON image_generation_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.org_id = image_generation_queue.org_id
    )
  );

-- Policy: Users can create queue items for their organization
CREATE POLICY "Users can create queue items for their organization"
  ON image_generation_queue FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.org_id = image_generation_queue.org_id
    )
  );

-- Policy: Users can update queue items from their organization
CREATE POLICY "Users can update queue items from their organization"
  ON image_generation_queue FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.org_id = image_generation_queue.org_id
    )
  );

-- Policy: Users can delete queue items from their organization
CREATE POLICY "Users can delete queue items from their organization"
  ON image_generation_queue FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.org_id = image_generation_queue.org_id
    )
  );

-- ============================================
-- 3. Trigger for updated_at timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_image_generation_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_image_generation_queue_updated_at
  BEFORE UPDATE ON image_generation_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_image_generation_queue_updated_at();

-- ============================================
-- 4. Comments
-- ============================================

COMMENT ON TABLE image_generation_queue IS 'Tracks image generation requests and their status through the generation pipeline';
COMMENT ON COLUMN image_generation_queue.status IS 'Current status: queued, generating, generated, failed, cancelled';
COMMENT ON COLUMN image_generation_queue.priority IS 'Priority level: 1 (highest) to 10 (lowest)';
COMMENT ON COLUMN image_generation_queue.type IS 'Image type: featured (blog cover) or section (content image)';

