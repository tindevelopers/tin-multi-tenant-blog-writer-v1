# Multi-Content-Type Migration Test Results

**Date:** December 1, 2025  
**Status:** ✅ Migration Successful - Ready for Manual API Testing

---

## ✅ Migration Tests (Automated)

All automated migration tests **PASSED**:

### Database Structure ✅
- ✅ Table `integration_sites` created successfully
- ✅ Table `content_type_profiles` created successfully  
- ✅ Table `content_type_field_mappings` created successfully

### Database Functions ✅
- ✅ Successfully queried integrations with nested sites/profiles/mappings
- ✅ Joins between tables working correctly

### RLS (Row Level Security) ✅
- ✅ RLS configured for `integration_sites`
- ✅ RLS configured for `content_type_profiles`
- ✅ RLS configured for `content_type_field_mappings`

### Test Data Created ✅
- ✅ Test organization: `81ece1e3-a1bf-443b-b8c5-160d578dd617`
- ✅ Test integration: `315d5877-c934-4bd5-b088-83708e313d1d`

---

## 📝 Data Migration Status

The migration ran successfully. Since this is a new installation with no existing integrations:
- ⚠️ No existing sites were migrated (expected - no prior data)
- ⚠️ No existing content type profiles were migrated (expected - no prior data)
- ⚠️ No existing field mappings were migrated (expected - no prior data)

If you run this migration on a database with existing integrations, the migration will automatically:
- Extract site information from `integrations.config.site_id`
- Create default "Blog Post" content type profiles
- Migrate field mappings from `integrations.field_mappings` to the new table

---

## 🔧 Manual API Testing Required

The API endpoints require authentication, so they must be tested manually through the UI or with a valid session cookie.

### Test Integration ID
Use this integration ID for testing: `315d5877-c934-4bd5-b088-83708e313d1d`

### API Endpoints to Test

#### 1. Sites Management

**List Sites:**
```
GET /api/integrations/315d5877-c934-4bd5-b088-83708e313d1d/sites
```

**Create Site:**
```
POST /api/integrations/315d5877-c934-4bd5-b088-83708e313d1d/sites
Body: {
  "site_name": "Main Webflow Site",
  "site_id": "webflow-site-id-123",
  "site_url": "https://example.webflow.io",
  "is_default": true,
  "is_active": true
}
```

**Update Site:**
```
PUT /api/integrations/315d5877-c934-4bd5-b088-83708e313d1d/sites/[SITE_ID]
Body: {
  "site_name": "Updated Site Name",
  "is_active": true
}
```

**Delete Site:**
```
DELETE /api/integrations/315d5877-c934-4bd5-b088-83708e313d1d/sites/[SITE_ID]
```

#### 2. Content Type Profiles

**List Profiles:**
```
GET /api/integrations/315d5877-c934-4bd5-b088-83708e313d1d/content-types
```

**List Profiles by Site:**
```
GET /api/integrations/315d5877-c934-4bd5-b088-83708e313d1d/content-types?site_id=[SITE_ID]
```

**Create Profile:**
```
POST /api/integrations/315d5877-c934-4bd5-b088-83708e313d1d/content-types
Body: {
  "profile_name": "Article",
  "content_type": "webflow_collection",
  "target_collection_id": "collection-123",
  "target_collection_name": "Blog Posts",
  "site_id": "[SITE_ID]",
  "is_default": true,
  "is_active": true,
  "description": "Standard blog article"
}
```

**Update Profile:**
```
PUT /api/integrations/315d5877-c934-4bd5-b088-83708e313d1d/content-types/[PROFILE_ID]
Body: {
  "profile_name": "Updated Article",
  "description": "Updated description"
}
```

**Delete Profile:**
```
DELETE /api/integrations/315d5877-c934-4bd5-b088-83708e313d1d/content-types/[PROFILE_ID]
```

#### 3. Field Mappings

**Get Field Mappings:**
```
GET /api/integrations/315d5877-c934-4bd5-b088-83708e313d1d/content-types/[PROFILE_ID]/fields
```

**Save Field Mappings:**
```
POST /api/integrations/315d5877-c934-4bd5-b088-83708e313d1d/content-types/[PROFILE_ID]/fields
Body: {
  "mappings": [
    {
      "blog_field": "title",
      "target_field": "post-title",
      "is_required": true,
      "display_order": 0
    },
    {
      "blog_field": "content",
      "target_field": "post-body",
      "is_required": true,
      "display_order": 1
    }
  ],
  "replace_all": true
}
```

---

## 🧪 Testing via UI

### Option 1: Test through Integration Settings

1. **Login to the application**
2. **Navigate to Settings → Integrations**
3. **Open the test integration** (ID: 315d5877-c934-4bd5-b088-83708e313d1d)
4. **Test Site Management:**
   - Click "Manage Sites" button
   - Add a new site
   - Edit site details
   - Set a site as default
   - Delete a site

5. **Test Content Type Profiles:**
   - Click "Manage Content Types" button
   - Create a new content type profile (e.g., "Article")
   - Select a site for the profile
   - Set collection ID
   - Mark as default if desired

6. **Test Field Mappings:**
   - Open a content type profile
   - Click "Configure Field Mappings"
   - Map blog fields to CMS fields
   - Save mappings
   - Verify mappings are persisted

### Option 2: Test via Browser DevTools

