-- Enhanced Keyword Storage with Traditional/AI Search Results and 90-Day Caching
-- Supports both traditional SEO keywords and AI-generated search results
-- Stores full keyword data similar to Ahrefs/SpyFu format

-- =====================================================
-- Keyword Cache Table (90-day cache)
-- =====================================================
CREATE TABLE IF NOT EXISTS keyword_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'United States',
  language TEXT NOT NULL DEFAULT 'en',
  search_type TEXT NOT NULL DEFAULT 'traditional' CHECK (search_type IN ('traditional', 'ai', 'both')),
  
  -- Traditional search data
  traditional_data JSONB,
  
  -- AI search data
  ai_data JSONB,
  
  -- Related terms (for traditional search)
  related_terms JSONB DEFAULT '[]'::jsonb,
  
  -- Full comprehensive data (Ahrefs/SpyFu style)
  comprehensive_data JSONB,
  
  -- Cache metadata
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
  hit_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- User/org context (optional - for user-specific caching)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID
);

-- Indexes for fast cache lookups
CREATE INDEX IF NOT EXISTS idx_keyword_cache_keyword ON keyword_cache(keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_cache_location ON keyword_cache(location);
CREATE INDEX IF NOT EXISTS idx_keyword_cache_expires_at ON keyword_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_keyword_cache_user_id ON keyword_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_cache_search_type ON keyword_cache(search_type);
-- Note: Cannot use NOW() in index predicate (not immutable)
-- Filter expires_at > NOW() in queries instead
CREATE INDEX IF NOT EXISTS idx_keyword_cache_lookup ON keyword_cache(keyword, location, language, search_type, user_id);

-- Unique constraint using partial unique index (handles NULL user_id)
-- For user-specific cache: unique per user
-- For global cache (user_id IS NULL): unique globally
CREATE UNIQUE INDEX IF NOT EXISTS idx_keyword_cache_unique_user 
  ON keyword_cache(keyword, location, language, search_type, user_id) 
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_keyword_cache_unique_global 
  ON keyword_cache(keyword, location, language, search_type) 
  WHERE user_id IS NULL;

-- =====================================================
-- Keyword Research Results Table (Full Storage)
-- =====================================================
CREATE TABLE IF NOT EXISTS keyword_research_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID,
  
  -- Search parameters
  keyword TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'United States',
  language TEXT NOT NULL DEFAULT 'en',
  search_type TEXT NOT NULL DEFAULT 'traditional' CHECK (search_type IN ('traditional', 'ai', 'both')),
  
  -- Traditional SEO Data (Ahrefs/SpyFu style)
  traditional_keyword_data JSONB,
  traditional_metrics JSONB, -- search_volume, difficulty, competition, cpc, etc.
  traditional_serp_data JSONB, -- SERP analysis, top pages, etc.
  traditional_trends JSONB, -- historical trends, growth rates
  
  -- AI Search Data
  ai_keyword_data JSONB,
  ai_metrics JSONB, -- ai_search_volume, ai_optimization_score, mentions_count, etc.
  ai_llm_mentions JSONB, -- LLM mentions data
  ai_trends JSONB, -- AI trend data
  
  -- Related Terms (for traditional search)
  related_terms JSONB DEFAULT '[]'::jsonb, -- Array of related keywords with full data
  matching_terms JSONB DEFAULT '[]'::jsonb, -- Matching terms with full data
  
  -- Comprehensive aggregated data
  aggregated_data JSONB, -- Combined traditional + AI insights
  
  -- Metadata
  source TEXT DEFAULT 'api', -- 'api', 'cache', 'manual'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 0,
  
  -- Full API response for replay
  full_api_response JSONB,
  
  CONSTRAINT unique_user_keyword_location UNIQUE (user_id, keyword, location, language, search_type)
);

