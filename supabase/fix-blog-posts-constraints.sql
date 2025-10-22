-- =====================================================
-- Fix blog_posts constraints to allow system operations
-- This allows content to be saved without user authentication
-- =====================================================

-- First, ensure the default organization exists
INSERT INTO organizations (org_id, name, slug, subscription_tier)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Organization',
  'default-org',
  'free'
) ON CONFLICT (org_id) DO NOTHING;

-- Make the created_by field nullable to allow system operations
ALTER TABLE blog_posts ALTER COLUMN created_by DROP NOT NULL;

-- Update existing RLS policies to allow system operations
DROP POLICY IF EXISTS "Users can view org posts" ON blog_posts;
DROP POLICY IF EXISTS "Users can create posts" ON blog_posts;
DROP POLICY IF EXISTS "Users can update own posts or admins can update all" ON blog_posts;
DROP POLICY IF EXISTS "Users can delete own posts or admins can delete all" ON blog_posts;

-- Create new policies that allow system operations
CREATE POLICY "Users can view org posts"
  ON blog_posts FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    OR org_id = '00000000-0000-0000-0000-000000000001'  -- Allow viewing default org posts
    OR created_by IS NULL  -- Allow viewing system-created posts
  );

CREATE POLICY "Users can create posts"
  ON blog_posts FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    OR org_id = '00000000-0000-0000-0000-000000000001'  -- Allow creating posts in default org
    OR created_by IS NULL  -- Allow system-created posts
  );

CREATE POLICY "Users can update own posts or admins can update all"
  ON blog_posts FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    OR org_id = '00000000-0000-0000-0000-000000000001'  -- Allow updating default org posts
    OR created_by IS NULL  -- Allow updating system-created posts
  );

CREATE POLICY "Users can delete own posts or admins can delete all"
  ON blog_posts FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    OR org_id = '00000000-0000-0000-0000-000000000001'  -- Allow deleting default org posts
    OR created_by IS NULL  -- Allow deleting system-created posts
  );

-- Show current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'blog_posts';
