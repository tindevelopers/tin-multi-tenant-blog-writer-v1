# Test Site ID Auto-Detection

## ✅ Updated Scan Endpoint

The scan endpoint now **auto-detects** `site_id` if it's not in the integration config!

## 🔍 How It Works

1. **First**: Checks for `site_id` in:
   - Request body (`body.site_id`)
   - Query parameter (`?site_id=xxx`)
   - Integration config (`config.site_id` or `config.siteId`)
   - Integration metadata (`metadata.site_id`)

2. **If not found**: Automatically detects `site_id` using the Webflow API:
   - Fetches all sites accessible with the API key
   - If only one site → uses it
   - If multiple sites → uses the first one (or matches by collection_id if available)
   - Stores the detected `site_id` back to the integration config for future use

3. **If auto-detection fails**: Returns a helpful error message

## 🧪 Test It

Run this in your browser console:

```javascript
// Test scan with auto-detection
async function testAutoDetection() {
  console.log('🧪 Testing Site ID Auto-Detection...\n');
  
  // Step 1: Check current integration config
  const intRes = await fetch('/api/integrations');
  const intData = await intRes.json();
  const webflow = intData.integrations?.filter(i => i.type === 'webflow' && i.status === 'active')[0];
  
  if (!webflow) {
    console.log('❌ No active Webflow integration found');
    return;
  }
  
  console.log('Current Integration Config:');
  console.log(`   Has site_id: ${!!(webflow.config?.site_id || webflow.metadata?.site_id)}`);
  console.log(`   Config keys: ${Object.keys(webflow.config || {}).join(', ')}`);
  console.log(`   Metadata keys: ${Object.keys(webflow.metadata || {}).join(', ')}\n`);
  
  // Step 2: Trigger scan (without site_id)
  console.log('Triggering scan (will auto-detect site_id if missing)...\n');
  
  const scanRes = await fetch('/api/integrations/webflow/scan-structure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}) // No site_id provided
  });
  
  const scanData = await scanRes.json();
  
  console.log(`HTTP Status: ${scanRes.status}`);
  console.log('Response:', JSON.stringify(scanData, null, 2));
  
  if (scanRes.ok && scanData.scan_id) {
    console.log(`\n✅ Scan started! Scan ID: ${scanData.scan_id}`);
    console.log(`   Site ID: ${scanData.site_id}`);
    
    // Check if site_id was auto-detected and stored
    setTimeout(async () => {
      const updatedIntRes = await fetch('/api/integrations');
      const updatedIntData = await updatedIntRes.json();
      const updatedWebflow = updatedIntData.integrations?.filter(
        i => i.integration_id === webflow.integration_id
      )[0];
      
      if (updatedWebflow?.config?.site_id) {
        console.log(`\n✅ Site ID was auto-detected and stored!`);
        console.log(`   Stored site_id: ${updatedWebflow.config.site_id}`);
      }
    }, 2000);
  } else {
    console.log('\n❌ Scan failed:', scanData.error);
    if (scanData.hint) {
      console.log('   Hint:', scanData.hint);
    }
  }
}

testAutoDetection();
```

## 📋 Expected Behavior

### If site_id is missing:
1. ✅ Auto-detects site_id from Webflow API
2. ✅ Stores it in integration config
3. ✅ Uses it for the scan
4. ✅ Future scans will use the stored site_id (no need to auto-detect again)

### If site_id exists:
- ✅ Uses the existing site_id (no auto-detection needed)

## 🔧 Manual Override

You can still provide `site_id` manually:

```javascript
// Provide site_id in request body
fetch('/api/integrations/webflow/scan-structure', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ site_id: 'your-site-id-here' })
});
```

## ⚠️ Notes

- Auto-detection requires a valid Webflow API token
- If you have multiple sites, it will use the first one (or match by collection_id if available)
- The detected `site_id` is stored in `config.site_id` for future use
- If auto-detection fails, you'll get a clear error message

## ✅ Summary

**Site ID is now optional!** The scan endpoint will:
1. Use provided site_id if available
2. Auto-detect if missing
3. Store it for future use
4. Provide clear errors if detection fails

Try the test script above to verify it works!

