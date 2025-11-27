# Google Cloud Run Configuration for Blog Writer API

## Issue

When generating blog content with `async_mode=true`, the external Blog Writer API returns an error:

```
Failed to create async job: Project ID must be provided or set in GOOGLE_CLOUD_PROJECT env var
```

## Root Cause

The external Blog Writer API (running on Google Cloud Run) is trying to create an async job using Google Cloud Tasks, but it doesn't have the `GOOGLE_CLOUD_PROJECT` environment variable configured.

## Solution

### Option 1: Configure GOOGLE_CLOUD_PROJECT in External API (Recommended)

The external Blog Writer API needs to have `GOOGLE_CLOUD_PROJECT` set as an environment variable.

**For Google Cloud Run:**
1. Go to Google Cloud Console
2. Navigate to Cloud Run → Your Blog Writer API service
3. Go to "Edit & Deploy New Revision"
4. Go to "Variables & Secrets" tab
5. Add environment variable:
   - **Name**: `GOOGLE_CLOUD_PROJECT`
   - **Value**: Your Google Cloud Project ID (e.g., `blog-writer-api-dev`)

**To find your Project ID:**
```bash
gcloud config get-value project
```

Or check in Google Cloud Console → Project Settings

### Option 2: Verify External API Configuration

Check if the external API is properly configured:

1. **Verify the API URL is correct:**
   - Current: `https://blog-writer-api-dev-613248238610.europe-west9.run.app`
   - Check if this is the correct URL

2. **Test the API directly:**
```bash
curl -X POST "https://blog-writer-api-dev-613248238610.europe-west9.run.app/api/v1/blog/generate-enhanced?async_mode=true" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "test",
    "keywords": ["test"],
    "word_count": 500
  }'
```

3. **Check API logs:**
   - Go to Google Cloud Console → Cloud Run → Logs
   - Look for errors related to `GOOGLE_CLOUD_PROJECT`

## Current Workaround

Our Next.js API now handles this gracefully:

1. ✅ **Queue entry is always created** before calling external API
2. ✅ **queue_id is always returned** even when external API fails
3. ✅ **Failed generations appear in queue** with error details
4. ✅ **Frontend can track failed generations** via queue_id

## Testing

After configuring `GOOGLE_CLOUD_PROJECT`:

1. Generate a blog post
2. Check that it goes into the queue (not immediately failed)
3. Verify the queue status updates correctly
4. Check that content is generated successfully

## Verification

To verify the external API is working:

```bash
# Test async mode
curl -X POST "https://blog-writer-api-dev-613248238610.europe-west9.run.app/api/v1/blog/generate-enhanced?async_mode=true" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "topic": "test topic",
    "keywords": ["test"],
    "word_count": 500
  }'

# Should return:
# {
#   "job_id": "...",
#   "status": "queued",
#   "message": "Blog generation job created"
# }
```

## Next Steps

1. ✅ **Code fix applied** - queue_id always returned
2. ⚠️ **External API configuration needed** - Set GOOGLE_CLOUD_PROJECT
3. ✅ **Frontend updated** - Handles error responses with queue_id
4. ✅ **Queue tracking** - Failed generations appear in queue dashboard

