-- =====================================================
-- Phase 1: Enhanced Keyword Research Schema
-- Drop and recreate tables with proper schema
-- =====================================================

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS research_keywords CASCADE;
DROP TABLE IF EXISTS keyword_clusters CASCADE;
DROP TABLE IF EXISTS keyword_research_sessions CASCADE;

-- =====================================================
-- Keyword Research Sessions Table
-- =====================================================
CREATE TABLE keyword_research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  
  primary_keyword TEXT NOT NULL,
  location_targeting TEXT DEFAULT 'United States',
  language_code TEXT DEFAULT 'en',
  
  total_keywords INTEGER DEFAULT 0,
  clusters_identified INTEGER DEFAULT 0,
  pillar_keywords INTEGER DEFAULT 0,
  supporting_keywords INTEGER DEFAULT 0,
  easy_wins_count INTEGER DEFAULT 0,
  high_value_count INTEGER DEFAULT 0,
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_session_per_user_keyword UNIQUE (user_id, primary_keyword, created_at)
);

-- Add org_id constraint if organizations table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
    EXECUTE 'ALTER TABLE keyword_research_sessions ADD CONSTRAINT fk_keyword_sessions_org FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE';
  END IF;
END $$;

CREATE INDEX idx_keyword_sessions_user_id ON keyword_research_sessions(user_id);
CREATE INDEX idx_keyword_sessions_org_id ON keyword_research_sessions(org_id);
CREATE INDEX idx_keyword_sessions_created_at ON keyword_research_sessions(created_at DESC);
CREATE INDEX idx_keyword_sessions_primary_keyword ON keyword_research_sessions(primary_keyword);

-- =====================================================
-- Keyword Clusters Table
-- =====================================================
CREATE TABLE keyword_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES keyword_research_sessions(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  
  cluster_name TEXT NOT NULL,
  primary_keyword TEXT NOT NULL,
  cluster_type TEXT NOT NULL CHECK (cluster_type IN ('pillar', 'supporting', 'long-tail')),
  
  authority_potential INTEGER CHECK (authority_potential >= 0 AND authority_potential <= 100),
  total_search_volume INTEGER DEFAULT 0,
  avg_difficulty INTEGER,
  keyword_count INTEGER DEFAULT 0,
  
  content_gap_analysis JSONB DEFAULT '{}'::jsonb,
  competitor_analysis JSONB DEFAULT '{}'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add org_id constraint if organizations table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
    EXECUTE 'ALTER TABLE keyword_clusters ADD CONSTRAINT fk_keyword_clusters_org FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE';
  END IF;
END $$;

CREATE INDEX idx_keyword_clusters_session_id ON keyword_clusters(session_id);
CREATE INDEX idx_keyword_clusters_org_id ON keyword_clusters(org_id);
CREATE INDEX idx_keyword_clusters_type ON keyword_clusters(cluster_type);
CREATE INDEX idx_keyword_clusters_authority ON keyword_clusters(authority_potential DESC);

-- =====================================================
-- Research Keywords Table
-- =====================================================
CREATE TABLE research_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES keyword_research_sessions(id) ON DELETE CASCADE,
  cluster_id UUID REFERENCES keyword_clusters(id) ON DELETE SET NULL,
  org_id UUID NOT NULL,
  
  keyword TEXT NOT NULL,
  search_volume INTEGER DEFAULT 0,
  keyword_difficulty INTEGER CHECK (keyword_difficulty >= 0 AND keyword_difficulty <= 100),
  competition_level TEXT CHECK (competition_level IN ('LOW', 'MEDIUM', 'HIGH')),
  cpc DECIMAL(10, 2),
  
  search_intent TEXT CHECK (search_intent IN ('informational', 'navigational', 'commercial', 'transactional')),
  trend_score INTEGER,
  
  easy_win_score INTEGER DEFAULT 0 CHECK (easy_win_score >= 0 AND easy_win_score <= 100),
  high_value_score INTEGER DEFAULT 0 CHECK (high_value_score >= 0 AND high_value_score <= 100),
  
  pillar_potential BOOLEAN DEFAULT FALSE,
  supporting_potential BOOLEAN DEFAULT FALSE,
  selected_for_content BOOLEAN DEFAULT FALSE,
  
  related_keywords JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_keyword_per_session UNIQUE (session_id, keyword)
);

