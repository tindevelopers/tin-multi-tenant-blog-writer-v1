# Testing Webflow Structure Scan

## Option 1: Test via Browser Console (Recommended)

Since you're already logged in, test directly from the browser:

1. **Open your app** (logged in)
2. **Open Browser DevTools** (F12)
3. **Go to Console tab**
4. **Run this code:**

```javascript
// Test Webflow Structure Scan
async function testWebflowScan() {
  try {
    // Trigger scan
    const response = await fetch('/api/integrations/webflow/scan-structure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        site_id: 'YOUR_SITE_ID' // Optional - will use from integration if not provided
      }),
    });

    const data = await response.json();
    console.log('Scan Response:', data);

    if (data.scan_id) {
      console.log(`✓ Scan started! Scan ID: ${data.scan_id}`);
      
      // Check status after a few seconds
      setTimeout(async () => {
        const statusResponse = await fetch(
          `/api/integrations/webflow/scan-structure?scan_id=${data.scan_id}`
        );
        const statusData = await statusResponse.json();
        console.log('Scan Status:', statusData);
      }, 5000);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testWebflowScan();
```

## Option 2: Test via UI Component

The `WebflowStructureScanner` component should already be integrated. Check:
- `/admin/panel/integrations`
- Look for the Webflow integration card
- Click "Scan Structure" button

## Option 3: Direct Function Test (If API Route Still 404s)

If the API route still returns 404 after deployment, we can test the underlying function directly. The scan function is in:
- `src/lib/integrations/webflow-structure-discovery.ts`
- Function: `discoverWebflowStructure(apiToken, siteId)`

## Troubleshooting

### If you get 404:
1. **Wait for deployment** - New routes take 5-10 minutes to deploy
2. **Clear browser cache** - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. **Check Vercel logs** - See if route is being built
4. **Verify route file exists** - Should be at `src/app/api/integrations/webflow/scan-structure/route.ts`

### If you get 401 Unauthorized:
- Make sure you're logged in
- Check that your session is valid
- Try refreshing the page

### If scan fails:
- Check browser console for error details
- Verify Webflow API credentials are correct
- Check that site_id matches your Webflow site

## Expected Results

A successful scan should return:
- Collections count
- Static pages count  
- CMS items count
- Total content items
- Scan record in `webflow_structure_scans` table

