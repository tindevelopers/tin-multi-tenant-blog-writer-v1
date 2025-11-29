# Frontend Testing Guide - Queue & SSE Streaming Implementation

This guide provides step-by-step instructions to test the new queue-based processing and SSE streaming endpoints.

## 🎯 Quick Test Checklist

- [ ] Health check endpoint responds
- [ ] Blog generation endpoint returns job_id (async by default)
- [ ] Blog SSE streaming endpoint works
- [ ] Image generation endpoint returns job_id (always async)
- [ ] Image SSE streaming endpoint works
- [ ] Job status polling works
- [ ] Backward compatibility (sync mode still available)

## 📍 Deployment Information

**Service:** `blog-writer-api-dev`  
**Region:** `europe-west9`  
**Project:** `api-ai-blog-writer`  
**Service URL:** `https://blog-writer-api-dev-kq42l26tuq-od.a.run.app`  
**Latest Revision:** `blog-writer-api-dev-00229-5ss`  
**Status:** ✅ Ready (as of 2025-11-27)

### Get Service URL

```bash
# Get the deployed service URL
gcloud run services describe blog-writer-api-dev \
  --region=europe-west9 \
  --project=api-ai-blog-writer \
  --format="value(status.url)"
```

**Current Service URL:** `https://blog-writer-api-dev-kq42l26tuq-od.a.run.app`

**Cloud Run Console:**
https://console.cloud.google.com/run/detail/europe-west9/blog-writer-api-dev?project=api-ai-blog-writer

**Health Check:** ✅ Service is healthy and responding

---

## 🧪 Test 1: Health Check

**Purpose:** Verify the service is deployed and running

```bash
# Current deployed service URL
SERVICE_URL="https://blog-writer-api-dev-kq42l26tuq-od.a.run.app"

curl -X GET "${SERVICE_URL}/health"
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 🧪 Test 2: Blog Generation (Async by Default)

**Purpose:** Verify blog generation now returns job_id and uses queue

**Endpoint:** `POST /api/v1/blog/generate-enhanced`

```bash
curl -X POST "${SERVICE_URL}/api/v1/blog/generate-enhanced" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Python programming benefits",
    "target_length": 1000,
    "tone": "professional"
  }'
```

**Expected Response (Async Mode - Default):**
```json
{
  "job_id": "abc123-def456-ghi789",
  "status": "queued",
  "message": "Blog generation job queued successfully",
  "estimated_completion_time": 120
}
```

**Verify Sync Mode Still Works:**
```bash
curl -X POST "${SERVICE_URL}/api/v1/blog/generate-enhanced?async_mode=false" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Python programming benefits",
    "target_length": 100
  }'
```

**Expected Response (Sync Mode):**
```json
{
  "blog_id": "blog-123",
    "title": "...",
    "content": "...",
  "status": "completed"
}
```

---

## 🧪 Test 3: Blog SSE Streaming ⭐ NEW

**Purpose:** Test real-time progress updates via Server-Sent Events

**Endpoint:** `POST /api/v1/blog/generate-enhanced/stream`

### Using curl (Terminal)

```bash
curl -N -X POST "${SERVICE_URL}/api/v1/blog/generate-enhanced/stream" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Python programming benefits",
    "target_length": 500,
    "tone": "professional"
  }'
```

**Expected SSE Stream:**
```
data: {"stage":"initialization","progress":0,"message":"Starting blog generation","job_id":"abc123"}

data: {"stage":"keyword_analysis","progress":10,"message":"Analyzing keywords"}

data: {"stage":"draft_generation","progress":50,"message":"Generating draft content"}

data: {"stage":"completed","progress":100,"message":"Blog generation complete","result":{"blog_id":"blog-123"}}
```

### Using JavaScript (Browser Console)

```javascript
const SERVICE_URL = 'https://blog-writer-api-dev-kq42l26tuq-od.a.run.app';

