-- =====================================================
-- Enhanced Cluster Content Ideas Migration
-- Adds missing fields for HumanReadableArticle interface
-- =====================================================

-- Add missing columns to cluster_content_ideas table
ALTER TABLE cluster_content_ideas 
ADD COLUMN IF NOT EXISTS seo_insights JSONB,
ADD COLUMN IF NOT EXISTS internal_linking_opportunities JSONB,
ADD COLUMN IF NOT EXISTS estimated_word_count INTEGER DEFAULT 1500,
ADD COLUMN IF NOT EXISTS freshness_score INTEGER DEFAULT 5 CHECK (freshness_score >= 1 AND freshness_score <= 10);

-- Add estimated_traffic as INTEGER (this column doesn't exist yet)
ALTER TABLE cluster_content_ideas 
ADD COLUMN IF NOT EXISTS estimated_traffic INTEGER DEFAULT 1;

-- Update difficulty_score to match the interface (1-10)
ALTER TABLE cluster_content_ideas 
ALTER COLUMN difficulty_score SET DEFAULT 5;

-- Add comments for documentation
COMMENT ON COLUMN cluster_content_ideas.seo_insights IS 'SEO insights and recommendations for this content';
COMMENT ON COLUMN cluster_content_ideas.internal_linking_opportunities IS 'Planned internal linking opportunities';
COMMENT ON COLUMN cluster_content_ideas.estimated_word_count IS 'Estimated word count for this content piece';
COMMENT ON COLUMN cluster_content_ideas.freshness_score IS 'Content freshness score (1-10)';

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_cluster_content_ideas_freshness_score ON cluster_content_ideas(freshness_score);
CREATE INDEX IF NOT EXISTS idx_cluster_content_ideas_estimated_word_count ON cluster_content_ideas(estimated_word_count);
