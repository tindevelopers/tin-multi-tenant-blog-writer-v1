# Complete Browser Console Test Scripts

## Option 1: Full Test (Trigger Scan + Poll Status)

```javascript
// Complete Webflow Scan Test - Triggers scan and polls for completion
(async function testWebflowScan() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Webflow Structure Scan - Complete Test');
  console.log('═══════════════════════════════════════════════\n');
  
  try {
    // Step 1: Trigger Scan
    console.log('STEP 1: Triggering Scan...\n');
    const scanRes = await fetch('/api/integrations/webflow/scan-structure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    const scanData = await scanRes.json();
    
    if (!scanRes.ok) {
      console.log('❌ Scan failed:', scanData.error);
      if (scanData.hint) console.log('💡 Hint:', scanData.hint);
      if (scanData.details) console.log('📋 Details:', scanData.details);
      return;
    }
    
    console.log('✅ Scan started!');
    console.log(`   Scan ID: ${scanData.scan_id}`);
    console.log(`   Status: ${scanData.status}`);
    console.log(`   Site ID: ${scanData.site_id}\n`);
    
    // Step 2: Poll for Results
    console.log('STEP 2: Waiting for completion...\n');
    const scanId = scanData.scan_id;
    let attempts = 0;
    const maxAttempts = 30;
    
    const poll = async () => {
      attempts++;
      const statusRes = await fetch(`/api/integrations/webflow/scan-structure?scan_id=${scanId}`);
      const statusData = await statusRes.json();
      
      if (!statusData.scan) {
        console.log(`   [${attempts}/${maxAttempts}] Waiting for scan to start...`);
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          console.log('\n⚠️  Scan is taking longer than expected');
        }
        return;
      }
      
      const scan = statusData.scan;
      console.log(`   [${attempts}/${maxAttempts}] Status: ${scan.status}`);
      
      if (scan.status === 'completed') {
        console.log('\n🎉 SUCCESS!\n');
        console.log('📊 Results:');
        console.log(`   Collections: ${scan.collections_count || 0}`);
        console.log(`   Static Pages: ${scan.static_pages_count || 0}`);
        console.log(`   CMS Items: ${scan.cms_items_count || 0}`);
        console.log(`   Total Content Items: ${scan.total_content_items || 0}`);
        console.log(`   Completed at: ${scan.scan_completed_at}\n`);
        
        if (scan.existing_content && scan.existing_content.length > 0) {
          console.log('📄 Sample Content Items (first 10):');
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
          console.log('   Details:', scan.error_details);
        }
      } else if (attempts < maxAttempts) {
        setTimeout(poll, 2000);
      } else {
        console.log('\n⚠️  Scan is taking longer than expected');
        console.log(`   Current status: ${scan.status}`);
      }
    };
    
    setTimeout(poll, 2000);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
})();
```

## Option 2: List All Scans (Find Existing Scan ID)

```javascript
// List all scans to find an existing scan_id
fetch('/api/integrations/webflow/scan-structure')
  .then(r => r.json())
  .then(data => {
    console.log('All Scans:', data);
    if (data.scans && data.scans.length > 0) {
      {
      console.log(`\nFound ${data.scans.length} scan(s):`);
      data.scans.forEach((scan, i) => {
        console.log(`\n${i + 1}. Scan ID: ${scan.scan_id}`);
        console.log(`   Status: ${scan.status}`);
        console.log(`   Site ID: ${scan.site_id}`);
        console.log(`   Total Items: ${scan.total_content_items || 0}`);
        console.log(`   Completed: ${scan.scan_completed_at || 'N/A'}`);
      });
      
      // Use the first scan
      const firstScan = data.scans[0];
      console.log(`\n✅ Use this scan_id: ${firstScan.scan_id}`);
    } else {
      console.log('No scans found. Trigger a new scan first.');
    }
  });
```

## Option 3: Check Specific Scan Status

```javascript
// Replace with actual scan_id from Option 2 or from a triggered scan
const scanId = 'PASTE_SCAN_ID_HERE';

fetch(`/api/integrations/webflow/scan-structure?scan_id=${scanId}`)
  .then(r => r.json())
  .then(data => {
    console.log('Scan Status:', data);
    if (data.scan) {
      const scan = data.scan;
      console.log(`\nStatus: ${scan.status}`);
      console.log(`Collections: ${scan.collections_count || 0}`);
      console.log(`Static Pages: ${scan.static_pages_count || 0}`);
      console.log(`CMS Items: ${scan.cms_items_count || 0}`);
      console.log(`Total: ${scan.total_content_items || 0}`);
      
      if (scan.status === 'completed' && scan.existing_content) {
        console.log('\n📄 Content Items:');
        scan.existing_content.slice(0, 10).forEach((item, i) => {
          console.log(`${i + 1}. [${item.type}] ${item.title} - ${item.url}`);
        });
      }
      
      if (scan.status === 'failed') {
        console.log(`\n❌ Error: ${scan.error_message}`);
      }
    } else {
      console.log('❌ Scan not found');
    }
  });
```

## Option 4: Quick Test (Trigger + Check After 5s)

```javascript
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
    
    // Check status after 5 seconds
    setTimeout(() => {
      fetch(`/api/integrations/webflow/scan-structure?scan_id=${data.scan_id}`)
        .then(r => r.json())
        .then(status => {
          console.log('\nScan Status:', status.scan?.status);
          if (status.scan?.status === 'completed') {
            console.log('🎉 Scan completed!');
            console.log(`Collections: ${status.scan.collections_count}`);
            console.log(`Static Pages: ${status.scan.static_pages_count}`);
            console.log(`CMS Items: ${status.scan.cms_items_count}`);
            console.log(`Total: ${status.scan.total_content_items}`);
          } else if (status.scan?.status === 'failed') {
            console.log(`❌ Failed: ${status.scan.error_message}`);
          }
        });
    }, 5000);
  } else {
    console.log('❌ Error:', data.error);
    if (data.hint) console.log('Hint:', data.hint);
    if (data.details) console.log('Details:', data.details);
  }
});
```

## Option 5: Get Latest Scan for Site

```javascript
// Replace with your site_id (from integration config or scan response)
const siteId = 'YOUR_SITE_ID_HERE';

fetch(`/api/integrations/webflow/scan-structure?site_id=${siteId}`)
  .then(r => r.json())
  .then(data => {
    console.log('Scans for Site:', data);
    if (data.scans && data.scans.length > 0) {
      const latest = data.scans[0];
      console.log(`\nLatest Scan:`);
      console.log(`  Scan ID: ${latest.scan_id}`);
      console.log(`  Status: ${latest.status}`);
      console.log(`  Collections: ${latest.collections_count || 0}`);
      console.log(`  Static Pages: ${latest.static_pages_count || 0}`);
      console.log(`  CMS Items: ${latest.cms_items_count || 0}`);
      console.log(`  Total: ${latest.total_content_items || 0}`);
    } else {
      console.log('No scans found for this site');
    }
  });
```