const eventSource = new EventSource(
  `${SERVICE_URL}/api/v1/blog/generate-enhanced/stream?` +
  `topic=Python%20programming&target_length=500`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }
);

// Note: EventSource only supports GET. For POST, use fetch with ReadableStream:
async function testBlogStreaming() {
  const response = await fetch(`${SERVICE_URL}/api/v1/blog/generate-enhanced/stream`, {
  method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
      topic: 'Python programming benefits',
      target_length: 500,
      tone: 'professional'
  })
});

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        console.log('Stage:', data.stage, 'Progress:', data.progress + '%');
      }
    }
  }
}

testBlogStreaming();
```

---

## 🧪 Test 4: Image Generation (Always Async)

**Purpose:** Verify image generation always returns job_id

**Endpoint:** `POST /api/v1/images/generate`

```bash
curl -X POST "${SERVICE_URL}/api/v1/images/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful sunset over mountains",
    "style": "photographic",
    "aspect_ratio": "16:9"
  }'
```

**Expected Response:**
```json
{
  "job_id": "img-abc123-def456",
  "status": "queued",
  "message": "Image generation job queued successfully",
  "estimated_completion_time": 30,
  "is_draft": false
}
```

**Note:** To extract the image URL from completed jobs, use:
```typescript
// Correct image URL extraction
const imageUrl = data.result?.images?.[0]?.image_url;  // ✅ Use 'image_url' field
```

See [IMAGE_RESPONSE_STRUCTURE.md](./IMAGE_RESPONSE_STRUCTURE.md) for complete response structure details.

---

## 🧪 Test 5: Image SSE Streaming ⭐ NEW

**Purpose:** Test real-time image generation progress

**Endpoint:** `POST /api/v1/images/generate/stream`

### Using curl (Terminal)

```bash
curl -N -X POST "${SERVICE_URL}/api/v1/images/generate/stream" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful sunset over mountains",
    "style": "photographic",
    "aspect_ratio": "16:9"
  }'
```

**Expected SSE Stream:**
```
data: {"stage":"queued","progress":0,"message":"Image generation queued","job_id":"img-abc123"}

data: {"stage":"processing","progress":20,"message":"Starting image generation"}

data: {"stage":"generating","progress":60,"message":"AI generating image"}

data: {"stage":"uploading","progress":90,"message":"Uploading to storage"}

data: {"stage":"completed","progress":100,"message":"Image ready","result":{"images":[{"image_url":"https://..."}]}}
```

### Using JavaScript (Browser Console)

```javascript
async function testImageStreaming() {
  const response = await fetch(`${SERVICE_URL}/api/v1/images/generate/stream`, {
      method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'A beautiful sunset over mountains',
      style: 'photographic',
      aspect_ratio: '16:9'
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        console.log('Stage:', data.stage, 'Progress:', data.progress + '%');
        
        if (data.stage === 'completed' && data.result?.images) {
          console.log('Image URL:', data.result.images[0].image_url);
        }
      }
    }
  }
}

