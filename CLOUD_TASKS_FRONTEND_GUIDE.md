# Cloud Tasks Async Blog Generation - Frontend Integration Guide

**Version:** 1.3.0  
**Last Updated:** 2025-11-15  
**Status:** ✅ Implemented

## Overview

The blog generation API now supports **asynchronous processing** via Google Cloud Tasks. This enables:

- **Non-blocking requests**: Submit blog generation jobs without waiting 4 minutes
- **Better scalability**: Handle 10+ concurrent blog generations
- **Progress tracking**: Real-time status updates via polling
- **Automatic retries**: Cloud Tasks handles retries on failure

## Quick Start

### Synchronous Mode (Default)

```typescript
// Traditional synchronous call (waits 4 minutes)
const response = await fetch('/api/v1/blog/generate-enhanced', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic: "Best Presents for Christmas 2025 for Teenagers",
    keywords: ["christmas gifts for teenagers", "best presents for teens"],
    use_google_search: true,
    // ... other options
  })
});

const blog = await response.json();
// Use blog.content, blog.title, etc.
```

### Asynchronous Mode (Recommended for Production)

```typescript
// Step 1: Create async job
const createResponse = await fetch('/api/v1/blog/generate-enhanced?async_mode=true', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic: "Best Presents for Christmas 2025 for Teenagers",
    keywords: ["christmas gifts for teenagers", "best presents for teens"],
    use_google_search: true,
  })
});

const { job_id, status, estimated_completion_time } = await createResponse.json();

// Step 2: Poll for status
const pollInterval = 5000; // 5 seconds
const maxWaitTime = 300000; // 5 minutes

const pollJobStatus = async (jobId: string): Promise<any> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const statusResponse = await fetch(`/api/v1/blog/jobs/${jobId}`);
    const status = await statusResponse.json();
    
    if (status.status === 'completed') {
      return status.result; // Full blog generation response
    }
    
    if (status.status === 'failed') {
      throw new Error(status.error_message || 'Blog generation failed');
    }
    
    // Log progress
    console.log(`Progress: ${status.progress_percentage}% - ${status.current_stage}`);
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error('Job timeout');
};

// Step 3: Get result
const blog = await pollJobStatus(job_id);
```

## API Endpoints

### 1. Create Async Job

**Endpoint:** `POST /api/v1/blog/generate-enhanced?async_mode=true`

**Request Body:** Same as synchronous endpoint (`EnhancedBlogGenerationRequest`)

**Response:**
```typescript
interface CreateJobResponse {
  job_id: string;
  status: 'pending' | 'queued';
  message: string;
  estimated_completion_time: number; // seconds
}
```

**Example:**
```typescript
const response = await fetch('/api/v1/blog/generate-enhanced?async_mode=true', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic: "Best Presents for Christmas 2025 for Teenagers",
    keywords: ["christmas gifts for teenagers"],
    use_google_search: true,
  })
});

const { job_id, estimated_completion_time } = await response.json();
```

### 2. Get Job Status

**Endpoint:** `GET /api/v1/blog/jobs/{job_id}`

**Response:**
```typescript
interface JobStatusResponse {
  job_id: string;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  progress_percentage: number; // 0-100
  current_stage?: string; // e.g., "draft_generation", "seo_polish"
  created_at: string; // ISO 8601
  started_at?: string;
  completed_at?: string;
  result?: EnhancedBlogGenerationResponse; // Only if status === 'completed'
  error_message?: string; // Only if status === 'failed'
  estimated_time_remaining?: number; // seconds
}
```

**Example:**
```typescript
const response = await fetch(`/api/v1/blog/jobs/${jobId}`);
const status = await response.json();

if (status.status === 'completed') {
  const blog = status.result;
  console.log(blog.title, blog.content);
} else if (status.status === 'failed') {
  console.error(status.error_message);
} else {
  console.log(`Progress: ${status.progress_percentage}%`);
}
```

## Job Status Values

| Status | Description | Next Action |
|--------|-------------|-------------|
| `pending` | Job created, not yet queued | Wait for `queued` |
| `queued` | Job queued in Cloud Tasks | Poll for `processing` |
| `processing` | Blog generation in progress | Poll for `completed` or `failed` |
| `completed` | Blog generated successfully | Use `result` field |
| `failed` | Generation failed | Check `error_message` |

## Progress Tracking

The `JobStatusResponse` includes real-time progress updates:

```typescript
interface JobStatusResponse {
  progress_percentage: number; // 0-100
  current_stage?: string; // Current pipeline stage
  // ... other fields
}
```

**Pipeline Stages:**
- `initialization`
- `keyword_analysis`
- `competitor_analysis`
- `intent_analysis`
- `length_optimization`
- `research_outline`
- `draft_generation`
- `enhancement`
- `seo_polish`
- `semantic_integration`
- `quality_scoring`
- `finalization`

## Production-Ready Frontend Code

**✅ Complete implementation files available in `frontend-examples/` directory**

We've created production-ready code that you can copy directly into your frontend project:

- **`useAsyncBlogGeneration.ts`** - React hook with automatic polling
- **`BlogGenerationProgress.tsx`** - Progress UI component
- **`blogPollingUtility.ts`** - Framework-agnostic utility (works with React, Vue, Angular, vanilla JS)
- **`README.md`** - Complete documentation and examples

**See the `frontend-examples/` directory for all files.**

