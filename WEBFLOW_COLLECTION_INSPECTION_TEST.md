# Webflow Collection Inspection Endpoint - Testing Guide

## Endpoint Details

**URL**: `/api/test/webflow-inspect-collection`  
**Method**: `GET`  
**Authentication**: Required (must be logged in)

## Query Parameters

- `collection_id` (required): The Webflow collection ID to inspect
- `api_key` (optional): Webflow API key. If not provided, will use the configured integration.

## Testing the Endpoint

### Option 1: Via Browser (After Login)

1. **Login to your Vercel deployment**:
   ```
   https://tin-multi-tenant-blog-writer-v1.vercel.app/auth/login
   ```

2. **Open browser console** and run:
   ```javascript
   fetch('/api/test/webflow-inspect-collection?collection_id=6928d5ea7146ca3510367bcc')
     .then(r => r.json())
     .then(console.log)
     .catch(console.error)
   ```

### Option 2: Via curl (with Authentication Cookie)

1. **Get your session cookie** from browser DevTools:
   - Open DevTools → Application → Cookies
   - Copy the `sb-<project-id>-auth-token` cookie value

2. **Test the endpoint**:
   ```bash
   curl -H "Cookie: sb-<project-id>-auth-token=<your-token>" \
     "https://tin-multi-tenant-blog-writer-v1.vercel.app/api/test/webflow-inspect-collection?collection_id=6928d5ea7146ca3510367bcc"
   ```

### Option 3: Via Postman/Insomnia

1. **Set up authentication**:
   - Login via browser first
   - Copy the authentication cookie
   - Add it to your request headers

2. **Make GET request**:
   ```
   GET https://tin-multi-tenant-blog-writer-v1.vercel.app/api/test/webflow-inspect-collection?collection_id=6928d5ea7146ca3510367bcc
   ```

## Expected Response

```json
{
  "success": true,
  "collection": {
    "id": "6928d5ea7146ca3510367bcc",
    "displayName": "Blog Posts",
    "singularName": "Blog Post",
    "slug": "blog-posts",
    "fieldCount": 15
  },
  "fields": [
    {
      "id": "field-id-1",
      "displayName": "Name",
      "slug": "name",
      "type": "PlainText",
      "isRequired": true,
      "isEditable": true
    },
    {
      "id": "field-id-2",
      "displayName": "Post Body",
      "slug": "post-body",
      "type": "RichText",
      "isRequired": false,
      "isEditable": true
    }
    // ... more fields
  ],
  "fieldMappings": {
    "title": {
      "suggested": ["name", "title", "post-title", "blog-title", "headline"],
      "found": "name"
    },
    "content": {
      "suggested": ["post-body", "body", "content", "post-content", "main-content", "rich-text"],
      "found": "post-body"
    },
    "featured_image": {
      "suggested": ["main-image", "featured-image", "post-image", "image", "thumbnail"],
      "found": "post-image"
    }
    // ... more mappings
  },
  "recommendations": {
    "titleField": "name",
    "contentField": "post-body",
    "imageField": "post-image"
  }
}
```

## What This Endpoint Does

1. **Fetches Collection Schema**: Gets all fields from the Webflow collection
2. **Analyzes Field Types**: Identifies field types (ImageRef, RichText, Date, etc.)
3. **Suggests Field Mappings**: Provides intelligent suggestions for mapping blog fields to Webflow fields
4. **Shows Sample Items**: Displays sample items to understand field data structure
5. **Provides Recommendations**: Gives specific recommendations for title, content, and image fields

## Next Steps After Inspection

1. **Review the field mappings** - Check if the suggested mappings match your collection
2. **Configure custom mappings** if needed in integration settings
3. **Test publishing** a blog post to verify the mappings work correctly

## Troubleshooting

### 401 Unauthorized
- Make sure you're logged in
- Check that your session cookie is valid

### 404 Not Found
- Wait for Vercel deployment to complete (usually 2-3 minutes after push)
- Check that the endpoint path is correct

### 400 Bad Request
- Ensure `collection_id` parameter is provided
- Verify the collection ID is correct

### Integration Not Found
- Make sure you have a Webflow integration configured
- Or provide `api_key` as a query parameter

## Deployment Status

**Commit**: `c36dbcc`  
**Status**: Pushed to `develop` branch  
**Vercel**: Deploying... (check https://vercel.com/tindeveloper/tin-multi-tenant-blog-writer-v1)

Wait 2-3 minutes after push for deployment to complete, then test the endpoint.

