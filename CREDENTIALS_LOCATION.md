# Where Are Credentials Needed?

**Date:** 2025-11-24  
**Answer:** ✅ **BACKEND (Cloud Run Service)**

---

## Architecture Overview

```
Frontend (Next.js/Vercel)
    ↓
    Calls: POST /api/blog-writer/generate
    ↓
Next.js API Route (src/app/api/blog-writer/generate/route.ts)
    ↓
    Proxies to: POST /api/v1/blog/generate-enhanced
    ↓
Backend API (Cloud Run Service)
    ↓
    Makes calls to: DataForSEO API
    ↓
DataForSEO API (External)
```

---

## Credentials Location: BACKEND ✅

### Why Backend?

1. **Backend Makes the API Calls**
   - The backend Cloud Run service (`blog-writer-api-dev-kq42l26tuq-od.a.run.app`) makes the actual HTTP requests to DataForSEO API
   - The frontend/Next.js route only proxies the request to the backend

2. **Security Best Practice**
   - API credentials should NEVER be exposed to the frontend
   - Credentials in the frontend would be visible in client-side code
   - Backend credentials are secure and server-side only

3. **Current Architecture**
   - Based on `DATAFORSEO_MIGRATION_COMPLETE.md`, DataForSEO integration was moved from Next.js to the backend
   - The backend handles all DataForSEO API calls
   - The frontend just passes `use_dataforseo_content_generation: true` flag

---

## Where to Configure Credentials

### ✅ Backend (Google Secret Manager)

**Location:** Google Secret Manager  
**Project:** `api-ai-blog-writer`  
**Service:** Cloud Run service loads secrets automatically

**Required Secrets:**
- `blog-writer-env-dev` - Dev environment secrets
- `blog-writer-env-staging` - Staging environment secrets
- `blog-writer-env-prod` - Production environment secrets

**Steps:**

#### Option 1: Using Automated Script (Recommended)

```bash
cd /Users/gene/Projects/api-blogwriting-python-gcr
./scripts/add-dataforseo-secrets.sh
```

The script will:
1. Prompt you for DataForSEO API Key and Secret
2. Add them to all environment secrets (dev, staging, production)
3. Create new secret versions automatically

#### Option 2: Manual Setup via gcloud CLI

```bash
PROJECT_ID="api-ai-blog-writer"
SECRET_NAME="blog-writer-env-dev"

# Get current secret value
CURRENT_JSON=$(gcloud secrets versions access latest \
  --secret=$SECRET_NAME \
  --project=$PROJECT_ID)

# Update with DataForSEO credentials
UPDATED_JSON=$(echo "$CURRENT_JSON" | jq '. + {
  "DATAFORSEO_API_KEY": "your-api-key-here",
  "DATAFORSEO_API_SECRET": "your-api-secret-here"
}')

# Create new version
echo "$UPDATED_JSON" | gcloud secrets versions add $SECRET_NAME \
  --data-file=- \
  --project=$PROJECT_ID
```

**Also add AI provider credentials (for pipeline fallback):**
```bash
# Add OpenAI key
UPDATED_JSON=$(echo "$CURRENT_JSON" | jq '. + {
  "OPENAI_API_KEY": "your-openai-key"
}')
echo "$UPDATED_JSON" | gcloud secrets versions add $SECRET_NAME \
  --data-file=- \
  --project=$PROJECT_ID

# Add Anthropic key
UPDATED_JSON=$(echo "$CURRENT_JSON" | jq '. + {
  "ANTHROPIC_API_KEY": "your-anthropic-key"
}')
echo "$UPDATED_JSON" | gcloud secrets versions add $SECRET_NAME \
  --data-file=- \
  --project=$PROJECT_ID
```

**After adding secrets, redeploy the service:**
- Push to `develop` branch for dev (auto-deploys)
- Push to `staging` branch for staging (auto-deploys)
- Push to `main` branch for production (auto-deploys)

---

## What the Frontend Does

