-- =====================================================
-- Fix Content Type Constraints Migration
-- Updates constraints to match the HumanReadableArticle interface
-- =====================================================

-- Update content_type constraint in cluster_content_ideas to allow additional types
ALTER TABLE cluster_content_ideas 
DROP CONSTRAINT IF EXISTS cluster_content_ideas_content_type_check;

ALTER TABLE cluster_content_ideas 
ADD CONSTRAINT cluster_content_ideas_content_type_check 
CHECK (content_type IN ('pillar', 'supporting', 'long_tail', 'news', 'tutorial', 'review', 'comparison'));

-- Make the unique constraint more flexible by adding a sequence number
-- This allows multiple articles with the same keyword in a cluster
ALTER TABLE cluster_content_ideas 
DROP CONSTRAINT IF EXISTS unique_keyword_per_cluster;

-- Add a sequence column to make keywords unique within clusters
ALTER TABLE cluster_content_ideas 
ADD COLUMN IF NOT EXISTS keyword_sequence INTEGER DEFAULT 1;

-- Create a new unique constraint that includes the sequence (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_keyword_sequence_per_cluster'
    ) THEN
        ALTER TABLE cluster_content_ideas 
        ADD CONSTRAINT unique_keyword_sequence_per_cluster 
        UNIQUE (cluster_id, target_keyword, keyword_sequence);
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN cluster_content_ideas.keyword_sequence IS 'Sequence number to allow multiple articles with same keyword in a cluster';
