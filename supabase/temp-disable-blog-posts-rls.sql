-- =====================================================
-- Temporarily disable RLS for blog_posts table
-- This allows content to be saved without authentication
-- =====================================================

-- Disable RLS temporarily for testing
ALTER TABLE blog_posts DISABLE ROW LEVEL SECURITY;

-- Add a comment
COMMENT ON TABLE blog_posts IS 'RLS temporarily disabled for testing content saving';

-- Show current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'blog_posts';
