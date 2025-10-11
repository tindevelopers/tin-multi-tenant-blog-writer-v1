-- Fix RLS Policies for Users Table
-- This script ensures users can read their own profile data

-- First, drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON users;

-- Recreate the policies with proper syntax
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Allow user creation during signup"
  ON users FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Test the policy by checking if the current user can read their own data
SELECT 
  'RLS Policy Test' as test_name,
  auth.uid() as current_user_id,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 'User is authenticated'
    ELSE 'User is not authenticated'
  END as auth_status;

-- Show current user profile (should work if RLS is correct)
SELECT 
  user_id,
  email,
  role,
  full_name,
  org_id
FROM users 
WHERE user_id = auth.uid();