testImageStreaming();
```

---

## 🧪 Test 6: Job Status Polling

**Purpose:** Verify job status endpoint works (alternative to SSE)

**Endpoint:** `GET /api/v1/images/jobs/{job_id}`

```bash
# First, generate an image to get a job_id
JOB_ID=$(curl -X POST "${SERVICE_URL}/api/v1/images/generate" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test image"}' \
  | jq -r '.job_id')

echo "Job ID: $JOB_ID"

# Poll the job status
curl -X GET "${SERVICE_URL}/api/v1/images/jobs/${JOB_ID}"
```

**Expected Response (Processing):**
```json
{
  "job_id": "img-abc123",
  "status": "processing",
  "progress_percentage": 45,
  "current_stage": "generating",
  "estimated_time_remaining": 15,
  "is_draft": false,
  "result": null
}
```

**Expected Response (Completed):**
```json
{
  "job_id": "img-abc123",
  "status": "completed",
  "progress_percentage": 100,
  "current_stage": "processing_result",
  "result": {
    "success": true,
    "images": [
      {
        "image_id": "img-123",
        "image_url": "https://cdn.example.com/image.png",  // ✅ Use 'image_url' field
        "width": 1024,
        "height": 1024,
        "format": "png"
      }
    ],
    "generation_time_seconds": 5.2,
    "provider": "stability_ai"
  },
  "is_draft": false
}
```

**Image URL Extraction:**
```typescript
// ✅ Correct way
const imageUrl = data.result?.images?.[0]?.image_url;

// ❌ Wrong - field name is 'image_url', not 'url'
const imageUrl = data.result.images[0].url;
```

**Poll until completed:**
```bash
while true; do
  STATUS=$(curl -s "${SERVICE_URL}/api/v1/images/jobs/${JOB_ID}" | jq -r '.status')
  echo "Status: $STATUS"
  
  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    curl -s "${SERVICE_URL}/api/v1/images/jobs/${JOB_ID}" | jq '.'
    break
  fi
  
  sleep 5
done
```

---

## 🧪 Test 7: Blog Job Status

**Purpose:** Verify blog job status endpoint

**Endpoint:** `GET /api/v1/blog/jobs/{job_id}`

```bash
# First, generate a blog to get a job_id
JOB_ID=$(curl -X POST "${SERVICE_URL}/api/v1/blog/generate-enhanced" \
  -H "Content-Type: application/json" \
  -d '{"topic": "Test topic", "target_length": 200}' \
  | jq -r '.job_id')

echo "Blog Job ID: $JOB_ID"

# Check status
curl -X GET "${SERVICE_URL}/api/v1/blog/jobs/${JOB_ID}"
```

---

## 🧪 Test 8: API Documentation

**Purpose:** Verify new endpoints are documented

```bash
# Open in browser
open "${SERVICE_URL}/docs"

# Or check via curl
curl -s "${SERVICE_URL}/openapi.json" | jq '.paths | keys' | grep -E "(stream|generate)"
```

**Expected:** Should see:
- `/api/v1/blog/generate-enhanced/stream`
- `/api/v1/images/generate/stream`

---

## 🧪 Test 9: React Component Integration

**Purpose:** Test the React hook from the frontend guide

Create a test file `test-image-streaming.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useImageGenerationStream } from '@/hooks/useImageGenerationStream';

export default function TestImageStreaming() {
  const [prompt, setPrompt] = useState('');
  const { generate, stage, progress, imageUrl, error, isLoading } = useImageGenerationStream();

  const handleGenerate = async () => {
    await generate({
      prompt,
      style: 'photographic',
      aspect_ratio: '16:9'
    });
  };

  return (
    <div className="p-8">
      <h1>Image Generation Test</h1>
      
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter image prompt"
        className="border p-2 w-full mb-4"
      />
      
      <button
        onClick={handleGenerate}
        disabled={isLoading}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        {isLoading ? 'Generating...' : 'Generate Image'}
      </button>

      {stage && (
        <div className="mt-4">
          <p>Stage: {stage}</p>
          <p>Progress: {progress}%</p>
        </div>
      )}

      {error && (
        <div className="mt-4 text-red-500">
          Error: {error}
        </div>
      )}

      {imageUrl && (
        <div className="mt-4">
          <img src={imageUrl} alt="Generated" className="max-w-full" />
        </div>
      )}
    </div>
  );
}
```

---

## 🔍 Deployment Status Check

### Check Cloud Run Service Status

```bash
gcloud run services describe blog-writer-api-dev \
  --region=europe-west9 \
  --project=api-ai-blog-writer \
  --format="table(status.conditions.type,status.conditions.status,status.conditions.message)"
```

### Check Latest Build Status

```bash
gcloud builds list \
  --project=api-ai-blog-writer \
  --limit=1 \
  --format="table(id,status,createTime,source.repoSource.branchName,source.repoSource.commitSha)"
```

### Check Service Logs

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=blog-writer-api-dev" \
  --project=api-ai-blog-writer \
  --limit=50 \
  --format="table(timestamp,severity,textPayload)"
```

