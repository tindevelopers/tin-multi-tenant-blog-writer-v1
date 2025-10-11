-- Temporarily Disable RLS to Fix Admin Panel
-- Run this in Supabase SQL Editor

-- Step 1: Disable RLS completely on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all policies to ensure clean state
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON users;
DROP POLICY IF EXISTS "Allow user creation" ON users;
DROP POLICY IF EXISTS "System admins can view all users" ON users;
DROP POLICY IF EXISTS "System admins can update all users" ON users;
DROP POLICY IF EXISTS "Managers can update users" ON users;
DROP POLICY IF EXISTS "Users can view org members" ON users;

-- Step 3: Verify the user can now be accessed without RLS
SELECT 
  'User Verification - RLS Disabled' as check_type,
  user_id,
  email,
  role,
  full_name,
  created_at
FROM users 
WHERE email = 'systemadmin@tin.info';

-- Step 4: Show that RLS is disabled
SELECT 
  'RLS Status Check' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'users';
