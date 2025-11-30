-- Check Webflow Integration Status
-- Run this in Supabase SQL Editor

-- 1. Check if integrations table exists
SELECT 
  'Table Check' as check_type,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'integrations'
  ) as integrations_table_exists;

-- 2. Check all Webflow integrations
SELECT 
  'Webflow Integrations' as check_type,
  integration_id,
  org_id,
  name,
  type,
  status,
  config->>'api_key' as has_api_key,
  config->>'site_id' as site_id_from_config,
  metadata->>'site_id' as site_id_from_metadata,
  created_at,
  updated_at
FROM integrations
WHERE type = 'webflow'
ORDER BY created_at DESC;

-- 3. Check for active Webflow integrations
SELECT 
  'Active Webflow Integrations' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ No active Webflow integrations found'
    ELSE '✅ Found ' || COUNT(*) || ' active integration(s)'
  END as status
FROM integrations
WHERE type = 'webflow'
AND status = 'active';

-- 4. Check integration config structure
SELECT 
  'Integration Config Structure' as check_type,
  integration_id,
  jsonb_object_keys(config) as config_key,
  config->jsonb_object_keys(config) as config_value
FROM integrations
WHERE type = 'webflow'
LIMIT 10;

-- 5. Sample integration config (first Webflow integration)
SELECT 
  'Sample Config' as check_type,
  integration_id,
  config,
  metadata
FROM integrations
WHERE type = 'webflow'
LIMIT 1;

