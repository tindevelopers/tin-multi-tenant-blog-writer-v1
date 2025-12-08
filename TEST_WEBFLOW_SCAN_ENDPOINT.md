# Test Webflow Scan Endpoint

## ✅ Endpoint Status
The endpoint exists at: `/api/integrations/webflow/scan-structure`

## 🧪 Test Methods

### Method 1: Browser Console (Recommended)

Open your browser console while logged into the app and run:

```javascript
// Test 1: Trigger a scan
async function testWebflowScan() {
  console.log('🔍 Testing Webflow Structure Scan...\n');
  
  try {
    // Step 1: Trigger scan
    console.log('Step 1: Triggering scan...');
    const scanResponse = await fetch('/api/integrations/webflow/scan-structure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}) // Empty body - will use site_id from integration
    });
    
    const scanData = await scanResponse.json();
    console.log('✅ Scan Response:', scanData);
    
    if (!scanResponse.ok) {
      console.error('❌ Scan failed:', scanData.error);
      return;
    }
    
    const scanId = scanData.scan_id;
    console.log(`\n✅ Scan started! Scan ID: ${scanId}`);
    console.log(`   Status: ${scanData.status}`);
    console.log(`   Site ID: ${scanData.site_id}\n`);
    
    // Step 2: Poll for completion
    console.log('Step 2: Waiting for scan to complete...');
    console.log('   (This may take 30-60 seconds)\n');
    
    let attempts = 0;
    const maxAttempts = 30;
    
    const checkStatus = async () => {
      const statusResponse = await fetch(
        `/api/integrations/webflow/scan-structure?scan_id=${scanId}`
      );
      const statusData = await statusResponse.json();
      
      if (!statusData.scan) {
        console.log(`   Attempt ${attempts + 1}/${maxAttempts} - Waiting...`);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 2000);
        } else {
          console.log('\n⚠️  Scan is taking longer than expected');
        }
        return;
      }
      
      const scan = statusData.scan;
      console.log(`   Attempt ${attempts + 1}/${maxAttempts} - Status: ${scan.status}`);
      
      if (scan.status === 'completed') {
        console.log('\n🎉 Scan completed successfully!\n');
        console.log('Results:');
        console.log(`   Collections: ${scan.collections_count || 0}`);
        console.log(`   Static Pages: ${scan.static_pages_count || 0}`);
        console.log(`   CMS Items: ${scan.cms_items_count || 0}`);
        console.log(`   Total Content Items: ${scan.total_content_items || 0}`);
        console.log(`   Completed at: ${scan.scan_completed_at}\n`);
        
        if (scan.existing_content && scan.existing_content.length > 0) {
          console.log('Sample Content Items:');
          scan.existing_content.slice(0, 5).forEach((item, i) => {
            console.log(`   ${i + 1}. [${item.type.toUpperCase()}] ${item.title}`);
            console.log(`      URL: ${item.url}`);
          });
        }
      } else if (scan.status === 'failed') {
        console.log('\n❌ Scan failed!');
        console.log(`   Error: ${scan.error_message || 'Unknown error'}\n`);
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 2000);
        } else {
          console.log('\n⚠️  Scan is taking longer than expected');
        }
      }
    };
    
    setTimeout(checkStatus, 2000);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testWebflowScan();
```

### Method 2: Quick Status Check

Check if you have any existing scans:

```javascript
fetch('/api/integrations/webflow/scan-structure')
  .then(r => r.json())
  .then(data => {
    console.log('Existing scans:', data);
    if (data.scans && data.scans.length > 0) {
      console.log(`\nFound ${data.scans.length} scan(s)`);
      const latest = data.scans[0];
      console.log(`Latest scan: ${latest.scan_id}`);
      console.log(`Status: ${latest.status}`);
      console.log(`Total items: ${latest.total_content_items || 0}`);
    } else {
      console.log('\nNo scans found. Trigger a new scan first.');
    }
  });
```

### Method 3: Get Specific Scan Results

If you have a scan ID:

```javascript
const scanId = 'YOUR_SCAN_ID_HERE';

fetch(`/api/integrations/webflow/scan-structure?scan_id=${scanId}`)
  .then(r => r.json())
  .then(data => {
    console.log('Scan details:', data);
    if (data.scan) {
      const scan = data.scan;
      console.log(`\nStatus: ${scan.status}`);
      console.log(`Collections: ${scan.collections_count}`);
      console.log(`Static Pages: ${scan.static_pages_count}`);
      console.log(`CMS Items: ${scan.cms_items_count}`);
      console.log(`Total: ${scan.total_content_items}`);
      
      if (scan.existing_content) {
        console.log(`\nContent Items: ${scan.existing_content.length}`);
        scan.existing_content.slice(0, 10).forEach((item, i) => {
          console.log(`${i + 1}. [${item.type}] ${item.title} - ${item.url}`);
        });
      }
    }
  });
```

## 📋 Expected Results

### Successful Scan Response:
```json
{
  "success": true,
  "scan_id": "uuid-here",
  "status": "scanning",
  "message": "Scan started successfully",
  "site_id": "your-webflow-site-id"
}
```

### Completed Scan Response:
```json
{
  "success": true,
  "scan": {
    "scan_id": "uuid-here",
    "status": "completed",
    "collections_count": 5,
    "static_pages_count": 12,
    "cms_items_count": 45,
    "total_content_items": 57,
    "existing_content": [
      {
        "type": "cms",
        "title": "Blog Post Title",
        "url": "https://yoursite.com/blog/post-slug",
        "slug": "post-slug",
        "keywords": ["keyword1", "keyword2"]
      },
      {
        "type": "static",
        "title": "About Page",
        "url": "https://yoursite.com/about",
        "slug": "about",
        "keywords": []
      }
    ]
  }
}
```

## ⚠️ Common Issues

1. **401 Unauthorized**: Make sure you're logged in
2. **404 Not Found**: Check that Webflow integration is active
3. **400 Bad Request**: Check that `site_id` is configured in integration
4. **Scan fails**: Check Webflow API token is valid

## 🔍 Verification

After running the test, verify:
- ✅ Scan was created in database
- ✅ Collections were discovered
- ✅ Static pages were discovered  
- ✅ CMS items were discovered
- ✅ Data is stored in `webflow_structure_scans` table
- ✅ Data can be used for hyperlink insertion

