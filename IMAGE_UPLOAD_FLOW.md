# Image Upload and Generation Flow

## Overview

This document describes how images are generated and uploaded in the blog writer system.

## Image Generation Flow

### 1. AI-Generated Images (Stability AI)

**Source**: Stability AI via Backend API

**Flow**:
1. User triggers image generation from blog content placeholders
2. Frontend calls `/api/blog-queue/[id]/generate-images`
3. Next.js API route detects image placeholders in content
4. Calls `BlogImageGenerator.generateImage()` which uses:
   - **Client-side**: `/api/images/generate` (Next.js proxy)
   - **Server-side**: `${BLOG_WRITER_API_URL}/api/v1/images/generate` (direct)
5. Backend API generates image using Stability AI
6. Returns image URL (temporary or permanent)
7. Images are optionally uploaded to Cloudinary if org has credentials configured
8. Images are inserted into blog content

**Files**:
- `src/lib/image-generation.ts` - Image generation service
- `src/app/api/images/generate/route.ts` - Next.js proxy for image generation
- `src/app/api/blog-queue/[id]/generate-images/route.ts` - Queue item image generation

## Image Upload Flow

### 2. User-Uploaded Images (Cloudinary)

**Source**: User uploads via TipTap editor

**Flow**:
1. User clicks "Insert Image" in TipTap editor
2. File picker opens, user selects image file
3. Frontend calls `/api/images/upload` with FormData
4. Next.js API route (`src/app/api/images/upload/route.ts`):
   - Validates authentication
   - Checks if organization has Cloudinary credentials configured
   - Converts file to base64 data URI
   - Calls backend API: `${BLOG_WRITER_API_URL}/api/v1/media/upload/cloudinary`
   - Passes Cloudinary credentials explicitly in request body
5. Backend API uploads to Cloudinary using provided credentials
6. Returns Cloudinary URL (`secure_url`)
7. Next.js route saves to `media_assets` table in Supabase
8. Returns URL to frontend for insertion into editor

**Files**:
- `src/app/api/images/upload/route.ts` - Image upload endpoint
- `src/lib/cloudinary-upload.ts` - Cloudinary utilities
- `src/components/blog-writer/TipTapEditor.tsx` - Editor component

## Cloudinary Configuration

### Organization Settings

Cloudinary credentials are stored in `organizations.settings` JSONB column:

```json
{
  "cloudinary": {
    "cloud_name": "your-cloud-name",
    "api_key": "your-api-key",
    "api_secret": "your-api-secret"
  }
}
```

### Configuration UI

Users can configure Cloudinary credentials in:
- **Settings → Integrations → Cloudinary**
- Component: `src/components/integrations/CloudinaryConfig.tsx`
- Test endpoint: `/api/integrations/cloudinary/test`

## Error Handling

### Common Errors

1. **CLOUDINARY_NOT_CONFIGURED**
   - **Message**: "Cloudinary is not configured for your organization..."
   - **Solution**: Configure Cloudinary credentials in Settings → Integrations

2. **INVALID_REQUEST** (400)
   - **Message**: "Invalid image file or request..."
   - **Solution**: Check file format, size, and request parameters

3. **AUTH_ERROR** (401/403)
   - **Message**: "Authentication failed..."
   - **Solution**: Check API credentials and organization permissions

4. **SERVER_ERROR** (500+)
   - **Message**: "Server error during upload..."
   - **Solution**: Check backend API logs, Cloudinary service status

### Error Response Format

```json
{
  "error": "User-friendly error message",
  "code": "ERROR_CODE",
  "details": { /* Additional error details */ }
}
```

## Database Storage

### media_assets Table

All uploaded images are stored in `media_assets` table:

```sql
CREATE TABLE media_assets (
  asset_id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(org_id),
  uploaded_by UUID REFERENCES users(user_id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,  -- Cloudinary secure_url
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  provider TEXT NOT NULL,  -- 'cloudinary' or 'cloudflare'
  metadata JSONB DEFAULT '{}',  -- Cloudinary public_id, dimensions, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Backend API Endpoints

### POST `/api/v1/media/upload/cloudinary`

**Request Body**:
```json
{
  "image_data": "data:image/png;base64,...",
  "file_name": "image.png",
  "folder": "blog-images/{org_id}",
  "cloudinary_credentials": {
    "cloud_name": "your-cloud-name",
    "api_key": "your-api-key",
    "api_secret": "your-api-secret"
  }
}
```

**Response**:
```json
{
  "public_id": "blog-images/org-id/image",
  "secure_url": "https://res.cloudinary.com/.../image.png",
  "url": "http://res.cloudinary.com/.../image.png",
  "width": 1920,
  "height": 1080,
  "format": "png",
  "bytes": 123456,
  "resource_type": "image"
}
```

## Recent Changes

### v1.3.6 - Improved Error Handling

- ✅ Check Cloudinary credentials before upload attempt
- ✅ Pass credentials explicitly to backend API
- ✅ Better error messages with error codes
- ✅ Detailed logging for debugging
- ✅ User-friendly error messages in UI

### Before

- Backend API was expected to fetch credentials from org settings
- Generic error messages
- No pre-flight credential check

### After

- Credentials are fetched and passed explicitly
- Clear error messages with actionable guidance
- Pre-flight check prevents unnecessary API calls
- Better logging for troubleshooting

## Troubleshooting

### Image Upload Fails

1. **Check Cloudinary Configuration**
   ```sql
   SELECT settings->'cloudinary' FROM organizations WHERE org_id = '...';
   ```

2. **Check Backend API Logs**
   - Cloud Run logs: `gcloud logging read "resource.type=cloud_run_revision" --limit 50`

3. **Test Cloudinary Connection**
   - Use `/api/integrations/cloudinary/test` endpoint
   - Or configure via Settings → Integrations → Cloudinary

4. **Check File Size/Format**
   - Cloudinary supports: JPEG, PNG, GIF, WebP, SVG, etc.
   - Max file size: 10MB (default, can be configured)

5. **Verify API Credentials**
   - Check `BLOG_WRITER_API_KEY` environment variable
   - Verify backend API is accessible

## Future Enhancements

- [ ] Support for Cloudflare Images as alternative provider
- [ ] Image optimization/transformation before upload
- [ ] Batch image upload
- [ ] Image library/gallery view
- [ ] Image search by tags/metadata
- [ ] Automatic image compression
- [ ] CDN integration for faster delivery

