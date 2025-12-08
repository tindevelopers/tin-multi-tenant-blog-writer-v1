-- Check Applied Migrations and Identify Problems
-- Run this in Supabase SQL Editor

-- 1. First, check the actual structure of migrations table
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'supabase_migrations'
AND table_name = 'schema_migrations'
ORDER BY ordinal_position;

-- 2. Check all applied migrations (using available columns)
SELECT 
  version,
  name,
  CASE 
    WHEN name ILIKE '%tenant%' THEN '⚠️ PROBLEMATIC - References tenant schema'
    WHEN name ILIKE '%webflow_site_scans%' AND name NOT ILIKE '%webflow_structure_scans%' THEN '⚠️ PROBLEMATIC - Wrong table name'
    ELSE '✅ OK'
  END as status
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 50;

-- 2. Check for problematic tables that shouldn't exist
SELECT 
  'tenants' as table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'tenants'
  ) as exists,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'tenants'
    ) THEN '❌ Should NOT exist - Wrong schema'
    ELSE '✅ OK - Does not exist'
  END as status
UNION ALL
SELECT 
  'user_tenants' as table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_tenants'
  ) as exists,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_tenants'
    ) THEN '❌ Should NOT exist - Wrong schema'
    ELSE '✅ OK - Does not exist'
  END as status
UNION ALL
SELECT 
  'webflow_site_scans' as table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'webflow_site_scans'
  ) as exists,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'webflow_site_scans'
    ) THEN '❌ Wrong table name - Should be webflow_structure_scans'
    ELSE '✅ OK - Does not exist'
  END as status
UNION ALL
SELECT 
  'webflow_structure_scans' as table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'webflow_structure_scans'
  ) as exists,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'webflow_structure_scans'
    ) THEN '✅ Correct table exists'
    ELSE '⚠️ Should exist - Migration 009_webflow_structure_scans.sql not applied'
  END as status;

-- 3. Check for problematic integrations table structure
SELECT 
  'integrations table' as check_type,
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'tenant_id' THEN '❌ WRONG - Should be org_id'
    WHEN column_name = 'org_id' THEN '✅ CORRECT'
    ELSE '✅ OK'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'integrations'
AND column_name IN ('tenant_id', 'org_id')
ORDER BY column_name;

-- 4. Find the most recent migration that might be problematic
SELECT 
  version,
  name,
  'Most recent migration - Check if this is problematic' as note
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 1;

