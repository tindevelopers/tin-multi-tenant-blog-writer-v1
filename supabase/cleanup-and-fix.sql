-- Cleanup existing policies that cause infinite recursion
-- Run this FIRST, then run the main schema.sql

-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;
DROP POLICY IF EXISTS "Users can update own organization" ON organizations;
DROP POLICY IF EXISTS "Users can view org members" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage org users" ON users;
DROP POLICY IF EXISTS "Users can view org posts" ON blog_posts;
DROP POLICY IF EXISTS "Users can create posts" ON blog_posts;
DROP POLICY IF EXISTS "Users can update own posts or admins can update all" ON blog_posts;
DROP POLICY IF EXISTS "Users can delete own posts or admins can delete all" ON blog_posts;
DROP POLICY IF EXISTS "Users can view org templates" ON content_templates;
DROP POLICY IF EXISTS "Users can create templates" ON content_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON content_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON content_templates;
DROP POLICY IF EXISTS "Users can view org api logs" ON api_usage_logs;
DROP POLICY IF EXISTS "System can insert api logs" ON api_usage_logs;
DROP POLICY IF EXISTS "Users can view org media" ON media_assets;
DROP POLICY IF EXISTS "Users can upload media" ON media_assets;
DROP POLICY IF EXISTS "Users can delete own media" ON media_assets;

-- Now recreate the fixed policies
-- RLS Policies for Organizations
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own organization"
  ON organizations FOR UPDATE
  USING (org_id IN (
    SELECT org_id FROM users 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  ));

-- RLS Policies for Users (FIXED - no circular references)
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Allow user creation during signup"
  ON users FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for Blog Posts
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

-- RLS Policies for Content Templates
CREATE POLICY "Users can view org templates"
  ON content_templates FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create templates"
  ON content_templates FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update own templates"
  ON content_templates FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can delete own templates"
  ON content_templates FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

-- RLS Policies for API Usage Logs
CREATE POLICY "Users can view org api logs"
  ON api_usage_logs FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can insert api logs"
  ON api_usage_logs FOR INSERT
  WITH CHECK (true); -- API routes will handle this

-- RLS Policies for Media Assets
CREATE POLICY "Users can view org media"
  ON media_assets FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can upload media"
  ON media_assets FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Users can delete own media"
  ON media_assets FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND uploaded_by = auth.uid()
  );