1. **Login to the application**
2. **Open Browser DevTools (F12)**
3. **Copy your session cookie**
4. **Use the `fetch` API or curl with the session cookie:**

```javascript
// Example: Get sites
fetch('/api/integrations/315d5877-c934-4bd5-b088-83708e313d1d/sites')
  .then(r => r.json())
  .then(console.log);

// Example: Create site
fetch('/api/integrations/315d5877-c934-4bd5-b088-83708e313d1d/sites', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    site_name: 'Test Site',
    site_id: 'test-123',
    site_url: 'https://test.webflow.io',
    is_default: true
  })
}).then(r => r.json()).then(console.log);
```

---

## 📊 Database Verification Queries

You can verify the data directly in Supabase:

```sql
-- Check migrated sites
SELECT * FROM integration_sites 
WHERE integration_id = '315d5877-c934-4bd5-b088-83708e313d1d';

-- Check content type profiles
SELECT * FROM content_type_profiles 
WHERE integration_id = '315d5877-c934-4bd5-b088-83708e313d1d';

-- Check field mappings
SELECT ctfm.* 
FROM content_type_field_mappings ctfm
JOIN content_type_profiles ctp ON ctfm.profile_id = ctp.profile_id
WHERE ctp.integration_id = '315d5877-c934-4bd5-b088-83708e313d1d'
ORDER BY ctfm.display_order;

-- Check integration with all nested data
SELECT 
  i.integration_id,
  i.name,
  i.type,
  i.status,
  (SELECT json_agg(s) FROM integration_sites s WHERE s.integration_id = i.integration_id) as sites,
  (SELECT json_agg(p) FROM content_type_profiles p WHERE p.integration_id = i.integration_id) as profiles
FROM integrations i
WHERE i.integration_id = '315d5877-c934-4bd5-b088-83708e313d1d';
```

---

## ✅ Checklist for Manual Testing

Use this checklist when testing through the UI:

### Sites Management
- [ ] Create a new site
- [ ] View list of sites
- [ ] Update site details
- [ ] Set site as default
- [ ] Verify only one site can be default
- [ ] Delete a site

### Content Type Profiles
- [ ] Create a content type profile
- [ ] Associate profile with a site
- [ ] View profiles filtered by site
- [ ] Update profile details
- [ ] Set profile as default
- [ ] Verify only one profile per site can be default
- [ ] Delete a profile

### Field Mappings
- [ ] Add field mappings to a profile
- [ ] View field mappings for a profile
- [ ] Update field mappings
- [ ] Verify mappings are saved in correct order
- [ ] Delete field mappings (via profile deletion)

### Integration Testing
- [ ] Verify RLS - users can only see their org's data
- [ ] Test with multiple integrations
- [ ] Test with multiple sites per integration
- [ ] Test with multiple profiles per site
- [ ] Test backward compatibility (old integrations still work)

---

## 🚀 Next Steps

After successful manual testing:

1. ✅ **Commit the migration and new features**
   ```bash
   git add .
   git commit -m "feat: Add multi-content-type support with sites and profiles"
   ```

2. **Update blog publishing workflow**
   - Modify blog post creation to select content type profile
   - Update publish API to accept `content_type_profile_id`
   - Update publish API to accept `target_site_id`
   - Use profile's field mappings for publishing

3. **Update UI components**
   - Add site selector in integration settings (✅ Done)
   - Add content type selector in blog editor (✅ Done)
   - Update field mapping UI (✅ Done)

4. **Documentation**
   - Update API documentation
   - Update user guide
   - Create migration guide for existing deployments

5. **Future Enhancements**
   - Add site discovery/sync for Webflow
   - Add collection discovery/sync for Webflow
   - Add validation for field mappings
   - Add field mapping templates

---

## 📚 Related Files

- Migration: `supabase/migrations/20251201111200_multi_content_type_support.sql`
- Migration Guide: `supabase/migrations/MULTI_CONTENT_TYPE_MIGRATION_GUIDE.md`
- API Routes:
  - `src/app/api/integrations/[id]/sites/route.ts`
  - `src/app/api/integrations/[id]/sites/[siteId]/route.ts`
  - `src/app/api/integrations/[id]/content-types/route.ts`
  - `src/app/api/integrations/[id]/content-types/[profileId]/route.ts`
  - `src/app/api/integrations/[id]/content-types/[profileId]/fields/route.ts`
- UI Components:
  - `src/components/integrations/SiteSelector.tsx`
  - `src/components/integrations/ContentTypeProfileSelector.tsx`
  - `src/components/integrations/WebflowConfig.tsx` (updated)

---

## 🐛 Troubleshooting

### Issue: "Table does not exist" error
**Solution:** Run the migration:
```bash
npx supabase migration up
```

### Issue: "Unauthorized" when calling API
**Solution:** Make sure you're logged in and have a valid session cookie

### Issue: "Integration not found"
**Solution:** Make sure the integration belongs to your organization

### Issue: "Cannot set multiple default sites"
**Solution:** The database has a constraint - only one site per integration can be default

### Issue: "Cannot set multiple default profiles"
**Solution:** The database has a constraint - only one profile per integration+site can be default

---

## 📞 Support

For issues or questions:
1. Check the migration guide: `supabase/migrations/MULTI_CONTENT_TYPE_MIGRATION_GUIDE.md`
2. Review the test documentation: `test-multi-content-type-api.md`
3. Check database logs in Supabase dashboard
4. Review API logs in application logs


