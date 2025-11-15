/**
 * React Component for Blog Generation Progress UI
 * 
 * Displays:
 * - Progress bar
 * - Current stage
 * - Estimated time remaining
 * - Error messages
 * - Final result
 * 
 * Usage:
 * ```tsx
 * <BlogGenerationProgress
 *   status={status}
 *   progress={progress}
 *   currentStage={currentStage}
 *   estimatedTimeRemaining={estimatedTimeRemaining}
 *   error={error}
 *   result={result}
 * />
 * ```
 */

import React from 'react';
import { getWordCountMessage } from '@/lib/word-count-expectations';
import { InternalLinksDisplay } from './InternalLinksDisplay';
import { GeneratedImagesDisplay } from './GeneratedImagesDisplay';
import { ContentStructureDisplay } from './ContentStructureDisplay';

export interface BlogGenerationProgressProps {
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | null;
  progress: number;
  currentStage?: string | null;
  estimatedTimeRemaining?: number | null;
  error?: string | null;
  result?: any | null;
  className?: string;
  contentLength?: 'short' | 'medium' | 'long' | 'extended' | 'very_long';
}

const STAGE_LABELS: Record<string, string> = {
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

export function BlogGenerationProgress({
  status,
  progress,
  currentStage,
  estimatedTimeRemaining,
  error,
  result,
  className = '',
  contentLength,
}: BlogGenerationProgressProps) {
  // Format estimated time
  const formatTime = (seconds: number | null): string => {
    if (!seconds) return '';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Get status color
  const getStatusColor = (): string => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'processing':
        return 'text-blue-600';
      case 'queued':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  // Get progress bar color
  const getProgressColor = (): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'processing':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Show error state
  if (status === 'failed' && error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <h3 className="text-red-800 font-semibold">Generation Failed</h3>
        </div>
        <p className="text-red-700 mt-2">{error}</p>
      </div>
    );
  }

  // Show completed state
  if (status === 'completed' && result) {
    const wordCount = result.content_metadata?.word_count || result.word_count || 0;
    const wordCountMessage = getWordCountMessage(wordCount, contentLength);
    
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 dark:bg-green-900/20 dark:border-green-800">
          <div className="flex items-center mb-2">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h3 className="text-green-800 dark:text-green-200 font-semibold">Blog Generated Successfully!</h3>
          </div>
          <div className="mt-4">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200">{result.title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {wordCountMessage} • 
              SEO Score: {result.seo_score?.toFixed(1) || 'N/A'} • 
              Quality: {result.quality_score?.toFixed(1) || 'N/A'}
              {result.internal_links && result.internal_links.length > 0 && (
                <> • {result.internal_links.length} internal links</>
              )}
              {result.generated_images && result.generated_images.length > 0 && (
                <> • {result.generated_images.length} images</>
              )}
              {result.featured_image && (
                <> • Featured image</>
              )}
            </p>
          </div>
        </div>
        
        {/* v1.3.1 Feature Displays */}
        {result.content && (
          <ContentStructureDisplay 
            content={result.content}
            content_metadata={result.content_metadata}
          />
        )}
        
        {result.internal_links && result.internal_links.length > 0 && (
          <InternalLinksDisplay internal_links={result.internal_links} />
        )}
        
        {(result.featured_image || (result.generated_images && result.generated_images.length > 0)) && (
          <GeneratedImagesDisplay 
            featured_image={result.featured_image}
            generated_images={result.generated_images}
          />
        )}
      </div>
    );
  }

  // Show processing state
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      {/* Status Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`font-semibold ${getStatusColor()}`}>
            {status === 'pending' && 'Preparing...'}
            {status === 'queued' && 'Queued'}
            {status === 'processing' && 'Generating Blog'}
            {status === 'completed' && 'Completed'}
            {status === 'failed' && 'Failed'}
          </h3>
          {currentStage && (
            <p className="text-sm text-gray-600 mt-1">
              {STAGE_LABELS[currentStage] || currentStage}
            </p>
          )}
        </div>
        {estimatedTimeRemaining && (
          <span className="text-sm text-gray-500">
            ~{formatTime(estimatedTimeRemaining)} remaining
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stage Indicator */}
      {currentStage && status === 'processing' && (
        <div className="mt-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Current Stage: {STAGE_LABELS[currentStage] || currentStage}
          </p>
        </div>
      )}

      {/* Spinner for active processing */}
      {status === 'processing' && (
        <div className="flex items-center justify-center mt-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}

