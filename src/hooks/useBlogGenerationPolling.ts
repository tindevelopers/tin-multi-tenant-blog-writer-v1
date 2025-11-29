"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';

/**
 * Progress update from the backend API
 */
export interface ProgressUpdate {
  stage: string;
  stage_number: number;
  total_stages: number;
  progress_percentage: number;
  status: string;
  details?: string;
  metadata: Record<string, any>;
  timestamp: number;
}

/**
 * Job status from the backend API
 */
export interface JobStatus {
  job_id: string;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  progress_percentage: number;
  current_stage?: string;
  progress_updates: ProgressUpdate[];
  result?: any; // Blog generation result
  error_message?: string;
  estimated_time_remaining?: number;
}

/**
 * Options for the polling hook
 */
export interface UseBlogGenerationPollingOptions {
  jobId: string | null;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  onStageComplete?: (stage: string, update: ProgressUpdate) => void;
  enabled?: boolean;
}

/**
 * Smart polling hook for blog generation jobs
 * 
 * Features:
 * - Adaptive polling frequency based on job status
 * - Stage completion detection
 * - Automatic cleanup on unmount
 * - Exponential backoff on errors
 * 
 * Based on FRONTEND_SMART_POLLING_GUIDE.md
 */
export function useBlogGenerationPolling({
  jobId,
  onComplete,
  onError,
  onStageComplete,
  enabled = true
}: UseBlogGenerationPollingOptions) {
  const [status, setStatus] = useState<JobStatus['status'] | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [completedStages, setCompletedStages] = useState<Set<string>>(new Set());
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const lastUpdateCountRef = useRef(0);
  const pollTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isPollingRef = useRef(false);

  /**
   * Get adaptive polling interval based on job status
   */
  const getPollInterval = useCallback((currentStatus: string): number => {
    switch (currentStatus) {
      case 'processing':
        return 2000;  // Fast polling during processing (2s)
      case 'queued':
        return 5000;  // Medium polling when queued (5s)
      case 'pending':
        return 10000; // Slow polling when pending (10s)
      default:
        return 5000;
    }
  }, []);

  /**
   * Detect if a progress update indicates stage completion
   */
  const isStageComplete = useCallback((update: ProgressUpdate): boolean => {
    const status = update.status.toLowerCase();
    return (
      status.includes('complete') ||
      status.includes('finished') ||
      status.includes('done') ||
      status.includes('completed')
    );
  }, []);

  /**
   * Poll job status and detect stage completions
   */
  const poll = useCallback(async () => {
    if (!jobId || !enabled || isPollingRef.current) {
      return;
    }

    isPollingRef.current = true;

    try {
      const response = await fetch(`/api/blog-writer/jobs/${jobId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const jobStatus: JobStatus = await response.json();
      
      // Update state
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
            isStageComplete(update) &&
            !completedStages.has(update.stage)
          );
        
        if (newlyCompleted.length > 0) {
          setCompletedStages(prev => {
            const updated = new Set(prev);
            newlyCompleted.forEach(update => {
              updated.add(update.stage);
              // Call stage complete callback
              onStageComplete?.(update.stage, update);
            });
            return updated;
          });
        }
        
        lastUpdateCountRef.current = jobStatus.progress_updates.length;
      }
      
      // Handle job completion
      if (jobStatus.status === 'completed') {
        isPollingRef.current = false;
        if (jobStatus.result) {
          setResult(jobStatus.result);
          onComplete?.(jobStatus.result);
        }
        return;
      }
      
      // Handle job failure
      if (jobStatus.status === 'failed') {
        isPollingRef.current = false;
        const errorMsg = jobStatus.error_message || 'Job failed';
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }
      
      // Continue polling with adaptive interval
      const interval = getPollInterval(jobStatus.status);
      pollTimerRef.current = setTimeout(() => {
        isPollingRef.current = false;
        poll();
      }, interval);
      
    } catch (err) {
      logger.error('Polling error:', err);
      isPollingRef.current = false;
      
      // Retry with exponential backoff
      const currentStatus = status || 'pending';
      const interval = getPollInterval(currentStatus);
      pollTimerRef.current = setTimeout(() => {
        poll();
      }, interval * 2);
    }
  }, [jobId, enabled, completedStages, onComplete, onError, onStageComplete, getPollInterval, isStageComplete, status]);

  /**
   * Start polling when jobId is available
   */
  useEffect(() => {
    if (jobId && enabled) {
      // Reset state
      setStatus(null);
      setProgress(0);
      setCurrentStage(null);
      setCompletedStages(new Set());
      setProgressUpdates([]);
      setResult(null);
      setError(null);
      lastUpdateCountRef.current = 0;
      
      // Start polling immediately
      poll();
    }
    
    // Cleanup on unmount or when jobId changes
    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = undefined;
      }
      isPollingRef.current = false;
    };
  }, [jobId, enabled, poll]);

  /**
   * Stop polling manually
   */
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = undefined;
    }
    isPollingRef.current = false;
  }, []);

  return {
    status,
    progress,
    currentStage,
    completedStages: Array.from(completedStages),
    progressUpdates,
    result,
    error,
    stopPolling,
    isPolling: isPollingRef.current
  };
}

