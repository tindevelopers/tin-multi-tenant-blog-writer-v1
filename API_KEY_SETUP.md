# Blog Writer API Key Setup Guide

## 🔐 Required: Set BLOG_WRITER_API_KEY in Vercel

The blog generation feature requires a valid API key to authenticate with the Blog Writer API. If you see a **401 Unauthorized** error, the API key is missing or invalid.

## Quick Setup

### 1. Get Your API Key
Contact your API administrator or check your organization settings to obtain the `BLOG_WRITER_API_KEY`.

### 2. Set in Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name**: `BLOG_WRITER_API_KEY`
   - **Value**: Your API key (e.g., `your-api-key-here`)
   - **Environment**: Select all (Production, Preview, Development)

4. Click **Save**

### 3. Redeploy

After adding the environment variable, trigger a new deployment:
- Go to **Deployments** tab
- Click **Redeploy** on the latest deployment
- Or push a new commit to trigger automatic deployment

## Alternative: Organization-Level API Keys

If you prefer organization-level API keys (multi-tenant setup):

1. Update your organization's `settings` JSONB field in the `organizations` table:
```sql
UPDATE organizations 
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{blog_writer_api_key}',
  '"your-api-key-here"'
)
WHERE org_id = 'your-org-id';
```

2. The system will automatically check organization settings if the environment variable is not set.

## Verification

After setting the API key, test blog generation:
1. Go to **Content Workflow** → **Editor**
2. Enter a topic and keywords
3. Click **Generate Blog**
4. Check the browser console and Vercel logs for authentication status

## Troubleshooting

### Error: 401 Unauthorized

**Cause**: API key is missing or invalid

**Solution**:
1. Verify `BLOG_WRITER_API_KEY` is set in Vercel environment variables
2. Check that the key is correct (no extra spaces, correct format)
3. Ensure the key is set for the correct environment (Production/Preview/Development)
4. Redeploy after adding the variable

### Error: API key not configured

**Cause**: Environment variable not found

**Solution**:
1. Check Vercel dashboard → Settings → Environment Variables
2. Verify the variable name is exactly `BLOG_WRITER_API_KEY` (case-sensitive)
3. Ensure it's set for all environments you're using
4. Redeploy the application

### Check Logs

View detailed logs in Vercel:
1. Go to **Deployments** → Select a deployment → **Functions** tab
2. Look for log entries with:
   - `🔑 API Key present`
   - `🌐 Calling external API`
   - `🔐 Authentication Error` (if 401 occurs)

## API Endpoints

The system automatically selects the correct API endpoint based on your branch:

- **Production** (`main`/`master`): `blog-writer-api-prod-613248238610.us-east1.run.app`
- **Staging** (`staging`): `blog-writer-api-staging-613248238610.europe-west9.run.app`
- **Development** (`develop`): `blog-writer-api-dev-613248238610.europe-west9.run.app`

You can override this by setting `BLOG_WRITER_API_URL` in environment variables.

## Security Notes

⚠️ **Important**: 
- Never commit API keys to git
- Use Vercel environment variables for production
- Rotate keys regularly
- Use different keys for different environments if possible

