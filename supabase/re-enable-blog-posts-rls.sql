-- =====================================================
-- Re-enable RLS for blog_posts table
-- This restores security after testing
-- =====================================================

-- Re-enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Re-create the RLS policies for blog_posts
CREATE POLICY "Users can view org posts"
  ON blog_posts FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create posts"
  ON blog_posts FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update own posts or admins can update all"
  ON blog_posts FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

CREATE POLICY "Users can delete own posts or admins can delete all"
  ON blog_posts FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
  );

-- Show current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'blog_posts';
