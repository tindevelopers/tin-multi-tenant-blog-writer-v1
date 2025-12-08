'use client';

/**
 * useBatchImageGeneration Hook
 * 
 * Provides batch image generation capabilities:
 * - Generate multiple images in parallel
 * - Track batch progress across all jobs
 * - Support for standard and draft_then_final workflows
 */

import { useState, useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';
import { useImageGeneration } from './useImageGeneration';
import type {
  ImageSuggestion,
  BatchImageRequest,
  GeneratedImageResult,
} from '@/types/blog-generation';

interface BatchJobStatus {
  jobId: string;
  index: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: GeneratedImageResult;
  error?: string;
}

interface UseBatchImageGenerationReturn {
  /** Array of job IDs for batch operation */
  batchJobs: string[];
  /** Detailed status for each job in the batch */
  jobStatuses: BatchJobStatus[];
  /** Overall batch status */
  batchStatus: 'idle' | 'generating' | 'completed' | 'partial' | 'failed';
  /** Progress percentage (0-100) */
  progress: number;
  /** Generate a batch of images from suggestions */
  generateBatch: (suggestions: ImageSuggestion[]) => Promise<string[]>;
  /** Generate a batch of images with custom requests */
  generateBatchCustom: (
    requests: BatchImageRequest[],
    blogId?: string,
    workflow?: 'standard' | 'draft_then_final'
  ) => Promise<string[]>;
  /** Reset batch state */
  resetBatch: () => void;
}

export const useBatchImageGeneration = (): UseBatchImageGenerationReturn => {
  const [batchJobs, setBatchJobs] = useState<string[]>([]);
  const [jobStatuses, setJobStatuses] = useState<BatchJobStatus[]>([]);
  const [batchStatus, setBatchStatus] = useState<'idle' | 'generating' | 'completed' | 'partial' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const pollingIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  const { checkJobStatus } = useImageGeneration();

  /**
   * Poll for individual job completion
   */
  const pollJobStatus = useCallback(async (jobId: string, index: number) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await checkJobStatus(jobId);
        
        if (status.status === 'completed' && status.result) {
          clearInterval(pollInterval);
          pollingIntervalsRef.current.delete(jobId);
          
          setJobStatuses(prev => {
            const next = [...prev];
            next[index] = {
              jobId,
              index,
              status: 'completed',
              result: status.result?.images?.[0],
            };
            return next;
          });
          
          // Update progress
          updateBatchProgress();
        } else if (status.status === 'failed') {
          clearInterval(pollInterval);
          pollingIntervalsRef.current.delete(jobId);
          
          setJobStatuses(prev => {
            const next = [...prev];
            next[index] = {
              jobId,
              index,
              status: 'failed',
              error: status.error_message || 'Unknown error',
            };
            return next;
          });
          
          // Update progress
          updateBatchProgress();
        } else if (status.status === 'processing') {
          setJobStatuses(prev => {
            const next = [...prev];
            if (next[index]?.status === 'pending') {
              next[index] = { ...next[index], status: 'processing' };
            }
            return next;
          });
        }
      } catch (err) {
        logger.error('❌ Error polling batch job status', { jobId, index, error: err });
      }
    }, 3000); // Poll every 3 seconds
    
    pollingIntervalsRef.current.set(jobId, pollInterval);
    
    // Timeout after 2 minutes
    setTimeout(() => {
      if (pollingIntervalsRef.current.has(jobId)) {
        clearInterval(pollInterval);
        pollingIntervalsRef.current.delete(jobId);
        
        setJobStatuses(prev => {
          const next = [...prev];
          if (next[index]?.status !== 'completed') {
            next[index] = {
              jobId,
              index,
              status: 'failed',
              error: 'Generation timed out',
            };
          }
          return next;
        });
        
        updateBatchProgress();
      }
    }, 120000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkJobStatus]);

  /**
   * Update overall batch progress
   */
  const updateBatchProgress = useCallback(() => {
    setJobStatuses(currentStatuses => {
      const completed = currentStatuses.filter(s => s.status === 'completed').length;
      const failed = currentStatuses.filter(s => s.status === 'failed').length;
      const total = currentStatuses.length;
      
      const newProgress = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;
      setProgress(newProgress);
      
      // Update overall batch status
      if (completed + failed === total && total > 0) {
        if (failed === total) {
          setBatchStatus('failed');
        } else if (failed > 0) {
          setBatchStatus('partial');
        } else {
          setBatchStatus('completed');
        }
      }
      
      return currentStatuses;
    });
  }, []);

  /**
   * Generate a batch of images from suggestions
   */
  const generateBatch = useCallback(async (
    suggestions: ImageSuggestion[]
  ): Promise<string[]> => {
    setBatchStatus('generating');
    setProgress(0);
    
    try {
      logger.debug('🖼️ Starting batch image generation...', { count: suggestions.length });
      
      // Prepare batch request
      const images: BatchImageRequest[] = suggestions.map(suggestion => ({
        prompt: suggestion.prompt,
        provider: 'stability_ai',
        style: suggestion.style,
        aspect_ratio: suggestion.aspect_ratio,
        quality: 'high',
        width: suggestion.aspect_ratio === '16:9' ? 1920 : 1200,
        height: suggestion.aspect_ratio === '16:9' ? 1080 : 900,
      }));

      const response = await fetch('/api/images/batch-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Batch generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      const jobIds = data.job_ids || [];
      
      setBatchJobs(jobIds);
      
      // Initialize job statuses
      const initialStatuses: BatchJobStatus[] = jobIds.map((jobId: string, index: number) => ({
        jobId,
        index,
        status: 'pending' as const,
      }));
      setJobStatuses(initialStatuses);
      
      // Start polling for each job
      jobIds.forEach((jobId: string, index: number) => {
        pollJobStatus(jobId, index);
      });
      
      logger.debug('✅ Batch image generation started', { jobIds });
      return jobIds;
    } catch (err) {
      logger.error('❌ Failed to start batch generation', { error: err });
      setBatchStatus('failed');
      throw err;
    }
  }, [pollJobStatus]);

  /**
   * Generate a batch of images with custom requests
   */
  const generateBatchCustom = useCallback(async (
    requests: BatchImageRequest[],
    blogId?: string,
    workflow: 'standard' | 'draft_then_final' = 'standard'
  ): Promise<string[]> => {
    setBatchStatus('generating');
    setProgress(0);
    
    try {
      logger.debug('🖼️ Starting custom batch image generation...', { 
        count: requests.length, 
        workflow 
      });

      const response = await fetch('/api/images/batch-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: requests,
          blog_id: blogId,
          workflow,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Batch generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      const jobIds = data.job_ids || [];
      
      setBatchJobs(jobIds);
      
      // Initialize job statuses
      const initialStatuses: BatchJobStatus[] = jobIds.map((jobId: string, index: number) => ({
        jobId,
        index,
        status: 'pending' as const,
      }));
      setJobStatuses(initialStatuses);
      
      // Start polling for each job
      jobIds.forEach((jobId: string, index: number) => {
        pollJobStatus(jobId, index);
      });
      
      logger.debug('✅ Custom batch image generation started', { jobIds });
      return jobIds;
    } catch (err) {
      logger.error('❌ Failed to start custom batch generation', { error: err });
      setBatchStatus('failed');
      throw err;
    }
  }, [pollJobStatus]);

  /**
   * Reset batch state
   */
  const resetBatch = useCallback(() => {
    // Clear all polling intervals
    pollingIntervalsRef.current.forEach((interval) => {
      clearInterval(interval);
    });
    pollingIntervalsRef.current.clear();
    
    setBatchJobs([]);
    setJobStatuses([]);
    setBatchStatus('idle');
    setProgress(0);
    
    logger.debug('🔄 Batch state reset');
  }, []);

  return {
    batchJobs,
    jobStatuses,
    batchStatus,
    progress,
    generateBatch,
    generateBatchCustom,
    resetBatch,
  };
};

export default useBatchImageGeneration;
