# Frontend Examples for Async Blog Generation

This directory contains production-ready frontend code examples for integrating with the async blog generation API.

## Files

### 1. `useAsyncBlogGeneration.ts` - React Hook
A complete React hook for async blog generation with:
- ✅ Job creation
- ✅ Automatic polling
- ✅ Progress tracking
- ✅ Error handling
- ✅ Cleanup on unmount

**Usage:**
```tsx
import { useAsyncBlogGeneration } from './useAsyncBlogGeneration';

function BlogGenerator() {
  const { createJob, status, progress, result, error } = useAsyncBlogGeneration();
  
  const handleGenerate = async () => {
    await createJob({
      topic: "Best Presents for Christmas 2025",
      keywords: ["christmas gifts"],
      use_google_search: true,
    });
  };
  
  return (
    <div>
      <button onClick={handleGenerate}>Generate</button>
      {status === 'processing' && <p>Progress: {progress}%</p>}
      {result && <div>{result.title}</div>}
    </div>
  );
}
```

### 2. `BlogGenerationProgress.tsx` - Progress UI Component
A complete React component for displaying blog generation progress:
- ✅ Progress bar
- ✅ Current stage indicator
- ✅ Estimated time remaining
- ✅ Error display
- ✅ Success state

**Usage:**
```tsx
import { BlogGenerationProgress } from './BlogGenerationProgress';

<BlogGenerationProgress
  status={status}
  progress={progress}
  currentStage={currentStage}
  estimatedTimeRemaining={estimatedTimeRemaining}
  error={error}
  result={result}
/>
```

### 3. `blogPollingUtility.ts` - Standalone Utility
A framework-agnostic TypeScript utility that works with:
- ✅ React
- ✅ Vue
- ✅ Angular
- ✅ Vanilla JavaScript
- ✅ Node.js

**Usage:**
```typescript
import { createBlogJob, pollBlogJob } from './blogPollingUtility';

// Create job
const { job_id } = await createBlogJob({
  topic: "Best Presents for Christmas 2025",
  keywords: ["christmas gifts"],
});

// Poll for result
const blog = await pollBlogJob(job_id, {
  onProgress: (status) => console.log(`${status.progress_percentage}%`),
});
```

## Quick Start

### For React Projects

1. Copy `useAsyncBlogGeneration.ts` to your project
2. Copy `BlogGenerationProgress.tsx` to your project
3. Use the hook in your component:

```tsx
import { useAsyncBlogGeneration } from './hooks/useAsyncBlogGeneration';
import { BlogGenerationProgress } from './components/BlogGenerationProgress';

function BlogGenerator() {
  const {
    createJob,
    status,
    progress,
    currentStage,
    estimatedTimeRemaining,
    error,
    result,
  } = useAsyncBlogGeneration();

  return (
    <div>
      <button onClick={() => createJob({ topic: "...", keywords: [...] })}>
        Generate Blog
      </button>
      
      <BlogGenerationProgress
        status={status}
        progress={progress}
        currentStage={currentStage}
        estimatedTimeRemaining={estimatedTimeRemaining}
        error={error}
        result={result}
      />
    </div>
  );
}
```

### For Non-React Projects

1. Copy `blogPollingUtility.ts` to your project
2. Use the utility functions:

```typescript
import { createBlogJob, pollBlogJob } from './utils/blogPollingUtility';

async function generateBlog() {
  try {
    // Create job
    const { job_id } = await createBlogJob({
      topic: "Best Presents for Christmas 2025",
      keywords: ["christmas gifts"],
      use_google_search: true,
    });

    // Poll for result
    const blog = await pollBlogJob(job_id, {
      onProgress: (status) => {
        console.log(`Progress: ${status.progress_percentage}%`);
        updateUI(status);
      },
    });

    console.log('Blog generated:', blog.title);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## Features

### ✅ Automatic Polling
- Polls every 5 seconds (configurable)
- Automatically stops when job completes or fails
- Handles timeouts (default: 5 minutes)

### ✅ Progress Tracking
- Real-time progress percentage (0-100)
- Current pipeline stage
- Estimated time remaining

### ✅ Error Handling
- Network errors
- Job failures
- Timeouts
- Abort support

### ✅ Cleanup
- Automatic cleanup on component unmount
- Abort support for cancellation
- Memory leak prevention

## Configuration

### Polling Options

```typescript
const { createJob } = useAsyncBlogGeneration({
  apiBaseUrl: 'https://your-api.run.app', // Optional
  pollInterval: 5000, // 5 seconds (default)
  maxWaitTime: 300000, // 5 minutes (default)
  autoPoll: true, // Auto-start polling (default)
  onProgress: (status) => console.log(status),
  onComplete: (result) => console.log(result),
  onError: (error) => console.error(error),
});
```

### Standalone Utility Options

```typescript
await pollBlogJob(jobId, {
  apiBaseUrl: 'https://your-api.run.app',
  pollInterval: 5000,
  maxWaitTime: 300000,
  onProgress: (status) => console.log(status),
  onError: (error) => console.error(error),
  abortSignal: abortController.signal, // For cancellation
});
```

## Examples

See the example code in each file for complete usage examples.

## TypeScript Types

All types are exported and can be imported:

```typescript
import type {
  BlogGenerationRequest,
  BlogGenerationResponse,
  JobStatus,
  UseAsyncBlogGenerationOptions,
  UseAsyncBlogGenerationReturn,
} from './useAsyncBlogGeneration';
```

## Support

For API documentation, see:
- `CLOUD_TASKS_FRONTEND_GUIDE.md` - Complete API guide
- `CLOUD_TASKS_IMPLEMENTATION_SUMMARY.md` - Implementation details

