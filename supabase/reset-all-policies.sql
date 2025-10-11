-- Reset all RLS policies - run this to clean slate
-- This will drop ALL existing policies and recreate them properly

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;
DROP POLICY IF EXISTS "Users can update own organization" ON organizations;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON users;
DROP POLICY IF EXISTS "Users can view org members" ON users;
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

-- Now create ONLY the essential policies for signup to work
-- Organizations - simple policies
CREATE POLICY "Allow organization creation"
  ON organizations FOR INSERT
  WITH CHECK (true); -- Allow creation during signup

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

-- Users - simple policies (no circular references)
CREATE POLICY "Allow user creation"
  ON users FOR INSERT
  WITH CHECK (user_id = auth.uid()); -- Allow during signup

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (user_id = auth.uid());
