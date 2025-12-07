'use client';

/**
 * useProgressiveImageGeneration Hook
 * 
 * Provides progressive/background image generation:
 * - Automatically generate recommended images in background
 * - Track multiple concurrent job statuses
 * - Show content immediately while images generate
 */

import { useState, useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';
import { useImageGeneration } from './useImageGeneration';
import type {
  ImageSuggestion,
  ImageType,
  ContentTone,
  GeneratedImageResult,
} from '@/types/blog-generation';

interface BackgroundJob {
  jobId: string;
  suggestion: ImageSuggestion;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: GeneratedImageResult;
  error?: string;
}

interface UseProgressiveImageGenerationReturn {
  /** Map of background jobs by image type */
  backgroundJobs: Map<string, BackgroundJob>;
  /** Whether background generation is in progress */
  isGenerating: boolean;
  /** Start background generation for recommended images */
  startBackgroundGeneration: (
    content: string,
    topic: string,
    keywords: string[],
    tone?: ContentTone
  ) => Promise<Map<string, BackgroundJob>>;
  /** Get completed images */
  getCompletedImages: () => BackgroundJob[];
  /** Cancel all background jobs */
  cancelBackgroundJobs: () => void;
}

export const useProgressiveImageGeneration = (): UseProgressiveImageGenerationReturn => {
  const [backgroundJobs, setBackgroundJobs] = useState<Map<string, BackgroundJob>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);
  const pollingIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  const { getImageSuggestions, generateImageFromContent, checkJobStatus } = useImageGeneration();

  /**
   * Poll for job completion
   */
  const pollJobStatus = useCallback(async (
    jobId: string,
    imageType: string,
    suggestion: ImageSuggestion
  ) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await checkJobStatus(jobId);
        
        if (status.status === 'completed' && status.result) {
          clearInterval(pollInterval);
          pollingIntervalsRef.current.delete(imageType);
          
          setBackgroundJobs(prev => {
            const next = new Map(prev);
            next.set(imageType, {
              jobId,
              suggestion,
              status: 'completed',
              result: status.result?.images?.[0],
            });
            return next;
          });
          
          logger.debug('✅ Background image completed', { imageType, jobId });
        } else if (status.status === 'failed') {
          clearInterval(pollInterval);
          pollingIntervalsRef.current.delete(imageType);
          
          setBackgroundJobs(prev => {
            const next = new Map(prev);
            next.set(imageType, {
              jobId,
              suggestion,
              status: 'failed',
              error: status.error_message || 'Unknown error',
            });
            return next;
          });
          
          logger.error('❌ Background image failed', { imageType, jobId, error: status.error_message });
        } else {
          // Update status to processing
          setBackgroundJobs(prev => {
            const next = new Map(prev);
            const existing = next.get(imageType);
            if (existing && existing.status === 'pending') {
              next.set(imageType, { ...existing, status: 'processing' });
            }
            return next;
          });
        }
      } catch (err) {
        logger.error('❌ Error polling job status', { imageType, jobId, error: err });
      }
    }, 3000); // Poll every 3 seconds
    
    pollingIntervalsRef.current.set(imageType, pollInterval);
    
    // Timeout after 2 minutes
    setTimeout(() => {
      if (pollingIntervalsRef.current.has(imageType)) {
        clearInterval(pollInterval);
        pollingIntervalsRef.current.delete(imageType);
        
        setBackgroundJobs(prev => {
          const next = new Map(prev);
          const existing = next.get(imageType);
          if (existing && existing.status !== 'completed') {
            next.set(imageType, {
              ...existing,
              status: 'failed',
              error: 'Generation timed out',
            });
          }
          return next;
        });
      }
    }, 120000);
  }, [checkJobStatus]);

  /**
   * Start background generation for recommended images
   */
  const startBackgroundGeneration = useCallback(async (
    content: string,
    topic: string,
    keywords: string[],
    tone: ContentTone = 'professional'
  ): Promise<Map<string, BackgroundJob>> => {
    setIsGenerating(true);
    const jobs = new Map<string, BackgroundJob>();
    
    try {
      logger.debug('🖼️ Starting progressive image generation...', { topic });
      
      // Get suggestions
      const { suggestions } = await getImageSuggestions(content, topic, keywords, tone);
      
      // Filter to only recommended images (priority >= 4)
      const recommendedSuggestions = suggestions.filter(s => s.placement.priority >= 4);
      
      logger.debug('📋 Found recommended suggestions', { 
        total: suggestions.length,
        recommended: recommendedSuggestions.length 
      });
      
      // Generate each recommended image in background
      for (const suggestion of recommendedSuggestions) {
        try {
          const jobId = await generateImageFromContent(
            content,
            topic,
            keywords,
            suggestion.image_type as ImageType,
            tone,
            suggestion.placement.section
          );
          
          const job: BackgroundJob = {
            jobId,
            suggestion,
            status: 'pending',
          };
          
          jobs.set(suggestion.image_type, job);
          
          // Start polling for this job
          pollJobStatus(jobId, suggestion.image_type, suggestion);
        } catch (err) {
          logger.error('❌ Failed to start background generation for image', { 
            imageType: suggestion.image_type, 
            error: err 
          });
          
          jobs.set(suggestion.image_type, {
            jobId: '',
            suggestion,
            status: 'failed',
            error: err instanceof Error ? err.message : 'Failed to start generation',
          });
        }
      }
      
      setBackgroundJobs(jobs);
      return jobs;
    } catch (err) {
      logger.error('❌ Failed to start background generation', { error: err });
      return new Map();
    } finally {
      setIsGenerating(false);
    }
  }, [getImageSuggestions, generateImageFromContent, pollJobStatus]);

  /**
   * Get all completed images
   */
  const getCompletedImages = useCallback((): BackgroundJob[] => {
    return Array.from(backgroundJobs.values()).filter(job => job.status === 'completed');
  }, [backgroundJobs]);

  /**
   * Cancel all background jobs
   */
  const cancelBackgroundJobs = useCallback(() => {
    // Clear all polling intervals
    pollingIntervalsRef.current.forEach((interval) => {
      clearInterval(interval);
    });
    pollingIntervalsRef.current.clear();
    
    // Update job statuses
    setBackgroundJobs(prev => {
      const next = new Map(prev);
      next.forEach((job, key) => {
        if (job.status === 'pending' || job.status === 'processing') {
          next.set(key, { ...job, status: 'failed', error: 'Cancelled' });
        }
      });
      return next;
    });
    
    logger.debug('🛑 Cancelled all background image jobs');
  }, []);

  return {
    backgroundJobs,
    isGenerating,
    startBackgroundGeneration,
    getCompletedImages,
    cancelBackgroundJobs,
  };
};

export default useProgressiveImageGeneration;
