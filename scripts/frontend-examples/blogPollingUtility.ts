/**
 * Standalone Polling Utility for Blog Generation Jobs
 * 
 * This is a pure TypeScript utility (no React dependencies) that can be used
 * in any JavaScript/TypeScript project (React, Vue, Angular, vanilla JS, etc.)
 * 
 * Usage:
 * ```typescript
 * import { pollBlogJob, createBlogJob } from './blogPollingUtility';
 * 
 * // Create job
 * const { job_id } = await createBlogJob({
 *   topic: "Best Presents for Christmas",
 *   keywords: ["christmas gifts"],
 * });
 * 
 * // Poll for result
 * const blog = await pollBlogJob(job_id, {
 *   onProgress: (status) => console.log(`${status.progress_percentage}%`),
 * });
 * ```
 */

export interface BlogGenerationRequest {
  topic: string;
  keywords: string[];
  [key: string]: any;
}

export interface BlogGenerationResponse {
  title: string;
  content: string;
  meta_title: string;
  meta_description: string;
  readability_score: number;
  seo_score: number;
  [key: string]: any;
}

export interface JobStatus {
  job_id: string;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  progress_percentage: number;
  current_stage?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  result?: BlogGenerationResponse;
  error_message?: string;
  estimated_time_remaining?: number;
}

export interface CreateJobResponse {
  job_id: string;
  status: 'pending' | 'queued';
  message: string;
  estimated_completion_time: number;
}

export interface PollOptions {
  apiBaseUrl?: string;
  pollInterval?: number; // milliseconds
  maxWaitTime?: number; // milliseconds
  onProgress?: (status: JobStatus) => void;
  onError?: (error: string) => void;
  abortSignal?: AbortSignal; // For cancellation
}

const DEFAULT_OPTIONS: Required<Omit<PollOptions, 'onProgress' | 'onError' | 'abortSignal'>> = {
  apiBaseUrl: typeof window !== 'undefined' ? window.location.origin : '',
  pollInterval: 5000, // 5 seconds
  maxWaitTime: 300000, // 5 minutes
};

/**
 * Create an async blog generation job
 */
export async function createBlogJob(
  request: BlogGenerationRequest,
  apiBaseUrl: string = DEFAULT_OPTIONS.apiBaseUrl
): Promise<CreateJobResponse> {
  const response = await fetch(`${apiBaseUrl}/api/v1/blog/generate-enhanced?async_mode=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to create job' }));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get job status (single poll)
 */
export async function getJobStatus(
  jobId: string,
  apiBaseUrl: string = DEFAULT_OPTIONS.apiBaseUrl
): Promise<JobStatus> {
  const response = await fetch(`${apiBaseUrl}/api/v1/blog/jobs/${jobId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Job not found');
    }
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Poll a blog generation job until completion
 * 
 * @param jobId - Job ID from createBlogJob
 * @param options - Polling options
 * @returns Promise that resolves with the blog result or rejects with an error
 */
export async function pollBlogJob(
  jobId: string,
  options: PollOptions = {}
): Promise<BlogGenerationResponse> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const poll = async () => {
      // Check abort signal
      if (opts.abortSignal?.aborted) {
        reject(new Error('Polling cancelled'));
        return;
      }

      // Check timeout
      if (Date.now() - startTime > opts.maxWaitTime) {
        reject(new Error('Job timeout: Maximum wait time exceeded'));
        return;
      }

      try {
        const status = await getJobStatus(jobId, opts.apiBaseUrl);

        // Call progress callback
        opts.onProgress?.(status);

        // Handle completed
        if (status.status === 'completed') {
          if (status.result) {
            resolve(status.result);
          } else {
            reject(new Error('Job completed but no result available'));
          }
          return;
        }

        // Handle failed
        if (status.status === 'failed') {
          const errorMsg = status.error_message || 'Blog generation failed';
          opts.onError?.(errorMsg);
          reject(new Error(errorMsg));
          return;
        }

        // Continue polling if still processing
        if (
          status.status === 'processing' ||
          status.status === 'queued' ||
          status.status === 'pending'
        ) {
          setTimeout(poll, opts.pollInterval);
        } else {
          reject(new Error(`Unexpected job status: ${status.status}`));
        }
      } catch (error: any) {
        if (opts.abortSignal?.aborted) {
          reject(new Error('Polling cancelled'));
          return;
        }

        const errorMsg = error.message || 'Failed to poll job status';
        opts.onError?.(errorMsg);
        reject(error);
      }
    };

    // Start polling
    poll();
  });
}

/**
 * Create and poll a blog generation job in one call
 * 
 * @param request - Blog generation request
 * @param options - Polling options
 * @returns Promise that resolves with the blog result
 */
export async function createAndPollBlogJob(
  request: BlogGenerationRequest,
  options: PollOptions = {}
): Promise<BlogGenerationResponse> {
  // Create job
  const { job_id } = await createBlogJob(request, options.apiBaseUrl);

  // Poll for result
  return pollBlogJob(job_id, options);
}

/**
 * Utility to format estimated time
 */
export function formatEstimatedTime(seconds: number | null | undefined): string {
  if (!seconds) return '';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

/**
 * Utility to get stage label
 */
export function getStageLabel(stage: string | null | undefined): string {
  if (!stage) return '';
  
  const labels: Record<string, string> = {
    initialization: 'Initializing',
    keyword_analysis: 'Analyzing Keywords',
    competitor_analysis: 'Analyzing Competitors',
    intent_analysis: 'Analyzing Search Intent',
    length_optimization: 'Optimizing Content Length',
    research_outline: 'Research & Outline',
    draft_generation: 'Generating Draft',
    enhancement: 'Enhancing Content',
    seo_polish: 'SEO Optimization',
    semantic_integration: 'Integrating Semantic Keywords',
    quality_scoring: 'Quality Scoring',
    finalization: 'Finalizing',
    completed: 'Completed',
  };

  return labels[stage] || stage;
}

// Example usage (vanilla JavaScript/TypeScript)
export async function exampleUsage() {
  try {
    // Option 1: Create and poll separately
    const { job_id } = await createBlogJob({
      topic: "Best Presents for Christmas 2025",
      keywords: ["christmas gifts"],
      use_google_search: true,
    });

    console.log(`Job created: ${job_id}`);

    const blog = await pollBlogJob(job_id, {
      onProgress: (status) => {
        console.log(`Progress: ${status.progress_percentage}% - ${getStageLabel(status.current_stage)}`);
      },
    });

    console.log('Blog generated:', blog.title);

    // Option 2: Create and poll in one call
    const blog2 = await createAndPollBlogJob(
      {
        topic: "Best Presents for Christmas 2025",
        keywords: ["christmas gifts"],
        use_google_search: true,
      },
      {
        onProgress: (status) => {
          console.log(`Progress: ${status.progress_percentage}%`);
        },
      }
    );

    console.log('Blog generated:', blog2.title);
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

