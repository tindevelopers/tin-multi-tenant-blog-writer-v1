/**
 * Content Analysis Panel Component
 * 
 * Displays content analysis results and allows re-analysis
 */

"use client";

import React, { useState } from 'react';
import { useContentAnalysis } from '@/hooks/useContentAnalysis';
import { 
  ChartBarIcon, 
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface ContentAnalysisPanelProps {
  content: string;
  topic?: string;
  keywords?: string[];
  targetAudience?: string;
  onAnalysisComplete?: (result: any) => void;
}

export function ContentAnalysisPanel({
  content,
  topic,
  keywords,
  targetAudience,
  onAnalysisComplete
}: ContentAnalysisPanelProps) {
  const { analyze, loading, error, result } = useContentAnalysis();
  const [showDetails, setShowDetails] = useState(false);

  const handleAnalyze = async () => {
    try {
      const analysisResult = await analyze({
        content,
        topic,
        keywords,
        target_audience: targetAudience
      });
      if (onAnalysisComplete) {
        onAnalysisComplete(analysisResult);
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Content Analysis
          </h3>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading || !content}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? 'Analyzing...' : 'Analyze Content'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Scores */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {result.readability_score}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Readability
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {result.seo_score}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                SEO Score
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {result.quality_score}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Quality
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Word Count:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {result.word_count.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Reading Time:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {result.reading_time_minutes} min
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Headings:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {result.headings_count}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Links:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {result.links_count}
              </span>
            </div>
          </div>

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showDetails ? 'Hide' : 'Show'} Recommendations ({result.recommendations.length})
              </button>
              {showDetails && (
                <ul className="mt-2 space-y-2">
                  {result.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Missing Keywords */}
          {result.missing_keywords && result.missing_keywords.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Missing Keywords:
              </p>
              <div className="flex flex-wrap gap-2">
                {result.missing_keywords.map((keyword: string, index: number) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded text-xs"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

