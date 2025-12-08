# Cloudinary Credentials Setup Guide

## Quick Setup

### Option 1: Using the UI (Recommended) ✅

1. **Navigate to Integrations Page**:
   - Go to: `/admin/panel/integrations`
   - Or: `/admin/integrations` (will redirect admins to panel)

2. **Configure Cloudinary**:
   - Find the "Cloudinary" card in the "Publishing System Requirements" section
   - Click the **"Configure Cloudinary"** button
   - Enter your credentials:
     - **Cloud Name**: Your Cloudinary cloud name (found in dashboard URL)
     - **API Key**: Found in Cloudinary Settings → Security
     - **API Secret**: Found in Cloudinary Settings → Security (click "Reveal")
   - Click **"Save Credentials"**
   - Optionally click **"Test Connection"** to verify

3. **Verify Setup**:
   - The Cloudinary card should show as "Configured ✓"
   - You can now sync media from Cloudinary

### Option 2: Using the API Endpoint

**Endpoint**: `POST /api/admin/cloudinary/set-credentials`

**Request Body**:
```json
{
  "cloud_name": "your-cloud-name",
  "api_key": "123456789012345",
  "api_secret": "abcdefghijklmnopqrstuvwxyz1234567890",
  "org_id": "optional-org-id" // Optional, defaults to your org
}
```

**Example using curl**:
```bash
curl -X POST https://your-domain.com/api/admin/cloudinary/set-credentials \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "cloud_name": "your-cloud-name",
    "api_key": "123456789012345",
    "api_secret": "your-api-secret"
  }'
```

**Note**: Requires authentication (must be logged in as owner/admin)

### Option 3: Direct Database Update (Advanced)

If you have direct database access:

```sql
UPDATE organizations
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{cloudinary}',
  '{
    "cloud_name": "your-cloud-name",
    "api_key": "123456789012345",
    "api_secret": "your-api-secret"
  }'::jsonb
),
updated_at = NOW()
WHERE org_id = 'your-org-id';
```

## Getting Your Cloudinary Credentials

1. **Log in to Cloudinary Dashboard**:
   - Go to: https://cloudinary.com/console
   - Sign in with your account

2. **Find Your Credentials**:
   - **Cloud Name**: Found in your dashboard URL: `https://console.cloudinary.com/console/c/{cloud_name}/media_library`
   - **API Key**: Go to Settings → Security → API Keys
   - **API Secret**: Go to Settings → Security → API Keys → Click "Reveal" next to API Secret

3. **Copy Credentials**:
   - Copy each value carefully
   - Keep your API Secret secure (never commit to git)

## Troubleshooting

### Error: "Invalid credentials" (401)

**Possible causes**:
1. Credentials are incorrect
2. API Secret is wrong (most common)
3. Cloud Name doesn't match your account

**Solutions**:
1. Double-check all three values in Cloudinary dashboard
2. Make sure you copied the full API Secret (it's long)
3. Try the "Test Connection" button in the UI to verify

### Error: "Cloudinary not configured for this organization"

**Solution**: Credentials haven't been set yet. Follow Option 1 above to configure.

### Error: "Only organization owners and admins can configure Cloudinary"

**Solution**: You need owner or admin role. Contact your organization admin.

## Where Credentials Are Stored

- **Location**: `organizations.settings.cloudinary` (JSONB field)
- **Structure**:
  ```json
  {
    "cloudinary": {
      "cloud_name": "your-cloud-name",
      "api_key": "123456789012345",
      "api_secret": "your-api-secret"
    }
  }
  ```
- **Security**: Credentials are encrypted at rest in Supabase
- **Access**: Only accessible server-side in API routes

## Testing Your Configuration

After setting credentials:

1. **Test Connection**:
   - Go to `/admin/panel/integrations`
   - Click "Test Connection" on the Cloudinary card
   - Should show success message

2. **Sync Media**:
   - Go to `/contentmanagement/media`
   - Click "Sync with Cloudinary"
   - Should sync images from your Cloudinary account

## Security Best Practices

1. ✅ **Never commit credentials to git**
2. ✅ **Use environment variables for production** (if needed)
3. ✅ **Rotate API secrets periodically**
4. ✅ **Use least privilege** (only give admin/owner access)
5. ✅ **Monitor API usage** in Cloudinary dashboard

## Need Help?

- **Cloudinary Documentation**: https://cloudinary.com/documentation
- **API Reference**: https://cloudinary.com/documentation/admin_api
- **Support**: Check the error message in the UI for specific guidance

