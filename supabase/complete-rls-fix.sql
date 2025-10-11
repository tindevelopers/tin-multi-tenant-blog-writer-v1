-- Complete RLS Fix for Users Table
-- Run this on the CORRECT Supabase project: edtxtpqrfpxeogukfunq

-- Step 1: Check current RLS status
SELECT 
  'Current RLS Status' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'users';

-- Step 2: Check existing policies
SELECT 
  'Existing Policies' as check_type,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'users';

-- Step 3: Completely disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 4: Test access without RLS
SELECT 
  'RLS Disabled - User Check' as test_type,
  user_id,
  email,
  role,
  full_name,
  org_id
FROM users 
WHERE email = 'systemadmin@tin.info';

-- Step 5: Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON users;

-- Step 7: Create new, simple policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Allow user creation during signup"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Step 8: Verify policies were created
SELECT 
  'New Policies Created' as check_type,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'users';

-- Step 9: Test authentication state
SELECT 
  'Auth State Test' as test_type,
  auth.uid() as current_user_id,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 'User is authenticated'
    ELSE 'User is NOT authenticated'
  END as auth_status;

-- Step 10: Final test - try to fetch user profile
SELECT 
  'Final User Fetch Test' as test_type,
  user_id,
  email,
  role,
  full_name
FROM users 
WHERE user_id = auth.uid();
