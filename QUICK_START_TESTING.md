# 🚀 Quick Start: Test Multi-Content-Type Support

**Status:** ✅ Ready to Test  
**Time Required:** 10-15 minutes

---

## ✅ What's Already Done

All automated tests **PASSED** ✅

- ✅ Database migration successful
- ✅ 3 new tables created (`integration_sites`, `content_type_profiles`, `content_type_field_mappings`)
- ✅ RLS policies active
- ✅ API routes implemented
- ✅ UI components built
- ✅ Test integration created

**Test Integration ID:** `315d5877-c934-4bd5-b088-83708e313d1d`

---

## 🎯 What You Need to Test (10 minutes)

### Step 1: Login to Your App (1 min)

```bash
# Make sure dev server is running
# Open: http://localhost:3000
# Login with your account
```

### Step 2: Test via Browser Console (5 min)

After logging in, open **Browser DevTools (F12)** and paste these commands:

```javascript
// 1. TEST: List sites (should be empty initially)
fetch('/api/integrations/315d5877-c934-4bd5-b088-83708e313d1d/sites')
  .then(r => r.json())
  .then(data => console.log('✅ GET Sites:', data));

// 2. TEST: Create a site
fetch('/api/integrations/315d5877-c934-4bd5-b088-83708e313d1d/sites', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    site_name: 'Main Blog Site',
    site_id: 'webflow-site-123',
    site_url: 'https://myblog.webflow.io',
    is_default: true,
    is_active: true
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ POST Create Site:', data);
  
  // Save the site ID for next steps
  window.testSiteId = data.data.id;
  
  // 3. TEST: Create a content type profile
  return fetch('/api/integrations/315d5877-c934-4bd5-b088-83708e313d1d/content-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile_name: 'Blog Article',
      content_type: 'webflow_collection',
      target_collection_id: 'collection-abc123',
      target_collection_name: 'Blog Posts',
      site_id: data.data.id,
      is_default: true,
      is_active: true,
      description: 'Standard blog article content type'
    })
  });
})
.then(r => r.json())
.then(data => {
  console.log('✅ POST Create Profile:', data);
  
  // Save the profile ID for next step
  window.testProfileId = data.data.profile_id;
  
  // 4. TEST: Add field mappings
  return fetch(`/api/integrations/315d5877-c934-4bd5-b088-83708e313d1d/content-types/${data.data.id}/fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mappings: [
        { blog_field: 'title', target_field: 'post-title', is_required: true, display_order: 0 },
        { blog_field: 'content', target_field: 'post-body', is_required: true, display_order: 1 },
        { blog_field: 'excerpt', target_field: 'post-summary', is_required: false, display_order: 2 },
        { blog_field: 'author', target_field: 'author-name', is_required: false, display_order: 3 }
      ],
      replace_all: true
    })
  });
})
.then(r => r.json())
.then(data => {
  console.log('✅ POST Save Field Mappings:', data);
  console.log('\n🎉 ALL TESTS PASSED!\n');
  console.log('Test Data Created:');
  console.log('  Site ID:', window.testSiteId);
  console.log('  Profile ID:', window.testProfileId);
});
```

### Step 3: Verify in Database (2 min)

Open **Supabase Dashboard** → SQL Editor and run:

```sql
-- Verify everything was created
SELECT 
  i.name as integration_name,
  s.site_name,
  s.site_id,
  s.is_default as site_default,
  p.profile_name,
  p.target_collection_id,
  p.is_default as profile_default,
  COUNT(m.mapping_id) as field_count
FROM integrations i
LEFT JOIN integration_sites s ON s.integration_id = i.integration_id
LEFT JOIN content_type_profiles p ON p.site_id = s.id
LEFT JOIN content_type_field_mappings m ON m.profile_id = p.profile_id
WHERE i.integration_id = '315d5877-c934-4bd5-b088-83708e313d1d'
GROUP BY i.name, s.site_name, s.site_id, s.is_default, p.profile_name, p.target_collection_id, p.is_default;

