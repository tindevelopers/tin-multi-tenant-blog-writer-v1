'use client';

import React from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export interface StreamingProgressProps {
  stage: string;
  progress: number;
  message?: string;
  isComplete?: boolean;
  error?: string;
}

export default function StreamingProgress({
  stage,
  progress,
  message,
  isComplete = false,
  error,
}: StreamingProgressProps) {
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900 dark:text-red-200">Error</p>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900 dark:text-green-200">Complete</p>
            <p className="text-sm text-green-700 dark:text-green-300">{message || 'Research completed successfully'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-200">{stage}</p>
          {message && (
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">{message}</p>
          )}
        </div>
        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{progress}%</span>
      </div>
      <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
        <div
          className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

