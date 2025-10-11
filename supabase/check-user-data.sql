-- Check User Data Script
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
-- Replace 'USER_ID_HERE' with the actual user ID from step 1
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

-- Step 5: Test RLS with authenticated user context (if user exists)
-- This simulates what the app sees when authenticated
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the user ID first
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'systemadmin@tin.info';
    
    IF admin_user_id IS NOT NULL THEN
        SET LOCAL role TO authenticated;
        SET LOCAL "request.jwt.claims" TO json_build_object('sub', admin_user_id::text, 'email', 'systemadmin@tin.info');
        
        PERFORM user_id, email, role, full_name
        FROM users 
        WHERE user_id = admin_user_id;
        
        RESET role;
    ELSE
        RAISE NOTICE 'User not found in auth.users, skipping RLS test';
    END IF;
END $$;
