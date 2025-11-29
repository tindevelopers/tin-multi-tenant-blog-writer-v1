-- Migration: Fix RLS policies for blog_platform_publishing to include system_admin and super_admin roles
-- This ensures that system_admin and super_admin can create publishing records

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Managers can create publishing records" ON blog_platform_publishing;

-- Recreate INSERT policy with system_admin and super_admin roles
CREATE POLICY "Managers can create publishing records"
  ON blog_platform_publishing FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'editor', 'system_admin', 'super_admin')
    )
  );

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Managers can update publishing status" ON blog_platform_publishing;

-- Recreate UPDATE policy with system_admin and super_admin roles
CREATE POLICY "Managers can update publishing status"
  ON blog_platform_publishing FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'editor', 'system_admin', 'super_admin')
    )
  );

COMMENT ON POLICY "Managers can create publishing records" ON blog_platform_publishing IS 
  'Allows users with admin, manager, editor, system_admin, or super_admin roles to create publishing records for their organization';

COMMENT ON POLICY "Managers can update publishing status" ON blog_platform_publishing IS 
  'Allows users with admin, manager, editor, system_admin, or super_admin roles to update publishing records for their organization';

