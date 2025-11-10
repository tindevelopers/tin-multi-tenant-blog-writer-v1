/**
 * Recommendations Form Component
 * 
 * Allows users to get keyword-based recommendations without connecting.
 * Useful for previewing recommendations before connecting to an integration.
 */

'use client';

import { useState } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface RecommendationsFormProps {
  provider: 'webflow' | 'wordpress' | 'shopify';
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

interface RecommendationResult {
  provider: string;
  recommended_backlinks: number;
  recommended_interlinks: number;
  per_keyword: Array<{
    keyword: string;
    difficulty?: number;
    suggested_backlinks: number;
    suggested_interlinks: number;
  }>;
  notes?: string;
}

export function RecommendationsForm({
  provider,
  onSuccess,
  onError,
}: RecommendationsFormProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keywords state
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed) && keywords.length < 50) {
      setKeywords((prev) => [...prev, trimmed]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords((prev) => prev.filter((k) => k !== keyword));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    // Validate keywords
    if (keywords.length === 0) {
      setError('Please add at least one keyword');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/integrations/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          keywords,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get recommendations');
      }

      setResult(data.data);
      onSuccess?.(data.data);
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Keywords Input */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Keywords</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Add keywords to get backlink and interlink recommendations. Maximum 50 keywords.
          </p>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddKeyword();
                }
              }}
              placeholder="Enter keyword and press Enter"
              disabled={keywords.length >= 50}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
            />
            <button
              type="button"
              onClick={handleAddKeyword}
              disabled={keywords.length >= 50 || !keywordInput.trim()}
              className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>

          {/* Keywords List */}
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-brand-100 dark:bg-brand-900 text-brand-800 dark:text-brand-200 rounded-full text-sm"
                >
                  {keyword}
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(keyword)}
                    className="hover:text-brand-600 dark:hover:text-brand-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {keywords.length} / 50 keywords
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || keywords.length === 0}
          className="w-full px-4 py-3 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              Getting Recommendations...
            </>
          ) : (
            `Get Recommendations for ${provider.charAt(0).toUpperCase() + provider.slice(1)}`
          )}
        </button>
      </form>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-800 dark:text-red-200">Error</h4>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-4">
            <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-800 dark:text-green-200">
                Recommendations Generated
              </h4>
            </div>
          </div>

          {/* Recommendations Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Recommended Backlinks</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {result.recommended_backlinks}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Recommended Interlinks</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {result.recommended_interlinks}
              </div>
            </div>
          </div>

          {/* Per-Keyword Recommendations */}
          {result.per_keyword && result.per_keyword.length > 0 && (
            <div className="mt-4">
              <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                Per-Keyword Recommendations
              </h5>
              <div className="space-y-2">
                {result.per_keyword.map((item, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 rounded-lg p-3 text-sm"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{item.keyword}</div>
                    <div className="flex gap-4 mt-1 text-gray-600 dark:text-gray-400">
                      <span>Backlinks: {item.suggested_backlinks}</span>
                      <span>Interlinks: {item.suggested_interlinks}</span>
                      {item.difficulty !== undefined && (
                        <span>Difficulty: {item.difficulty.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {result.notes && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> {result.notes}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

