# Browser Console Test - Webflow Scan Endpoint

## 🔍 Step 1: Check Integration Status

First, check if you have an active Webflow integration:

```javascript
// Check Webflow Integration Status
async function checkIntegration() {
  console.log('🔍 Checking Webflow Integration...\n');
  
  try {
    const res = await fetch('/api/integrations');
    const data = await res.json();
    
    const webflow = data.integrations?.filter(i => i.type === 'webflow') || [];
    
    console.log(`🌐 Found ${webflow.length} Webflow integration(s)\n`);
    
    if (webflow.length === 0) {
      console.log('❌ No Webflow integration found!');
      console.log('💡 Go to: Admin Panel → Integrations → Connect Webflow\n');
      return false;
    }
    
    webflow.forEach((int, i) => {
      console.log(`${i + 1}. ${int.name || 'Unnamed'}`);
      console.log(`   ID: ${int.integration_id}`);
      console.log(`   Status: ${int.status}`);
      console.log(`   Has API Key: ${!!(int.config?.api_key || int.config?.apiToken)}`);
      console.log(`   Site ID: ${int.config?.site_id || int.metadata?.site_id || 'NOT SET'}`);
      
      if (int.status !== 'active') {
        console.log(`   ⚠️  Status is "${int.status}" - needs to be "active"`);
      }
      if (!int.config?.api_key && !int.config?.apiToken) {
        console.log(`   ⚠️  Missing API key`);
      }
      if (!int.config?.site_id && !int.metadata?.site_id) {
        console.log(`   ⚠️  Missing Site ID`);
      }
      console.log('');
    });
    
    const active = webflow.filter(i => i.status === 'active');
    if (active.length === 0) {
      console.log('❌ No ACTIVE Webflow integrations found!\n');
      return false;
    }
    
    console.log(`✅ Found ${active.length} active integration(s)\n`);
    return true;
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

// Run check
checkIntegration();
```

---

## 🚀 Step 2: Test Scan Endpoint

Once you have an active integration, test the scan:

```javascript
// Test Webflow Structure Scan
async function testWebflowScan() {
  console.log('🚀 Testing Webflow Structure Scan...\n');
  
  try {
    // Step 1: Trigger scan
    console.log('Step 1: Triggering scan...');
    const scanResponse = await fetch('/api/integrations/webflow/scan-structure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}) // Empty - will use site_id from integration
    });
    
    const scanData = await scanResponse.json();
    console.log('✅ Scan Response:', scanData);
    
    if (!scanResponse.ok) {
      console.error('❌ Scan failed:', scanData.error);
      if (scanData.hint) {
        console.log('💡 Hint:', scanData.hint);
      }
      return;
    }
    
    const scanId = scanData.scan_id;
    console.log(`\n✅ Scan started successfully!`);
    console.log(`   Scan ID: ${scanId}`);
    console.log(`   Status: ${scanData.status}`);
    console.log(`   Site ID: ${scanData.site_id}\n`);
    
    // Step 2: Poll for completion
    console.log('Step 2: Waiting for scan to complete...');
    console.log('   (This may take 30-60 seconds)\n');
    
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts = ~60 seconds max
    
    const checkStatus = async () => {
      attempts++;
      
      try {
        const statusResponse = await fetch(
          `/api/integrations/webflow/scan-structure?scan_id=${scanId}`
        );
        const statusData = await statusResponse.json();
        
        if (!statusData.scan) {
          console.log(`   Attempt ${attempts}/${maxAttempts} - Waiting for scan to start...`);
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, 2000);
          } else {
            console.log('\n⚠️  Scan is taking longer than expected');
            console.log(`   Check manually: GET /api/integrations/webflow/scan-structure?scan_id=${scanId}`);
          }
          return;
        }
        
        const scan = statusData.scan;
        process.stdout?.write(`\r   Attempt ${attempts}/${maxAttempts} - Status: ${scan.status}...`);
        console.log(`   Attempt ${attempts}/${maxAttempts} - Status: ${scan.status}`);
        
        if (scan.status === 'completed') {
          console.log('\n\n🎉 Scan completed successfully!\n');
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
              if (item.keywords && item.keywords.length > 0) {
                console.log(`      Keywords: ${item.keywords.slice(0, 3).join(', ')}${item.keywords.length > 3 ? '...' : ''}`);
              }
            });
            console.log('');
          }
          
          console.log('✅ Scan is ready to use for hyperlink insertion!\n');
        } else if (scan.status === 'failed') {
          console.log('\n\n❌ Scan failed!');
          console.log(`   Error: ${scan.error_message || 'Unknown error'}`);
          if (scan.error_details) {
            console.log(`   Details:`, scan.error_details);
          }
          console.log('');
        } else if (scan.status === 'scanning') {
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, 2000);
          } else {
            console.log('\n\n⚠️  Scan is taking longer than expected');
            console.log(`   Current status: ${scan.status}`);
            console.log(`   Check manually: GET /api/integrations/webflow/scan-structure?scan_id=${scanId}`);
          }
        }
      } catch (error) {
        console.error('\n❌ Error checking status:', error);
      }
    };
    
    // Start checking after 2 seconds
    setTimeout(checkStatus, 2000);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test
testWebflowScan();
```