-- Indexes for keyword research results
CREATE INDEX IF NOT EXISTS idx_keyword_research_results_user_id ON keyword_research_results(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_research_results_org_id ON keyword_research_results(org_id);
CREATE INDEX IF NOT EXISTS idx_keyword_research_results_keyword ON keyword_research_results(keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_research_results_search_type ON keyword_research_results(search_type);
CREATE INDEX IF NOT EXISTS idx_keyword_research_results_created_at ON keyword_research_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_research_results_accessed_at ON keyword_research_results(accessed_at DESC);

-- =====================================================
-- Keyword Terms Table (Individual keyword storage)
-- Stores each keyword with full metrics (like Ahrefs keyword table)
-- =====================================================
CREATE TABLE IF NOT EXISTS keyword_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_result_id UUID REFERENCES keyword_research_results(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID,
  
  -- Keyword identification
  keyword TEXT NOT NULL,
  keyword_normalized TEXT NOT NULL, -- Lowercase, normalized for deduplication
  parent_keyword TEXT, -- Original search keyword
  
  -- Traditional SEO Metrics
  search_volume INTEGER DEFAULT 0,
  global_search_volume INTEGER DEFAULT 0,
  keyword_difficulty INTEGER CHECK (keyword_difficulty >= 0 AND keyword_difficulty <= 100),
  competition DECIMAL(3,2) CHECK (competition >= 0 AND competition <= 1),
  cpc DECIMAL(10,4),
  cps DECIMAL(10,4), -- Clicks per search
  traffic_potential INTEGER DEFAULT 0,
  
  -- Search Intent
  search_intent TEXT CHECK (search_intent IN ('informational', 'navigational', 'commercial', 'transactional', 'local')),
  
  -- Trends
  trend_score DECIMAL(5,2),
  growth_rate_12m DECIMAL(5,2),
  monthly_searches JSONB, -- Historical monthly search data
  
  -- SERP Features
  serp_features TEXT[],
  serp_feature_counts JSONB,
  
  -- AI Metrics
  ai_search_volume INTEGER DEFAULT 0,
  ai_optimization_score INTEGER CHECK (ai_optimization_score >= 0 AND ai_optimization_score <= 100),
  ai_recommended BOOLEAN DEFAULT FALSE,
  ai_mentions_count INTEGER DEFAULT 0,
  ai_platform TEXT, -- 'chat_gpt', 'google', etc.
  ai_trend DECIMAL(5,2),
  ai_monthly_searches JSONB,
  
  -- Related data
  parent_topic TEXT,
  category_type TEXT CHECK (category_type IN ('topic', 'question', 'action', 'entity')),
  related_keywords TEXT[],
  
  -- Classification
  is_related_term BOOLEAN DEFAULT FALSE,
  is_matching_term BOOLEAN DEFAULT FALSE,
  is_long_tail BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  search_type TEXT NOT NULL DEFAULT 'traditional' CHECK (search_type IN ('traditional', 'ai', 'both')),
  location TEXT NOT NULL DEFAULT 'United States',
  language TEXT NOT NULL DEFAULT 'en',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_user_keyword_term UNIQUE (user_id, keyword_normalized, location, language, search_type)
);

-- Indexes for keyword terms
CREATE INDEX IF NOT EXISTS idx_keyword_terms_research_result_id ON keyword_terms(research_result_id);
CREATE INDEX IF NOT EXISTS idx_keyword_terms_user_id ON keyword_terms(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_terms_keyword_normalized ON keyword_terms(keyword_normalized);
CREATE INDEX IF NOT EXISTS idx_keyword_terms_parent_keyword ON keyword_terms(parent_keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_terms_search_type ON keyword_terms(search_type);
CREATE INDEX IF NOT EXISTS idx_keyword_terms_search_volume ON keyword_terms(search_volume DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_terms_ai_search_volume ON keyword_terms(ai_search_volume DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_terms_keyword_difficulty ON keyword_terms(keyword_difficulty);
CREATE INDEX IF NOT EXISTS idx_keyword_terms_is_related_term ON keyword_terms(is_related_term) WHERE is_related_term = TRUE;
CREATE INDEX IF NOT EXISTS idx_keyword_terms_is_matching_term ON keyword_terms(is_matching_term) WHERE is_matching_term = TRUE;

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE keyword_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_research_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_terms ENABLE ROW LEVEL SECURITY;

-- Keyword Cache Policies
CREATE POLICY "Users can view their own cached keywords"
  ON keyword_cache
  FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own cached keywords"
  ON keyword_cache
  FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can update their own cached keywords"
  ON keyword_cache
  FOR UPDATE
  USING (user_id IS NULL OR auth.uid() = user_id);

-- Keyword Research Results Policies
CREATE POLICY "Users can view their own research results"
  ON keyword_research_results
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own research results"
  ON keyword_research_results
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own research results"
  ON keyword_research_results
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own research results"
  ON keyword_research_results
  FOR DELETE
  USING (auth.uid() = user_id);

-- Keyword Terms Policies
CREATE POLICY "Users can view their own keyword terms"
  ON keyword_terms
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own keyword terms"
  ON keyword_terms
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own keyword terms"
  ON keyword_terms
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own keyword terms"
  ON keyword_terms
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- Functions
-- =====================================================

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_keyword_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM keyword_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to flush cache for a specific user (or all users if user_id is NULL)
CREATE OR REPLACE FUNCTION flush_keyword_cache(
  p_user_id UUID DEFAULT NULL,
  p_keyword TEXT DEFAULT NULL,
  p_search_type TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM keyword_cache
  WHERE (p_user_id IS NULL OR user_id = p_user_id)
    AND (p_keyword IS NULL OR keyword = p_keyword)
    AND (p_search_type IS NULL OR search_type = p_search_type);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update accessed_at timestamp
CREATE OR REPLACE FUNCTION update_keyword_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.accessed_at = NOW();
  NEW.access_count = COALESCE(OLD.access_count, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update access tracking
CREATE TRIGGER update_keyword_research_results_access
  BEFORE UPDATE ON keyword_research_results
  FOR EACH ROW
  WHEN (OLD.accessed_at IS DISTINCT FROM NEW.accessed_at)
  EXECUTE FUNCTION update_keyword_access();

-- Function to get cached keyword (checks expiration)
CREATE OR REPLACE FUNCTION get_cached_keyword(
  p_keyword TEXT,
  p_location TEXT DEFAULT 'United States',
  p_language TEXT DEFAULT 'en',
  p_search_type TEXT DEFAULT 'traditional',
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  keyword TEXT,
  traditional_data JSONB,
  ai_data JSONB,
  related_terms JSONB,
  comprehensive_data JSONB,
  cached_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kc.id,
    kc.keyword,
    kc.traditional_data,
    kc.ai_data,
    kc.related_terms,
    kc.comprehensive_data,
    kc.cached_at,
    kc.expires_at
  FROM keyword_cache kc
  WHERE kc.keyword = p_keyword
    AND kc.location = p_location
    AND kc.language = p_language
    AND kc.search_type = p_search_type
    AND (kc.user_id = p_user_id OR (kc.user_id IS NULL AND p_user_id IS NULL))
    AND kc.expires_at > NOW();
  
  -- Update hit count and last accessed
  UPDATE keyword_cache
  SET hit_count = hit_count + 1,
      last_accessed_at = NOW()
  WHERE keyword = p_keyword
    AND location = p_location
    AND language = p_language
    AND search_type = p_search_type
    AND (user_id = p_user_id OR (user_id IS NULL AND p_user_id IS NULL))
    AND expires_at > NOW();
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE keyword_cache IS '90-day cache for keyword research results to reduce API calls';
COMMENT ON TABLE keyword_research_results IS 'Full storage of keyword research results with traditional and AI data';
COMMENT ON TABLE keyword_terms IS 'Individual keyword terms with comprehensive metrics (Ahrefs/SpyFu style)';
COMMENT ON FUNCTION get_cached_keyword IS 'Retrieves cached keyword data if not expired (90 days)';
COMMENT ON FUNCTION clean_expired_keyword_cache IS 'Removes expired cache entries (older than 90 days)';
COMMENT ON FUNCTION flush_keyword_cache IS 'Flushes keyword cache entries. If user_id is NULL, flushes all cache. Can optionally filter by keyword and search_type.';

