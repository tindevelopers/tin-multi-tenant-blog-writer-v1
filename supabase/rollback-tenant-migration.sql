-- Rollback Script for Tenant-Based Migration
-- ⚠️  WARNING: Only run this if you confirmed a problematic migration was applied
-- Run this in Supabase SQL Editor

-- Step 1: Check what needs to be rolled back
DO $$
DECLARE
  migration_version TEXT;
  migration_name TEXT;
BEGIN
  -- Find problematic migration
  SELECT version, name INTO migration_version, migration_name
  FROM supabase_migrations.schema_migrations
  WHERE name ILIKE '%tenant%' 
     OR name ILIKE '%webflow_site_scans%'
  ORDER BY version DESC
  LIMIT 1;
  
  IF migration_version IS NOT NULL THEN
    RAISE NOTICE 'Found problematic migration: % - %', migration_version, migration_name;
  ELSE
    RAISE NOTICE 'No problematic migration found';
  END IF;
END $$;

-- Step 2: Drop problematic tables if they exist
-- ⚠️  Only run these if the tables actually exist

-- Drop webflow_site_scans if it exists (wrong table name)
DROP TABLE IF EXISTS public.webflow_site_scans CASCADE;

-- Drop tenants table if it exists (wrong schema)
DROP TABLE IF EXISTS public.tenants CASCADE;

-- Drop user_tenants table if it exists (wrong schema)
DROP TABLE IF EXISTS public.user_tenants CASCADE;

-- Step 3: Remove problematic migration from migrations table
-- ⚠️  Replace 'MIGRATION_VERSION_HERE' with the actual version from Step 1
-- This removes the migration record so it can be re-run correctly

-- Example (uncomment and replace with actual version):
-- DELETE FROM supabase_migrations.schema_migrations 
-- WHERE version = 'MIGRATION_VERSION_HERE';

-- Step 4: Verify cleanup
SELECT 
  'Cleanup Verification' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') 
      THEN '❌ tenants table still exists'
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_tenants') 
      THEN '❌ user_tenants table still exists'
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webflow_site_scans') 
      THEN '❌ webflow_site_scans table still exists'
    ELSE '✅ All problematic tables removed'
  END as status;

