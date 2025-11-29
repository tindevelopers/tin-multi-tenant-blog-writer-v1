# Frontend Smart Polling Guide - Stage Completion Tracking

**Date:** 2025-01-XX  
**Status:** ✅ Ready for Implementation

---

## 🎯 Overview

Smart polling allows the frontend to track blog generation progress and detect when individual stages complete, without the cost overhead of SSE streaming.

**Key Benefits:**
- ✅ Track stage completion in real-time
- ✅ Low cost (~$6/month vs $286/month for SSE)
- ✅ Simple implementation
- ✅ Adaptive polling frequency
- ✅ Stage completion notifications

---

## 📊 How It Works

### Progress Updates Structure

Each progress update contains:

```typescript
interface ProgressUpdate {
  stage: string;                    // Stage identifier (e.g., "keyword_analysis")
  stage_number: number;             // Stage number (1-based)
  total_stages: number;             // Total stages (e.g., 12)
  progress_percentage: number;      // Overall progress (0-100)
  status: string;                   // Status message (includes "complete" when done)
  details?: string;                 // Detailed information
  metadata: Record<string, any>;    // Additional metadata
  timestamp: number;                // Unix timestamp
}
```

### Stage Completion Detection

Stages emit **two updates**:
1. **Start update**: When stage begins (e.g., "Analyzing keywords...")
2. **Complete update**: When stage finishes (e.g., "Keyword analysis complete")

**Detection method:**
- Compare `progress_updates` between polls
- Look for new updates with `status.includes('complete')` or `status.includes('Complete')`
- Track which stages have been completed

---

## 🚀 Implementation

### Step 1: Create Async Job

```typescript
async function createBlogJob(request: BlogGenerationRequest): Promise<string> {
  const response = await fetch('/api/v1/blog/generate-enhanced?async_mode=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  
  const { job_id } = await response.json();
  return job_id;
}
```

### Step 2: Smart Polling with Stage Tracking

```typescript
interface JobStatus {
  job_id: string;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  progress_percentage: number;
  current_stage?: string;
  progress_updates: ProgressUpdate[];  // All progress updates
  result?: BlogGenerationResponse;
  error_message?: string;
  estimated_time_remaining?: number;
}

interface ProgressUpdate {
  stage: string;
  stage_number: number;
  total_stages: number;
  progress_percentage: number;
  status: string;
  details?: string;
  metadata: Record<string, any>;
  timestamp: number;
}

class BlogGenerationTracker {
  private jobId: string;
  private lastUpdateCount: number = 0;
  private completedStages: Set<string> = new Set();
  private pollInterval: number = 2000; // Start with 2 seconds
  private pollTimer?: NodeJS.Timeout;
  
  constructor(jobId: string) {
    this.jobId = jobId;
  }
  
  /**
   * Start polling with adaptive frequency
   */
  startPolling(
    onProgress: (update: ProgressUpdate) => void,
    onStageComplete: (stage: string, update: ProgressUpdate) => void,
    onComplete: (result: BlogGenerationResponse) => void,
    onError: (error: string) => void
  ): void {
    this.poll(onProgress, onStageComplete, onComplete, onError);
  }
  
  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = undefined;
    }
  }
  
  /**
   * Adaptive polling based on job status
   */
  private getPollInterval(status: string): number {
    switch (status) {
      case 'processing':
        return 2000;  // Fast polling during processing (2s)
      case 'queued':
        return 5000;  // Medium polling when queued (5s)
      case 'pending':
        return 10000; // Slow polling when pending (10s)
      default:
        return 5000;
    }
  }
  
  /**
   * Poll job status and detect stage completions
   */
  private async poll(
    onProgress: (update: ProgressUpdate) => void,
    onStageComplete: (stage: string, update: ProgressUpdate) => void,
    onComplete: (result: BlogGenerationResponse) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const response = await fetch(`/api/v1/blog/jobs/${this.jobId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const jobStatus: JobStatus = await response.json();
      
      // Update polling frequency based on status
      this.pollInterval = this.getPollInterval(jobStatus.status);
      
      // Detect new progress updates
      if (jobStatus.progress_updates.length > this.lastUpdateCount) {
        const newUpdates = jobStatus.progress_updates.slice(this.lastUpdateCount);
        
        for (const update of newUpdates) {
          // Call progress callback for all updates
          onProgress(update);
          
          // Detect stage completion
          const isComplete = 
            update.status.toLowerCase().includes('complete') ||
            update.status.toLowerCase().includes('finished') ||
            update.status.toLowerCase().includes('done');
          
          if (isComplete && !this.completedStages.has(update.stage)) {
            this.completedStages.add(update.stage);
            onStageComplete(update.stage, update);
          }
        }
        
        this.lastUpdateCount = jobStatus.progress_updates.length;
      }
      
      // Handle job completion
      if (jobStatus.status === 'completed') {
        this.stopPolling();
        if (jobStatus.result) {
          onComplete(jobStatus.result);
        }
        return;
      }
      
      // Handle job failure
      if (jobStatus.status === 'failed') {
        this.stopPolling();
        onError(jobStatus.error_message || 'Job failed');
        return;
      }
      
      // Continue polling
      this.pollTimer = setTimeout(
        () => this.poll(onProgress, onStageComplete, onComplete, onError),
        this.pollInterval
      );
      
    } catch (error) {
      console.error('Polling error:', error);
      // Retry with exponential backoff
      this.pollTimer = setTimeout(
        () => this.poll(onProgress, onStageComplete, onComplete, onError),
        this.pollInterval * 2
      );
    }
  }
}
```

### Step 3: Usage Example

```typescript
// Create job
const jobId = await createBlogJob({
  topic: 'Best Notary Services in California',
  keywords: ['notary services california'],
  tone: 'professional',
  length: 'medium',
  use_google_search: true
});

