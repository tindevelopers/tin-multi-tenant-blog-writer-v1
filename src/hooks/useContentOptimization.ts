/**
 * React Hook: Content Optimization
 * 
 * Hook for optimizing content using the /api/blog-writer/optimize endpoint
 */

import { useState, useCallback } from 'react';
import { blogWriterAPI } from '@/lib/blog-writer-api';

export interface ContentOptimizationResult {
  optimized_content: string;
  changes_made: Array<{
    type: string;
    description: string;
    location: string;
  }>;
  before_scores: { readability: number; seo: number };
  after_scores: { readability: number; seo: number };
  improvements: string[];
}

export function useContentOptimization() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ContentOptimizationResult | null>(null);

  const optimize = useCallback(async (params: {
    content: string;
    topic: string;
    keywords: string[];
    optimization_goals?: string[];
  }) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const optimizationResult = await blogWriterAPI.optimizeContent(params);
      setResult(optimizationResult);
      return optimizationResult;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to optimize content';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    optimize,
    loading,
    error,
    result,
  };
}

