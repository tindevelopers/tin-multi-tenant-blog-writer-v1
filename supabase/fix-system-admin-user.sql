-- Fix System Admin User Script
-- Run this in Supabase SQL Editor to ensure the system admin user is properly set up

-- Step 1: Get the user ID from auth.users
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the user ID for systemadmin@tin.info
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'systemadmin@tin.info';
    
    IF admin_user_id IS NULL THEN
        RAISE NOTICE 'User systemadmin@tin.info not found in auth.users';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found user ID: %', admin_user_id;
    
    -- Step 2: Check if user exists in users table
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = admin_user_id) THEN
        RAISE NOTICE 'User not found in users table, creating...';
        
        -- Insert user into users table
        INSERT INTO users (user_id, email, role, full_name, created_at, updated_at)
        VALUES (
            admin_user_id,
            'systemadmin@tin.info',
            'system_admin',
            'System Administrator',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'User created in users table';
    ELSE
        RAISE NOTICE 'User exists in users table, updating role...';
        
        -- Update user role to system_admin
        UPDATE users 
        SET 
            role = 'system_admin',
            updated_at = NOW()
        WHERE user_id = admin_user_id;
        
        RAISE NOTICE 'User role updated to system_admin';
    END IF;
    
    -- Step 3: Verify the user
    SELECT 
        user_id,
        email,
        role,
        full_name,
        created_at
    FROM users 
    WHERE user_id = admin_user_id;
    
END $$;

-- Step 4: Final verification
SELECT 
    'Final Verification' as check_type,
    u.user_id,
    u.email,
    u.role,
    u.full_name,
    au.email_confirmed_at,
    au.created_at as auth_created_at
FROM users u
JOIN auth.users au ON u.user_id = au.id
WHERE u.email = 'systemadmin@tin.info';