// Track progress
const tracker = new BlogGenerationTracker(jobId);

tracker.startPolling(
  // Progress callback - called for every update
  (update) => {
    console.log(`Progress: ${update.progress_percentage}%`);
    console.log(`Stage ${update.stage_number}/${update.total_stages}: ${update.status}`);
    
    // Update UI progress bar
    updateProgressBar(update.progress_percentage);
    updateStatusText(update.status);
  },
  
  // Stage complete callback - called when a stage finishes
  (stage, update) => {
    console.log(`✅ Stage completed: ${stage}`);
    console.log(`Details: ${update.details}`);
    
    // Show stage completion notification
    showStageCompleteNotification(stage, update);
    
    // Update stage checklist
    markStageComplete(stage);
  },
  
  // Complete callback - called when job finishes
  (result) => {
    console.log('✅ Blog generation complete!');
    console.log(`Title: ${result.title}`);
    console.log(`Word count: ${result.content.split(' ').length}`);
    
    // Display blog content
    displayBlog(result);
  },
  
  // Error callback
  (error) => {
    console.error('❌ Blog generation failed:', error);
    showError(error);
  }
);

// Stop polling if needed (e.g., user navigates away)
// tracker.stopPolling();
```

---

## 📋 Stage Completion Detection

### Method 1: Status Text Detection (Recommended)

```typescript
function isStageComplete(update: ProgressUpdate): boolean {
  const status = update.status.toLowerCase();
  return (
    status.includes('complete') ||
    status.includes('finished') ||
    status.includes('done') ||
    status.includes('completed')
  );
}
```

### Method 2: Stage Number Tracking

```typescript
class StageTracker {
  private completedStages: Set<number> = new Set();
  
  checkStageComplete(update: ProgressUpdate): boolean {
    // If we see a new stage_number, previous stage is complete
    if (!this.completedStages.has(update.stage_number - 1)) {
      if (update.stage_number > 1) {
        this.completedStages.add(update.stage_number - 1);
        return true; // Previous stage completed
      }
    }
    return false;
  }
}
```

### Method 3: Timestamp Comparison

```typescript
function detectNewCompletions(
  previousUpdates: ProgressUpdate[],
  currentUpdates: ProgressUpdate[]
): ProgressUpdate[] {
  const previousTimestamps = new Set(
    previousUpdates.map(u => u.timestamp)
  );
  
  return currentUpdates.filter(update => {
    const isNew = !previousTimestamps.has(update.timestamp);
    const isComplete = isStageComplete(update);
    return isNew && isComplete;
  });
}
```

---

## 🎨 UI Implementation Example

### React Hook Example

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseBlogGenerationOptions {
  jobId: string;
  onComplete?: (result: BlogGenerationResponse) => void;
  onError?: (error: string) => void;
}

export function useBlogGeneration({ jobId, onComplete, onError }: UseBlogGenerationOptions) {
  const [status, setStatus] = useState<'pending' | 'queued' | 'processing' | 'completed' | 'failed'>('pending');
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [completedStages, setCompletedStages] = useState<Set<string>>(new Set());
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
  const [result, setResult] = useState<BlogGenerationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const lastUpdateCountRef = useRef(0);
  const pollTimerRef = useRef<NodeJS.Timeout>();
  
  const getPollInterval = useCallback((currentStatus: string): number => {
    switch (currentStatus) {
      case 'processing': return 2000;  // 2 seconds
      case 'queued': return 5000;       // 5 seconds
      case 'pending': return 10000;     // 10 seconds
      default: return 5000;
    }
  }, []);
  
  const poll = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/blog/jobs/${jobId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const jobStatus: JobStatus = await response.json();
      
      setStatus(jobStatus.status);
      setProgress(jobStatus.progress_percentage);
      setCurrentStage(jobStatus.current_stage || null);
      
      // Detect new progress updates
      if (jobStatus.progress_updates.length > lastUpdateCountRef.current) {
        const newUpdates = jobStatus.progress_updates.slice(lastUpdateCountRef.current);
        
        setProgressUpdates(prev => [...prev, ...newUpdates]);
        
        // Detect stage completions
        const newlyCompleted = newUpdates
          .filter(update => 
            update.status.toLowerCase().includes('complete') &&
            !completedStages.has(update.stage)
          );
        
        if (newlyCompleted.length > 0) {
          setCompletedStages(prev => {
            const updated = new Set(prev);
            newlyCompleted.forEach(update => updated.add(update.stage));
            return updated;
          });
          
          // Show notifications for completed stages
          newlyCompleted.forEach(update => {
            console.log(`✅ Stage ${update.stage_number} completed: ${update.stage}`);
          });
        }
        
        lastUpdateCountRef.current = jobStatus.progress_updates.length;
      }
      
      // Handle completion
      if (jobStatus.status === 'completed' && jobStatus.result) {
        setResult(jobStatus.result);
        onComplete?.(jobStatus.result);
        return;
      }
      
      // Handle failure
      if (jobStatus.status === 'failed') {
        setError(jobStatus.error_message || 'Job failed');
        onError?.(jobStatus.error_message || 'Job failed');
        return;
      }
      
      // Continue polling
      const interval = getPollInterval(jobStatus.status);
      pollTimerRef.current = setTimeout(poll, interval);
      
    } catch (err) {
      console.error('Polling error:', err);
      const interval = getPollInterval(status);
      pollTimerRef.current = setTimeout(poll, interval * 2); // Exponential backoff
    }
  }, [jobId, status, completedStages, onComplete, onError, getPollInterval]);
  
  useEffect(() => {
    if (jobId) {
      poll();
    }
    
    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [jobId]);
  
  return {
    status,
    progress,
    currentStage,
    completedStages: Array.from(completedStages),
    progressUpdates,
    result,
    error
  };
}
```

