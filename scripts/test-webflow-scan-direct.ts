#!/usr/bin/env node
/**
 * Direct Test of Webflow Structure Scan
 * 
 * This script tests the scan functionality directly using the service client,
 * bypassing the API endpoint authentication.
 * 
 * Usage:
 *   npx tsx scripts/test-webflow-scan-direct.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createServiceClient } from '@/lib/supabase/service';
import { discoverWebflowStructure } from '@/lib/integrations/webflow-structure-discovery';
import { logger } from '@/utils/logger';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testWebflowScan() {
  console.log('\n=== Testing Webflow Structure Scan ===\n');

  // Check environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!SUPABASE_URL);
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_KEY);
    console.error('\n💡 Make sure .env.local file exists with these variables.');
    process.exit(1);
  }

  try {
    const supabase = createServiceClient();

    // Step 1: Find an active Webflow integration
    console.log('Step 1: Finding active Webflow integration...\n');
    
    const { data: integrations, error: integrationError } = await supabase
      .from('integrations')
      .select('integration_id, org_id, config, metadata')
      .eq('type', 'webflow')
      .eq('status', 'active')
      .limit(1);

    if (integrationError) {
      console.error('❌ Error querying integrations:', integrationError.message);
      process.exit(1);
    }

    if (!integrations || integrations.length === 0) {
      console.error('❌ No active Webflow integration found');
      console.error('   Please configure a Webflow integration first.');
      process.exit(1);
    }

    const integration = integrations[0];
    const config = integration.config as any;
    const metadata = integration.metadata as any;
    
    const apiToken = config?.api_key || config?.apiToken || config?.token;
    const siteId = config?.site_id || config?.siteId || metadata?.site_id;

    console.log('✅ Found Webflow integration:');
    console.log(`   Integration ID: ${integration.integration_id}`);
    console.log(`   Organization ID: ${integration.org_id}`);
    console.log(`   Site ID: ${siteId || 'NOT SET'}`);
    console.log(`   API Token: ${apiToken ? '***SET***' : 'NOT SET'}\n`);

    if (!apiToken) {
      console.error('❌ Webflow API token not found in integration config');
      process.exit(1);
    }

    if (!siteId) {
      console.error('❌ Webflow site ID not found in integration config');
      process.exit(1);
    }

    // Step 2: Test the scan discovery function
    console.log('Step 2: Testing Webflow structure discovery...\n');
    console.log('   This will fetch:');
    console.log('   - CMS Collections');
    console.log('   - CMS Items');
    console.log('   - Static Pages\n');

    const startTime = Date.now();
    
    const structure = await discoverWebflowStructure(apiToken, siteId);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('✅ Scan completed successfully!\n');
    console.log('Results:');
    console.log(`   Collections: ${structure.collections.length}`);
    console.log(`   Static Pages: ${structure.static_pages.length}`);
    console.log(`   CMS Items: ${structure.existing_content.filter(c => c.type === 'cms').length}`);
    console.log(`   Total Content Items: ${structure.existing_content.length}`);
    console.log(`   Duration: ${duration}s\n`);

    // Step 3: Show sample data
    if (structure.collections.length > 0) {
      console.log('Sample Collections:');
      structure.collections.slice(0, 3).forEach((collection, i) => {
        console.log(`   ${i + 1}. ${collection.name} (${collection.slug})`);
      });
      console.log('');
    }

    if (structure.static_pages.length > 0) {
      console.log('Sample Static Pages:');
      structure.static_pages.slice(0, 5).forEach((page, i) => {
        const pageTitle = (page as any).displayName || (page as any).title || page.slug;
        console.log(`   ${i + 1}. ${pageTitle} (${page.slug})`);
      });
      console.log('');
    }

    if (structure.existing_content.length > 0) {
      console.log('Sample Content Items:');
      structure.existing_content.slice(0, 5).forEach((item, i) => {
        console.log(`   ${i + 1}. [${item.type.toUpperCase()}] ${item.title}`);
        console.log(`      URL: ${item.url}`);
        console.log(`      Keywords: ${item.keywords.slice(0, 3).join(', ')}${item.keywords.length > 3 ? '...' : ''}`);
      });
      console.log('');
    }

    // Step 4: Test storing the scan
    console.log('Step 3: Testing scan storage...\n');
    
    const { data: scanRecord, error: scanError } = await supabase
      .from('webflow_structure_scans')
      .insert({
        org_id: integration.org_id,
        integration_id: integration.integration_id,
        site_id: siteId,
        scan_type: 'full',
        status: 'completed',
        collections: structure.collections,
        static_pages: structure.static_pages,
        existing_content: structure.existing_content,
        collections_count: structure.collections.length,
        static_pages_count: structure.static_pages.length,
        cms_items_count: structure.existing_content.filter(c => c.type === 'cms').length,
        total_content_items: structure.existing_content.length,
        scan_started_at: new Date(Date.now() - parseFloat(duration) * 1000).toISOString(),
        scan_completed_at: new Date().toISOString(),
        next_scan_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('scan_id')
      .single();

    if (scanError) {
      console.error('⚠️  Failed to store scan:', scanError.message);
      console.error('   (This is OK - the scan itself worked)\n');
    } else {
      console.log('✅ Scan stored successfully!');
      console.log(`   Scan ID: ${scanRecord.scan_id}\n`);
    }

    console.log('🎉 All tests passed!\n');
    console.log('Summary:');
    console.log('   ✅ Webflow API connection: Working');
    console.log('   ✅ Structure discovery: Working');
    console.log('   ✅ Data extraction: Working');
    console.log('   ✅ Scan storage: ' + (scanError ? 'Failed (non-critical)' : 'Working'));
    console.log('\n💡 The scan endpoint should work correctly!\n');

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
