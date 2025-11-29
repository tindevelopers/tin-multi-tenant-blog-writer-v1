-- Migration: Add content_index table for interlinking system
-- This table stores indexed website content for the hybrid interlinking approach
-- NOTE: This migration was applied incrementally via SQL Editor with additional ALTER statements

-- ============================================================
-- 1. Content Index Table
-- ============================================================

CREATE TABLE IF NOT EXISTS content_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  page_id UUID NOT NULL,
  url TEXT,
  title TEXT,
  content TEXT,
  excerpt TEXT,
  keywords TEXT[] DEFAULT '{}',
  topics TEXT[] DEFAULT '{}',
  word_count INTEGER DEFAULT 0,
  reading_time INTEGER DEFAULT 0,
  authority_score DECIMAL(5,2) DEFAULT 0,
  content_type TEXT DEFAULT 'page',
  last_crawled_at TIMESTAMPTZ,
  webflow_item_id TEXT,
  webflow_collection_id TEXT,
  metadata JSONB DEFAULT '{}',
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_content_index_org_id ON content_index(org_id);
CREATE INDEX IF NOT EXISTS idx_content_index_url ON content_index(url);
CREATE INDEX IF NOT EXISTS idx_content_index_content_type ON content_index(content_type);
CREATE INDEX IF NOT EXISTS idx_content_index_keywords ON content_index USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_content_index_topics ON content_index USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_content_index_updated_at ON content_index(updated_at DESC);

-- Add comments
COMMENT ON TABLE content_index IS 'Indexed website content for the hybrid interlinking system';
COMMENT ON COLUMN content_index.keywords IS 'Extracted keywords from the page content';
COMMENT ON COLUMN content_index.topics IS 'Identified topics for content clustering';

-- Enable RLS
ALTER TABLE content_index ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users
CREATE POLICY "Authenticated users can view content_index"
  ON content_index FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert content_index"
  ON content_index FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update content_index"
  ON content_index FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete content_index"
  ON content_index FOR DELETE TO authenticated USING (true);

-- Service role bypass policy
CREATE POLICY "Service role can manage all content_index"
  ON content_index FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 2. Interlinking Suggestions Table
-- ============================================================

CREATE TABLE IF NOT EXISTS interlinking_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  source_url TEXT,
  source_content_id UUID REFERENCES content_index(id) ON DELETE CASCADE,
  target_url TEXT,
  suggestions JSONB DEFAULT '[]'::jsonb,
  internal_links JSONB DEFAULT '[]'::jsonb,
  external_links JSONB DEFAULT '[]'::jsonb,
  cluster_links JSONB DEFAULT '[]'::jsonb,
  total_suggestions INTEGER DEFAULT 0,
  applied_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_interlinking_suggestions_org_id ON interlinking_suggestions(org_id);
CREATE INDEX IF NOT EXISTS idx_interlinking_suggestions_source_url ON interlinking_suggestions(source_url);
CREATE INDEX IF NOT EXISTS idx_interlinking_suggestions_status ON interlinking_suggestions(status);

-- Comments
COMMENT ON TABLE interlinking_suggestions IS 'AI-generated interlinking suggestions for blog posts';

-- Enable RLS
ALTER TABLE interlinking_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view interlinking_suggestions"
  ON interlinking_suggestions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert interlinking_suggestions"
  ON interlinking_suggestions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update interlinking_suggestions"
  ON interlinking_suggestions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete interlinking_suggestions"
  ON interlinking_suggestions FOR DELETE TO authenticated USING (true);

-- Service role bypass
CREATE POLICY "Service role can manage all interlinking_suggestions"
  ON interlinking_suggestions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 3. Website Crawl History Table
-- ============================================================

CREATE TABLE IF NOT EXISTS website_crawl_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  webflow_site_id TEXT NOT NULL,
  crawl_type TEXT NOT NULL DEFAULT 'full',
  status TEXT NOT NULL DEFAULT 'pending',
  pages_crawled INTEGER DEFAULT 0,
  pages_indexed INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_website_crawl_history_org_id ON website_crawl_history(org_id);
CREATE INDEX IF NOT EXISTS idx_website_crawl_history_status ON website_crawl_history(status);
CREATE INDEX IF NOT EXISTS idx_website_crawl_history_started ON website_crawl_history(started_at DESC);

-- Comments
COMMENT ON TABLE website_crawl_history IS 'History of website crawls for the interlinking system';

-- Enable RLS
ALTER TABLE website_crawl_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view website_crawl_history"
  ON website_crawl_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert website_crawl_history"
  ON website_crawl_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update website_crawl_history"
  ON website_crawl_history FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete website_crawl_history"
  ON website_crawl_history FOR DELETE TO authenticated USING (true);

-- Service role bypass
CREATE POLICY "Service role can manage all website_crawl_history"
  ON website_crawl_history FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 4. Functions
-- ============================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_content_index_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for content_index
DROP TRIGGER IF EXISTS trigger_content_index_updated_at ON content_index;
CREATE TRIGGER trigger_content_index_updated_at
  BEFORE UPDATE ON content_index
  FOR EACH ROW
  EXECUTE FUNCTION update_content_index_updated_at();