### Usage in Component

```tsx
function BlogGenerator() {
  const [jobId, setJobId] = useState<string | null>(null);
  
  const {
    status,
    progress,
    currentStage,
    completedStages,
    progressUpdates,
    result,
    error
  } = useBlogGeneration({
    jobId: jobId!,
    onComplete: (result) => {
      console.log('Blog ready!', result.title);
    },
    onError: (error) => {
      console.error('Generation failed:', error);
    }
  });
  
  const handleGenerate = async () => {
    const response = await fetch('/api/v1/blog/generate-enhanced?async_mode=true', {
      method: 'POST',
      body: JSON.stringify({
        topic: 'Best Notary Services',
        keywords: ['notary services']
      })
    });
    const { job_id } = await response.json();
    setJobId(job_id);
  };
  
  return (
    <div>
      <button onClick={handleGenerate}>Generate Blog</button>
      
      {status === 'processing' && (
        <div>
          <ProgressBar value={progress} />
          <p>Current Stage: {currentStage}</p>
          
          {/* Stage Checklist */}
          <div className="stages">
            {progressUpdates
              .filter((_, i, arr) => {
                // Get unique stages
                const stage = arr[i].stage;
                return arr.findIndex(u => u.stage === stage) === i;
              })
              .map(update => (
                <div
                  key={update.stage}
                  className={completedStages.includes(update.stage) ? 'completed' : 'pending'}
                >
                  {completedStages.includes(update.stage) ? '✅' : '⏳'} 
                  Stage {update.stage_number}: {update.stage}
                </div>
              ))}
          </div>
        </div>
      )}
      
      {result && <BlogDisplay blog={result} />}
      {error && <ErrorMessage error={error} />}
    </div>
  );
}
```

---

## 📊 Stage List Reference

Common stages you'll see:

| Stage | Description | Typical Duration |
|-------|-------------|------------------|
| `initialization` | Pipeline setup | < 1s |
| `keyword_analysis` | Keyword research | 2-5s |
| `competitor_analysis` | Competitor research | 2-5s |
| `intent_analysis` | Search intent detection | 1-2s |
| `length_optimization` | Content length analysis | 1-2s |
| `research_outline` | Research & outline | 2-3s |
| `draft_generation` | Content generation | 4-6s |
| `enhancement` | Content enhancement | 3-4s |
| `seo_polish` | SEO optimization | 1-2s |
| `semantic_integration` | Semantic keywords | 1-2s |
| `quality_scoring` | Quality assessment | 1-2s |
| `finalization` | Final compilation | < 1s |

---

## ✅ Summary

**Yes, smart polling can inform the frontend when stages complete!**

**How:**
1. Poll `/api/v1/blog/jobs/{job_id}` every 2-10 seconds (adaptive)
2. Compare `progress_updates` array between polls
3. Detect new updates with "complete" in status
4. Show stage completion notifications

**Benefits:**
- ✅ Low cost (~$6/month)
- ✅ Real-time stage tracking
- ✅ Simple implementation
- ✅ Adaptive polling frequency
- ✅ Stage completion notifications

**Implementation:**
- Use the `BlogGenerationTracker` class above
- Or use the React hook example
- Track `progress_updates` array to detect completions

---

**Ready to implement!** The backend now includes `progress_updates` in the job status response. ✅

