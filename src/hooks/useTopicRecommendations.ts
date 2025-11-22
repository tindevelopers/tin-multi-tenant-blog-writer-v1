/**
 * React Hook: Topic Recommendations
 * 
 * Hook for getting topic recommendations using the /api/blog-writer/topics/recommend endpoint
 */

import { useState, useCallback } from 'react';
import { blogWriterAPI } from '@/lib/blog-writer-api';

export interface TopicRecommendation {
  title: string;
  description: string;
  keywords: string[];
  search_volume: number;
  difficulty: string;
  content_angle: string;
  estimated_traffic: number;
  // AI Optimization fields (optional)
  aiScore?: number;
  aiSearchVolume?: number;
  traditionalSearchVolume?: number;
  recommended?: boolean;
}

export interface TopicRecommendationsResult {
  topics: TopicRecommendation[];
}

export function useTopicRecommendations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TopicRecommendationsResult | null>(null);

  const recommend = useCallback(async (params: {
    keywords?: string[];
    industry?: string;
    existing_topics?: string[];
    target_audience?: string;
    count?: number;
  }) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const recommendationsResult = await blogWriterAPI.recommendTopics(params);
      setResult(recommendationsResult);
      return recommendationsResult;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get topic recommendations';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    recommend,
    loading,
    error,
    result,
  };
}

