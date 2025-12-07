'use client';

/**
 * Image Suggestions Panel Component
 * 
 * Displays content-aware image suggestions and allows generation.
 * Features:
 * - Analyze blog content for optimal image placements
 * - Show recommended vs optional suggestions
 * - Generate images with one click
 * - Track generation progress
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { logger } from '@/utils/logger';
import type {
  ImageSuggestion,
  ContentTone,
  ImageType,
  GeneratedImageResult,
} from '@/types/blog-generation';

interface ImageSuggestionsPanelProps {
  /** Blog content in markdown format */
  blogContent: string;
  /** Blog topic */
  topic: string;
  /** Keywords for the blog */
  keywords: string[];
  /** Content tone */
  tone?: ContentTone;
  /** Callback when an image is generated */
  onImageGenerated?: (image: GeneratedImageResult, suggestion: ImageSuggestion) => void;
  /** Callback when user wants to insert an image */
  onInsertImage?: (imageUrl: string, altText: string, placement: ImageSuggestion['placement']) => void;
  /** Additional CSS classes */
  className?: string;
}

export function ImageSuggestionsPanel({
  blogContent,
  topic,
  keywords,
  tone = 'professional',
  onImageGenerated,
  onInsertImage,
  className = '',
}: ImageSuggestionsPanelProps) {
  const {
    suggestions,
    generating,
    error,
    getImageSuggestions,
    generateImageFromContent,
    checkJobStatus,
    clearError,
  } = useImageGeneration();

  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [generatingJobs, setGeneratingJobs] = useState<Map<number, string>>(new Map());
  const [generatedImages, setGeneratedImages] = useState<Map<number, GeneratedImageResult>>(new Map());
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Load suggestions when content changes
  useEffect(() => {
    const loadSuggestions = async () => {
      if (blogContent && blogContent.length >= 50 && topic && keywords.length > 0) {
        setLoadingSuggestions(true);
        try {
          await getImageSuggestions(blogContent, topic, keywords, tone);
        } catch (err) {
          logger.error('Failed to load image suggestions', { error: err });
        } finally {
          setLoadingSuggestions(false);
        }
      }
    };

    // Debounce to avoid too many API calls
    const timeoutId = setTimeout(loadSuggestions, 1000);
    return () => clearTimeout(timeoutId);
  }, [blogContent, topic, keywords, tone, getImageSuggestions]);

  /**
   * Poll for job completion
   */
  const pollJobStatus = useCallback(async (
    jobId: string, 
    suggestion: ImageSuggestion, 
    index: number
  ) => {
    const maxAttempts = 40; // 2 minutes with 3s intervals
    let attempt = 0;

    const poll = async () => {
      attempt++;
      
      try {
        const status = await checkJobStatus(jobId);
        
        if (status.status === 'completed' && status.result?.images?.[0]) {
          const image = status.result.images[0];
          
          setGeneratingJobs(prev => {
            const next = new Map(prev);
            next.delete(index);
            return next;
          });
          
          setGeneratedImages(prev => new Map(prev).set(index, image));
          setSelectedSuggestions(prev => new Set(prev).add(index));
          
          if (onImageGenerated) {
            onImageGenerated(image, suggestion);
          }
          
          logger.debug('✅ Image generated successfully', { index, imageType: suggestion.image_type });
          return;
        } else if (status.status === 'failed') {
          setGeneratingJobs(prev => {
            const next = new Map(prev);
            next.delete(index);
            return next;
          });
          
          logger.error('❌ Image generation failed', { 
            index, 
            imageType: suggestion.image_type,
            error: status.error_message 
          });
          return;
        }
        
        // Continue polling if not complete
        if (attempt < maxAttempts) {
          setTimeout(poll, 3000);
        } else {
          setGeneratingJobs(prev => {
            const next = new Map(prev);
            next.delete(index);
            return next;
          });
          logger.error('❌ Image generation timed out', { index, imageType: suggestion.image_type });
        }
      } catch (err) {
        logger.error('❌ Error polling job status', { index, error: err });
        if (attempt < maxAttempts) {
          setTimeout(poll, 3000);
        }
      }
    };

    poll();
  }, [checkJobStatus, onImageGenerated]);

  /**
   * Handle generating an image from a suggestion
   */
  const handleGenerateImage = async (suggestion: ImageSuggestion, index: number) => {
    try {
      const jobId = await generateImageFromContent(
        blogContent,
        topic,
        keywords,
        suggestion.image_type as ImageType,
        tone,
        suggestion.placement.section
      );

      setGeneratingJobs(prev => new Map(prev).set(index, jobId));

      // Start polling for job completion
      pollJobStatus(jobId, suggestion, index);
    } catch (err) {
      logger.error('Failed to generate image', { error: err });
    }
  };

  /**
   * Handle inserting a generated image
   */
  const handleInsertImage = (index: number, suggestion: ImageSuggestion) => {
    const image = generatedImages.get(index);
    if (image && onInsertImage) {
      const imageUrl = image.image_url || (image.image_data ? `data:image/${image.format};base64,${image.image_data}` : '');
      if (imageUrl) {
        onInsertImage(imageUrl, suggestion.alt_text, suggestion.placement);
      }
    }
  };

  /**
   * Generate all recommended images
   */
  const handleGenerateAllRecommended = async () => {
    const recommendedIndices = suggestions
      .map((s, i) => ({ suggestion: s, index: i }))
      .filter(({ suggestion, index }) => 
        suggestion.placement.priority >= 4 && 
        !selectedSuggestions.has(index) && 
        !generatingJobs.has(index)
      );

    for (const { suggestion, index } of recommendedIndices) {
      await handleGenerateImage(suggestion, index);
      // Small delay between requests to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  // Loading state
  if (loadingSuggestions && suggestions.length === 0) {
    return (
      <div className={`bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mr-3" />
          <span className="text-gray-600 dark:text-gray-300">Analyzing content for image opportunities...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <p className="text-red-700 dark:text-red-300">Error: {error}</p>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 text-sm"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // No suggestions
  if (!loadingSuggestions && suggestions.length === 0) {
    return (
      <div className={`bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${className}`}>
        <p className="text-gray-600 dark:text-gray-400 text-center">
          No image suggestions available. Add more content to get suggestions.
        </p>
      </div>
    );
  }

  const recommendedCount = suggestions.filter(s => s.placement.priority >= 4).length;
  const pendingRecommended = suggestions.filter((s, i) => 
    s.placement.priority >= 4 && !selectedSuggestions.has(i) && !generatingJobs.has(i)
  ).length;

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <svg className="w-5 h-5 mr-2 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              Image Suggestions
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {suggestions.length} suggestions found ({recommendedCount} recommended)
            </p>
          </div>
          
          {pendingRecommended > 0 && (
            <button
              onClick={handleGenerateAllRecommended}
              disabled={generating}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              Generate All Recommended ({pendingRecommended})
            </button>
          )}
        </div>
      </div>

      {/* Suggestions List */}
      <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
        {suggestions.map((suggestion, index) => {
          const isGenerating = generatingJobs.has(index);
          const isGenerated = generatedImages.has(index);
          const isRecommended = suggestion.placement.priority >= 4;
          const generatedImage = generatedImages.get(index);

          return (
            <div
              key={index}
              className={`border rounded-lg p-4 transition-all ${
                isGenerated 
                  ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                  : isRecommended
                  ? 'border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-900/20'
                  : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50'
              }`}
            >
              {/* Suggestion Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white capitalize">
                      {suggestion.image_type.replace('_', ' ')}
                    </h4>
                    {isRecommended && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 rounded-full">
                        Recommended
                      </span>
                    )}
                    {isGenerated && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 rounded-full">
                        ✓ Generated
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {suggestion.placement.section} • Priority: {suggestion.placement.priority}/5
                  </p>
                </div>
              </div>

              {/* Generated Image Preview */}
              {isGenerated && generatedImage && (
                <div className="mb-3">
                  {/* eslint-disable @next/next/no-img-element */}
                  <div className="relative w-full h-40 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                    {generatedImage.image_url ? (
                      <img
                        src={generatedImage.image_url}
                        alt={suggestion.alt_text}
                        className="w-full h-full object-cover"
                      />
                    ) : generatedImage.image_data ? (
                      <img
                        src={`data:image/${generatedImage.format};base64,${generatedImage.image_data}`}
                        alt={suggestion.alt_text}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  {/* eslint-enable @next/next/no-img-element */}
                  {onInsertImage && (
                    <button
                      onClick={() => handleInsertImage(index, suggestion)}
                      className="mt-2 w-full px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium transition-colors"
                    >
                      Insert into Content
                    </button>
                  )}
                </div>
              )}

              {/* Prompt Preview */}
              <div className="mb-3">
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                  {suggestion.prompt}
                </p>
              </div>

              {/* Alt Text */}
              <div className="mb-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Alt Text:</span> {suggestion.alt_text}
                </p>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                <span>Style: {suggestion.style}</span>
                <span>Aspect: {suggestion.aspect_ratio}</span>
              </div>

              {/* Prompt Variations (Collapsible) */}
              {suggestion.prompt_variations.length > 0 && (
                <details className="mb-3">
                  <summary className="cursor-pointer text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">
                    {suggestion.prompt_variations.length} prompt variations
                  </summary>
                  <ul className="mt-2 space-y-1 pl-4 text-xs text-gray-600 dark:text-gray-400 list-disc">
                    {suggestion.prompt_variations.slice(0, 3).map((variation, vIndex) => (
                      <li key={vIndex} className="line-clamp-1">{variation}</li>
                    ))}
                  </ul>
                </details>
              )}

              {/* Actions */}
              {!isGenerated && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGenerateImage(suggestion, index)}
                    disabled={isGenerating || generating}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isGenerating
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-brand-600 text-white hover:bg-brand-700'
                    }`}
                  >
                    {isGenerating ? (
                      <span className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Generating...
                      </span>
                    ) : (
                      'Generate Image'
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ImageSuggestionsPanel;
