# Cloudinary Image Flow Documentation

## Overview
This document explains how images are generated, uploaded to Cloudinary, and attached to blog posts in the system.

## Image Generation & Upload Flow

### 1. Image Generation
**Endpoint**: `/api/blog-writer/images/generate`
- Images are generated via the Blog Writer API (Stability AI)
- Generated images are returned with URLs and metadata

### 2. Cloudinary Upload
**Location**: `src/lib/cloudinary-upload.ts`
- Images are uploaded to Cloudinary via Blog Writer API endpoint: `/api/v1/media/upload/cloudinary`
- **Folder Structure**: `blog-images/{org_id}/`
- Example: `blog-images/550e8400-e29b-41d4-a716-446655440000/`
- Images are stored with:
  - `public_id`: Unique identifier in Cloudinary
  - `secure_url`: HTTPS URL for the image
  - `url`: HTTP URL for the image
  - Metadata: width, height, format, bytes, etc.

### 3. Media Assets Storage
**Table**: `media_assets`
- After Cloudinary upload, images are saved to `media_assets` table
- Fields:
  - `file_url`: Cloudinary secure URL
  - `file_name`: Original filename
  - `file_type`: Image format (png, jpg, etc.)
  - `file_size`: Size in bytes
  - `provider`: "cloudinary"
  - `metadata`: JSONB with Cloudinary public_id, dimensions, etc.

## Image Attachment to Blog Posts

### Storage Location
Images are stored in the `blog_posts.metadata` JSONB field:

```json
{
  "featured_image": "https://res.cloudinary.com/.../image/upload/v123/...",
  "featured_image_alt": "Alt text for featured image",
  "content_images": [
    {
      "url": "https://res.cloudinary.com/.../image/upload/v123/...",
      "alt": "Alt text for content image"
    }
  ]
}
```

### Workflow Phase 2 (Image Generation)
**File**: `src/lib/workflow-phase-manager.ts` → `handlePhase2Completion()`

When Phase 2 completes:
1. Featured image URL is stored in `metadata.featured_image`
2. Featured image alt text is stored in `metadata.featured_image_alt`
3. Content images array is stored in `metadata.content_images`
4. Featured image HTML is prepended to blog content:
   ```html
   <figure class="featured-image">
     <img src="{featured_image.url}" alt="{featured_image.alt}" />
   </figure>
   ```

### Image References in Blog Content
- **Featured Image**: Stored in both `metadata.featured_image` AND prepended to `content` field as HTML
- **Content Images**: Stored in `metadata.content_images` array
- Images can also be embedded directly in the HTML `content` field

## Cloudinary Folder Structure

### Current Structure
```
Cloudinary Root
├── blog-images/
│   ├── {org_id_1}/
│   │   ├── blog-featured-1234567890.png
│   │   └── blog-section-1234567891.png
│   └── {org_id_2}/
│       └── ...
└── (other folders/images)
```

### Sync Behavior
- **Default**: Syncs from root (all images) when `?root=true` parameter is used
- **Org-specific**: Syncs from `blog-images/{org_id}/` when no root parameter
- **Media Library**: Shows all synced images from `media_assets` table

## Testing Root Directory Access

### Endpoint
`GET /api/integrations/cloudinary/check-root`

### What It Checks
1. **Root Directory** (no prefix) - All images in Cloudinary
2. **blog-images Folder** - All images in blog-images folder
3. **Org-specific Folder** - Images in `blog-images/{org_id}/`

### Response Format
```json
{
  "success": true,
  "credentials": {
    "cloudName": "dmc7libxs",
    "apiKeyPrefix": "58343..."
  },
  "checks": [
    {
      "location": "Root (no prefix)",
      "success": true,
      "resourceCount": 10,
      "resources": [...],
      "folders": ["blog-images", "other-folder"]
    },
    {
      "location": "Folder: blog-images/{org_id}",
      "success": true,
      "resourceCount": 5
    }
  ],
  "summary": {
    "rootAccess": true,
    "totalLocationsChecked": 3,
    "successfulChecks": 3,
    "totalResourcesFound": 15
  }
}
```

## Key Files

### Image Generation
- `src/app/api/blog-writer/images/generate/route.ts` - Generates images and uploads to Cloudinary
- `src/lib/cloudinary-upload.ts` - Cloudinary upload utilities

### Image Attachment
- `src/lib/workflow-phase-manager.ts` - Handles Phase 2 completion and updates blog metadata
- `src/app/api/workflow/generate-images/route.ts` - Phase 2 workflow endpoint

### Media Sync
- `src/app/api/media/sync/route.ts` - Syncs Cloudinary images to media_assets table
- `src/app/api/integrations/cloudinary/check-root/route.ts` - Checks root directory access

### UI Components
- `src/app/contentmanagement/drafts/edit/[id]/page.tsx` - Displays featured_image and content_images
- `src/app/contentmanagement/media/page.tsx` - Media library with sync functionality

## Troubleshooting

### Images Not Syncing
1. Check root directory access: Visit `/api/integrations/cloudinary/check-root`
2. Verify credentials are configured correctly
3. Check if images are in expected folder structure
4. Ensure `type=upload` parameter is included in API calls

### Images Not Showing in Blog
1. Check `blog_posts.metadata.featured_image` field
2. Verify `metadata.content_images` array exists
3. Check if images are prepended to `content` field HTML
4. Verify Cloudinary URLs are accessible

### Folder Structure Issues
- Images uploaded via system go to: `blog-images/{org_id}/`
- Images in root or other folders won't sync unless `?root=true` is used
- Use the check-root endpoint to see actual folder structure

