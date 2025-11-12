# Cloudinary Integration Setup Guide

This guide explains how to configure Cloudinary credentials for your organization to enable automatic image storage for generated blog posts.

## Overview

When blog posts are generated with featured images, the system will automatically:
1. Generate a featured image using AI
2. Upload the image to your organization's Cloudinary account
3. Store the image reference in your media library
4. Use the Cloudinary URL in the blog post

## Prerequisites

- A Cloudinary account (sign up at https://cloudinary.com)
- Organization admin or owner access

## Step 1: Get Your Cloudinary Credentials

1. **Log in to Cloudinary Dashboard**: https://cloudinary.com/console
2. **Navigate to Settings** → **Security** (or Dashboard → Account Details)
3. **Copy the following credentials**:
   - **Cloud Name**: Found in the dashboard URL or account details
   - **API Key**: Found in Security settings
   - **API Secret**: Found in Security settings (click "Reveal" to show)

## Step 2: Configure Credentials in Database

Cloudinary credentials are stored in your organization's `settings` JSONB field in the `organizations` table.

### Option A: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Table Editor** → **organizations**
3. Find your organization row
4. Click on the `settings` column
5. Add or update the following JSON structure:

```json
{
  "cloudinary": {
    "cloud_name": "your-cloud-name",
    "api_key": "your-api-key",
    "api_secret": "your-api-secret"
  }
}
```

### Option B: Using SQL Query

Run this SQL query in Supabase SQL Editor (replace with your actual values):

```sql
UPDATE organizations
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{cloudinary}',
  '{
    "cloud_name": "your-cloud-name",
    "api_key": "your-api-key",
    "api_secret": "your-api-secret"
  }'::jsonb
)
WHERE org_id = 'your-org-id';
```

### Option C: Using API (Future)

An organization settings UI will be available in the admin panel to configure Cloudinary credentials through the interface.

## Step 3: Verify Configuration

After configuring credentials, test by generating a blog post. The system will:

1. Generate a featured image
2. Upload it to Cloudinary in the folder: `blog-images/{org_id}/`
3. Save the image reference to `media_assets` table
4. Return the Cloudinary URL in the blog generation response

## Image Storage Structure

Images are stored in Cloudinary with the following structure:

- **Folder**: `blog-images/{org_id}/`
- **Filename**: `blog-featured-{timestamp}.{format}`
- **Metadata**: Includes blog topic, keywords, quality scores, etc.

## Troubleshooting

### Images Not Uploading

1. **Check Credentials**: Verify Cloudinary credentials are correctly stored in `organizations.settings`
2. **Check API Secret**: Ensure the API secret is correct and not expired
3. **Check Cloudinary Account**: Verify your Cloudinary account is active and has available storage
4. **Check Logs**: Review server logs for Cloudinary upload errors

### Common Errors

- **"No Cloudinary credentials configured"**: Credentials are missing or incorrectly formatted in `organizations.settings`
- **"Cloudinary upload failed"**: Check API key/secret, account limits, or network connectivity
- **"Failed to fetch image"**: The generated image URL is invalid or expired

## Security Best Practices

1. **Never expose API Secret**: The API secret should only be stored in the database, never in client-side code
2. **Use Signed Uploads**: For production, consider using signed uploads with upload presets
3. **Set Upload Presets**: Configure Cloudinary upload presets with appropriate security settings
4. **Monitor Usage**: Regularly check Cloudinary dashboard for usage and storage limits

## Media Library

All uploaded images are automatically saved to the `media_assets` table with:
- Organization ID (for multi-tenancy)
- Cloudinary URL
- File metadata (size, format, dimensions)
- Upload metadata (topic, keywords, quality scores)

You can query your media library:

```sql
SELECT * FROM media_assets 
WHERE org_id = 'your-org-id' 
ORDER BY created_at DESC;
```

## Next Steps

- Set up Cloudinary upload presets for better security
- Configure image transformations (resize, optimize, etc.)
- Set up automatic image optimization
- Configure CDN settings for faster delivery

## Support

For issues with Cloudinary integration:
1. Check server logs for detailed error messages
2. Verify Cloudinary credentials are correct
3. Ensure your Cloudinary account has available storage/quota
4. Contact support if issues persist

