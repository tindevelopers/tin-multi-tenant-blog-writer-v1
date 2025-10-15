-- =====================================================
-- Phase 2: Content Cluster Strategy Engine
-- Database Schema for Content Clusters and Content Ideas
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;

-- Content Clusters Table
-- Represents a group of related content organized around a pillar topic
CREATE TABLE IF NOT EXISTS content_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  -- Cluster identification
  cluster_name TEXT NOT NULL,
  pillar_keyword TEXT NOT NULL,
  cluster_description TEXT,
  
  -- Cluster status and metrics
  cluster_status TEXT DEFAULT 'planning' CHECK (cluster_status IN ('planning', 'in_progress', 'completed', 'archived')),
  authority_score INTEGER DEFAULT 0 CHECK (authority_score >= 0 AND authority_score <= 100),
  
  -- Content tracking
  total_keywords INTEGER DEFAULT 0,
  content_count INTEGER DEFAULT 0,
  pillar_content_count INTEGER DEFAULT 0,
  supporting_content_count INTEGER DEFAULT 0,
  internal_links_count INTEGER DEFAULT 0,
  
  -- SEO metrics
  estimated_traffic INTEGER DEFAULT 0,
  target_traffic INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_cluster_per_org UNIQUE (org_id, cluster_name)
);

-- Cluster Content Ideas Table
-- Individual content pieces within a cluster
CREATE TABLE IF NOT EXISTS cluster_content_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID REFERENCES content_clusters(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  
  -- Content identification
  content_type TEXT NOT NULL CHECK (content_type IN ('pillar', 'supporting', 'long_tail')),
  target_keyword TEXT NOT NULL,
  
  -- Content details
  title TEXT NOT NULL,
  meta_description TEXT,
  url_slug TEXT,
  
  -- Content structure
  outline JSONB, -- Structured outline with H2, H3, etc.
  word_count_target INTEGER DEFAULT 1500,
  tone TEXT DEFAULT 'professional',
  
  -- Status tracking
  status TEXT DEFAULT 'idea' CHECK (status IN ('idea', 'planned', 'in_progress', 'draft', 'review', 'published', 'archived')),
  priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 10),
  
  -- SEO and content planning
  search_volume INTEGER,
  keyword_difficulty INTEGER,
  content_gap_score INTEGER, -- How much this fills a content gap (0-100)
  
  -- Linking strategy
  internal_links_planned JSONB, -- Array of planned internal links
  external_links_planned JSONB, -- Array of planned external links
  
  -- Publishing details
  published_url TEXT,
  published_date TIMESTAMPTZ,
  
  -- Content generation metadata
  generated_content_id UUID, -- Link to generated blog content
  images_generated BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_keyword_per_cluster UNIQUE (cluster_id, target_keyword)
);

-- Content Idea Keywords Table
-- Link keywords from research to content ideas
CREATE TABLE IF NOT EXISTS content_idea_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_idea_id UUID REFERENCES cluster_content_ideas(id) ON DELETE CASCADE,
  keyword_id UUID REFERENCES research_keywords(id) ON DELETE SET NULL,
  org_id UUID NOT NULL,
  
  -- Keyword relationship
  keyword TEXT NOT NULL,
  keyword_type TEXT CHECK (keyword_type IN ('primary', 'secondary', 'lsi', 'related')),
  
  -- Usage tracking
  placement TEXT, -- Where in content: 'title', 'h2', 'h3', 'body', 'meta'
  density_target DECIMAL(5, 2), -- Target keyword density percentage
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Ideas Performance Tracking
CREATE TABLE IF NOT EXISTS content_ideas_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_idea_id UUID REFERENCES cluster_content_ideas(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  
  -- Performance metrics
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5, 2),
  avg_time_on_page INTEGER, -- in seconds
  
  -- SEO performance
  keyword_rankings JSONB, -- { "keyword": rank }
  backlinks_count INTEGER DEFAULT 0,
  domain_authority INTEGER,
  
  -- Traffic sources
  organic_traffic INTEGER DEFAULT 0,
  direct_traffic INTEGER DEFAULT 0,
  referral_traffic INTEGER DEFAULT 0,
  social_traffic INTEGER DEFAULT 0,
  
  -- Measurement period
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_clusters_org_id ON content_clusters(org_id);
CREATE INDEX IF NOT EXISTS idx_content_clusters_user_id ON content_clusters(user_id);
CREATE INDEX IF NOT EXISTS idx_content_clusters_status ON content_clusters(cluster_status);
CREATE INDEX IF NOT EXISTS idx_cluster_content_ideas_cluster_id ON cluster_content_ideas(cluster_id);
CREATE INDEX IF NOT EXISTS idx_cluster_content_ideas_org_id ON cluster_content_ideas(org_id);
CREATE INDEX IF NOT EXISTS idx_cluster_content_ideas_status ON cluster_content_ideas(status);
CREATE INDEX IF NOT EXISTS idx_cluster_content_ideas_type ON cluster_content_ideas(content_type);
CREATE INDEX IF NOT EXISTS idx_content_idea_keywords_content_idea_id ON content_idea_keywords(content_idea_id);
CREATE INDEX IF NOT EXISTS idx_content_idea_keywords_keyword_id ON content_idea_keywords(keyword_id);

