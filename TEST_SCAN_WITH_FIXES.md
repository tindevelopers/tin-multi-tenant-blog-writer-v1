# Test Webflow Scan API with Fixes Applied

## Fixes Implemented

1. ✅ **Added AbortController timeouts** to all Webflow API fetch calls (30 seconds per request)
2. ✅ **Improved error logging** with detailed step-by-step logging
3. ✅ **Fixed integration lookup** - validates integration exists before using it
4. ✅ **Added per-step logging** to track scan progress through each phase

## Test the Scan API

Run this in your browser console (on the authenticated site):

```javascript
// Complete Webflow Scan Test with Fixes
(async function testScanWithFixes() {
  console.log('═══════════════════════════════════════════════');
  console.log(' Webflow Structure Scan - Testing with Fixes');
  console.log('═══════════════════════════════════════════════\n');

  // Step 1: Check Integration
  console.log('STEP 1: Checking Webflow Integration...\n');
  const res = await fetch('/api/integrations');
  const data = await res.json();
  const webflow = data.integrations?.filter(i => i.type === 'webflow') || [];
  
  if (webflow.length === 0) {
    console.log('❌ No Webflow integration found!');
    return;
  }
  
  const active = webflow.filter(i => i.status === 'active');
  if (active.length === 0) {
    console.log('❌ No ACTIVE Webflow integrations found!');
    return;
  }
  
  console.log(`✅ Found ${active.length} active Webflow integration(s)\n`);

  // Step 2: Trigger Scan
  console.log('STEP 2: Triggering Scan...\n');
  const scanRes = await fetch('/api/integrations/webflow/scan-structure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  
  const scanData = await scanRes.json();
  
  if (!scanRes.ok || !scanData.success) {
    console.log('❌ Scan failed:', scanData.error);
    if (scanData.hint) console.log('💡 Hint:', scanData.hint);
    return;
  }
  
  console.log('✅ Scan started!');
  console.log(`   Scan ID: ${scanData.scan_id}`);
  console.log(`   Status: ${scanData.status}`);
  console.log(`   Site ID: ${scanData.site_id}\n`);

  // Step 3: Poll for Results (with timeout protection)
  console.log('STEP 3: Waiting for completion...\n');
  const scanId = scanData.scan_id;
  let attempts = 0;
  const maxAttempts = 150; // 5 minutes max (150 * 2 seconds)
  
  const poll = async () => {
    attempts++;
    
    if (attempts > maxAttempts) {
      console.log('\n⚠️ Scan timeout: Exceeded 5 minutes');
      console.log('💡 Check scan status manually or mark as failed');
      return;
    }
    
    const statusRes = await fetch(`/api/integrations/webflow/scan-structure?scan_id=${scanId}`);
    const statusData = await statusRes.json();
    
    if (!statusData.scan) {
      console.log(`[${attempts}/${maxAttempts}] Waiting for scan to start...`);
      setTimeout(poll, 2000);
      return;
    }
    
    const scan = statusData.scan;
    console.log(`[${attempts}/${maxAttempts}] Status: ${scan.status}`);
    
    if (scan.status === 'completed') {
      console.log('\n🎉 SUCCESS!\n');
      console.log('📊 Results:');
      console.log(`   Collections: ${scan.collections_count || 0}`);
      console.log(`   Static Pages: ${scan.static_pages_count || 0}`);
      console.log(`   CMS Items: ${scan.cms_items_count || 0}`);
      console.log(`   Total Content Items: ${scan.total_content_items || 0}`);
      console.log(`   Completed at: ${scan.scan_completed_at}\n`);
      
      if (scan.existing_content && scan.existing_content.length > 0) {
        console.log('📄 Sample Content Items:');
        scan.existing_content.slice(0, 10).forEach((item, i) => {
          console.log(`   ${i + 1}. [${item.type.toUpperCase()}] ${item.title}`);
          console.log(`      URL: ${item.url}`);
        });
        console.log('');
      }
      
      console.log('✅ Scan complete! Ready for hyperlink insertion.\n');
    } else if (scan.status === 'failed') {
      console.log('\n❌ FAILED:', scan.error_message || 'Unknown error');
      if (scan.error_details) {
        console.log('   Details:', JSON.stringify(scan.error_details, null, 2));
      }
    } else if (scan.status === 'scanning' || scan.status === 'pending') {
      // Check if stuck (running longer than 5 minutes)
      const started = new Date(scan.scan_started_at);
      const now = new Date();
      const durationMs = now - started;
      const durationMinutes = Math.floor(durationMs / 1000 / 60);
      
      if (durationMinutes >= 5) {
        console.log(`\n⚠️ WARNING: Scan has been running for ${durationMinutes} minutes`);
        console.log('💡 Consider marking as failed if it continues');
      }
      
      setTimeout(poll, 2000);
    }
  };
  
  setTimeout(poll, 2000);
})();
```

## Expected Behavior with Fixes

1. **Faster failure detection**: If Webflow API hangs, it will timeout after 30 seconds per request
2. **Better error messages**: Detailed logging shows exactly where the scan fails
3. **No stuck scans**: Timeout protection prevents scans from hanging indefinitely
4. **Integration validation**: Ensures integration exists before starting scan

## Check Scan Status

```javascript
// Quick status check
const scanId = 'YOUR_SCAN_ID_HERE';
fetch(`/api/integrations/webflow/scan-structure?scan_id=${scanId}`)
  .then(r => r.json())
  .then(data => {
    console.log('Scan Status:', data.scan?.status);
    console.log('Collections:', data.scan?.collections_count);
    console.log('CMS Items:', data.scan?.cms_items_count);
    console.log('Static Pages:', data.scan?.static_pages_count);
    if (data.scan?.error_message) {
      console.log('Error:', data.scan.error_message);
    }
  });
```

## Debug Endpoint

```javascript
// Get detailed debug info
fetch('/api/integrations/webflow/scan-debug')
  .then(r => r.json())
  .then(data => {
    console.log('Scan Debug:', data);
    console.log('Issues:', data.analysis?.issues);
    console.log('Warnings:', data.analysis?.warnings);
    console.log('Recommendations:', data.analysis?.recommendations);
  });
```

