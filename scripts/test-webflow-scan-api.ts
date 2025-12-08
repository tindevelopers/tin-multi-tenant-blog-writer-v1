/**
 * Test Webflow Structure Scan via API endpoint
 * 
 * This script calls the API endpoint directly, which will use the authenticated
 * session to find and use the Webflow integration.
 * 
 * Usage:
 *   npx tsx scripts/test-webflow-scan-api.ts
 * 
 * Make sure you're logged in and have a Webflow integration configured.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const WEBFLOW_SITE_ID = process.env.WEBFLOW_SITE_ID;

async function testViaAPI() {
  console.log('\n=== Testing Webflow Structure Scan via API ===\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  if (!WEBFLOW_SITE_ID) {
    console.log('⚠️  WEBFLOW_SITE_ID not set in environment');
    console.log('   The API will try to use the site_id from your integration config\n');
  }

  try {
    // Step 1: Trigger scan
    console.log('Step 1: Triggering scan via API...');
    
    const scanResponse = await fetch(`${BASE_URL}/api/integrations/webflow/scan-structure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        site_id: WEBFLOW_SITE_ID || undefined,
      }),
      credentials: 'include', // Include cookies for authentication
    });

    const scanData = await scanResponse.json();
    
    if (!scanResponse.ok) {
      if (scanResponse.status === 401) {
        console.error('❌ Unauthorized - Please make sure you are logged in');
        console.error('   Open the app in your browser and log in first');
        console.error('   Or provide authentication cookies/token');
        process.exit(1);
      }
      
      console.error(`❌ Scan failed: ${scanResponse.status}`);
      console.error('Response:', JSON.stringify(scanData, null, 2));
      process.exit(1);
    }

    console.log('✓ Scan triggered successfully!');
    console.log(`   Scan ID: ${scanData.scan_id}`);
    console.log(`   Status: ${scanData.status}`);
    console.log(`   Site ID: ${scanData.site_id}\n`);

    const scanId = scanData.scan_id;

    // Step 2: Poll for completion
    console.log('Step 2: Waiting for scan to complete...');
    console.log('   (This may take 30-60 seconds)\n');

    let attempts = 0;
    const maxAttempts = 30; // 30 attempts = ~60 seconds max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      const statusResponse = await fetch(
        `${BASE_URL}/api/integrations/webflow/scan-structure?scan_id=${scanId}`,
        {
          credentials: 'include',
        }
      );

      if (!statusResponse.ok) {
        console.error(`❌ Failed to get scan status: ${statusResponse.status}`);
        break;
      }

      const statusData = await statusResponse.json();
      const scan = statusData.scan;

      if (!scan) {
        console.log('⚠️  Scan not found, waiting...');
        attempts++;
        continue;
      }

      process.stdout.write(`\r   Attempt ${attempts + 1}/${maxAttempts} - Status: ${scan.status}...`);

      if (scan.status === 'completed') {
        console.log('\n\n✓ Scan completed successfully!\n');
        console.log('Results:');
        console.log(`   Collections: ${scan.collections_count || 0}`);
        console.log(`   Static Pages: ${scan.static_pages_count || 0}`);
        console.log(`   CMS Items: ${scan.cms_items_count || 0}`);
        console.log(`   Total Content Items: ${scan.total_content_items || 0}`);
        console.log(`   Completed at: ${scan.scan_completed_at}\n`);
        return;
      }

      if (scan.status === 'failed') {
        console.log('\n\n❌ Scan failed!');
        console.log(`   Error: ${scan.error_message || 'Unknown error'}\n`);
        process.exit(1);
      }

      attempts++;
    }

    console.log('\n\n⚠️  Scan is taking longer than expected');
    console.log(`   Current status: ${scanData.status}`);
    console.log(`   Check status manually: GET /api/integrations/webflow/scan-structure?scan_id=${scanId}\n`);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testViaAPI().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

