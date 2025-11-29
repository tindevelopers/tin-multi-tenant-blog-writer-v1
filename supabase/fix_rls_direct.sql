-- =====================================================
-- Direct Fix for RLS Policies - cluster_content_ideas
-- Run this if the migration didn't work
-- =====================================================

-- First, let's see what we have
SELECT 'BEFORE FIX - Current Policies' as status, policyname, cmd, qual::text, with_check::text
FROM pg_policies
WHERE tablename = 'cluster_content_ideas';

-- Drop ALL existing policies for cluster_content_ideas
DROP POLICY IF EXISTS "Users can view their org's content ideas" ON cluster_content_ideas;
DROP POLICY IF EXISTS "Users can create content ideas in their org" ON cluster_content_ideas;
DROP POLICY IF EXISTS "Users can update their org's content ideas" ON cluster_content_ideas;
DROP POLICY IF EXISTS "Users can delete their org's content ideas" ON cluster_content_ideas;

-- Recreate with CORRECT policies
CREATE POLICY "Users can view their org's content ideas" ON cluster_content_ideas
  FOR SELECT 
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create content ideas in their org" ON cluster_content_ideas
  FOR INSERT 
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org's content ideas" ON cluster_content_ideas
  FOR UPDATE 
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their org's content ideas" ON cluster_content_ideas
  FOR DELETE 
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

-- Verify after fix
SELECT 'AFTER FIX - Updated Policies' as status, policyname, cmd, qual::text, with_check::text
FROM pg_policies
WHERE tablename = 'cluster_content_ideas'
ORDER BY policyname;

