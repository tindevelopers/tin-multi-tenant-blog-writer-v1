# Browser Console Test - Final Working Version

## ✅ Quick Test (Scan Only)

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
    
    // Check status after 3 seconds
    setTimeout(() => {
      fetch(`/api/integrations/webflow/scan-structure?scan_id=${data.scan_id}`)
        .then(r => r.json())
        .then(status => {
          console.log('Scan Status:', status.scan?.status);
          if (status.scan?.status === 'completed') {
            console.log('🎉 Scan completed!');
            console.log(`Collections: ${status.scan.collections_count}`);
            console.log(`Static Pages: ${status.scan.static_pages_count}`);
            console.log(`CMS Items: ${status.scan.cms_items_count}`);
            console.log(`Total: ${status.scan.total_content_items}`);
          }
        });
    }, 3000);
  } else {
    console.log('❌ Error:', data.error);
  }
});
```

## 🔍 Check Scan Status

If you already have a scan ID, check its status:

```javascript
// Replace with your scan_id
const scanId = '147a0ff1-0f6b-4d84-a184-8f6245ce07c9';

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
      
      if (scan.status === 'completed' && scan.existing_content) {
        console.log('\n📄 Content Items:');
        scan.existing_content.slice(0, 10).forEach((item, i) => {
          console.log(`${i + 1}. [${item.type}] ${item.title} - ${item.url}`);
        });
      }
      
      if (scan.status === 'failed') {
        console.log(`❌ Error: ${scan.error_message}`);
      }
    }
  });
```

## 📊 Poll for Completion

Poll until the scan completes:

```javascript
const scanId = '147a0ff1-0f6b-4d84-a184-8f6245ce07c9';
let attempts = 0;

const checkStatus = async () => {
  attempts++;
  const res = await fetch(`/api/integrations/webflow/scan-structure?scan_id=${scanId}`);
  const data = await res.json();
  
  if (data.scan) {
    const scan = data.scan;
    console.log(`[${attempts}] Status: ${scan.status}`);
    
    if (scan.status === 'completed') {
      console.log('\n🎉 SUCCESS!');
      console.log(`Collections: ${scan.collections_count}`);
      console.log(`Static Pages: ${scan.static_pages_count}`);
      console.log(`CMS Items: ${scan.cms_items_count}`);
      console.log(`Total: ${scan.total_content_items}`);
    } else if (scan.status === 'failed') {
      console.log(`\n❌ Failed: ${scan.error_message}`);
    } else if (attempts < 30) {
      setTimeout(checkStatus, 2000);
    }
  } else if (attempts < 30) {
    setTimeout(checkStatus, 2000);
  }
};

checkStatus();
```

