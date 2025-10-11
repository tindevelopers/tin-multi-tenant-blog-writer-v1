-- Fix Recursive RLS Policies
-- Run this in Supabase SQL Editor to remove the problematic policies

-- Step 1: Drop the problematic recursive policies
DROP POLICY IF EXISTS "Managers can update users" ON users;
DROP POLICY IF EXISTS "Users can view org members" ON users;

-- Step 2: Keep the safe policies and create a simple system admin policy
-- The safe policies are:
-- - "Users can view own profile" 
-- - "Users can update own profile"
-- - "Allow user creation during signup"

-- Step 3: Create a system admin policy that can view all users
CREATE POLICY "System admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.user_id = auth.uid() 
      AND u.role = 'system_admin'
    )
  );

-- Step 4: Create a system admin policy that can update all users
CREATE POLICY "System admins can update all users"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.user_id = auth.uid() 
      AND u.role = 'system_admin'
    )
  );

-- Step 5: Verify the user can now be accessed
SELECT 
  'User Verification After Recursive Fix' as check_type,
  user_id,
  email,
  role,
  full_name,
  created_at
FROM users 
WHERE email = 'systemadmin@tin.info';

-- Step 6: Show final policies
SELECT 
  'Final RLS Policies' as check_type,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;
