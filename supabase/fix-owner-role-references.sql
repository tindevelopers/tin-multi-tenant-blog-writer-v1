-- Fix Script: Replace 'owner' role references with 'admin'
-- This script updates all RLS policies and queries that reference 'owner'
-- to use 'admin' instead, which is the correct enum value

-- ============================================
-- Fix RLS Policies in blog_generation_queue
-- ============================================

-- Drop and recreate policies with correct role
DROP POLICY IF EXISTS "Users can update own queue items or managers can update all" ON blog_generation_queue;
CREATE POLICY "Users can update own queue items or managers can update all"
  ON blog_generation_queue FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager', 'editor')
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete own queue items or managers can delete all" ON blog_generation_queue;
CREATE POLICY "Users can delete own queue items or managers can delete all"
  ON blog_generation_queue FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager', 'editor')
      )
    )
  );

-- ============================================
-- Fix RLS Policies in blog_approvals
-- ============================================

-- Already correct, but ensuring consistency
DROP POLICY IF EXISTS "Managers can review approvals" ON blog_approvals;
CREATE POLICY "Managers can review approvals"
  ON blog_approvals FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'editor')
    )
  );

-- ============================================
-- Fix RLS Policies in blog_platform_publishing
-- ============================================

DROP POLICY IF EXISTS "Managers can create publishing records" ON blog_platform_publishing;
CREATE POLICY "Managers can create publishing records"
  ON blog_platform_publishing FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'editor')
    )
  );

DROP POLICY IF EXISTS "Managers can update publishing status" ON blog_platform_publishing;
CREATE POLICY "Managers can update publishing status"
  ON blog_platform_publishing FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'editor')
    )
  );

-- ============================================
-- Note: Other migration files may also need fixing
-- Check these files and update manually:
-- - supabase/migrations/20250118000004_add_organization_logo_support.sql
-- - supabase/migrations/20250110000000_create_integrations_abstraction.sql
-- - supabase/schema.sql
-- - supabase/re-enable-blog-posts-rls.sql
-- - supabase/reset-all-policies.sql
-- - supabase/cleanup-and-fix.sql
-- ============================================

-- Verify the fix
DO $$
BEGIN
  -- Check if any policies still reference 'owner'
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE qual::text LIKE '%owner%' 
    AND tablename IN ('blog_generation_queue', 'blog_approvals', 'blog_platform_publishing')
  ) THEN
    RAISE NOTICE 'Warning: Some policies may still reference "owner" role';
  ELSE
    RAISE NOTICE 'Success: All policies updated to use "admin" instead of "owner"';
  END IF;
END $$;

