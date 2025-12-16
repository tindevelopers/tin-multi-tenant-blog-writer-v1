-- FIX: Allow multiple Webflow integrations per organization
-- Run this directly in Supabase SQL Editor to enable multi-site Webflow support
-- Date: 2025-01-28

-- Drop the unique constraint that prevents multiple integrations of the same type per org
-- These constraints were added in 20250118000000_add_connection_method_support.sql

-- Drop from dev table
ALTER TABLE IF EXISTS integrations_dev
  DROP CONSTRAINT IF EXISTS integrations_dev_org_provider_unique;

-- Drop from staging table
ALTER TABLE IF EXISTS integrations_staging
  DROP CONSTRAINT IF EXISTS integrations_staging_org_provider_unique;

-- Drop from prod table
ALTER TABLE IF EXISTS integrations_prod
  DROP CONSTRAINT IF EXISTS integrations_prod_org_provider_unique;

-- Drop from base integrations table (just in case)
ALTER TABLE IF EXISTS integrations
  DROP CONSTRAINT IF EXISTS unique_org_integration_type;

-- Verify constraints were dropped (run this query separately to check):
-- SELECT conname, conrelid::regclass 
-- FROM pg_constraint 
-- WHERE conname LIKE '%org_provider_unique%' OR conname LIKE '%unique_org_integration%';

-- After running this, you should be able to add multiple Webflow sites for the same organization.
