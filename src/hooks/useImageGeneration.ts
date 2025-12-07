'use client';

/**
 * useImageGeneration Hook
 * 
 * Provides content-aware image generation capabilities:
 * - Get image suggestions from blog content
 * - Generate images from content with auto-prompts
 * - Generate images with custom prompts
 * - Poll for job completion
 */

import { useState, useCallback } from 'react';
import { logger } from '@/utils/logger';
import type {
  ImageSuggestion,
  ImageSuggestionsResponse,
  ImageType,
  ContentTone,
  ImageStyle,
  ImageAspectRatio,
  ImageQuality,
  ImageJobStatusResponse,
} from '@/types/blog-generation';

interface UseImageGenerationReturn {
  /** Whether an operation is in progress */
  generating: boolean;
  /** Current image suggestions */
  suggestions: ImageSuggestion[];
  /** Error message if any */
  error: string | null;
  /** Get image suggestions from blog content */
  getImageSuggestions: (
    content: string,
    topic: string,
    keywords: string[],
    tone?: ContentTone
  ) => Promise<ImageSuggestionsResponse>;
  /** Generate an image from blog content (auto-prompt) */
  generateImageFromContent: (
    content: string,
    topic: string,
    keywords: string[],
    imageType: ImageType,
    tone?: ContentTone,
    sectionTitle?: string
  ) => Promise<string>;
  /** Generate an image with a custom prompt */
  generateImage: (
    prompt: string,
    style?: ImageStyle,
    aspectRatio?: ImageAspectRatio,
    quality?: ImageQuality
  ) => Promise<string>;
  /** Check status of an image generation job */
  checkJobStatus: (jobId: string) => Promise<ImageJobStatusResponse>;
  /** Clear error state */
  clearError: () => void;
}

export const useImageGeneration = (): UseImageGenerationReturn => {
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<ImageSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get image suggestions based on blog content
   */
  const getImageSuggestions = useCallback(async (
    content: string,
    topic: string,
    keywords: string[],
    tone: ContentTone = 'professional'
  ): Promise<ImageSuggestionsResponse> => {
    setGenerating(true);
    setError(null);
    
    try {
      logger.debug('🖼️ Fetching image suggestions...', { topic, keywordsCount: keywords.length });
      
      const response = await fetch('/api/images/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          topic,
          keywords,
          tone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Failed to get suggestions: ${response.statusText}`);
      }

      const data: ImageSuggestionsResponse = await response.json();
      setSuggestions(data.suggestions);
      
      logger.debug('✅ Image suggestions retrieved', { 
        count: data.total_suggestions,
        recommended: data.recommended_count 
      });
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error getting suggestions';
      setError(errorMessage);
      logger.error('❌ Failed to get image suggestions', { error: errorMessage });
      throw err;
    } finally {
      setGenerating(false);
    }
  }, []);

  /**
   * Generate an image from blog content with auto-generated prompt
   */
  const generateImageFromContent = useCallback(async (
    content: string,
    topic: string,
    keywords: string[],
    imageType: ImageType,
    tone: ContentTone = 'professional',
    sectionTitle?: string
  ): Promise<string> => {
    setGenerating(true);
    setError(null);
    
    try {
      logger.debug('🖼️ Generating image from content...', { topic, imageType, sectionTitle });
      
      const response = await fetch('/api/images/generate-from-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          topic,
          keywords,
          image_type: imageType,
          tone,
          section_title: sectionTitle,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Failed to generate image: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('✅ Content-aware image generation started', { jobId: data.job_id });
      
      return data.job_id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error generating image';
      setError(errorMessage);
      logger.error('❌ Failed to generate image from content', { error: errorMessage });
      throw err;
    } finally {
      setGenerating(false);
    }
  }, []);

  /**
   * Generate an image with a custom prompt
   */
  const generateImage = useCallback(async (
    prompt: string,
    style: ImageStyle = 'photographic',
    aspectRatio: ImageAspectRatio = '16:9',
    quality: ImageQuality = 'high'
  ): Promise<string> => {
    setGenerating(true);
    setError(null);
    
    try {
      logger.debug('🖼️ Generating image with custom prompt...', { style, aspectRatio, quality });
      
      const response = await fetch('/api/images/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          provider: 'stability_ai',
          style,
          aspect_ratio: aspectRatio,
          quality,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Failed to generate image: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('✅ Custom image generation started', { jobId: data.job_id });
      
      return data.job_id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error generating image';
      setError(errorMessage);
      logger.error('❌ Failed to generate image', { error: errorMessage });
      throw err;
    } finally {
      setGenerating(false);
    }
  }, []);

  /**
   * Check the status of an image generation job
   */
  const checkJobStatus = useCallback(async (jobId: string): Promise<ImageJobStatusResponse> => {
    try {
      const response = await fetch(`/api/images/jobs/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Failed to check job status: ${response.statusText}`);
      }

      const data: ImageJobStatusResponse = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error checking job status';
      logger.error('❌ Failed to check job status', { jobId, error: errorMessage });
      throw err;
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generating,
    suggestions,
    error,
    getImageSuggestions,
    generateImageFromContent,
    generateImage,
    checkJobStatus,
    clearError,
  };
};

export default useImageGeneration;
