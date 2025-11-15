# Quick Start Guide - Async Blog Generation

**Get started in 5 minutes!**

## For React Projects

### 1. Copy Files
```bash
cp useAsyncBlogGeneration.ts src/hooks/
cp BlogGenerationProgress.tsx src/components/
```

### 2. Use in Component
```tsx
import { useAsyncBlogGeneration } from '@/hooks/useAsyncBlogGeneration';
import { BlogGenerationProgress } from '@/components/BlogGenerationProgress';

export default function BlogGenerator() {
  const { createJob, status, progress, result, error } = useAsyncBlogGeneration();

  return (
    <div>
      <button onClick={() => createJob({
        topic: "Best Presents for Christmas 2025",
        keywords: ["christmas gifts"],
        use_google_search: true,
      })}>
        Generate Blog
      </button>
      
      <BlogGenerationProgress
        status={status}
        progress={progress}
        result={result}
        error={error}
      />
    </div>
  );
}
```

### 3. Set API URL
```bash
# .env.local
NEXT_PUBLIC_API_URL=https://your-api.run.app
```

**Done!** 🎉

## For Non-React Projects

### 1. Copy File
```bash
cp blogPollingUtility.ts src/utils/
```

### 2. Use in Code
```typescript
import { createBlogJob, pollBlogJob } from '@/utils/blogPollingUtility';

async function generateBlog() {
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
}
```

**Done!** 🎉

## Need More Help?

- See `README.md` for detailed documentation
- See `CLOUD_TASKS_FRONTEND_GUIDE.md` for complete API reference

