# Diagnose Webflow Scan Failure

## 🔍 Enhanced Diagnostic Script

Run this in your browser console to get detailed information about why the scan is failing:

```javascript
// Enhanced Diagnostic - Find the exact issue
async function diagnoseScanFailure() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Webflow Scan Failure Diagnostic');
  console.log('═══════════════════════════════════════════════\n');
  
  try {
    // Step 1: Get user and org info
    console.log('STEP 1: Checking user and organization...\n');
    const userRes = await fetch('/api/auth/user');
    const userData = await userRes.json();
    
    if (!userData.user) {
      console.log('❌ Not logged in');
      return;
    }
    
    console.log('✅ Logged in:', userData.user.email);
    
    // Step 2: Get all integrations
    console.log('\nSTEP 2: Checking integrations...\n');
    const intRes = await fetch('/api/integrations');
    const intData = await intRes.json();
    
    const webflow = intData.integrations?.filter(i => i.type === 'webflow') || [];
    console.log(`Found ${webflow.length} Webflow integration(s)\n`);
    
    if (webflow.length === 0) {
      console.log('❌ No Webflow integrations found!');
      return;
    }
    
    // Step 3: Check each integration
    webflow.forEach((int, i) => {
      console.log(`\nIntegration ${i + 1}:`);
      console.log(`   ID: ${int.integration_id}`);
      console.log(`   Name: ${int.name || 'Unnamed'}`);
      console.log(`   Status: ${int.status}`);
      console.log(`   Config keys: ${Object.keys(int.config || {}).join(', ')}`);
      console.log(`   Metadata keys: ${Object.keys(int.metadata || {}).join(', ')}`);
      
      const apiKey = int.config?.api_key || int.config?.apiToken || int.config?.token;
      const siteId = int.config?.site_id || int.config?.siteId || int.metadata?.site_id;
      
      console.log(`   Has API Key: ${!!apiKey}`);
      console.log(`   Site ID: ${siteId || 'NOT SET'}`);
      
      // Check what's wrong
      const issues = [];
      if (int.status !== 'active') {
        issues.push(`Status is "${int.status}" (needs to be "active")`);
      }
      if (!apiKey) {
        issues.push('Missing API key (api_key, apiToken, or token)');
      }
      if (!siteId) {
        issues.push('Missing Site ID');
      }
      
      if (issues.length > 0) {
        console.log(`   ⚠️  Issues:`);
        issues.forEach(issue => console.log(`      - ${issue}`));
      } else {
        console.log(`   ✅ Looks good!`);
      }
    });
    
    // Step 4: Try to trigger scan and capture detailed error
    console.log('\n\nSTEP 3: Attempting scan with detailed error capture...\n');
    
    const scanRes = await fetch('/api/integrations/webflow/scan-structure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    const scanData = await scanRes.json();
    
    console.log(`HTTP Status: ${scanRes.status}`);
    console.log('Response:', JSON.stringify(scanData, null, 2));
    
    if (!scanRes.ok) {
      console.log('\n❌ Scan request failed');
      if (scanData.error) {
        console.log(`   Error: ${scanData.error}`);
      }
      if (scanData.hint) {
        console.log(`   Hint: ${scanData.hint}`);
      }
      if (scanData.details) {
        console.log(`   Details: ${scanData.details}`);
      }
      return;
    }
    
    // Step 5: If scan started, check for errors
    if (scanData.scan_id) {
      console.log(`\n✅ Scan started! Scan ID: ${scanData.scan_id}`);
      console.log('\nSTEP 4: Checking scan status...\n');
      
      // Wait a bit then check status
      setTimeout(async () => {
        const statusRes = await fetch(
          `/api/integrations/webflow/scan-structure?scan_id=${scanData.scan_id}`
        );
        const statusData = await statusRes.json();
        
        if (statusData.scan) {
          const scan = statusData.scan;
          console.log(`Status: ${scan.status}`);
          
          if (scan.status === 'failed') {
            console.log('\n❌ Scan failed!');
            console.log(`   Error: ${scan.error_message || 'Unknown'}`);
            if (scan.error_details) {
              console.log(`   Details:`, scan.error_details);
            }
          } else if (scan.status === 'completed') {
            console.log('\n✅ Scan completed!');
            console.log(`   Collections: ${scan.collections_count}`);
            console.log(`   Static Pages: ${scan.static_pages_count}`);
            console.log(`   CMS Items: ${scan.cms_items_count}`);
            console.log(`   Total: ${scan.total_content_items}`);
          }
        }
      }, 3000);
    }
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  }
}

diagnoseScanFailure();
```

## 🔧 Quick Fix Script

If the issue is that status is not 'active', run this to check what statuses exist:

```javascript
// Check integration statuses
fetch('/api/integrations')
  .then(r => r.json())
  .then(data => {
    const webflow = data.integrations?.filter(i => i.type === 'webflow') || [];
    console.log('Webflow Integration Statuses:');
    webflow.forEach(int => {
      console.log(`- ${int.name || 'Unnamed'}: status="${int.status}"`);
    });
  });
```

## 📋 Common Issues & Fixes

1. **Status is not 'active'**
   - Fix: Go to Admin Panel → Integrations → Edit → Set status to "active"

2. **Missing API Key**
   - Fix: Edit integration and add `api_key` or `apiToken` to config

3. **Missing Site ID**
   - Fix: Edit integration and add `site_id` to config or metadata

4. **Scan fails during execution**
   - Check server logs for detailed error
   - Verify Webflow API token is valid
   - Verify Site ID is correct

Run the diagnostic script and share the output!

