# Browser Console Test for Webflow Scan API

## Quick Test - Trigger Scan and Monitor

Copy and paste this into your browser console:

```javascript
// Complete Webflow Scan Test
(async function testWebflowScan() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Webflow Structure Scan - Browser Console Test');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Trigger Scan
    console.log('📡 Step 1: Triggering scan...\n');
    
    const scanResponse = await fetch('/api/integrations/webflow/scan-structure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const scanData = await scanResponse.json();

    if (!scanResponse.ok || !scanData.success) {
      console.error('❌ Failed to start scan:', scanData.error || 'Unknown error');
      if (scanData.hint) console.log('💡 Hint:', scanData.hint);
      return;
    }

    console.log('✅ Scan started!');
    console.log(`   Scan ID: ${scanData.scan_id}`);
    console.log(`   Status: ${scanData.status}`);
    console.log(`   Site ID: ${scanData.site_id}\n`);

    const scanId = scanData.scan_id;
    const siteId = scanData.site_id;

    // Step 2: Poll for completion
    console.log('⏳ Step 2: Waiting for scan to complete...\n');
    
    let attempts = 0;
    const maxAttempts = 150; // 5 minutes max (150 * 2 seconds)
    let lastStatus = scanData.status;

    const pollStatus = async () => {
      attempts++;
      
      try {
        const statusResponse = await fetch(`/api/integrations/webflow/scan-structure?scan_id=${scanId}`);
        const statusData = await statusResponse.json();

        if (!statusData.success || !statusData.scan) {
          console.log(`[${attempts}/${maxAttempts}] Waiting for scan to start...`);
          if (attempts < maxAttempts) {
            setTimeout(pollStatus, 2000);
          } else {
            console.log('\n⚠️ Scan is taking longer than expected');
          }
          return;
        }

        const scan = statusData.scan;
        
        // Only log when status changes
        if (scan.status !== lastStatus) {
          console.log(`[${attempts}/${maxAttempts}] Status changed: ${lastStatus} → ${scan.status}`);
          lastStatus = scan.status;
        } else if (attempts % 10 === 0) {
          // Log every 10th attempt to show progress
          console.log(`[${attempts}/${maxAttempts}] Still ${scan.status}...`);
        }

        if (scan.status === 'completed') {
          console.log('\n🎉 SUCCESS! Scan completed!\n');
          console.log('📊 Results:');
          console.log(`   Collections: ${scan.collections_count || 0}`);
          console.log(`   Static Pages: ${scan.static_pages_count || 0}`);
          console.log(`   CMS Items: ${scan.cms_items_count || 0}`);
          console.log(`   Total Content Items: ${scan.total_content_items || 0}`);
          console.log(`   Completed at: ${scan.scan_completed_at ? new Date(scan.scan_completed_at).toLocaleString() : 'N/A'}\n`);

          if (scan.existing_content && scan.existing_content.length > 0) {
            console.log('📄 Sample Content Items:');
            scan.existing_content.slice(0, 10).forEach((item, i) => {
              console.log(`   ${i + 1}. [${item.type?.toUpperCase() || 'UNKNOWN'}] ${item.title || 'Untitled'}`);
              console.log(`      URL: ${item.url || 'No URL'}`);
            });
            console.log('');
          }

          console.log('✅ Scan complete! Ready for hyperlink insertion.\n');
        } else if (scan.status === 'failed') {
          console.log('\n❌ FAILED');
          console.log(`   Error: ${scan.error_message || 'Unknown error'}`);
          if (scan.error_details) {
            console.log('   Details:', scan.error_details);
          }
        } else if (attempts < maxAttempts) {
          // Continue polling
          setTimeout(pollStatus, 2000);
        } else {
          console.log('\n⚠️ Scan is taking longer than expected');
          console.log(`   Current status: ${scan.status}`);
          console.log(`   Consider checking manually or marking as stuck`);
        }
      } catch (err) {
        console.error(`[${attempts}/${maxAttempts}] Polling error:`, err);
        if (attempts < maxAttempts) {
          setTimeout(pollStatus, 2000);
        }
      }
    };

    // Start polling after 2 seconds
    setTimeout(pollStatus, 2000);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
})();
```

## Simple Test - Just Trigger Scan

If you just want to trigger a scan without monitoring:

```javascript
// Simple scan trigger
fetch('/api/integrations/webflow/scan-structure', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
})
.then(r => r.json())
.then(data => {
  console.log('✅ Scan Response:', data);
  if (data.scan_id) {
    console.log(`Scan ID: ${data.scan_id}`);
    console.log(`Status: ${data.status}`);
    console.log(`Site ID: ${data.site_id}`);
  } else {
    console.log('❌ Error:', data.error);
  }
});
```

## Check Scan Status

To check the status of a specific scan:

```javascript
// Replace SCAN_ID_HERE with your scan ID
const scanId = 'SCAN_ID_HERE';

fetch(`/api/integrations/webflow/scan-structure?scan_id=${scanId}`)
  .then(r => r.json())
  .then(data => {
    console.log('Scan Status:', data);
    if (data.scan) {
      const scan = data.scan;
      console.log(`Status: ${scan.status}`);
      console.log(`Collections: ${scan.collections_count || 0}`);
      console.log(`Static Pages: ${scan.static_pages_count || 0}`);
      console.log(`CMS Items: ${scan.cms_items_count || 0}`);
      console.log(`Total: ${scan.total_content_items || 0}`);
    }
  });
```

## Check All Scans (via scan-status endpoint)

```javascript
fetch('/api/integrations/webflow/scan-status')
  .then(r => r.json())
  .then(data => {
    console.log('All Scans:', data);
    console.log(`Total scans: ${data.count}`);
    console.log(`Completed: ${data.summary.completed}`);
    console.log(`Failed: ${data.summary.failed}`);
    console.log(`In Progress: ${data.summary.in_progress}`);
    if (data.latest_scan) {
      console.log('\nLatest Scan:', data.latest_scan);
    }
  });
```

## Mark Stuck Scans as Failed

```javascript
fetch('/api/integrations/webflow/mark-stuck-scans-failed', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ timeout_minutes: 10 })
})
.then(r => r.json())
.then(data => {
  console.log('Recovery Result:', data);
  if (data.success) {
    console.log(`Marked ${data.marked_failed} stuck scan(s) as failed`);
  }
});
```