## React Hook Example

**✅ Production-ready code available in `frontend-examples/useAsyncBlogGeneration.ts`**

A complete React hook with automatic polling, progress tracking, error handling, and cleanup:

```typescript
import { useAsyncBlogGeneration } from './frontend-examples/useAsyncBlogGeneration';
import { BlogGenerationProgress } from './frontend-examples/BlogGenerationProgress';

function BlogGenerator() {
  const {
    jobId,
    status,
    progress,
    currentStage,
    estimatedTimeRemaining,
    result,
    error,
    createJob,
  } = useAsyncBlogGeneration({
    onProgress: (status) => console.log(`${status.progress_percentage}%`),
    onComplete: (result) => console.log('Completed:', result.title),
    onError: (error) => console.error('Error:', error),
  });

  const handleGenerate = async () => {
    await createJob({
      topic: "Best Presents for Christmas 2025 for Teenagers",
      keywords: ["christmas gifts for teenagers"],
      use_google_search: true,
    });
  };

  return (
    <div>
      {!jobId && (
        <button onClick={handleGenerate}>Generate Blog</button>
      )}
      
      {jobId && (
        <BlogGenerationProgress
          status={status}
          progress={progress}
          currentStage={currentStage}
          estimatedTimeRemaining={estimatedTimeRemaining}
          error={error}
          result={result}
        />
      )}
    </div>
  );
}
```

**See `frontend-examples/` directory for complete implementation.**

## Error Handling

```typescript
try {
  const response = await fetch('/api/v1/blog/generate-enhanced?async_mode=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create job');
  }
  
  const { job_id } = await response.json();
  
  // Poll for status...
  
} catch (error) {
  console.error('Blog generation error:', error);
  // Handle error (show toast, retry, etc.)
}
```

## Best Practices

### 1. Polling Interval

- **Recommended:** 5 seconds (5000ms)
- **Minimum:** 2 seconds (to avoid rate limiting)
- **Maximum:** 10 seconds (for better UX)

### 2. Timeout Handling

```typescript
const MAX_WAIT_TIME = 300000; // 5 minutes
const startTime = Date.now();

while (Date.now() - startTime < MAX_WAIT_TIME) {
  // Poll status...
}

throw new Error('Job timeout');
```

### 3. Progress Display

```typescript
// Show progress bar
<progress value={progress} max={100} />

// Show current stage
<p>Current stage: {current_stage}</p>

// Show estimated time
{estimated_time_remaining && (
  <p>Estimated time remaining: {estimated_time_remaining}s</p>
)}
```

### 4. Retry Logic

```typescript
const pollWithRetry = async (jobId: string, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`/api/v1/blog/jobs/${jobId}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

## Migration from Synchronous

### Before (Synchronous)

```typescript
// ❌ Blocks for 4 minutes
const response = await fetch('/api/v1/blog/generate-enhanced', {
  method: 'POST',
  body: JSON.stringify(request),
});
const blog = await response.json();
```

### After (Asynchronous)

```typescript
// ✅ Returns immediately
const { job_id } = await fetch('/api/v1/blog/generate-enhanced?async_mode=true', {
  method: 'POST',
  body: JSON.stringify(request),
}).then(r => r.json());

// Poll for result
const blog = await pollJobStatus(job_id);
```

## Environment Variables

No frontend environment variables needed. The API handles Cloud Tasks configuration internally.

## Limitations

1. **Job Storage**: Currently in-memory (jobs lost on service restart)
   - **Future:** Will migrate to Supabase/database for persistence

2. **Job Retention**: Jobs are kept in memory indefinitely
   - **Future:** Will implement automatic cleanup (e.g., 24 hours)

3. **Concurrent Jobs**: Limited by Cloud Tasks queue capacity (500 concurrent)
   - **Current:** Sufficient for 10 blogs at a time

## Troubleshooting

### Job Not Found (404)

- **Cause:** Job ID invalid or service restarted (in-memory storage)
- **Solution:** Recreate the job

### Job Stuck in "queued" Status

- **Cause:** Cloud Tasks queue may be full or service unavailable
- **Solution:** Wait a few minutes, then check again. If persists, check Cloud Run logs

### Job Failed

- **Cause:** Blog generation error (same as synchronous mode)
- **Solution:** Check `error_message` field for details

## Support

For issues or questions:
1. Check Cloud Run logs: `gcloud run services logs read blog-writer-api-dev --region europe-west1`
2. Check job status: `GET /api/v1/blog/jobs/{job_id}`
3. Review error message in failed job response

## Files for Frontend Team

**See `FRONTEND_TEAM_FILES.md` for a complete list of files to copy to your frontend project.**

### Quick File List:
- ✅ `frontend-examples/useAsyncBlogGeneration.ts` - React hook
- ✅ `frontend-examples/BlogGenerationProgress.tsx` - Progress UI component
- ✅ `frontend-examples/blogPollingUtility.ts` - Framework-agnostic utility
- ✅ `frontend-examples/README.md` - Quick start guide
- ✅ `CLOUD_TASKS_FRONTEND_GUIDE.md` - This file (complete API reference)

## Changelog

### Version 1.3.0 (2025-11-15)
- ✅ Added async blog generation via Cloud Tasks
- ✅ Added job status endpoint
- ✅ Added progress tracking
- ✅ Added worker endpoint for Cloud Tasks
- ✅ Added production-ready frontend code examples

