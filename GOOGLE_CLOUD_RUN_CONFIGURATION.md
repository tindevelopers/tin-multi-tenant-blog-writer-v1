# Google Cloud Run Configuration for Blog Writer API

## Issue

When generating blog content with `async_mode=true`, the external Blog Writer API returns an error:

```
Failed to create async job: Project ID must be provided or set in GOOGLE_CLOUD_PROJECT env var
```

## Root Cause

The external Blog Writer API (running on Google Cloud Run) is trying to create an async job using Google Cloud Tasks, but it doesn't have the `GOOGLE_CLOUD_PROJECT` environment variable configured.

## Solution

### Option 1: Store in Secrets Manager and Mount to Cloud Run (Recommended)

The Google Cloud Project ID should be stored in Google Cloud Secrets Manager and mounted as an environment variable in Cloud Run.

**Project ID:** `api-ai-blog-writer`

#### Step 1: Create Secret in Secrets Manager

Run the setup script:
```bash
./scripts/setup-google-cloud-project-secret.sh
```

Or manually:
```bash
# Set your project
gcloud config set project api-ai-blog-writer

# Create the secret
echo -n "api-ai-blog-writer" | gcloud secrets create google-cloud-project-id \
    --project=api-ai-blog-writer \
    --data-file=-

# Grant Cloud Run service account access
gcloud secrets add-iam-policy-binding google-cloud-project-id \
    --project=api-ai-blog-writer \
    --member="serviceAccount:api-ai-blog-writer@appspot.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

#### Step 2: Update Cloud Run Service to Use Secret

Run the update script:
```bash
./scripts/update-cloud-run-with-secret.sh
```

Or manually:
```bash
gcloud run services update blog-writer-api-dev \
    --region=europe-west9 \
    --project=api-ai-blog-writer \
    --update-secrets=GOOGLE_CLOUD_PROJECT=google-cloud-project-id:latest
```

#### Step 3: Verify Configuration

Check that the secret is mounted:
```bash
gcloud run services describe blog-writer-api-dev \
    --region=europe-west9 \
    --project=api-ai-blog-writer \
    --format="value(spec.template.spec.containers[0].env)"
```

### Option 2: Configure Directly as Environment Variable (Alternative)

If you prefer not to use Secrets Manager:

**For Google Cloud Run:**
1. Go to Google Cloud Console
2. Navigate to Cloud Run → Your Blog Writer API service
3. Go to "Edit & Deploy New Revision"
4. Go to "Variables & Secrets" tab
5. Add environment variable:
   - **Name**: `GOOGLE_CLOUD_PROJECT`
   - **Value**: `api-ai-blog-writer`

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

