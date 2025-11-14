"use client";

import { useState, useCallback } from 'react';
import contentSuggestionService, { ContentSuggestion, ContentCluster } from '@/lib/content-suggestions';
import { logger } from '@/utils/logger';

export interface UseContentSuggestionsReturn {
  suggestions: ContentSuggestion[];
  clusters: ContentCluster[];
  loading: boolean;
  error: string | null;
  generateSuggestions: (researchResults: any, targetAudience?: string) => Promise<void>;
  selectSuggestion: (suggestionId: string) => ContentSuggestion | null;
  getSuggestionsByType: (type: string) => ContentSuggestion[];
  getSuggestionsByPriority: (priority: string) => ContentSuggestion[];
  clearSuggestions: () => void;
}

export function useContentSuggestions(): UseContentSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<ContentSuggestion[]>([]);
  const [clusters, setClusters] = useState<ContentCluster[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSuggestions = useCallback(async (
    researchResults: any,
    targetAudience: string = 'general'
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      logger.debug('Generating content suggestions', { targetAudience });
      
      // Generate content suggestions from research results
      const newSuggestions = await contentSuggestionService.generateContentSuggestions(
        researchResults,
        targetAudience
      );
      
      logger.debug('Generated suggestions', { count: newSuggestions.length });
      
      // Generate content clusters
      const newClusters = contentSuggestionService.generateContentClusters(newSuggestions);
      
      logger.debug('Generated clusters', { count: newClusters.length });
      
      setSuggestions(newSuggestions);
      setClusters(newClusters);
      
      logger.info(`Generated ${newSuggestions.length} suggestions in ${newClusters.length} clusters`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate content suggestions';
      setError(errorMessage);
      logger.logError(err instanceof Error ? err : new Error(errorMessage), {
        researchResults,
        targetAudience
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const selectSuggestion = useCallback((suggestionId: string): ContentSuggestion | null => {
    return suggestions.find(s => s.id === suggestionId) || null;
  }, [suggestions]);

  const getSuggestionsByType = useCallback((type: string): ContentSuggestion[] => {
    return suggestions.filter(s => s.type === type);
  }, [suggestions]);

  const getSuggestionsByPriority = useCallback((priority: string): ContentSuggestion[] => {
    return suggestions.filter(s => s.priority === priority);
  }, [suggestions]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setClusters([]);
    setError(null);
  }, []);

  return {
    suggestions,
    clusters,
    loading,
    error,
    generateSuggestions,
    selectSuggestion,
    getSuggestionsByType,
    getSuggestionsByPriority,
    clearSuggestions,
  };
}
