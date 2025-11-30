/**
 * Direct test of Webflow Structure Scanning
 * 
 * This script tests the scan functionality directly without going through the API route.
 * It uses the same functions that the API route uses.
 * 
 * Usage:
 *   npx tsx scripts/test-webflow-scan-direct.ts
 * 
 * Environment variables required:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY with proper auth)
 *   - WEBFLOW_API_KEY (optional, will use integration if not provided)
 *   - WEBFLOW_SITE_ID (optional, will use integration if not provided)
 */

import { createClient } from '@supabase/supabase-js';
import { discoverWebflowStructure } from '../src/lib/integrations/webflow-structure-discovery';

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const WEBFLOW_API_KEY = process.env.WEBFLOW_API_KEY;
const WEBFLOW_SITE_ID = process.env.WEBFLOW_SITE_ID;
const ORG_ID = process.env.ORG_ID; // Optional: specific org to test

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testWebflowScan() {
  console.log('\n=== Testing Webflow Structure Scanning Directly ===\n');

  try {
    // Step 1: Get Webflow integration
    console.log('Step 1: Finding Webflow integration...');
    
    let orgId = ORG_ID;
    if (!orgId) {
      // Get first organization with Webflow integration
      const { data: integrations, error: intError } = await supabase
        .from('integrations')
        .select('org_id, integration_id, config, metadata')
        .eq('type', 'webflow')
        .eq('status', 'active')
        .limit(1);

      if (intError || !integrations || integrations.length === 0) {
        console.error('❌ No active Webflow integration found');
        console.error('   Please configure a Webflow integration first');
        process.exit(1);
      }

      orgId = integrations[0].org_id;
      console.log(`✓ Found Webflow integration for org: ${orgId}`);
    } else {
      const { data: integration } = await supabase
        .from('integrations')
        .select('integration_id, config, metadata')
        .eq('org_id', orgId)
        .eq('type', 'webflow')
        .eq('status', 'active')
        .single();

      if (!integration) {
        console.error(`❌ No active Webflow integration found for org: ${orgId}`);
        process.exit(1);
      }
      console.log(`✓ Using Webflow integration for org: ${orgId}`);
    }

    // Get integration details
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('integration_id, config, metadata')
      .eq('org_id', orgId)
      .eq('type', 'webflow')
      .eq('status', 'active')
      .single();

    if (integrationError || !integration) {
      throw new Error('Failed to fetch Webflow integration');
    }

    const config = integration.config as any;
    const metadata = integration.metadata as any;
    const apiToken = WEBFLOW_API_KEY || config?.api_key || config?.apiToken || config?.token;
    const siteId = WEBFLOW_SITE_ID || config?.site_id || config?.siteId || metadata?.site_id;

    if (!apiToken) {
      console.error('❌ Webflow API token not found');
      console.error('   Set WEBFLOW_API_KEY environment variable or configure integration');
      process.exit(1);
    }

    if (!siteId) {
      console.error('❌ Webflow site ID not found');
      console.error('   Set WEBFLOW_SITE_ID environment variable or configure integration');
      process.exit(1);
    }

    console.log(`✓ API Token: ${apiToken.substring(0, 10)}...`);
    console.log(`✓ Site ID: ${siteId}\n`);

    // Step 2: Create scan record
    console.log('Step 2: Creating scan record...');
    const { data: scanRecord, error: scanError } = await supabase
      .from('webflow_structure_scans')
      .insert({
        org_id: orgId,
        integration_id: integration.integration_id,
        site_id: siteId,
        scan_type: 'full',
        status: 'scanning',
        scan_started_at: new Date().toISOString(),
      })
      .select('scan_id')
      .single();

    if (scanError || !scanRecord) {
      throw new Error(`Failed to create scan record: ${scanError?.message}`);
    }

    const scanId = scanRecord.scan_id;
    console.log(`✓ Scan record created: ${scanId}\n`);

    // Step 3: Perform scan
    console.log('Step 3: Performing Webflow structure scan...');
    console.log('   This may take a few moments...\n');

    const startTime = Date.now();
    const structure = await discoverWebflowStructure(apiToken, siteId);
    const duration = Date.now() - startTime;

    console.log('✓ Scan completed successfully!\n');
    console.log('Results:');
    console.log(`   Collections: ${structure.collections.length}`);
    console.log(`   Static Pages: ${structure.static_pages.length}`);
    console.log(`   CMS Items: ${structure.existing_content.filter(c => c.type === 'cms').length}`);
    console.log(`   Static Items: ${structure.existing_content.filter(c => c.type === 'static').length}`);
    console.log(`   Total Content Items: ${structure.existing_content.length}`);
    console.log(`   Duration: ${duration}ms\n`);

    // Step 4: Update scan record
    console.log('Step 4: Updating scan record with results...');
    const { error: updateError } = await supabase
      .from('webflow_structure_scans')
      .update({
        status: 'completed',
        collections: structure.collections,
        static_pages: structure.static_pages,
        existing_content: structure.existing_content,
        collections_count: structure.collections.length,
        static_pages_count: structure.static_pages.length,
        cms_items_count: structure.existing_content.filter(c => c.type === 'cms').length,
        total_content_items: structure.existing_content.length,
        scan_completed_at: new Date().toISOString(),
        next_scan_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('scan_id', scanId);

    if (updateError) {
      throw new Error(`Failed to update scan record: ${updateError.message}`);
    }

    console.log('✓ Scan record updated\n');

    // Step 5: Display sample results
    if (structure.collections.length > 0) {
      console.log('Sample Collections:');
      structure.collections.slice(0, 3).forEach((col, idx) => {
        console.log(`   ${idx + 1}. ${col.name} (${col.slug}) - ${col.fields?.length || 0} fields`);
      });
      console.log('');
    }

    if (structure.static_pages.length > 0) {
      console.log('Sample Static Pages:');
      structure.static_pages.slice(0, 5).forEach((page, idx) => {
        console.log(`   ${idx + 1}. ${page.displayName} (${page.slug})`);
      });
      console.log('');
    }

    if (structure.existing_content.length > 0) {
      console.log('Sample Content Items:');
      structure.existing_content.slice(0, 5).forEach((item, idx) => {
        console.log(`   ${idx + 1}. [${item.type}] ${item.title} - ${item.url}`);
      });
      console.log('');
    }

    console.log('✅ All tests passed!');
    console.log(`\nScan ID: ${scanId}`);
    console.log(`You can view this scan in the database or via the API:\n`);
    console.log(`   GET /api/integrations/webflow/scan-structure?scan_id=${scanId}`);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testWebflowScan().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

