-- Migration: Site-Aware Interlinking Support
-- Date: 2025-01-29
-- 
-- This migration adds site_id tracking to blog posts and content index
-- to support multi-site interlinking (links only to posts on same site)

BEGIN;

-- ============================================
-- 1. Add target_site columns to blog_posts
-- ============================================

-- Add target site tracking to blog_posts
ALTER TABLE blog_posts 
  ADD COLUMN IF NOT EXISTS target_site_id TEXT,
  ADD COLUMN IF NOT EXISTS target_site_name TEXT,
  ADD COLUMN IF NOT EXISTS target_site_url TEXT;

-- Index for filtering posts by target site
CREATE INDEX IF NOT EXISTS idx_blog_posts_target_site 
  ON blog_posts(org_id, target_site_id) 
  WHERE target_site_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN blog_posts.target_site_id IS 'The Webflow/CMS site_id this post will be published to';
COMMENT ON COLUMN blog_posts.target_site_name IS 'Human-readable name of the target site';
COMMENT ON COLUMN blog_posts.target_site_url IS 'Base URL of the target site (e.g., https://blog.example.com)';

-- ============================================
-- 2. Add site columns to content_index
-- ============================================

-- Check if content_index table exists, create if not
CREATE TABLE IF NOT EXISTS content_index (
  id TEXT PRIMARY KEY,
  org_id UUID NOT NULL,
  page_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  keywords TEXT[] DEFAULT '{}',
  topics TEXT[] DEFAULT '{}',
  word_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(1536),
  indexed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add site tracking columns
ALTER TABLE content_index
  ADD COLUMN IF NOT EXISTS site_id TEXT,
  ADD COLUMN IF NOT EXISTS site_name TEXT,
  ADD COLUMN IF NOT EXISTS site_url TEXT;

-- Index for filtering content by site
CREATE INDEX IF NOT EXISTS idx_content_index_site 
  ON content_index(org_id, site_id) 
  WHERE site_id IS NOT NULL;

-- Composite index for site-aware queries
CREATE INDEX IF NOT EXISTS idx_content_index_org_site 
  ON content_index(org_id, site_id, updated_at DESC);

-- Comment for documentation
COMMENT ON COLUMN content_index.site_id IS 'The Webflow/CMS site_id this content belongs to';
COMMENT ON COLUMN content_index.site_name IS 'Human-readable name of the site';
COMMENT ON COLUMN content_index.site_url IS 'Base URL of the site';

-- ============================================
-- 3. Create link_validation_results table
-- ============================================

CREATE TABLE IF NOT EXISTS link_validation_results (
  validation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL,
  post_id UUID REFERENCES blog_posts(post_id) ON DELETE CASCADE,
  target_site_id TEXT NOT NULL,
  
  -- Validation results
  is_valid BOOLEAN DEFAULT false,
  total_links INTEGER DEFAULT 0,
  valid_links INTEGER DEFAULT 0,
  broken_links INTEGER DEFAULT 0,
  wrong_site_links INTEGER DEFAULT 0,
  
  -- Detailed link analysis (JSONB array)
  link_details JSONB DEFAULT '[]',
  -- Example: [{"url": "...", "anchor": "...", "status": "valid|broken|wrong_site", "suggestion": "..."}]
  
  -- Warnings and errors
  warnings TEXT[] DEFAULT '{}',
  errors TEXT[] DEFAULT '{}',
  
  -- Timing
  validated_at TIMESTAMPTZ DEFAULT NOW(),
  validated_by UUID REFERENCES users(user_id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for looking up validation results
CREATE INDEX IF NOT EXISTS idx_link_validation_post 
  ON link_validation_results(post_id, validated_at DESC);

CREATE INDEX IF NOT EXISTS idx_link_validation_org 
  ON link_validation_results(org_id, validated_at DESC);

-- Enable RLS
ALTER TABLE link_validation_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "select_org_link_validations" ON link_validation_results;
CREATE POLICY "select_org_link_validations"
  ON link_validation_results FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_org_link_validations" ON link_validation_results;
CREATE POLICY "insert_org_link_validations"
  ON link_validation_results FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "update_org_link_validations" ON link_validation_results;
CREATE POLICY "update_org_link_validations"
  ON link_validation_results FOR UPDATE
  USING (org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_org_link_validations" ON link_validation_results;
CREATE POLICY "delete_org_link_validations"
  ON link_validation_results FOR DELETE
  USING (org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid()));

-- ============================================
-- 4. Update trigger for timestamps
-- ============================================

CREATE OR REPLACE FUNCTION update_link_validation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_link_validation_updated_at ON link_validation_results;
CREATE TRIGGER trg_link_validation_updated_at
  BEFORE UPDATE ON link_validation_results
  FOR EACH ROW
  EXECUTE FUNCTION update_link_validation_updated_at();

COMMIT;
