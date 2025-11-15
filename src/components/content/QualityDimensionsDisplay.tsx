/**
 * Quality Dimensions Display Component
 * 
 * Displays quality dimensions breakdown from blog generation response
 */

"use client";

import React from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';

interface QualityDimensions {
  readability?: number;
  seo?: number;
  structure?: number;
  factual?: number;
  uniqueness?: number;
  engagement?: number;
}

interface QualityDimensionsDisplayProps {
  dimensions: QualityDimensions | null | undefined;
  overallScore?: number | null;
  className?: string;
}

export function QualityDimensionsDisplay({
  dimensions,
  overallScore,
  className = ''
}: QualityDimensionsDisplayProps) {
  if (!dimensions || Object.keys(dimensions).length === 0) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/20';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  const dimensionLabels: Record<string, string> = {
    readability: 'Readability',
    seo: 'SEO',
    structure: 'Structure',
    factual: 'Factual Accuracy',
    uniqueness: 'Uniqueness',
    engagement: 'Engagement'
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <ChartBarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Quality Dimensions
        </h3>
        {overallScore !== null && overallScore !== undefined && (
          <div className="ml-auto">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {overallScore}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Overall
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {Object.entries(dimensions).map(([key, value]) => {
          if (value === null || value === undefined) return null;
          
          const score = typeof value === 'number' ? value : 0;
          const label = dimensionLabels[key] || key;

          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {label}
                </span>
                <span className={`text-sm font-semibold ${getScoreColor(score)}`}>
                  {score}/100
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getScoreBgColor(score)}`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

