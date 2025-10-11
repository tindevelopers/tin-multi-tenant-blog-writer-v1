-- Check User Data Script (Fixed)
-- Run this in Supabase SQL Editor to verify user data

-- Step 1: Check if the user exists in auth.users
SELECT 
  'Auth Users Check' as check_type,
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users 
WHERE email = 'systemadmin@tin.info';

-- Step 2: Check if the user exists in the users table
SELECT 
  'Users Table Check' as check_type,
  user_id,
  email,
  role,
  full_name,
  org_id,
  created_at
FROM users 
WHERE email = 'systemadmin@tin.info';

-- Step 3: Check by user_id if we found the auth user
SELECT 
  'Users Table by ID Check' as check_type,
  user_id,
  email,
  role,
  full_name,
  org_id,
  created_at
FROM users 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'systemadmin@tin.info');

-- Step 4: Check RLS policies on users table
SELECT 
  'RLS Policies Check' as check_type,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'users';

