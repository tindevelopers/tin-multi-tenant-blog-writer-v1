# Browser Console Test for Webflow Structure Scan

## Step 1: Get Your Webflow Site ID

First, let's get the site_id from your integration:

```javascript
// Get Webflow integration to find site_id
async function getWebflowSiteId() {
  try {
    const response = await fetch('/api/integrations');
    const data = await response.json();
    
    const webflowIntegration = data.integrations?.find(i => i.type === 'webflow' && i.status === 'active');
    
    if (webflowIntegration) {
      const config = webflowIntegration.config || {};
      const siteId = config.site_id || config.siteId || webflowIntegration.metadata?.site_id;
      
      if (siteId) {
        console.log('✅ Found Webflow Site ID:', siteId);
        return siteId;
      } else {
        console.log('⚠️ Webflow integration found but no site_id in config');
        console.log('Config:', config);
        return null;
      }
    } else {
      console.log('❌ No active Webflow integration found');
      return null;
    }
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

// Run this first
const siteId = await getWebflowSiteId();
```

## Step 2: Run the Scan

Once you have the site_id, run the scan:

```javascript
// Test Webflow Structure Scan with site_id
async function testWebflowScan(siteId) {
  try {
    console.log('🚀 Starting scan for site:', siteId);
    
    const response = await fetch('/api/integrations/webflow/scan-structure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        site_id: siteId
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('❌ Error:', data.error);
      return null;
    }
    
    console.log('✅ Scan Response:', data);
    
    if (data.scan_id) {
      console.log(`✓ Scan started! Scan ID: ${data.scan_id}`);
      console.log(`  Status: ${data.status}`);
      console.log(`  Site ID: ${data.site_id}`);
      
      // Check status after 5 seconds
      setTimeout(async () => {
        const statusResponse = await fetch(
          `/api/integrations/webflow/scan-structure?scan_id=${data.scan_id}`
        );
        const statusData = await statusResponse.json();
        console.log('📊 Scan Status:', statusData);
        
        if (statusData.scan?.status === 'completed') {
          console.log('✅ Scan completed!');
          console.log(`   Collections: ${statusData.scan.collections_count}`);
          console.log(`   Static Pages: ${statusData.scan.static_pages_count}`);
          console.log(`   CMS Items: ${statusData.scan.cms_items_count}`);
          console.log(`   Total: ${statusData.scan.total_content_items}`);
        }
      }, 5000);
      
      return data.scan_id;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

// Run the scan (use siteId from Step 1)
if (siteId) {
  await testWebflowScan(siteId);
} else {
  console.log('⚠️ Cannot run scan without site_id');
}
```

## Complete One-Liner Test

Or run everything at once:

```javascript
(async () => {
  // Get integration
  const intRes = await fetch('/api/integrations');
  const intData = await intRes.json();
  const webflow = intData.integrations?.find(i => i.type === 'webflow' && i.status === 'active');
  
  if (!webflow) {
    console.error('❌ No active Webflow integration found');
    return;
  }
  
  const siteId = webflow.config?.site_id || webflow.config?.siteId || webflow.metadata?.site_id;
  
  if (!siteId) {
    console.error('❌ No site_id found in integration config');
    console.log('Integration:', webflow);
    return;
  }
  
  console.log('✅ Found site_id:', siteId);
  
  // Start scan
  const scanRes = await fetch('/api/integrations/webflow/scan-structure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ site_id: siteId })
  });
  
  const scanData = await scanRes.json();
  console.log('📊 Scan Response:', scanData);
  
  if (scanData.scan_id) {
    console.log(`✓ Scan ID: ${scanData.scan_id}`);
    
    // Poll for completion
    const checkStatus = async () => {
      const statusRes = await fetch(`/api/integrations/webflow/scan-structure?scan_id=${scanData.scan_id}`);
      const statusData = await statusRes.json();
      const scan = statusData.scan;
      
      if (scan?.status === 'completed') {
        console.log('✅ Scan completed!');
        console.log(`   Collections: ${scan.collections_count}`);
        console.log(`   Static Pages: ${scan.static_pages_count}`);
        console.log(`   CMS Items: ${scan.cms_items_count}`);
        console.log(`   Total: ${scan.total_content_items}`);
      } else if (scan?.status === 'failed') {
        console.error('❌ Scan failed:', scan.error_message);
      } else {
        console.log(`⏳ Status: ${scan?.status || 'checking...'}`);
        setTimeout(checkStatus, 3000);
      }
    };
    
    setTimeout(checkStatus, 5000);
  }
})();
```