### Verify Latest Revision

```bash
gcloud run revisions list \
  --service=blog-writer-api-dev \
  --region=europe-west9 \
  --project=api-ai-blog-writer \
  --limit=1 \
  --format="table(name,status.conditions.type,status.conditions.status,metadata.creationTimestamp)"
```

---

## ✅ Success Criteria

All tests should pass:

1. ✅ Health check returns 200 OK
2. ✅ Blog generation returns `job_id` (async by default)
3. ✅ Blog SSE stream emits stage updates
4. ✅ Image generation returns `job_id` (always async)
5. ✅ Image SSE stream emits stage updates
6. ✅ Job status polling works for both blog and image
7. ✅ Sync mode still works for blog generation (`async_mode=false`)
8. ✅ API docs show new streaming endpoints
9. ✅ No errors in Cloud Run logs

---

## 🐛 Troubleshooting

### SSE Stream Not Working

**Issue:** No data received from SSE endpoint

**Solutions:**
1. Check CORS headers are set correctly
2. Verify `Accept: text/event-stream` header
3. Check browser console for errors
4. Test with curl first to isolate frontend issues

### Job Status Returns 404

**Issue:** `GET /api/v1/images/jobs/{job_id}` returns 404

**Solutions:**
1. Verify job_id is correct (check from initial response)
2. Check job exists: `gcloud tasks list --queue=image-generation-queue`
3. Verify job hasn't expired (default TTL: 1 hour)

### Build Failed

**Issue:** Cloud Build shows failure

**Solutions:**
1. Check build logs: `gcloud builds log <BUILD_ID>`
2. Verify Dockerfile builds locally
3. Check Cloud Build trigger configuration
4. Verify secrets exist: `gcloud secrets list`

---

## 📚 Additional Resources

- [Frontend Integration Guide](./IMAGE_GENERATION_QUEUE_FRONTEND_GUIDE.md)
- [API Documentation](https://your-service-url/docs)
- [Cloud Run Console](https://console.cloud.google.com/run?project=api-ai-blog-writer)

---

## 🚀 Quick Test Script

Save this as `test-all-endpoints.sh`:

```bash
#!/bin/bash

SERVICE_URL="${1:-https://blog-writer-api-dev-kq42l26tuq-od.a.run.app}"

echo "🧪 Testing ${SERVICE_URL}"

echo ""
echo "1. Health Check..."
curl -s "${SERVICE_URL}/health" | jq '.'

echo ""
echo "2. Blog Generation (Async)..."
BLOG_JOB=$(curl -s -X POST "${SERVICE_URL}/api/v1/blog/generate-enhanced" \
  -H "Content-Type: application/json" \
  -d '{"topic": "Test", "target_length": 100}')
echo "$BLOG_JOB" | jq '.'
BLOG_JOB_ID=$(echo "$BLOG_JOB" | jq -r '.job_id // empty')

echo ""
echo "3. Image Generation (Async)..."
IMG_JOB=$(curl -s -X POST "${SERVICE_URL}/api/v1/images/generate" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test image"}')
echo "$IMG_JOB" | jq '.'
IMG_JOB_ID=$(echo "$IMG_JOB" | jq -r '.job_id // empty')

if [ -n "$BLOG_JOB_ID" ]; then
  echo ""
  echo "4. Blog Job Status..."
  curl -s "${SERVICE_URL}/api/v1/blog/jobs/${BLOG_JOB_ID}" | jq '.'
fi

if [ -n "$IMG_JOB_ID" ]; then
  echo ""
  echo "5. Image Job Status..."
  curl -s "${SERVICE_URL}/api/v1/images/jobs/${IMG_JOB_ID}" | jq '.'
fi

echo ""
echo "✅ Tests complete!"
```

Make it executable and run:
```bash
chmod +x test-all-endpoints.sh
./test-all-endpoints.sh https://your-service-url.run.app
```