-- Row Level Security (RLS) Policies
ALTER TABLE content_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_content_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_idea_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_ideas_performance ENABLE ROW LEVEL SECURITY;

-- Content Clusters RLS Policies
CREATE POLICY "Users can view their org's content clusters" ON content_clusters
  FOR SELECT USING (org_id = auth.uid() OR user_id = auth.uid());

CREATE POLICY "Users can create content clusters in their org" ON content_clusters
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their org's content clusters" ON content_clusters
  FOR UPDATE USING (org_id = auth.uid() OR user_id = auth.uid());

CREATE POLICY "Users can delete their own content clusters" ON content_clusters
  FOR DELETE USING (user_id = auth.uid());

-- Cluster Content Ideas RLS Policies
CREATE POLICY "Users can view their org's content ideas" ON cluster_content_ideas
  FOR SELECT USING (org_id = auth.uid());

CREATE POLICY "Users can create content ideas in their org" ON cluster_content_ideas
  FOR INSERT WITH CHECK (org_id = auth.uid());

CREATE POLICY "Users can update their org's content ideas" ON cluster_content_ideas
  FOR UPDATE USING (org_id = auth.uid());

CREATE POLICY "Users can delete their org's content ideas" ON cluster_content_ideas
  FOR DELETE USING (org_id = auth.uid());

-- Content Idea Keywords RLS Policies
CREATE POLICY "Users can view their org's content idea keywords" ON content_idea_keywords
  FOR SELECT USING (org_id = auth.uid());

CREATE POLICY "Users can create content idea keywords in their org" ON content_idea_keywords
  FOR INSERT WITH CHECK (org_id = auth.uid());

CREATE POLICY "Users can update their org's content idea keywords" ON content_idea_keywords
  FOR UPDATE USING (org_id = auth.uid());

CREATE POLICY "Users can delete their org's content idea keywords" ON content_idea_keywords
  FOR DELETE USING (org_id = auth.uid());

-- Content Ideas Performance RLS Policies
CREATE POLICY "Users can view their org's content performance" ON content_ideas_performance
  FOR SELECT USING (org_id = auth.uid());

CREATE POLICY "Users can insert content performance for their org" ON content_ideas_performance
  FOR INSERT WITH CHECK (org_id = auth.uid());

-- Updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_content_clusters_updated_at ON content_clusters;
CREATE TRIGGER update_content_clusters_updated_at
  BEFORE UPDATE ON content_clusters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cluster_content_ideas_updated_at ON cluster_content_ideas;
CREATE TRIGGER update_cluster_content_ideas_updated_at
  BEFORE UPDATE ON cluster_content_ideas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE content_clusters IS 'Content clusters for organizing pillar and supporting content around core topics';
COMMENT ON TABLE cluster_content_ideas IS 'Individual content pieces within clusters, includes pillar and supporting content';
COMMENT ON TABLE content_idea_keywords IS 'Links keywords from research to specific content ideas with placement strategy';
COMMENT ON TABLE content_ideas_performance IS 'Tracks performance metrics for published content ideas';

