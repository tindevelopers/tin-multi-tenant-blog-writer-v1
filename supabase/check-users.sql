-- Check Users in Database
-- Run this on the CORRECT Supabase project: edtxtpqrfpxeogukfunq

-- Step 1: Check if users table exists and has data
SELECT 
  'Users Table Check' as check_type,
  COUNT(*) as total_users,
  MIN(created_at) as oldest_user,
  MAX(created_at) as newest_user
FROM users;

-- Step 2: List all users
SELECT 
  user_id,
  email,
  full_name,
  role,
  org_id,
  created_at,
  updated_at
FROM users
ORDER BY created_at DESC;

-- Step 3: Check for systemadmin user specifically
SELECT 
  'System Admin Check' as check_type,
  user_id,
  email,
  full_name,
  role,
  org_id,
  created_at,
  updated_at
FROM users
WHERE email = 'systemadmin@tin.info';

-- Step 4: Check organizations
SELECT 
  org_id,
  name,
  slug,
  created_at
FROM organizations
ORDER BY created_at DESC;

-- Step 5: Check auth.users table (if accessible)
SELECT 
  'Auth Users Check' as check_type,
  id,
  email,
  created_at
FROM auth.users
WHERE email = 'systemadmin@tin.info'
LIMIT 1;

-- Step 6: Check RLS policies on users table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users';

