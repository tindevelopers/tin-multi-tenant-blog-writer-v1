-- Final Status Check - Summary
-- Run this to get a complete picture

-- Summary: Do problematic tables exist?
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants')
      THEN '❌ PROBLEM: tenants table exists - needs to be dropped'
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_tenants')
      THEN '❌ PROBLEM: user_tenants table exists - needs to be dropped'
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webflow_site_scans')
      THEN '❌ PROBLEM: webflow_site_scans table exists (wrong name) - needs to be dropped'
    ELSE '✅ GOOD: No problematic tables found'
  END as problematic_tables_status;

-- Summary: Does correct table exist?
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webflow_structure_scans')
      THEN '✅ GOOD: webflow_structure_scans table exists (correct)'
    ELSE '❌ PROBLEM: webflow_structure_scans table missing - migration 009 not applied'
  END as correct_table_status;

-- Summary: Integrations table structure
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'integrations' 
      AND column_name = 'tenant_id'
    ) THEN '❌ PROBLEM: integrations table has tenant_id (should be org_id)'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'integrations' 
      AND column_name = 'org_id'
    ) THEN '✅ GOOD: integrations table has org_id (correct)'
    ELSE '⚠️  WARNING: Could not verify integrations table structure'
  END as integrations_structure_status;

-- Final verdict
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('tenants', 'user_tenants', 'webflow_site_scans'))
      THEN '❌ ACTION NEEDED: Problematic tables exist - run rollback script'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webflow_structure_scans')
      THEN '⚠️  ACTION NEEDED: Correct table missing - apply migration 009_webflow_structure_scans.sql'
    ELSE '✅ ALL GOOD: Database schema is correct!'
  END as final_verdict;