---

## 🎯 Complete Test (All-in-One)

Run this complete test that checks integration first, then scans:

```javascript
// Complete Webflow Scan Test
(async function completeTest() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Webflow Structure Scan - Complete Test');
  console.log('═══════════════════════════════════════════════\n');
  
  // Step 1: Check Integration
  console.log('STEP 1: Checking Webflow Integration...\n');
  const res = await fetch('/api/integrations');
  const data = await res.json();
  const webflow = data.integrations?.filter(i => i.type === 'webflow') || [];
  
  if (webflow.length === 0) {
    console.log('❌ No Webflow integration found!');
    console.log('💡 Go to: Admin Panel → Integrations → Connect Webflow\n');
    return;
  }
  
  const active = webflow.filter(i => i.status === 'active');
  if (active.length === 0) {
    console.log('❌ No ACTIVE Webflow integrations found!');
    console.log('💡 Activate your integration first.\n');
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
  
  if (!scanRes.ok) {
    console.log('❌ Scan failed:', scanData.error);
    return;
  }
  
  console.log('✅ Scan started!');
  console.log(`   Scan ID: ${scanData.scan_id}`);
  console.log(`   Status: ${scanData.status}\n`);
  
  // Step 3: Poll for Results
  console.log('STEP 3: Waiting for completion...\n');
  const scanId = scanData.scan_id;
  let attempts = 0;
  
  const poll = async () => {
    attempts++;
    const statusRes = await fetch(`/api/integrations/webflow/scan-structure?scan_id=${scanId}`);
    const statusData = await statusRes.json();
    
    if (!statusData.scan) {
      if (attempts < 30) {
        setTimeout(poll, 2000);
      }
      return;
    }
    
    const scan = statusData.scan;
    console.log(`   [${attempts}/30] Status: ${scan.status}`);
    
    if (scan.status === 'completed') {
      console.log('\n🎉 SUCCESS!\n');
      console.log(`   Collections: ${scan.collections_count}`);
      console.log(`   Static Pages: ${scan.static_pages_count}`);
      console.log(`   CMS Items: ${scan.cms_items_count}`);
      console.log(`   Total: ${scan.total_content_items}\n`);
    } else if (scan.status === 'failed') {
      console.log('\n❌ FAILED:', scan.error_message);
    } else if (attempts < 30) {
      setTimeout(poll, 2000);
    }
  };
  
  setTimeout(poll, 2000);
})();
```

---

## 📋 Quick Status Check

Just want to see existing scans?

```javascript
// Quick Status Check
fetch('/api/integrations/webflow/scan-structure')
  .then(r => r.json())
  .then(data => {
    console.log('📊 Existing Scans:', data);
    if (data.scans && data.scans.length > 0) {
      console.log(`\nFound ${data.scans.length} scan(s)`);
      data.scans.forEach((scan, i) => {
        console.log(`\n${i + 1}. Scan ID: ${scan.scan_id}`);
        console.log(`   Status: ${scan.status}`);
        console.log(`   Site ID: ${scan.site_id}`);
        console.log(`   Total Items: ${scan.total_content_items || 0}`);
        console.log(`   Completed: ${scan.scan_completed_at || 'N/A'}`);
      });
    } else {
      console.log('\nNo scans found. Trigger a new scan first.');
    }
  });
```

---

**Copy and paste any of these scripts into your browser console to test!**
