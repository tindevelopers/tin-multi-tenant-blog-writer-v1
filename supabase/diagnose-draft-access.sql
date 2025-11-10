-- Diagnostic Script: Check Draft Access After Database Restart
-- Run this in Supabase SQL Editor to diagnose draft retrieval issues

-- Step 1: Check if the draft exists
SELECT 
  'Draft Check' as check_type,
  post_id,
  title,
  org_id,
  created_by,
  status,
  created_at
FROM blog_posts
WHERE post_id = '8d7616d2-350b-4814-9616-923bba4bad81';

-- Step 2: Check user organization membership
-- Replace 'YOUR_USER_EMAIL' with the actual user email
SELECT 
  'User Organization Check' as check_type,
  u.user_id,
  u.email,
  u.org_id,
  u.role,
  o.name as org_name,
  o.slug as org_slug
FROM users u
LEFT JOIN organizations o ON u.org_id = o.org_id
WHERE u.email = 'developer@tin.info'; -- Update with actual email

-- Step 3: Verify RLS policy can see the draft
-- This simulates what RLS policy does
SELECT 
  'RLS Policy Simulation' as check_type,
  bp.post_id,
  bp.title,
  bp.org_id as draft_org_id,
  u.org_id as user_org_id,
  CASE 
    WHEN bp.org_id = u.org_id THEN '✅ Access Allowed'
    ELSE '❌ Access Denied - Org Mismatch'
  END as access_status
FROM blog_posts bp
CROSS JOIN users u
WHERE bp.post_id = '8d7616d2-350b-4814-9616-923bba4bad81'
  AND u.email = 'developer@tin.info'; -- Update with actual email

-- Step 4: Check all drafts for the user's organization
SELECT 
  'Organization Drafts' as check_type,
  bp.post_id,
  bp.title,
  bp.status,
  bp.created_at,
  u.email as created_by_email
FROM blog_posts bp
LEFT JOIN users u ON bp.created_by = u.user_id
WHERE bp.org_id IN (
  SELECT org_id FROM users WHERE email = 'developer@tin.info' -- Update with actual email
)
ORDER BY bp.created_at DESC
LIMIT 10;

-- Step 5: Verify RLS policies are enabled
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
WHERE tablename = 'blog_posts'
ORDER BY policyname;

-- Step 6: Check if user exists in auth.users
SELECT 
  'Auth User Check' as check_type,
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'developer@tin.info'; -- Update with actual email

-- Step 7: Verify user record exists in public.users table
SELECT 
  'Public Users Check' as check_type,
  user_id,
  email,
  org_id,
  role,
  full_name,
  created_at
FROM users
WHERE email = 'developer@tin.info'; -- Update with actual email

-- Step 8: If user is missing from public.users, this will help identify the issue
-- Check if there's a mismatch between auth.users and public.users
SELECT 
  'User Sync Check' as check_type,
  au.id as auth_user_id,
  au.email as auth_email,
  pu.user_id as public_user_id,
  pu.email as public_email,
  pu.org_id,
  CASE 
    WHEN pu.user_id IS NULL THEN '❌ User missing from public.users table'
    WHEN pu.org_id IS NULL THEN '❌ User has no org_id'
    ELSE '✅ User properly synced'
  END as sync_status
FROM auth.users au
LEFT JOIN users pu ON au.id = pu.user_id
WHERE au.email = 'developer@tin.info'; -- Update with actual email

