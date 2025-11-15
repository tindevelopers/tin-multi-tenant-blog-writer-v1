"use client";

import React, { useState } from 'react';
import { useKeywordDifficulty } from '@/hooks/useKeywordDifficulty';
import { Loader2, TrendingUp, Target, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { KeywordDifficultyRequest } from '@/app/api/keywords/difficulty/route';

interface KeywordDifficultyAnalyzerProps {
  keyword: string;
  searchVolume?: number;
  difficulty?: number;
  competition?: number;
  location?: string;
  onAnalysisComplete?: (data: any) => void;
}

export function KeywordDifficultyAnalyzer({
  keyword,
  searchVolume = 0,
  difficulty = 50,
  competition = 0.5,
  location = 'United States',
  onAnalysisComplete,
}: KeywordDifficultyAnalyzerProps) {
  const { analyzeDifficulty, data, loading, error } = useKeywordDifficulty();
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const handleAnalyze = async () => {
    if (!keyword.trim()) return;

    const request: KeywordDifficultyRequest = {
      keyword: keyword.trim(),
      search_volume: searchVolume || undefined,
      difficulty: difficulty || undefined,
      competition: competition || undefined,
      location,
      language: 'en',
    };

    await analyzeDifficulty(request);
    setHasAnalyzed(true);
    if (data && onAnalysisComplete) {
      onAnalysisComplete(data);
    }
  };

  // Auto-analyze when keyword changes (only once)
  React.useEffect(() => {
    if (keyword.trim() && !hasAnalyzed && !loading && !data) {
      handleAnalyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Analyzing difficulty...</span>
      </div>
    );
  }

  if (error?.message === 'SERVICE_UNAVAILABLE') {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Difficulty analysis is not available for this keyword yet.
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
        <AlertCircle className="w-4 h-4" />
        <span>Error: {error.message}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <button
        onClick={handleAnalyze}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
      >
        Analyze Difficulty
      </button>
    );
  }

  const getDifficultyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low':
        return 'text-green-600 dark:text-green-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'high':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getProbabilityColor = (prob: number) => {
    if (prob >= 0.7) return 'text-green-600 dark:text-green-400';
    if (prob >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 dark:text-white">Difficulty Analysis</h4>
        <CheckCircle2 className="w-5 h-5 text-green-600" />
      </div>

      {/* Overall Difficulty */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Overall Difficulty</span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {data.overall_difficulty}/100
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              data.overall_difficulty < 40
                ? 'bg-green-500'
                : data.overall_difficulty < 70
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${data.overall_difficulty}%` }}
          />
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <Target className="w-3 h-3" />
            Domain Authority
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {data.domain_authority_required}/100
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <TrendingUp className="w-3 h-3" />
            Backlinks
          </div>
          <div className={`text-lg font-semibold ${getDifficultyColor(data.backlink_requirements)}`}>
            {data.backlink_requirements}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Content Length</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {data.content_length_needed.toLocaleString()} words
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Competition</div>
          <div className={`text-lg font-semibold ${getDifficultyColor(data.competition_level)}`}>
            {data.competition_level}
          </div>
        </div>
      </div>

      {/* Time to Rank */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <div className="flex-1">
          <div className="text-xs text-gray-500 dark:text-gray-400">Time to Rank</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {data.time_to_rank}
          </div>
        </div>
      </div>

      {/* Ranking Probability */}
      <div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Ranking Probability</div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">1 month</span>
            <span className={`text-sm font-semibold ${getProbabilityColor(data.ranking_probability['1_month'])}`}>
              {(data.ranking_probability['1_month'] * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">3 months</span>
            <span className={`text-sm font-semibold ${getProbabilityColor(data.ranking_probability['3_months'])}`}>
              {(data.ranking_probability['3_months'] * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">6 months</span>
            <span className={`text-sm font-semibold ${getProbabilityColor(data.ranking_probability['6_months'])}`}>
              {(data.ranking_probability['6_months'] * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Recommendations:
          </div>
          <ul className="space-y-1">
            {data.recommendations.map((rec, idx) => (
              <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

