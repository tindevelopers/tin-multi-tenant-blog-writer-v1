/**
 * Content Optimization Panel Component
 * 
 * Allows users to optimize content and view changes
 */

"use client";

import React, { useState } from 'react';
import { useContentOptimization } from '@/hooks/useContentOptimization';
import { 
  SparklesIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface ContentOptimizationPanelProps {
  content: string;
  topic: string;
  keywords: string[];
  onOptimized?: (optimizedContent: string) => void;
}

export function ContentOptimizationPanel({
  content,
  topic,
  keywords,
  onOptimized
}: ContentOptimizationPanelProps) {
  const { optimize, loading, error, result } = useContentOptimization();
  const [optimizationGoals, setOptimizationGoals] = useState<string[]>(['seo', 'readability', 'keywords']);
  const [showDiff, setShowDiff] = useState(false);

  const handleOptimize = async () => {
    try {
      const optimizationResult = await optimize({
        content,
        topic,
        keywords,
        optimization_goals: optimizationGoals
      });
      if (onOptimized && optimizationResult) {
        onOptimized(optimizationResult.optimized_content);
      }
    } catch (err) {
      console.error('Optimization failed:', err);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Content Optimization
          </h3>
        </div>
        <button
          onClick={handleOptimize}
          disabled={loading || !content || !topic || keywords.length === 0}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              <SparklesIcon className="w-4 h-4" />
              Optimize Content
            </>
          )}
        </button>
      </div>

      {/* Optimization Goals */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Optimization Goals
        </label>
        <div className="flex flex-wrap gap-2">
          {['seo', 'readability', 'keywords'].map((goal) => (
            <label key={goal} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={optimizationGoals.includes(goal)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setOptimizationGoals([...optimizationGoals, goal]);
                  } else {
                    setOptimizationGoals(optimizationGoals.filter(g => g !== goal));
                  }
                }}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                {goal}
              </span>
            </label>
          ))}
        </div>
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
          {/* Score Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">Before</div>
              <div className="space-y-1">
                <div className="text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Readability:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {result.before_scores.readability}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600 dark:text-gray-400">SEO:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {result.before_scores.seo}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">After</div>
              <div className="space-y-1">
                <div className="text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Readability:</span>
                  <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                    {result.after_scores.readability}
                    {result.after_scores.readability > result.before_scores.readability && (
                      <span className="ml-1">↑</span>
                    )}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600 dark:text-gray-400">SEO:</span>
                  <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                    {result.after_scores.seo}
                    {result.after_scores.seo > result.before_scores.seo && (
                      <span className="ml-1">↑</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Changes Made */}
          {result.changes_made && result.changes_made.length > 0 && (
            <div>
              <button
                onClick={() => setShowDiff(!showDiff)}
                className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline"
              >
                {showDiff ? 'Hide' : 'Show'} Changes ({result.changes_made.length})
              </button>
              {showDiff && (
                <ul className="mt-2 space-y-2">
                  {result.changes_made.map((change: any, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">{change.type}:</span> {change.description}
                        {change.location && (
                          <span className="text-gray-500 dark:text-gray-400 ml-1">
                            ({change.location})
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Improvements */}
          {result.improvements && result.improvements.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Improvements:
              </p>
              <ul className="space-y-1">
                {result.improvements.map((improvement: string, index: number) => (
                  <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Accept/Reject Buttons */}
          {onOptimized && (
            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => onOptimized(result.optimized_content)}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Accept Optimized Content
              </button>
              <button
                onClick={() => setShowDiff(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

