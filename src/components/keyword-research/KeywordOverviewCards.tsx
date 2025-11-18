"use client";

import React from 'react';
import { TrendingUp, DollarSign, Target, Globe, AlertCircle } from 'lucide-react';

interface KeywordMetrics {
  search_volume?: number;
  global_search_volume?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  competition?: number;
  cpc?: number;
  trend_score?: number;
  monthly_searches?: Array<{ month: string; volume: number }>;
  traffic_potential?: number;
  primary_intent?: string;
  intent_probabilities?: Record<string, number>;
}

interface KeywordOverviewCardsProps {
  keyword: string;
  metrics: KeywordMetrics;
  location?: string;
  locationUsed?: string;
}

export function KeywordOverviewCards({
  keyword,
  metrics,
  location = 'United States',
  locationUsed,
}: KeywordOverviewCardsProps) {
  // Convert difficulty to numeric (0-100 scale)
  const getDifficultyScore = (difficulty?: string): number => {
    if (!difficulty) return 50;
    const map: Record<string, number> = { easy: 30, medium: 60, hard: 85 };
    return map[difficulty] || 50;
  };

  const difficultyScore = getDifficultyScore(metrics.difficulty);
  const competitionPercent = metrics.competition ? Math.round(metrics.competition * 100) : 0;
  const searchVolume = metrics.search_volume || 0;
  const cpc = metrics.cpc || 0;
  const trafficPotential = metrics.traffic_potential || (searchVolume * 0.1); // Estimate 10% CTR

  // Location mismatch warning
  const locationMismatch = locationUsed && locationUsed !== location;

  // Get intent badge
  const primaryIntent = metrics.primary_intent || 
    (metrics.intent_probabilities ? Object.keys(metrics.intent_probabilities)[0] : null);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  // Difficulty gauge component
  const DifficultyGauge = ({ score }: { score: number }) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = score <= 40 ? '#10b981' : score <= 70 ? '#f59e0b' : '#ef4444';
    const label = score <= 40 ? 'Easy' : score <= 70 ? 'Medium' : 'Hard';

    return (
      <div className="relative w-32 h-32 mx-auto">
        <svg className="transform -rotate-90 w-32 h-32">
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>
            {score}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        </div>
      </div>
    );
  };

  // Trend sparkline (simplified - would use a chart library in production)
  const TrendSparkline = ({ data }: { data?: Array<{ month: string; volume: number }> }) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-16 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
          No trend data
        </div>
      );
    }

    const maxVolume = Math.max(...data.map(d => d.volume));
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - (d.volume / maxVolume) * 80;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="h-16">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-brand-500"
          />
        </svg>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Keyword Difficulty Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Keyword Difficulty</h3>
          <Target className="h-4 w-4 text-gray-400" />
        </div>
        <DifficultyGauge score={difficultyScore} />
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
          {metrics.difficulty ? metrics.difficulty.charAt(0).toUpperCase() + metrics.difficulty.slice(1) : 'Unknown'}
        </p>
      </div>

      {/* Search Volume & Trend Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Search Volume</h3>
          <TrendingUp className="h-4 w-4 text-gray-400" />
        </div>
        <div className="mb-2">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatNumber(searchVolume)}
          </div>
          {metrics.global_search_volume && metrics.global_search_volume > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Global: {formatNumber(metrics.global_search_volume)}
            </div>
          )}
        </div>
        <TrendSparkline data={metrics.monthly_searches} />
        {metrics.trend_score !== undefined && (
          <div className="flex items-center gap-1 mt-2 text-xs">
            <TrendingUp className={`h-3 w-3 ${metrics.trend_score > 0 ? 'text-green-500' : 'text-red-500'}`} />
            <span className={metrics.trend_score > 0 ? 'text-green-500' : 'text-red-500'}>
              {metrics.trend_score > 0 ? '+' : ''}{metrics.trend_score.toFixed(1)}% trend
            </span>
          </div>
        )}
      </div>

      {/* Traffic Potential Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Traffic Potential</h3>
          <Globe className="h-4 w-4 text-gray-400" />
        </div>
        <div className="mb-2">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatNumber(Math.round(trafficPotential))}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Estimated monthly visits
          </div>
        </div>
        {cpc > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Value</div>
            <div className="text-lg font-semibold text-green-600 dark:text-green-400">
              ${(trafficPotential * cpc * 0.02).toFixed(0)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Est. monthly value</div>
          </div>
        )}
      </div>

      {/* CPC & Competition Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">CPC & Competition</h3>
          <DollarSign className="h-4 w-4 text-gray-400" />
        </div>
        <div className="space-y-4">
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              ${cpc.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Cost per click</div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">Competition</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {competitionPercent}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-brand-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${competitionPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Location Mismatch Warning */}
      {locationMismatch && (
        <div className="col-span-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
              Location Mismatch
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Results are for <strong>{locationUsed}</strong> but you requested <strong>{location}</strong>.
              The API detected your location from IP address.
            </p>
          </div>
        </div>
      )}

      {/* Intent Badge */}
      {primaryIntent && (
        <div className="col-span-full">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 rounded-lg text-sm font-medium">
            <Target className="h-4 w-4" />
            Primary Intent: {primaryIntent.charAt(0).toUpperCase() + primaryIntent.slice(1)}
          </div>
        </div>
      )}
    </div>
  );
}

