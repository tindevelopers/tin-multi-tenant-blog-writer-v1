-- =====================================================
-- Enhanced Content Clusters Migration
-- Adds missing fields for enhanced content clusters functionality
-- =====================================================

-- Add missing columns to content_clusters table
ALTER TABLE content_clusters 
ADD COLUMN IF NOT EXISTS research_data JSONB,
ADD COLUMN IF NOT EXISTS keyword_clusters JSONB,
ADD COLUMN IF NOT EXISTS estimated_traffic_potential TEXT CHECK (estimated_traffic_potential IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS content_gap_score INTEGER DEFAULT 0 CHECK (content_gap_score >= 0 AND content_gap_score <= 100),
ADD COLUMN IF NOT EXISTS competition_level TEXT CHECK (competition_level IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS target_audience TEXT,
ADD COLUMN IF NOT EXISTS content_strategy TEXT,
ADD COLUMN IF NOT EXISTS long_tail_content_count INTEGER DEFAULT 0;

-- Update the cluster_content_ideas table to match the enhanced structure
ALTER TABLE cluster_content_ideas 
ADD COLUMN IF NOT EXISTS subtitle TEXT,
ADD COLUMN IF NOT EXISTS estimated_reading_time INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS estimated_traffic TEXT CHECK (estimated_traffic IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS difficulty_score INTEGER DEFAULT 5 CHECK (difficulty_score >= 1 AND difficulty_score <= 10),
ADD COLUMN IF NOT EXISTS content_outline JSONB,
ADD COLUMN IF NOT EXISTS internal_links JSONB,
ADD COLUMN IF NOT EXISTS external_resources JSONB,
ADD COLUMN IF NOT EXISTS content_gaps JSONB,
ADD COLUMN IF NOT EXISTS seo_opportunities JSONB,
ADD COLUMN IF NOT EXISTS cluster_relationship JSONB;

-- Update content_type to include new types
ALTER TABLE cluster_content_ideas 
DROP CONSTRAINT IF EXISTS cluster_content_ideas_content_type_check;

ALTER TABLE cluster_content_ideas 
ADD CONSTRAINT cluster_content_ideas_content_type_check 
CHECK (content_type IN ('pillar', 'supporting', 'long_tail', 'news', 'tutorial', 'review', 'comparison'));

-- Add comments for documentation
COMMENT ON COLUMN content_clusters.research_data IS 'Complete research results data used to generate this cluster';
COMMENT ON COLUMN content_clusters.keyword_clusters IS 'Keyword cluster analysis data';
COMMENT ON COLUMN content_clusters.estimated_traffic_potential IS 'Estimated traffic potential for this cluster';
COMMENT ON COLUMN content_clusters.content_gap_score IS 'Score indicating content gap opportunity (0-100)';
COMMENT ON COLUMN content_clusters.competition_level IS 'Competition level for this cluster';
COMMENT ON COLUMN content_clusters.target_audience IS 'Target audience for content in this cluster';
COMMENT ON COLUMN content_clusters.content_strategy IS 'Content strategy recommendations';
COMMENT ON COLUMN content_clusters.long_tail_content_count IS 'Number of long-tail content pieces in this cluster';

COMMENT ON COLUMN cluster_content_ideas.subtitle IS 'Content subtitle or tagline';
COMMENT ON COLUMN cluster_content_ideas.estimated_reading_time IS 'Estimated reading time in minutes';
COMMENT ON COLUMN cluster_content_ideas.estimated_traffic IS 'Estimated traffic potential for this content';
COMMENT ON COLUMN cluster_content_ideas.difficulty_score IS 'Content creation difficulty score (1-10)';
COMMENT ON COLUMN cluster_content_ideas.content_outline IS 'Detailed content outline structure';
COMMENT ON COLUMN cluster_content_ideas.internal_links IS 'Planned internal linking strategy';
COMMENT ON COLUMN cluster_content_ideas.external_resources IS 'External resources and references';
COMMENT ON COLUMN cluster_content_ideas.content_gaps IS 'Identified content gaps and opportunities';
COMMENT ON COLUMN cluster_content_ideas.seo_opportunities IS 'SEO optimization opportunities';
COMMENT ON COLUMN cluster_content_ideas.cluster_relationship IS 'Relationship data within the cluster';

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_content_clusters_estimated_traffic_potential ON content_clusters(estimated_traffic_potential);
CREATE INDEX IF NOT EXISTS idx_content_clusters_competition_level ON content_clusters(competition_level);
CREATE INDEX IF NOT EXISTS idx_cluster_content_ideas_estimated_traffic ON cluster_content_ideas(estimated_traffic);
CREATE INDEX IF NOT EXISTS idx_cluster_content_ideas_difficulty_score ON cluster_content_ideas(difficulty_score);
