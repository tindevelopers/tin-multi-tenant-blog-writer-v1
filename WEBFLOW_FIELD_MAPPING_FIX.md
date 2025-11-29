# Webflow Field Mapping Fix

## Problem
Blog posts were successfully pushed to Webflow but:
1. The blog didn't show up on the Webflow site
2. Images didn't push correctly
3. Field mapping didn't match the actual Webflow collection schema

## Solution

### 1. Enhanced Field Mapping (`src/lib/integrations/webflow-field-mapping.ts`)
- Added `autoDetectFieldMappings()` function that intelligently matches blog fields to Webflow fields based on:
  - Field slug names (tries multiple variations)
  - Field types (prefers ImageRef for images, RichText for content, Date for dates)
  - Available fields in the collection

- Updated default mappings with more field name variations:
  - Title: `name`, `title`, `post-title`, `blog-title`, `headline`
  - Content: `post-body`, `body`, `content`, `post-content`, `main-content`, `rich-text`
  - Image: `post-image`, `main-image`, `featured-image`, `image`, `thumbnail`, `cover-image`, `hero-image`
  - And more variations for other fields

### 2. Improved Image Handling (`src/lib/integrations/webflow-assets.ts`)
- Created new module for Webflow asset management
- Added `validateImageUrl()` to check if image URLs are accessible
- Added `uploadImageToWebflow()` function (currently uses external URLs directly, but can be extended to upload to Webflow assets)
- Webflow supports external image URLs directly in image fields

### 3. Enhanced Publishing Logic (`src/lib/integrations/webflow-publish.ts`)
- Added field type detection and mapping
- Improved image field detection based on field type (ImageRef, FileRef, Image)
- Better logging to debug field mapping issues
- Auto-detection of field mappings when custom mappings aren't configured
- Enhanced validation and error messages

### 4. Collection Inspection API (`src/app/api/test/webflow-inspect-collection/route.ts`)
- New endpoint to inspect Webflow collection schema
- Shows all available fields with their types
- Provides field mapping suggestions
- Shows sample items to understand field data structure

## Usage

### Inspect Collection Schema
```bash
GET /api/test/webflow-inspect-collection?collection_id=6928d5ea7146ca3510367bcc
```

This will return:
- Collection information
- All fields with types and requirements
- Field mapping suggestions
- Sample items

### Publishing Flow
1. When publishing, the system now:
   - Fetches the collection schema
   - Detects field types
   - Auto-maps fields if custom mappings aren't configured
   - Validates image URLs
   - Maps images to correct image fields based on type
   - Publishes the site after creating the item

## Next Steps

1. **Test the collection inspection**:
   ```bash
   curl "http://localhost:3000/api/test/webflow-inspect-collection?collection_id=6928d5ea7146ca3510367bcc"
   ```

2. **Review the field mappings** returned by the inspection endpoint

3. **Configure custom field mappings** if needed in the integration settings

4. **Test publishing** a blog post and verify:
   - Fields are mapped correctly
   - Images appear in Webflow
   - Blog shows up on the live site

## Field Mapping Configuration

If auto-detection doesn't work perfectly, you can configure custom field mappings in:
- Integration settings (`integrations` table, `field_mappings` column)
- Organization settings (`organizations` table, `settings.webflow.field_mappings`)

Example mapping format:
```json
[
  {
    "blogField": "title",
    "targetField": "name"
  },
  {
    "blogField": "content",
    "targetField": "post-body"
  },
  {
    "blogField": "featured_image",
    "targetField": "main-image"
  }
]
```

## Troubleshooting

### Blog doesn't show up
- Check if the site was published after item creation
- Verify the item was created with `isDraft: false`
- Check Webflow CMS to see if item exists

### Image doesn't appear
- Verify the image URL is accessible (public URL)
- Check that the image field type is ImageRef or FileRef
- Ensure the field slug matches (use inspection endpoint to verify)

### Fields not mapping
- Use the inspection endpoint to see available fields
- Check logs for field mapping warnings
- Configure custom mappings if auto-detection fails

