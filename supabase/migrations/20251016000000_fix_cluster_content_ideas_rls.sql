-- =====================================================
-- Fix RLS Policies for cluster_content_ideas
-- The policies were incorrectly checking org_id = auth.uid()
-- but auth.uid() returns user_id, not org_id
-- =====================================================

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Users can view their org's content ideas" ON cluster_content_ideas;
DROP POLICY IF EXISTS "Users can create content ideas in their org" ON cluster_content_ideas;
DROP POLICY IF EXISTS "Users can update their org's content ideas" ON cluster_content_ideas;
DROP POLICY IF EXISTS "Users can delete their org's content ideas" ON cluster_content_ideas;

-- Create corrected policies that check user's org_id from users table
CREATE POLICY "Users can view their org's content ideas" ON cluster_content_ideas
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create content ideas in their org" ON cluster_content_ideas
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org's content ideas" ON cluster_content_ideas
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their org's content ideas" ON cluster_content_ideas
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

-- Also fix content_clusters policies for consistency
DROP POLICY IF EXISTS "Users can view their org's content clusters" ON content_clusters;
DROP POLICY IF EXISTS "Users can create content clusters in their org" ON content_clusters;
DROP POLICY IF EXISTS "Users can update their org's content clusters" ON content_clusters;
DROP POLICY IF EXISTS "Users can delete their own content clusters" ON content_clusters;

CREATE POLICY "Users can view their org's content clusters" ON content_clusters
  FOR SELECT USING (
  org_id IN (
    SELECT org_id FROM users WHERE user_id = auth.uid()
  ) OR user_id = auth.uid()
);

CREATE POLICY "Users can create content clusters in their org" ON content_clusters
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org's content clusters" ON content_clusters
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    ) OR user_id = auth.uid()
  );

CREATE POLICY "Users can delete their own content clusters" ON content_clusters
  FOR DELETE USING (
    user_id = auth.uid() OR
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

-- Fix content_idea_keywords policies
DROP POLICY IF EXISTS "Users can view their org's content idea keywords" ON content_idea_keywords;
DROP POLICY IF EXISTS "Users can create content idea keywords in their org" ON content_idea_keywords;
DROP POLICY IF EXISTS "Users can update their org's content idea keywords" ON content_idea_keywords;
DROP POLICY IF EXISTS "Users can delete their org's content idea keywords" ON content_idea_keywords;

CREATE POLICY "Users can view their org's content idea keywords" ON content_idea_keywords
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cluster_content_ideas cci
      JOIN users u ON u.org_id = cci.org_id
      WHERE cci.id = content_idea_keywords.content_idea_id
      AND u.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create content idea keywords in their org" ON content_idea_keywords
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cluster_content_ideas cci
      JOIN users u ON u.org_id = cci.org_id
      WHERE cci.id = content_idea_keywords.content_idea_id
      AND u.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org's content idea keywords" ON content_idea_keywords
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM cluster_content_ideas cci
      JOIN users u ON u.org_id = cci.org_id
      WHERE cci.id = content_idea_keywords.content_idea_id
      AND u.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their org's content idea keywords" ON content_idea_keywords
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cluster_content_ideas cci
      JOIN users u ON u.org_id = cci.org_id
      WHERE cci.id = content_idea_keywords.content_idea_id
      AND u.user_id = auth.uid()
    )
  );

-- Fix content_ideas_performance policies
DROP POLICY IF EXISTS "Users can view their org's content performance" ON content_ideas_performance;
DROP POLICY IF EXISTS "Users can insert content performance for their org" ON content_ideas_performance;

CREATE POLICY "Users can view their org's content performance" ON content_ideas_performance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cluster_content_ideas cci
      JOIN users u ON u.org_id = cci.org_id
      WHERE cci.id = content_ideas_performance.content_idea_id
      AND u.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert content performance for their org" ON content_ideas_performance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cluster_content_ideas cci
      JOIN users u ON u.org_id = cci.org_id
      WHERE cci.id = content_ideas_performance.content_idea_id
      AND u.user_id = auth.uid()
    )
  );

