-- Quick Check for Problematic Tables and Migrations
-- Run this in Supabase SQL Editor

-- 1. Check if problematic tables exist
SELECT 
  'Problematic Tables Check' as check_type,
  table_name,
  CASE 
    WHEN table_name = 'tenants' THEN '❌ EXISTS - Should be DROPPED (wrong schema)'
    WHEN table_name = 'user_tenants' THEN '❌ EXISTS - Should be DROPPED (wrong schema)'
    WHEN table_name = 'webflow_site_scans' THEN '❌ EXISTS - Wrong name, should be webflow_structure_scans'
    ELSE '✅ OK'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('tenants', 'user_tenants', 'webflow_site_scans')
ORDER BY table_name;

-- 2. Check if correct table exists
SELECT 
  'Correct Tables Check' as check_type,
  table_name,
  CASE 
    WHEN table_name = 'webflow_structure_scans' THEN '✅ EXISTS - Correct table'
    WHEN table_name = 'integrations' THEN '✅ EXISTS - Correct table'
    ELSE '✅ OK'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('webflow_structure_scans', 'integrations')
ORDER BY table_name;

-- 3. Check integrations table structure (should have org_id, NOT tenant_id)
SELECT 
  'Integrations Table Structure' as check_type,
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
AND column_name IN ('tenant_id', 'org_id', 'integration_id', 'type', 'status')
ORDER BY column_name;

-- 4. Check for migrations with "tenant" in the name (excluding migration scripts)
SELECT 
  'Problematic Migrations' as check_type,
  version,
  name,
  CASE 
    WHEN name ILIKE '%tenant%' AND name NOT ILIKE '%migrate%' AND name NOT ILIKE '%replace%' THEN '⚠️ PROBLEMATIC - References tenant schema'
    WHEN name ILIKE '%webflow_site_scans%' AND name NOT ILIKE '%webflow_structure_scans%' THEN '⚠️ PROBLEMATIC - Wrong table name'
    ELSE '✅ OK'
  END as status
FROM supabase_migrations.schema_migrations
WHERE name ILIKE '%tenant%' 
   OR (name ILIKE '%webflow%' AND name ILIKE '%scan%')
ORDER BY version DESC;

