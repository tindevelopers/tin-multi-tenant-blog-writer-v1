# Image Generation Response Structure Guide

**Date:** 2025-11-27  
**Issue:** Frontend needs clarification on image URL extraction from job status response

---

## ✅ Correct Response Structure

### Job Status Response (`GET /api/v1/images/jobs/{job_id}`)

When the job is **completed**, the response structure is:

```json
{
  "job_id": "abc123-def456",
  "status": "completed",
  "progress_percentage": 100.0,
  "current_stage": "processing_result",
  "created_at": "2025-11-27T14:00:00Z",
  "started_at": "2025-11-27T14:00:01Z",
  "completed_at": "2025-11-27T14:00:06Z",
  "result": {
    "success": true,
    "images": [
      {
        "image_id": "img-123",
        "image_url": "https://cdn.example.com/image.png",
        "width": 1024,
        "height": 1024,
        "format": "png",
        "size_bytes": 245760,
        "seed": 12345,
        "steps": 50,
        "guidance_scale": 7.5,
        "created_at": "2025-11-27T14:00:06Z",
        "provider": "stability_ai",
        "model": "stable-diffusion-xl-turbo",
        "quality_score": 0.95,
        "safety_score": 0.98
      }
    ],
    "generation_time_seconds": 5.2,
    "provider": "stability_ai",
    "model": "stable-diffusion-xl-turbo",
    "cost": 0.002,
    "request_id": "req-123",
    "prompt_used": "A beautiful sunset over mountains"
  },
  "error_message": null,
  "estimated_time_remaining": null,
  "is_draft": false,
  "final_job_id": null
}
```

---

## 🔍 Image URL Extraction

### Correct Way ✅

```typescript
// Get job status
const response = await fetch(`/api/v1/images/jobs/${jobId}`);
const data = await response.json();

// Extract image URL
if (data.status === 'completed' && data.result?.images?.[0]) {
  const imageUrl = data.result.images[0].image_url;  // ✅ Correct
  console.log('Image URL:', imageUrl);
}
```

### Common Mistakes ❌

```typescript
// ❌ WRONG - Field name is 'image_url', not 'url'
const imageUrl = data.result.images[0].url;

// ❌ WRONG - Missing null check
const imageUrl = data.result.images[0].image_url;  // Could crash if images is empty

// ❌ WRONG - Wrong path
const imageUrl = data.images[0].image_url;  // Should be data.result.images[0].image_url
```

---

## 📋 Complete Frontend Example

```typescript
interface ImageJobStatus {
  job_id: string;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  progress_percentage: number;
  current_stage?: string;
  result?: {
    success: boolean;
    images: Array<{
      image_id: string;
      image_url: string;  // ✅ This is the correct field name
      width: number;
      height: number;
      format: string;
      // ... other fields
    }>;
    generation_time_seconds: number;
    provider: string;
    model?: string;
    cost?: number;
  };
  error_message?: string;
  estimated_time_remaining?: number;
  is_draft: boolean;
}

async function getImageUrl(jobId: string): Promise<string | null> {
  const response = await fetch(`/api/v1/images/jobs/${jobId}`);
  const data: ImageJobStatus = await response.json();

  // Check if completed and has images
  if (data.status === 'completed' && data.result?.images?.length > 0) {
    // ✅ Correct: Use image_url field
    return data.result.images[0].image_url;
  }

  return null;
}

// Usage
const imageUrl = await getImageUrl('abc123-def456');
if (imageUrl) {
  console.log('Image URL:', imageUrl);
  // Use imageUrl in <img src={imageUrl} />
}
```

---

## 🔄 Response Structure During Different Stages

### 1. Queued Status
```json
{
  "job_id": "abc123",
  "status": "queued",
  "progress_percentage": 0.0,
  "result": null,  // ✅ No result yet
  ...
}
```

### 2. Processing Status
```json
{
  "job_id": "abc123",
  "status": "processing",
  "progress_percentage": 45.0,
  "current_stage": "generating",
  "result": null,  // ✅ No result yet
  ...
}
```

### 3. Completed Status
```json
{
  "job_id": "abc123",
  "status": "completed",
  "progress_percentage": 100.0,
  "result": {
    "success": true,
    "images": [
      {
        "image_url": "https://...",  // ✅ Available here
        ...
      }
    ],
    ...
  },
  ...
}
```

### 4. Failed Status
```json
{
  "job_id": "abc123",
  "status": "failed",
  "progress_percentage": 0.0,
  "result": null,
  "error_message": "Generation failed: ...",  // ✅ Check error_message
  ...
}
```

---

## 🧪 Testing Image URL Extraction

### Test Script

```typescript
async function testImageUrlExtraction() {
  // 1. Generate image
  const generateResponse = await fetch('/api/v1/images/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'A sunset' })
  });
  const { job_id } = await generateResponse.json();

  // 2. Poll for completion
  let imageUrl = null;
  let attempts = 0;
  const maxAttempts = 60;

  while (attempts < maxAttempts && !imageUrl) {
    const statusResponse = await fetch(`/api/v1/images/jobs/${job_id}`);
    const status = await statusResponse.json();

    if (status.status === 'completed' && status.result?.images?.[0]) {
      // ✅ Correct extraction
      imageUrl = status.result.images[0].image_url;
      break;
    }

    if (status.status === 'failed') {
      throw new Error(status.error_message || 'Image generation failed');
    }

    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    attempts++;
  }

  if (!imageUrl) {
    throw new Error('Timeout waiting for image generation');
  }

  console.log('✅ Image URL extracted:', imageUrl);
  return imageUrl;
}
```

---

## 📝 Key Points

1. **Field Name:** Use `image_url` (not `url`)
2. **Path:** `result.images[0].image_url` (not `images[0].image_url`)
3. **Null Checks:** Always check `status === 'completed'` and `result?.images?.length > 0`
4. **Multiple Images:** If multiple images are generated, access them via `result.images[index]`

---

## 🔗 Related Documentation

- [Frontend Testing Guide](./FRONTEND_TESTING_GUIDE.md)
- [Image Generation Queue Guide](./IMAGE_GENERATION_QUEUE_FRONTEND_GUIDE.md)
- [API Documentation](https://blog-writer-api-dev-kq42l26tuq-od.a.run.app/docs)

---

## ✅ Summary

**Correct Image URL Extraction:**
```typescript
const imageUrl = data.result?.images?.[0]?.image_url;
```

**Always check:**
- ✅ `status === 'completed'`
- ✅ `result?.images?.length > 0`
- ✅ Use `image_url` field (not `url`)

