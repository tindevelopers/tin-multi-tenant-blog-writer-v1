# Blog Writer API Configuration Guide

## 🌐 Open API - No Authentication Required

The Blog Writer API is **open** and does **not require authentication**. The API key is **optional** and only needed for special features or future use.

## Quick Setup

**No API key is required!** The Blog Writer API is open and works without authentication.

### Optional: API Key (For Future Use)

If you have an API key for special features, you can optionally set it:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new variable (optional):
   - **Name**: `BLOG_WRITER_API_KEY`
   - **Value**: Your API key (if you have one)
   - **Environment**: Select all (Production, Preview, Development)

4. Click **Save** (only if you have an API key)

**Note**: Leaving this unset is perfectly fine - the API will work without it.

## Verification

Test blog generation (no API key needed):
1. Go to **Content Workflow** → **Editor**
2. Enter a topic and keywords
3. Click **Generate Blog**
4. The API will work without authentication

## Troubleshooting

### Error: 401 Unauthorized

**Cause**: This should not happen with an open API. If you see this error:

**Possible causes**:
1. The API endpoint URL is incorrect
2. Network/firewall issues
3. The API service is down

**Solution**:
1. Check Vercel logs for the actual API URL being called
2. Verify the API endpoint is accessible
3. Check network connectivity
4. Contact API administrator if the issue persists

### Error: API endpoint not found

**Cause**: Incorrect API URL configuration

**Solution**:
1. Verify `BLOG_WRITER_API_URL` is set correctly (or uses default)
2. Check that the API service is running
3. Ensure the endpoint path is correct (`/api/v1/blog/generate-enhanced`)

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

## Notes

✅ **Open API**: 
- No authentication required
- API key is optional (only for future features)
- Works out of the box without configuration

If you do set an API key in the future:
- Never commit API keys to git
- Use Vercel environment variables for production
- Keep keys secure