### Frontend Responsibilities:
- ✅ Passes `use_dataforseo_content_generation: true` flag
- ✅ Sends request to Next.js API route
- ✅ Receives response from backend

### Frontend Does NOT:
- ❌ Store DataForSEO credentials
- ❌ Make direct calls to DataForSEO API
- ❌ Handle authentication with DataForSEO

---

## Current Flow

### 1. Frontend Request
```typescript
// Frontend code
const result = await blogWriterAPI.generateBlog({
  topic: 'Introduction to Python',
  keywords: ['python'],
  use_dataforseo_content_generation: true, // ← Flag only
});
```

### 2. Next.js API Route (Proxy)
```typescript
// src/app/api/blog-writer/generate/route.ts
const response = await fetch(`${BACKEND_URL}/api/v1/blog/generate-enhanced`, {
  method: 'POST',
  body: JSON.stringify({
    topic,
    keywords,
    use_dataforseo_content_generation: true, // ← Pass flag to backend
  }),
});
```

### 3. Backend API (Makes DataForSEO Calls)
```python
# Backend code (Cloud Run service)
# Secrets are loaded from Google Secret Manager at startup
# Mounted at /secrets/env and loaded by load_env_from_secrets()

if use_dataforseo_content_generation:
    # Backend uses credentials from Google Secret Manager
    result = await content_service.generate_blog_content(
        topic=request.topic,
        keywords=request.keywords,
        # Credentials loaded from DATAFORSEO_API_KEY and DATAFORSEO_API_SECRET
        # These come from Google Secret Manager via /secrets/env
        ...
    )
```

---

## Summary

| Component | Credentials Needed? | Location |
|-----------|---------------------|----------|
| **Frontend** | ❌ No | N/A |
| **Next.js API Route** | ❌ No | Acts as proxy only |
| **Backend (Cloud Run)** | ✅ **YES** | Google Secret Manager (`blog-writer-env-{env}`) |

---

## Error Message Confirms This

The current error message from the backend:
```
Content generation failed: Generated content is empty or too short (0 chars). 
DataForSEO API may not be configured correctly or subscription may be required.
```

This error comes from the **backend**, confirming that:
- ✅ Backend is trying to use DataForSEO
- ❌ Backend doesn't have credentials configured
- ✅ Backend needs credentials in Cloud Run environment variables

---

## Next Steps

1. **Add credentials to Google Secret Manager:**
   ```bash
   cd /Users/gene/Projects/api-blogwriting-python-gcr
   ./scripts/add-dataforseo-secrets.sh
   ```
   
   Or manually:
   ```bash
   # See GOOGLE_SECRETS_SETUP_V1.3.6.md for detailed instructions
   gcloud secrets versions add blog-writer-env-dev \
     --data-file=- \
     --project=api-ai-blog-writer
   ```

2. **Redeploy the service:**
   - Push to `develop` branch for dev (auto-deploys)
   - Secrets are automatically mounted at `/secrets/env` during deployment

3. **Verify secrets are loading:**
   ```bash
   # Check Cloud Run logs for:
   gcloud logging read "resource.type=cloud_run_revision AND \
     textPayload=~'DataForSEO'" \
     --limit 20
   ```
   
   Look for:
   - ✅ `✅ Environment variables loaded from secrets: X set`
   - ✅ `✅ DataForSEO Labs client initialized.`

4. **Test the endpoint:**
   ```bash
   curl -X POST https://blog-writer-api-dev-kq42l26tuq-od.a.run.app/api/v1/blog/generate-enhanced \
     -H "Content-Type: application/json" \
     -d '{
       "topic": "Introduction to Python",
       "keywords": ["python"],
       "blog_type": "tutorial",
       "length": "short"
     }'
   ```

5. **Expected result:**
   - HTTP 200 status
   - Content with > 50 characters
   - `total_tokens` > 0
   - `generation_time` > 1 second

---

**Last Updated:** 2025-11-24

