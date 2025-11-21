-- =====================================================
-- UNDO: User and Role Management Schema
-- =====================================================
-- This script reverses the changes made by the user-role schema creation
-- Run this in Supabase SQL Editor to remove the created objects
-- =====================================================

-- Step 1: Drop RLS Policies (must be done before dropping tables)
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

-- Step 2: Disable RLS on tables (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
        ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Step 3: Drop triggers (only if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
        DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
    END IF;
END $$;

-- Step 4: Drop tables (CASCADE will remove indexes and constraints)
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Step 5: Drop the trigger function (only if no other tables use it)
-- Check if any other tables are using this function first
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

-- Step 6: Verify removal
SELECT 
    'Verification: Remaining objects' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN 'roles table still exists'
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN 'user_profiles table still exists'
        ELSE 'All tables removed successfully'
    END as status;

-- Show any remaining related objects
SELECT 
    'Remaining indexes' as check_type,
    indexname,
    tablename
FROM pg_indexes
WHERE tablename IN ('roles', 'user_profiles')
AND schemaname = 'public';

