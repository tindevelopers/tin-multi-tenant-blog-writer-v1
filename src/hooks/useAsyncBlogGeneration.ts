/**
 * React Hook for Async Blog Generation with Cloud Tasks
 * 
 * This hook handles:
 * - Creating async blog generation jobs
 * - Polling for job status
 * - Progress tracking
 * - Error handling
 * - Automatic cleanup
 * 
 * Usage:
 * ```tsx
 * const { createJob, status, progress, result, error } = useAsyncBlogGeneration();
 * 
 * const handleGenerate = async () => {
 *   await createJob({
 *     topic: "Best Presents for Christmas 2025",
 *     keywords: ["christmas gifts"],
 *     use_google_search: true,
 *   });
 * };
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface BlogGenerationRequest {
  topic: string;
  keywords?: string[];
  tone?: 'professional' | 'casual' | 'friendly' | 'authoritative' | 'conversational' | 'technical' | 'creative';
  length?: 'short' | 'medium' | 'long' | 'extended' | 'very_long';
  use_google_search?: boolean;
  use_fact_checking?: boolean;
  use_citations?: boolean;
  use_serp_optimization?: boolean;
  use_consensus_generation?: boolean;
  use_knowledge_graph?: boolean;
  use_semantic_keywords?: boolean;
  use_quality_scoring?: boolean;
  target_audience?: string;
  custom_instructions?: string;
  template_type?: string;
  include_product_research?: boolean;
  quality_level?: string;
  word_count?: number;
  [key: string]: any;
}

export interface BlogGenerationResponse {
  title: string;
  content: string;
  meta_title: string;
  meta_description: string;
  readability_score: number;
  seo_score: number;
  stage_results: Array<{
    stage: string;
    provider: string;
    tokens: number;
    cost: number;
  }>;
  citations: Array<{
    text: string;
    url: string;
    title: string;
  }>;
  total_tokens: number;
  total_cost: number;
  generation_time: number;
  seo_metadata: Record<string, any>;
  internal_links?: Array<Record<string, string>>;
  quality_score?: number;
  quality_dimensions: Record<string, number>;
  structured_data?: Record<string, any>;
  semantic_keywords: string[];
  content_metadata: Record<string, any>;
  generated_images?: Array<{
    type: string;
    image_url: string;
    alt_text: string;
  }>;
  brand_recommendations?: string[];
  success: boolean;
  warnings: string[];
  progress_updates: Array<Record<string, any>>;
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

export interface UseAsyncBlogGenerationOptions {
  pollInterval?: number; // milliseconds
  maxWaitTime?: number; // milliseconds
  onProgress?: (status: JobStatus) => void;
  onComplete?: (result: BlogGenerationResponse) => void;
  onError?: (error: string) => void;
  autoPoll?: boolean; // Automatically start polling after job creation
}

export interface UseAsyncBlogGenerationReturn {
  // State
  jobId: string | null;
  status: JobStatus['status'] | null;
  progress: number;
  currentStage: string | null;
  result: BlogGenerationResponse | null;
  error: string | null;
  estimatedTimeRemaining: number | null;
  isPolling: boolean;
  
  // Actions
  createJob: (request: BlogGenerationRequest) => Promise<string | null>;
  pollJob: (jobId: string) => Promise<BlogGenerationResponse | null>;
  stopPolling: () => void;
  reset: () => void;
}

const DEFAULT_OPTIONS: Required<Omit<UseAsyncBlogGenerationOptions, 'onProgress' | 'onComplete' | 'onError'>> = {
  pollInterval: 5000, // 5 seconds
  maxWaitTime: 300000, // 5 minutes
  autoPoll: true,
};

export function useAsyncBlogGeneration(
  options: UseAsyncBlogGenerationOptions = {}
): UseAsyncBlogGenerationReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // State
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus['status'] | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [result, setResult] = useState<BlogGenerationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  
  // Refs for cleanup
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearTimeout(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Poll job status
  const pollJob = useCallback(async (id: string): Promise<BlogGenerationResponse | null> => {
    if (isPolling) {
      console.warn('Already polling, stopping previous poll');
      stopPolling();
    }
    
    setIsPolling(true);
    const startTime = Date.now();
    
    // Create abort controller for cleanup
    abortControllerRef.current = new AbortController();
    
    const poll = async (): Promise<BlogGenerationResponse | null> => {
      // Check timeout
      if (Date.now() - startTime > opts.maxWaitTime) {
        const timeoutError = 'Job timeout: Maximum wait time exceeded';
        setError(timeoutError);
        setStatus('failed');
        setIsPolling(false);
        opts.onError?.(timeoutError);
        return null;
      }
      
      try {
        // Use local API route for job status
        const response = await fetch(`/api/blog-writer/jobs/${id}`, {
          signal: abortControllerRef.current?.signal,
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Job not found');
          }
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const jobStatus: JobStatus = await response.json();
        
        // Update state
        setStatus(jobStatus.status);
        setProgress(jobStatus.progress_percentage);
        setCurrentStage(jobStatus.current_stage || null);
        setEstimatedTimeRemaining(jobStatus.estimated_time_remaining || null);
        
        // Call progress callback
        opts.onProgress?.(jobStatus);
        
        // Handle completed
        if (jobStatus.status === 'completed') {
          setIsPolling(false);
          if (jobStatus.result) {
            setResult(jobStatus.result);
            opts.onComplete?.(jobStatus.result);
            return jobStatus.result;
          }
        }
        
        // Handle failed
        if (jobStatus.status === 'failed') {
          setIsPolling(false);
          const errorMsg = jobStatus.error_message || 'Blog generation failed';
          setError(errorMsg);
          opts.onError?.(errorMsg);
          return null;
        }
        
        // Continue polling if still processing
        if (jobStatus.status === 'processing' || jobStatus.status === 'queued' || jobStatus.status === 'pending') {
          // Schedule next poll
          pollIntervalRef.current = setTimeout(() => {
            poll();
          }, opts.pollInterval);
        } else {
          setIsPolling(false);
        }
        
        return null;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // Polling was cancelled
          return null;
        }
        
        setIsPolling(false);
        const errorMsg = err.message || 'Failed to poll job status';
        setError(errorMsg);
        opts.onError?.(errorMsg);
        return null;
      }
    };
    
    // Start polling
    return poll();
  }, [opts, isPolling, stopPolling]);
  
  // Create async job
  const createJob = useCallback(async (request: BlogGenerationRequest): Promise<string | null> => {
    try {
      setError(null);
      setResult(null);
      setProgress(0);
      
      // Use local API route with async_mode=true
      const response = await fetch('/api/blog-writer/generate?async_mode=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create job' }));
        throw new Error(errorData.error || errorData.detail || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const newJobId = data.job_id;
      
      if (!newJobId) {
        throw new Error('No job_id returned from API');
      }
      
      setJobId(newJobId);
      setStatus(data.status || 'queued');
      
      // Auto-start polling if enabled
      if (opts.autoPoll && newJobId) {
        pollJob(newJobId);
      }
      
      return newJobId;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create job';
      setError(errorMessage);
      opts.onError?.(errorMessage);
      return null;
    }
  }, [opts, pollJob]);
  
  // Reset state
  const reset = useCallback(() => {
    stopPolling();
    setJobId(null);
    setStatus(null);
    setProgress(0);
    setCurrentStage(null);
    setResult(null);
    setError(null);
    setEstimatedTimeRemaining(null);
  }, [stopPolling]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);
  
  // Auto-poll when jobId changes (if autoPoll is enabled)
  useEffect(() => {
    if (opts.autoPoll && jobId && !isPolling && status !== 'completed' && status !== 'failed') {
      pollJob(jobId);
    }
  }, [jobId, opts.autoPoll, isPolling, status, pollJob]);
  
  return {
    jobId,
    status,
    progress,
    currentStage,
    result,
    error,
    estimatedTimeRemaining,
    isPolling,
    createJob,
    pollJob,
    stopPolling,
    reset,
  };
}

