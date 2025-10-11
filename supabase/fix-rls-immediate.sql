-- Immediate RLS Fix for Users Table
-- Run this on the CORRECT Supabase project: edtxtpqrfpxeogukfunq

-- Step 1: Temporarily disable RLS to test
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 2: Test if user can be fetched without RLS
SELECT 
  'RLS Disabled Test' as test_name,
  user_id,
  email,
  role,
  full_name
FROM users 
WHERE email = 'systemadmin@tin.info';

-- Step 3: Re-enable RLS with correct policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON users;

-- Step 5: Create new, simpler policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Allow user creation during signup"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Step 6: Test with RLS enabled
SELECT 
  'RLS Enabled Test' as test_name,
  auth.uid() as current_auth_user,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 'User is authenticated'
    ELSE 'User is not authenticated'
  END as auth_status;

-- Step 7: Try to fetch the user profile (this should work now)
SELECT 
  user_id,
  email,
  role,
  full_name
FROM users 
WHERE user_id = auth.uid();

