-- Extended schema for keyword search results persistence
-- This extends the existing keyword_research_sessions table to store full search metadata

-- Add new columns to keyword_research_sessions for enhanced search tracking
ALTER TABLE keyword_research_sessions 
  ADD COLUMN IF NOT EXISTS search_query TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'United States',
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS search_type TEXT CHECK (search_type IN ('how_to', 'listicle', 'product', 'brand', 'comparison', 'qa', 'evergreen', 'seasonal', 'general')),
  ADD COLUMN IF NOT EXISTS niche TEXT,
  ADD COLUMN IF NOT EXISTS search_mode TEXT DEFAULT 'keywords' CHECK (search_mode IN ('keywords', 'matching_terms', 'related_terms', 'questions', 'ads_ppc')),
  ADD COLUMN IF NOT EXISTS save_search BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS filters JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS full_api_response JSONB,
  ADD COLUMN IF NOT EXISTS keyword_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_search_volume BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_difficulty TEXT,
  ADD COLUMN IF NOT EXISTS avg_competition DECIMAL(3,2);

-- Create index for faster search history queries
CREATE INDEX IF NOT EXISTS idx_keyword_research_sessions_search_query ON keyword_research_sessions(search_query);
CREATE INDEX IF NOT EXISTS idx_keyword_research_sessions_location ON keyword_research_sessions(location);
CREATE INDEX IF NOT EXISTS idx_keyword_research_sessions_search_type ON keyword_research_sessions(search_type);
CREATE INDEX IF NOT EXISTS idx_keyword_research_sessions_created_at_desc ON keyword_research_sessions(created_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN keyword_research_sessions.search_query IS 'The original search query entered by the user';
COMMENT ON COLUMN keyword_research_sessions.location IS 'Location used for search (country name)';
COMMENT ON COLUMN keyword_research_sessions.language IS 'Language code (e.g., en, es, fr)';
COMMENT ON COLUMN keyword_research_sessions.search_type IS 'Type of content search: how_to, listicle, product, brand, comparison, qa, evergreen, seasonal';
COMMENT ON COLUMN keyword_research_sessions.niche IS 'Optional niche/industry specified by user';
COMMENT ON COLUMN keyword_research_sessions.search_mode IS 'Search mode: keywords, matching_terms, related_terms, questions, ads_ppc';
COMMENT ON COLUMN keyword_research_sessions.save_search IS 'Whether this search should be saved to history';
COMMENT ON COLUMN keyword_research_sessions.filters IS 'JSON object storing all filter parameters used in the search';
COMMENT ON COLUMN keyword_research_sessions.full_api_response IS 'Complete API response from DataForSEO for replaying searches';
COMMENT ON COLUMN keyword_research_sessions.keyword_count IS 'Total number of keywords found in this search';
COMMENT ON COLUMN keyword_research_sessions.total_search_volume IS 'Sum of all keyword search volumes';
COMMENT ON COLUMN keyword_research_sessions.avg_difficulty IS 'Average difficulty across all keywords';
COMMENT ON COLUMN keyword_research_sessions.avg_competition IS 'Average competition score across all keywords';

