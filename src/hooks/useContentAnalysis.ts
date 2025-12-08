/**
 * React Hook: Content Analysis
 * 
 * Hook for analyzing content using the /api/blog-writer/analyze endpoint
 */

import { useState, useCallback } from 'react';
import { blogWriterAPI } from '@/lib/blog-writer-api';

export interface ContentAnalysisResult {
  readability_score: number;
  seo_score: number;
  quality_score: number;
  engagement_score?: number;
  accessibility_score?: number;
  eeat_score?: number;
  keyword_density: Record<string, number>;
  missing_keywords: string[];
  recommendations: string[];
  word_count: number;
  reading_time_minutes: number;
  headings_count: number;
  links_count: number;
  images_count: number;
}

export function useContentAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ContentAnalysisResult | null>(null);

  const analyze = useCallback(async (params: {
    content: string;
    topic?: string;
    keywords?: string[];
    target_audience?: string;
  }) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const analysisResult = await blogWriterAPI.analyzeContent(params);
      setResult(analysisResult);
      return analysisResult;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to analyze content';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    analyze,
    loading,
    error,
    result,
  };
}

