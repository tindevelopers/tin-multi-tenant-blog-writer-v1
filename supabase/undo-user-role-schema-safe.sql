-- =====================================================
-- SAFE UNDO: User and Role Management Schema
-- =====================================================
-- This script safely reverses the changes made by the user-role schema creation
-- It checks for data before dropping tables
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Check if tables exist and have data
DO $$
DECLARE
    roles_count INTEGER := 0;
    profiles_count INTEGER := 0;
BEGIN
    -- Check roles table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
        SELECT COUNT(*) INTO roles_count FROM roles;
        RAISE NOTICE 'roles table exists with % rows', roles_count;
        
        IF roles_count > 0 THEN
            RAISE WARNING 'roles table contains % rows. Data will be lost!', roles_count;
        END IF;
    ELSE
        RAISE NOTICE 'roles table does not exist';
    END IF;
    
    -- Check user_profiles table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        SELECT COUNT(*) INTO profiles_count FROM user_profiles;
        RAISE NOTICE 'user_profiles table exists with % rows', profiles_count;
        
        IF profiles_count > 0 THEN
            RAISE WARNING 'user_profiles table contains % rows. Data will be lost!', profiles_count;
        END IF;
    ELSE
        RAISE NOTICE 'user_profiles table does not exist';
    END IF;
END $$;

-- Step 2: Show what will be removed (for verification)
SELECT 
    'Objects to be removed' as check_type,
    'roles' as object_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') 
         THEN 'EXISTS' 
         ELSE 'DOES NOT EXIST' 
    END as status
UNION ALL
SELECT 
    'Objects to be removed' as check_type,
    'user_profiles' as object_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') 
         THEN 'EXISTS' 
         ELSE 'DOES NOT EXIST' 
    END as status;

-- Step 3: Drop RLS Policies (must be done before dropping tables)
-- Only drop policies if tables exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
        DROP POLICY IF EXISTS "User profiles are modifiable by service role only" ON user_profiles;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
        DROP POLICY IF EXISTS "Roles are viewable by authenticated users" ON roles;
        DROP POLICY IF EXISTS "Roles are modifiable by service role only" ON roles;
    END IF;
END $$;

-- Step 4: Disable RLS on tables (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
        ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Step 5: Drop triggers (only if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
        DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
    END IF;
END $$;

-- Step 6: Drop tables (CASCADE will remove indexes and constraints)
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Step 7: Drop the trigger function (only if no other tables use it)
DO $$
BEGIN
    -- Only drop if no other triggers are using it
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger t
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE p.proname = 'update_updated_at_column'
        AND t.tgname != 'update_user_profiles_updated_at'
        AND t.tgname != 'update_roles_updated_at'
    ) THEN
        DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
        RAISE NOTICE 'Dropped update_updated_at_column function';
    ELSE
        RAISE NOTICE 'update_updated_at_column function is still in use by other tables, keeping it';
    END IF;
END $$;

-- Step 8: Final verification
SELECT 
    'Final Verification' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') 
             OR EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles')
        THEN 'WARNING: Some tables still exist'
        ELSE 'SUCCESS: All tables removed'
    END as status;

