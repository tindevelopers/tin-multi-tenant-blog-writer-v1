-- Simple Fix for System Admin User
-- Run this in Supabase SQL Editor

-- Step 1: Insert or update the user in the users table
INSERT INTO users (user_id, email, role, full_name, created_at, updated_at)
SELECT 
    au.id,
    'systemadmin@tin.info',
    'system_admin',
    'System Administrator',
    NOW(),
    NOW()
FROM auth.users au
WHERE au.email = 'systemadmin@tin.info'
ON CONFLICT (user_id) 
DO UPDATE SET 
    role = 'system_admin',
    updated_at = NOW();

-- Step 2: Verify the user was created/updated
SELECT 
    'User Verification' as check_type,
    u.user_id,
    u.email,
    u.role,
    u.full_name,
    u.created_at
FROM users u
WHERE u.email = 'systemadmin@tin.info';
