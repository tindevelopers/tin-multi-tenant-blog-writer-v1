-- =====================================================
-- Remove org_id foreign key constraints
-- These constraints are blocking keyword research saves
-- We'll use org_id as a simple UUID field for now
-- =====================================================

-- Drop the foreign key constraints if they exist
DO $$
BEGIN
  -- Drop constraint on keyword_research_sessions
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_keyword_sessions_org' 
    AND table_name = 'keyword_research_sessions'
  ) THEN
    ALTER TABLE keyword_research_sessions DROP CONSTRAINT fk_keyword_sessions_org;
    RAISE NOTICE 'Dropped fk_keyword_sessions_org constraint';
  END IF;

  -- Drop constraint on keyword_clusters
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_keyword_clusters_org' 
    AND table_name = 'keyword_clusters'
  ) THEN
    ALTER TABLE keyword_clusters DROP CONSTRAINT fk_keyword_clusters_org;
    RAISE NOTICE 'Dropped fk_keyword_clusters_org constraint';
  END IF;

  -- Drop constraint on research_keywords
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_research_keywords_org' 
    AND table_name = 'research_keywords'
  ) THEN
    ALTER TABLE research_keywords DROP CONSTRAINT fk_research_keywords_org;
    RAISE NOTICE 'Dropped fk_research_keywords_org constraint';
  END IF;
END $$;

-- Comment on the org_id columns to clarify their purpose
COMMENT ON COLUMN keyword_research_sessions.org_id IS 'Organization ID (UUID) - Currently used for future multi-tenancy, not enforced with FK';
COMMENT ON COLUMN keyword_clusters.org_id IS 'Organization ID (UUID) - Currently used for future multi-tenancy, not enforced with FK';
COMMENT ON COLUMN research_keywords.org_id IS 'Organization ID (UUID) - Currently used for future multi-tenancy, not enforced with FK';

-- Add a note that these can be re-enabled later when organizations are properly set up
COMMENT ON TABLE keyword_research_sessions IS 'Phase 1: Stores keyword research sessions. org_id FK constraints removed for initial implementation.';
COMMENT ON TABLE keyword_clusters IS 'Phase 1: Stores content clusters. org_id FK constraints removed for initial implementation.';
COMMENT ON TABLE research_keywords IS 'Phase 1: Stores individual keyword data. org_id FK constraints removed for initial implementation.';