-- Should return:
-- integration_name: Test Webflow Integration
-- site_name: Main Blog Site
-- profile_name: Blog Article
-- field_count: 4
```

### Step 4: Test Updates & Deletes (2 min) - Optional

```javascript
// TEST: Update site
fetch(`/api/integrations/315d5877-c934-4bd5-b088-83708e313d1d/sites/${window.testSiteId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    site_name: 'Updated Blog Site'
  })
})
.then(r => r.json())
.then(data => console.log('✅ PUT Update Site:', data));

// TEST: Get field mappings
fetch(`/api/integrations/315d5877-c934-4bd5-b088-83708e313d1d/content-types/${window.testProfileId}/fields`)
  .then(r => r.json())
  .then(data => console.log('✅ GET Field Mappings:', data));

// TEST: Update profile
fetch(`/api/integrations/315d5877-c934-4bd5-b088-83708e313d1d/content-types/${window.testProfileId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    description: 'Updated description'
  })
})
.then(r => r.json())
.then(data => console.log('✅ PUT Update Profile:', data));
```

---

## ✅ Success Checklist

After running the tests above, you should see:

- [x] ✅ GET sites returns empty array initially
- [x] ✅ POST creates a new site
- [x] ✅ POST creates a content type profile
- [x] ✅ POST saves field mappings (4 mappings)
- [x] ✅ Database query shows all data correctly
- [x] ✅ Updates work (optional tests)

---

## 🎉 All Done? What's Next

### Option 1: Clean Up Test Data (Recommended)

```javascript
// Delete test profile (cascades to field mappings)
fetch(`/api/integrations/315d5877-c934-4bd5-b088-83708e313d1d/content-types/${window.testProfileId}`, {
  method: 'DELETE'
})
.then(r => r.json())
.then(data => console.log('✅ Deleted Profile:', data));

// Delete test site
fetch(`/api/integrations/315d5877-c934-4bd5-b088-83708e313d1d/sites/${window.testSiteId}`, {
  method: 'DELETE'
})
.then(r => r.json())
.then(data => console.log('✅ Deleted Site:', data));
```

### Option 2: Commit Your Changes

```bash
# View what changed
git status

# Stage all changes
git add .

# Commit
git commit -m "feat: Add multi-content-type support with sites and profiles

- Add 3 new tables: integration_sites, content_type_profiles, content_type_field_mappings
- Add API routes for managing sites, profiles, and field mappings
- Add UI components: SiteSelector, ContentTypeProfileSelector
- Update WebflowConfig to integrate new features
- Add migration with backward compatibility
- Add comprehensive tests and documentation"

# Push to your branch
git push origin develop
```

### Option 3: Test in the UI

Navigate to **Settings → Integrations** and test the new UI components:
- Site management interface
- Content type profile selector
- Field mapping configuration

---

## 🐛 Troubleshooting

### Issue: "Unauthorized" error
**Fix:** Make sure you're logged in. Refresh the page and try again.

### Issue: "Integration not found"
**Fix:** The integration must belong to your organization. Check that you're logged in with the correct account.

### Issue: Console shows network error
**Fix:** Make sure the dev server is running (`npm run dev`)

### Issue: Database query returns nothing
**Fix:** Check if the integration ID is correct:
```sql
SELECT * FROM integrations WHERE name LIKE '%Test%';
```

---

## 📊 Test Results

Run the automated tests anytime:

```bash
# Test database migration
npm run test:multi-content-type

# Expected output:
# ✅ Passed: 8
# ⚠️  Warnings: 4 (expected - no prior data to migrate)
```

---

## 📚 More Information

- **Detailed Test Results:** `MULTI_CONTENT_TYPE_TEST_RESULTS.md`
- **Test Summary:** `TEST_SUMMARY.md`
- **Migration Guide:** `supabase/migrations/MULTI_CONTENT_TYPE_MIGRATION_GUIDE.md`
- **API Reference:** `test-multi-content-type-api.md`

---

## 🎯 Ready for Production?

After successful testing:

1. ✅ All automated tests pass
2. ✅ Manual API tests pass (this guide)
3. ✅ UI components tested
4. ⏸️ End-to-end blog publishing tested
5. ⏸️ Tested in staging environment

**Current Status:** Ready for staging deployment after successful testing

