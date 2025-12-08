# Multi-Content-Type API Testing Guide

## Test the API Endpoints

### Prerequisites
1. Ensure migration has been run successfully
2. Have an integration ID ready (create one if needed)
3. Be authenticated as an admin user

### Test Steps

#### 1. Test Sites API

**GET Sites:**
```bash
curl -X GET "http://localhost:3000/api/integrations/{integrationId}/sites" \
  -H "Cookie: your-session-cookie"
```

**POST Create Site:**
```bash
curl -X POST "http://localhost:3000/api/integrations/{integrationId}/sites" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "site_name": "Main Webflow Site",
    "site_id": "test-site-id-123",
    "site_url": "https://example.webflow.io",
    "is_default": true
  }'
```

**PUT Update Site:**
```bash
curl -X PUT "http://localhost:3000/api/integrations/{integrationId}/sites/{siteId}" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "site_name": "Updated Site Name",
    "is_active": true
  }'
```

**DELETE Site:**
```bash
curl -X DELETE "http://localhost:3000/api/integrations/{integrationId}/sites/{siteId}" \
  -H "Cookie: your-session-cookie"
```

#### 2. Test Content Type Profiles API

**GET Profiles:**
```bash
curl -X GET "http://localhost:3000/api/integrations/{integrationId}/content-types" \
  -H "Cookie: your-session-cookie"
```

**GET Profiles by Site:**
```bash
curl -X GET "http://localhost:3000/api/integrations/{integrationId}/content-types?site_id={siteId}" \
  -H "Cookie: your-session-cookie"
```

**POST Create Profile:**
```bash
curl -X POST "http://localhost:3000/api/integrations/{integrationId}/content-types" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "profile_name": "Article",
    "content_type": "webflow_collection",
    "target_collection_id": "collection-123",
    "target_collection_name": "Blog Posts",
    "site_id": "{siteId}",
    "is_default": true,
    "description": "Standard blog article content type"
  }'
```

**PUT Update Profile:**
```bash
curl -X PUT "http://localhost:3000/api/integrations/{integrationId}/content-types/{profileId}" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "profile_name": "Updated Article",
    "is_active": true
  }'
```

**DELETE Profile:**
```bash
curl -X DELETE "http://localhost:3000/api/integrations/{integrationId}/content-types/{profileId}" \
  -H "Cookie: your-session-cookie"
```

#### 3. Test Field Mappings API

**GET Field Mappings:**
```bash
curl -X GET "http://localhost:3000/api/integrations/{integrationId}/content-types/{profileId}/fields" \
  -H "Cookie: your-session-cookie"
```

**POST Save Field Mappings:**
```bash
curl -X POST "http://localhost:3000/api/integrations/{integrationId}/content-types/{profileId}/fields" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
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
      },
      {
        "blog_field": "author",
        "target_field": "author-name",
        "is_required": false,
        "display_order": 2
      }
    ],
    "replace_all": true
  }'
```

### Expected Responses

All endpoints should return:
- Success: `{ "success": true, "data": [...] }`
- Error: `{ "error": "error message" }`

### Testing Checklist

- [ ] Sites API: GET returns list of sites
- [ ] Sites API: POST creates new site
- [ ] Sites API: PUT updates existing site
- [ ] Sites API: DELETE removes site
- [ ] Content Types API: GET returns list of profiles
- [ ] Content Types API: POST creates new profile
- [ ] Content Types API: PUT updates existing profile
- [ ] Content Types API: DELETE removes profile
- [ ] Field Mappings API: GET returns list of mappings
- [ ] Field Mappings API: POST saves mappings
- [ ] Verify RLS policies work (users can only see their org's data)
- [ ] Verify default site/profile constraints work
- [ ] Test error handling (404, 403, 409, etc.)

