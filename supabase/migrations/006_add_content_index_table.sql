-- Migration: Add content_index table for interlinking system
-- This table stores indexed website content for the hybrid interlinking approach

-- Create content_index table
CREATE TABLE IF NOT EXISTS content_index (
  id TEXT PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  keywords TEXT[] DEFAULT '{}',
  topics TEXT[] DEFAULT '{}',
  word_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(1536), -- For future semantic search with OpenAI embeddings
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint on org_id + page_id
  UNIQUE(org_id, page_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_content_index_org_id ON content_index(org_id);
CREATE INDEX IF NOT EXISTS idx_content_index_page_id ON content_index(page_id);
CREATE INDEX IF NOT EXISTS idx_content_index_keywords ON content_index USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_content_index_topics ON content_index USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_content_index_updated_at ON content_index(updated_at DESC);

-- Create index for full-text search
CREATE INDEX IF NOT EXISTS idx_content_index_title_search ON content_index USING GIN(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_content_index_content_search ON content_index USING GIN(to_tsvector('english', COALESCE(content, '')));

-- Add comments
COMMENT ON TABLE content_index IS 'Indexed website content for the hybrid interlinking system. Stores crawled pages from Webflow and other platforms.';
COMMENT ON COLUMN content_index.id IS 'Unique ID in format org_id_page_id';
COMMENT ON COLUMN content_index.page_id IS 'External page ID from the source platform (e.g., Webflow item ID)';
COMMENT ON COLUMN content_index.keywords IS 'Extracted keywords from the page content';
COMMENT ON COLUMN content_index.topics IS 'Identified topics for content clustering';
COMMENT ON COLUMN content_index.embedding IS 'Vector embedding for semantic similarity search';
COMMENT ON COLUMN content_index.metadata IS 'Additional metadata like collection_id, published_at, author, tags, etc.';

-- Enable RLS
ALTER TABLE content_index ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their organization's content index"
  ON content_index
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert into their organization's content index"
  ON content_index
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their organization's content index"
  ON content_index
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete from their organization's content index"
  ON content_index
  FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Service role bypass policy
CREATE POLICY "Service role can manage all content index"
  ON content_index
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- Content Clusters Table
-- ============================================================

CREATE TABLE IF NOT EXISTS content_clusters (
  id TEXT PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pillar_content_id TEXT REFERENCES content_index(id) ON DELETE SET NULL,
  topics TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  authority_score DECIMAL(5,2) DEFAULT 0,
  total_content INTEGER DEFAULT 0,
  internal_links INTEGER DEFAULT 0,
  content_gaps TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(org_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_content_clusters_org_id ON content_clusters(org_id);
CREATE INDEX IF NOT EXISTS idx_content_clusters_pillar ON content_clusters(pillar_content_id);
CREATE INDEX IF NOT EXISTS idx_content_clusters_authority ON content_clusters(authority_score DESC);

-- Comments
COMMENT ON TABLE content_clusters IS 'Content clusters for topical authority building';
COMMENT ON COLUMN content_clusters.pillar_content_id IS 'Reference to the pillar content (main authoritative piece) in the cluster';
COMMENT ON COLUMN content_clusters.authority_score IS 'Calculated authority score for the cluster (0-100)';
COMMENT ON COLUMN content_clusters.content_gaps IS 'Identified content gaps that should be filled';

-- Enable RLS
ALTER TABLE content_clusters ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_clusters
CREATE POLICY "Users can view their organization's content clusters"
  ON content_clusters FOR SELECT
  USING (org_id IN (SELECT org_id FROM user_organizations WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their organization's content clusters"
  ON content_clusters FOR ALL
  USING (org_id IN (SELECT org_id FROM user_organizations WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage all content clusters"
  ON content_clusters FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- Content Cluster Members Table (many-to-many)
-- ============================================================

CREATE TABLE IF NOT EXISTS content_cluster_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id TEXT NOT NULL REFERENCES content_clusters(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES content_index(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('pillar', 'supporting', 'long_tail')),
  relevance_score DECIMAL(5,2) DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(cluster_id, content_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cluster_members_cluster ON content_cluster_members(cluster_id);
CREATE INDEX IF NOT EXISTS idx_cluster_members_content ON content_cluster_members(content_id);
CREATE INDEX IF NOT EXISTS idx_cluster_members_role ON content_cluster_members(role);

-- Enable RLS
ALTER TABLE content_cluster_members ENABLE ROW LEVEL SECURITY;

-- RLS policies (inherit from cluster)
CREATE POLICY "Users can view cluster members via cluster"
  ON content_cluster_members FOR SELECT
  USING (
    cluster_id IN (
      SELECT id FROM content_clusters WHERE org_id IN (
        SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage cluster members via cluster"
  ON content_cluster_members FOR ALL
  USING (
    cluster_id IN (
      SELECT id FROM content_clusters WHERE org_id IN (
        SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role can manage all cluster members"
  ON content_cluster_members FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- Interlinking Suggestions Table
-- ============================================================

CREATE TABLE IF NOT EXISTS interlinking_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_post_id UUID REFERENCES blog_posts(post_id) ON DELETE CASCADE,
  target_content_id TEXT REFERENCES content_index(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  anchor_text TEXT NOT NULL,
  placement TEXT CHECK (placement IN ('introduction', 'body', 'conclusion')),
  link_type TEXT CHECK (link_type IN ('internal', 'external', 'cluster')),
  relevance_score DECIMAL(5,2) DEFAULT 0,
  authority_score DECIMAL(5,2) DEFAULT 0,
  link_value DECIMAL(5,2) DEFAULT 0,
  reason TEXT,
  context TEXT,
  is_applied BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_interlinking_org ON interlinking_suggestions(org_id);
CREATE INDEX IF NOT EXISTS idx_interlinking_source ON interlinking_suggestions(source_post_id);
CREATE INDEX IF NOT EXISTS idx_interlinking_target ON interlinking_suggestions(target_content_id);
CREATE INDEX IF NOT EXISTS idx_interlinking_applied ON interlinking_suggestions(is_applied);
CREATE INDEX IF NOT EXISTS idx_interlinking_value ON interlinking_suggestions(link_value DESC);

-- Comments
COMMENT ON TABLE interlinking_suggestions IS 'Suggested internal and external links for blog posts';
COMMENT ON COLUMN interlinking_suggestions.link_value IS 'Combined score of relevance and authority (0-100)';
COMMENT ON COLUMN interlinking_suggestions.is_applied IS 'Whether this link has been applied to the content';

-- Enable RLS
ALTER TABLE interlinking_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their organization's link suggestions"
  ON interlinking_suggestions FOR SELECT
  USING (org_id IN (SELECT org_id FROM user_organizations WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their organization's link suggestions"
  ON interlinking_suggestions FOR ALL
  USING (org_id IN (SELECT org_id FROM user_organizations WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage all link suggestions"
  ON interlinking_suggestions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- Website Crawl History Table
-- ============================================================

CREATE TABLE IF NOT EXISTS website_crawl_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('webflow', 'wordpress', 'shopify', 'custom')),
  site_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'crawling', 'indexing', 'completed', 'failed')),
  pages_crawled INTEGER DEFAULT 0,
  pages_indexed INTEGER DEFAULT 0,
  collections_found INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Crawl configuration
  config JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crawl_history_org ON website_crawl_history(org_id);
CREATE INDEX IF NOT EXISTS idx_crawl_history_status ON website_crawl_history(status);
CREATE INDEX IF NOT EXISTS idx_crawl_history_started ON website_crawl_history(started_at DESC);

-- Comments
COMMENT ON TABLE website_crawl_history IS 'History of website crawls for the interlinking system';

-- Enable RLS
ALTER TABLE website_crawl_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their organization's crawl history"
  ON website_crawl_history FOR SELECT
  USING (org_id IN (SELECT org_id FROM user_organizations WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their organization's crawl history"
  ON website_crawl_history FOR ALL
  USING (org_id IN (SELECT org_id FROM user_organizations WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage all crawl history"
  ON website_crawl_history FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- Functions
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
CREATE TRIGGER trigger_content_index_updated_at
  BEFORE UPDATE ON content_index
  FOR EACH ROW
  EXECUTE FUNCTION update_content_index_updated_at();

-- Trigger for content_clusters
CREATE TRIGGER trigger_content_clusters_updated_at
  BEFORE UPDATE ON content_clusters
  FOR EACH ROW
  EXECUTE FUNCTION update_content_index_updated_at();

