# Browser Console Test - Webflow Structure Scan (FIXED)

## Complete Test Code (Copy & Paste)

Paste this entire code block into your browser console (F12 → Console tab):

```javascript
(async () => {
  console.log('🚀 Starting Webflow Structure Scan Test...\n');
  
  // Step 1: Get your Webflow integration and site_id
  console.log('Step 1: Fetching Webflow integration...');
  const intRes = await fetch('/api/integrations');
  const intData = await intRes.json();
  
  // API returns { success: true, data: [...] }
  const integrations = intData.data || intData.integrations || [];
  console.log(`Found ${integrations.length} integration(s)`);
  
  // Try to find Webflow integration (check both active and inactive)
  let webflow = integrations.find(i => i.type === 'webflow' && i.status === 'active');
  
  if (!webflow) {
    // Try inactive ones too
    webflow = integrations.find(i => i.type === 'webflow');
    if (webflow) {
      console.log('⚠️ Found Webflow integration but status is:', webflow.status);
    }
  }
  
  if (!webflow) {
    console.error('❌ No Webflow integration found');
    console.log('Available integrations:', integrations.map(i => ({ type: i.type, status: i.status, name: i.name })));
    return;
  }
  
  console.log('✅ Found Webflow integration:', webflow.name || 'Unnamed');
  console.log('   Status:', webflow.status);
  console.log('   Integration ID:', webflow.integration_id);
  
  // Extract site_id from config
  const siteId = webflow.config?.site_id || webflow.config?.siteId || webflow.metadata?.site_id;
  
  if (!siteId) {
    console.error('❌ No site_id found in integration config');
    console.log('Integration config:', webflow.config);
    console.log('Integration metadata:', webflow.metadata);
    return;
  }
  
  console.log('✅ Found site_id:', siteId);
  console.log('');
  
  // Step 2: Start the scan
  console.log('Step 2: Starting structure scan...');
  const scanRes = await fetch('/api/integrations/webflow/scan-structure', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      site_id: siteId
    }),
  });
  
  const scanData = await scanRes.json();
  
  if (scanData.error) {
    console.error('❌ Scan failed:', scanData.error);
    if (scanData.hint) {
      console.log('💡 Hint:', scanData.hint);
    }
    return;
  }
  
  console.log('✅ Scan started successfully!');
  console.log('   Scan ID:', scanData.scan_id);
  console.log('   Status:', scanData.status);
  console.log('   Site ID:', scanData.site_id);
  console.log('');
  
  const scanId = scanData.scan_id;
  
  // Step 3: Poll for completion
  console.log('Step 3: Waiting for scan to complete...');
  console.log('   (This may take 30-60 seconds)\n');
  
  let attempts = 0;
  const maxAttempts = 30;
  
  const checkStatus = async () => {
    attempts++;
    
    const statusRes = await fetch(
      `/api/integrations/webflow/scan-structure?scan_id=${scanId}`
    );
    
    if (!statusRes.ok) {
      console.error(`❌ Failed to get status: ${statusRes.status}`);
      return;
    }
    
    const statusData = await statusRes.json();
    const scan = statusData.scan;
    
    if (!scan) {
      console.log(`⏳ Attempt ${attempts}/${maxAttempts} - Waiting for scan to start...`);
      if (attempts < maxAttempts) {
        setTimeout(checkStatus, 2000);
      }
      return;
    }
    
    console.log(`⏳ Attempt ${attempts}/${maxAttempts} - Status: ${scan.status}`);
    
    if (scan.status === 'completed') {
      console.log('\n✅✅✅ SCAN COMPLETED SUCCESSFULLY! ✅✅✅\n');
      console.log('📊 Results:');
      console.log(`   Collections: ${scan.collections_count || 0}`);
      console.log(`   Static Pages: ${scan.static_pages_count || 0}`);
      console.log(`   CMS Items: ${scan.cms_items_count || 0}`);
      console.log(`   Total Content Items: ${scan.total_content_items || 0}`);
      console.log(`   Completed at: ${scan.scan_completed_at}`);
      console.log('');
      console.log(`🔗 View scan details: /api/integrations/webflow/scan-structure?scan_id=${scanId}`);
      return;
    }
    
    if (scan.status === 'failed') {
      console.log('\n❌❌❌ SCAN FAILED ❌❌❌\n');
      console.error('Error:', scan.error_message);
      if (scan.error_details) {
        console.error('Details:', scan.error_details);
      }
      return;
    }
    
    if (scan.status === 'scanning' && attempts < maxAttempts) {
      setTimeout(checkStatus, 2000);
    } else if (attempts >= maxAttempts) {
      console.log('\n⚠️ Scan is taking longer than expected');
      console.log(`   Current status: ${scan.status}`);
      console.log(`   Check manually: /api/integrations/webflow/scan-structure?scan_id=${scanId}`);
    }
  };
  
  // Start checking after 3 seconds
  setTimeout(checkStatus, 3000);
})();
```

## Quick Version (If You Know Your Site ID)

```javascript
const SITE_ID = 'YOUR_SITE_ID_HERE';

fetch('/api/integrations/webflow/scan-structure', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ site_id: SITE_ID })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Scan Response:', data);
  if (data.scan_id) {
    console.log(`Scan ID: ${data.scan_id}`);
    setTimeout(() => {
      fetch(`/api/integrations/webflow/scan-structure?scan_id=${data.scan_id}`)
        .then(r => r.json())
        .then(status => {
          console.log('📊 Status:', status);
          if (status.scan?.status === 'completed') {
            console.log('✅ Completed!');
            console.log(`Collections: ${status.scan.collections_count}`);
            console.log(`Static Pages: ${status.scan.static_pages_count}`);
            console.log(`CMS Items: ${status.scan.cms_items_count}`);
            console.log(`Total: ${status.scan.total_content_items}`);
          }
        });
    }, 5000);
  }
})
.catch(err => console.error('❌ Error:', err));
```




