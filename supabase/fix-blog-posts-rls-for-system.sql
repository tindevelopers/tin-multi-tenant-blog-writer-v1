-- =====================================================
-- Fix RLS policies for blog_posts to allow system users
-- This allows content to be saved by system users
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view org posts" ON blog_posts;
DROP POLICY IF EXISTS "Users can create posts" ON blog_posts;
DROP POLICY IF EXISTS "Users can update own posts or admins can update all" ON blog_posts;
DROP POLICY IF EXISTS "Users can delete own posts or admins can delete all" ON blog_posts;

-- First, create a default organization if it doesn't exist
INSERT INTO organizations (org_id, name, slug, subscription_tier)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Organization',
  'default-org',
  'free'
) ON CONFLICT (org_id) DO NOTHING;

-- Create new policies that allow system users
CREATE POLICY "Users can view org posts"
  ON blog_posts FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    OR org_id = '00000000-0000-0000-0000-000000000001'  -- Allow viewing default org posts
  );

CREATE POLICY "Users can create posts"
  ON blog_posts FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    OR org_id = '00000000-0000-0000-0000-000000000001'  -- Allow creating posts in default org
  );

CREATE POLICY "Users can update own posts or admins can update all"
  ON blog_posts FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    OR org_id = '00000000-0000-0000-0000-000000000001'  -- Allow updating default org posts
  );

CREATE POLICY "Users can delete own posts or admins can delete all"
  ON blog_posts FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    OR org_id = '00000000-0000-0000-0000-000000000001'  -- Allow deleting default org posts
  );

-- Show current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'blog_posts';
