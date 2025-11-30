# Diagnose Webflow Integration

## 🔍 Check Your Integration Status

Run this in your browser console to check if you have a Webflow integration:

```javascript
// Check Webflow Integration Status
async function checkWebflowIntegration() {
  console.log('🔍 Checking Webflow Integration Status...\n');
  
  try {
    // Get your user info
    const userResponse = await fetch('/api/auth/user');
    const userData = await userResponse.json();
    
    if (!userData.user) {
      console.error('❌ Not logged in');
      return;
    }
    
    console.log('✅ Logged in as:', userData.user.email);
    
    // Get integrations
    const integrationsResponse = await fetch('/api/integrations');
    const integrationsData = await integrationsResponse.json();
    
    console.log('\n📋 All Integrations:');
    console.log(integrationsData);
    
    // Filter Webflow integrations
    const webflowIntegrations = integrationsData.integrations?.filter(
      i => i.type === 'webflow'
    ) || [];
    
    console.log(`\n🌐 Webflow Integrations Found: ${webflowIntegrations.length}\n`);
    
    if (webflowIntegrations.length === 0) {
      console.log('❌ No Webflow integration found!');
      console.log('\n💡 To create one:');
      console.log('   1. Go to Admin Panel → Integrations');
      console.log('   2. Click "Connect" on Webflow');
      console.log('   3. Enter your Webflow API token and Site ID');
      return;
    }
    
    webflowIntegrations.forEach((integration, index) => {
      console.log(`\nIntegration ${index + 1}:`);
      console.log(`   ID: ${integration.integration_id}`);
      console.log(`   Name: ${integration.name}`);
      console.log(`   Status: ${integration.status}`);
      console.log(`   Has API Key: ${!!(integration.config?.api_key || integration.config?.apiToken)}`);
      console.log(`   Site ID: ${integration.config?.site_id || integration.metadata?.site_id || 'NOT SET'}`);
      
      if (integration.status !== 'active') {
        console.log(`   ⚠️  Status is "${integration.status}" - needs to be "active"`);
      }
      
      if (!integration.config?.api_key && !integration.config?.apiToken) {
        console.log(`   ⚠️  Missing API key in config`);
      }
      
      if (!integration.config?.site_id && !integration.metadata?.site_id) {
        console.log(`   ⚠️  Missing Site ID`);
      }
    });
    
    // Check for active integrations
    const activeIntegrations = webflowIntegrations.filter(
      i => i.status === 'active'
    );
    
    if (activeIntegrations.length === 0) {
      console.log('\n❌ No ACTIVE Webflow integrations found!');
      console.log('\n💡 To activate:');
      console.log('   1. Go to Admin Panel → Integrations');
      console.log('   2. Find your Webflow integration');
      console.log('   3. Click "Edit" and set status to "active"');
      console.log('   4. Ensure API key and Site ID are configured');
    } else {
      console.log(`\n✅ Found ${activeIntegrations.length} active Webflow integration(s)`);
      console.log('\n💡 Try the scan again - it should work now!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkWebflowIntegration();
```

## 🔧 Quick Fix: Create/Activate Integration

If you need to create or activate a Webflow integration, run this:

```javascript
// Create or Update Webflow Integration
async function setupWebflowIntegration() {
  const apiKey = prompt('Enter your Webflow API Token:');
  const siteId = prompt('Enter your Webflow Site ID:');
  
  if (!apiKey || !siteId) {
    console.log('❌ Both API key and Site ID are required');
    return;
  }
  
  try {
    const response = await fetch('/api/integrations/connect-api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'webflow',
        api_key: apiKey,
        site_id: siteId,
        name: 'Webflow Integration'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Integration created/updated:', data);
      console.log('\n💡 Now try the scan again!');
    } else {
      console.error('❌ Failed:', data);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Uncomment to run:
// setupWebflowIntegration();
```

## 📋 Manual Check via SQL

Or run this SQL in Supabase SQL Editor:

```sql
-- Check Webflow Integrations
SELECT 
  integration_id,
  org_id,
  name,
  type,
  status,
  config->>'api_key' as has_api_key,
  config->>'site_id' as site_id,
  created_at
FROM integrations
WHERE type = 'webflow'
ORDER BY created_at DESC;
```

## ✅ What You Need

For the scan to work, you need:
1. ✅ A Webflow integration in the `integrations` table
2. ✅ Status = `'active'`
3. ✅ `config.api_key` or `config.apiToken` set
4. ✅ `config.site_id` or `metadata.site_id` set
5. ✅ Integration belongs to your organization (`org_id` matches)

Run the diagnostic script above to see what's missing!

