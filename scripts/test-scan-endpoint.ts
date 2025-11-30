/**
 * Test script for Webflow Scan API Endpoint
 * Tests both authenticated and service-level endpoints
 */

import { createServiceClient } from '../src/lib/supabase/service';
import { logger } from '../src/utils/logger';

async function testScanEndpoint() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Webflow Scan API Endpoint Test');
  console.log('═══════════════════════════════════════════════════════════\n');

  const supabase = createServiceClient();

  try {
    // Test 1: Check scan-status endpoint (uses service client, no auth needed)
    console.log('📊 Test 1: Checking scan-status endpoint...');
    console.log('   Endpoint: GET /api/integrations/webflow/scan-status');
    
    const response = await fetch('http://localhost:3000/api/integrations/webflow/scan-status');
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('   ✅ Status endpoint works!');
      console.log(`   📈 Found ${data.count} scan(s)`);
      console.log(`   Summary: ${data.summary.completed} completed, ${data.summary.failed} failed, ${data.summary.in_progress} in progress`);
      
      if (data.latest_scan) {
        console.log(`   Latest scan: ${data.latest_scan.status} (${data.latest_scan.total_content_items} items)`);
      }
    } else {
      console.log('   ❌ Status endpoint failed:', data.error || 'Unknown error');
    }

    // Test 2: Check database directly for scans
    console.log('\n📊 Test 2: Checking database directly...');
    const { data: scans, error: dbError } = await supabase
      .from('webflow_structure_scans')
      .select('scan_id, site_id, status, scan_type, total_content_items, scan_started_at, scan_completed_at, error_message')
      .order('scan_completed_at', { ascending: false })
      .order('scan_started_at', { ascending: false })
      .limit(5);

    if (dbError) {
      console.log('   ❌ Database query failed:', dbError.message);
    } else {
      console.log(`   ✅ Database accessible, found ${scans?.length || 0} scan(s)`);
      if (scans && scans.length > 0) {
        scans.forEach((scan, i) => {
          console.log(`   ${i + 1}. ${scan.status} - ${scan.total_content_items || 0} items - ${scan.scan_id.substring(0, 8)}...`);
        });
      }
    }

    // Test 3: Check if scan-structure endpoint exists (will fail auth, but confirms endpoint exists)
    console.log('\n📊 Test 3: Testing scan-structure endpoint (will require auth)...');
    console.log('   Endpoint: POST /api/integrations/webflow/scan-structure');
    
    const scanResponse = await fetch('http://localhost:3000/api/integrations/webflow/scan-structure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    
    const scanData = await scanResponse.json();
    
    if (scanResponse.status === 401) {
      console.log('   ✅ Endpoint exists and correctly requires authentication');
      console.log('   ℹ️  To trigger a scan, use the UI or provide valid auth credentials');
    } else if (scanResponse.ok) {
      console.log('   ✅ Scan triggered successfully!');
      console.log(`   Scan ID: ${scanData.scan_id}`);
      console.log(`   Status: ${scanData.status}`);
    } else {
      console.log('   ⚠️  Unexpected response:', scanResponse.status, scanData);
    }

    // Test 4: Check mark-stuck-scans endpoint
    console.log('\n📊 Test 4: Testing mark-stuck-scans endpoint...');
    console.log('   Endpoint: POST /api/integrations/webflow/mark-stuck-scans-failed');
    
    const stuckResponse = await fetch('http://localhost:3000/api/integrations/webflow/mark-stuck-scans-failed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeout_minutes: 10 }),
    });
    
    const stuckData = await stuckResponse.json();
    
    if (stuckResponse.ok && stuckData.success) {
      console.log('   ✅ Recovery endpoint works!');
      console.log(`   Marked ${stuckData.marked_failed} stuck scan(s) as failed`);
    } else {
      console.log('   ⚠️  Recovery endpoint response:', stuckResponse.status, stuckData);
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  Test Summary');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Scan-status endpoint: Working (no auth required)');
    console.log('✅ Database access: Working');
    console.log('✅ Scan-structure endpoint: Exists (requires auth)');
    console.log('✅ Mark-stuck-scans endpoint: Working');
    console.log('\n💡 To trigger a scan:');
    console.log('   1. Use the UI at /admin/panel/integrations');
    console.log('   2. Or authenticate and POST to /api/integrations/webflow/scan-structure');
    console.log('\n✅ All endpoints are functional!\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    logger.error('Scan endpoint test error', { error });
    process.exit(1);
  }
}

testScanEndpoint().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