-- Add org_id constraint if organizations table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
    EXECUTE 'ALTER TABLE research_keywords ADD CONSTRAINT fk_research_keywords_org FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE';
  END IF;
END $$;

CREATE INDEX idx_research_keywords_session_id ON research_keywords(session_id);
CREATE INDEX idx_research_keywords_cluster_id ON research_keywords(cluster_id);
CREATE INDEX idx_research_keywords_org_id ON research_keywords(org_id);
CREATE INDEX idx_research_keywords_keyword ON research_keywords(keyword);
CREATE INDEX idx_research_keywords_search_volume ON research_keywords(search_volume DESC);
CREATE INDEX idx_research_keywords_difficulty ON research_keywords(keyword_difficulty);
CREATE INDEX idx_research_keywords_easy_win ON research_keywords(easy_win_score DESC);
CREATE INDEX idx_research_keywords_high_value ON research_keywords(high_value_score DESC);
CREATE INDEX idx_research_keywords_selected ON research_keywords(selected_for_content) WHERE selected_for_content = TRUE;

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE keyword_research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON keyword_research_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create sessions" ON keyword_research_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON keyword_research_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON keyword_research_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view org clusters" ON keyword_clusters FOR SELECT USING (session_id IN (SELECT id FROM keyword_research_sessions WHERE user_id = auth.uid()));
CREATE POLICY "Users can create clusters" ON keyword_clusters FOR INSERT WITH CHECK (session_id IN (SELECT id FROM keyword_research_sessions WHERE user_id = auth.uid()));
CREATE POLICY "Users can update clusters" ON keyword_clusters FOR UPDATE USING (session_id IN (SELECT id FROM keyword_research_sessions WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete clusters" ON keyword_clusters FOR DELETE USING (session_id IN (SELECT id FROM keyword_research_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can view org keywords" ON research_keywords FOR SELECT USING (session_id IN (SELECT id FROM keyword_research_sessions WHERE user_id = auth.uid()));
CREATE POLICY "Users can create keywords" ON research_keywords FOR INSERT WITH CHECK (session_id IN (SELECT id FROM keyword_research_sessions WHERE user_id = auth.uid()));
CREATE POLICY "Users can update keywords" ON research_keywords FOR UPDATE USING (session_id IN (SELECT id FROM keyword_research_sessions WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete keywords" ON research_keywords FOR DELETE USING (session_id IN (SELECT id FROM keyword_research_sessions WHERE user_id = auth.uid()));

-- =====================================================
-- Triggers
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_keyword_sessions_updated_at BEFORE UPDATE ON keyword_research_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_keyword_clusters_updated_at BEFORE UPDATE ON keyword_clusters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_research_keywords_updated_at BEFORE UPDATE ON research_keywords FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Helper Functions
-- =====================================================

CREATE OR REPLACE FUNCTION get_session_stats(session_uuid UUID)
RETURNS TABLE (
  total_keywords BIGINT,
  avg_search_volume NUMERIC,
  avg_difficulty NUMERIC,
  easy_wins BIGINT,
  high_value BIGINT,
  pillar_count BIGINT,
  supporting_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    AVG(search_volume)::NUMERIC,
    AVG(keyword_difficulty)::NUMERIC,
    COUNT(*) FILTER (WHERE easy_win_score >= 60)::BIGINT,
    COUNT(*) FILTER (WHERE high_value_score >= 60)::BIGINT,
    COUNT(*) FILTER (WHERE pillar_potential = TRUE)::BIGINT,
    COUNT(*) FILTER (WHERE supporting_potential = TRUE)::BIGINT
  FROM research_keywords
  WHERE session_id = session_uuid;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Grants
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON keyword_research_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON keyword_clusters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON research_keywords TO authenticated;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE keyword_research_sessions IS 'Phase 1: Stores keyword research sessions with primary keyword and targeting parameters';
COMMENT ON TABLE keyword_clusters IS 'Phase 1: Stores content clusters for pillar content strategy';
COMMENT ON TABLE research_keywords IS 'Phase 1: Stores individual keyword data with SEO metrics and strategic scores';

