/**
 * Enhanced Keyword Research Hooks
 * React hooks for Phase 1 keyword research functionality
 */

import { useState, useCallback } from 'react';
import {
  keywordResearchService,
  type KeywordData,
  type KeywordCluster,
  type KeywordAnalysisResponse,
  type KeywordSuggestionResponse,
} from '@/lib/keyword-research-enhanced';

export interface UseKeywordResearchResult {
  // State
  loading: boolean;
  error: string | null;
  keywords: KeywordData[];
  clusters: KeywordCluster[];
  primaryAnalysis: KeywordAnalysisResponse | null;
  suggestions: KeywordSuggestionResponse | null;
  
  // Actions
  researchKeyword: (
    primaryKeyword: string,
    location?: string,
    language?: string
  ) => Promise<void>;
  analyzeKeywords: (
    keywords: string[],
    location?: string,
    language?: string
  ) => Promise<void>;
  createClusters: () => Promise<void>;
  filterEasyWins: (threshold?: number) => KeywordData[];
  filterHighValue: (threshold?: number) => KeywordData[];
  reset: () => void;
}

/**
 * Main hook for enhanced keyword research
 */
export function useEnhancedKeywordResearch(): UseKeywordResearchResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<KeywordData[]>([]);
  const [clusters, setClusters] = useState<KeywordCluster[]>([]);
  const [primaryAnalysis, setPrimaryAnalysis] = useState<KeywordAnalysisResponse | null>(null);
  const [suggestions, setSuggestions] = useState<KeywordSuggestionResponse | null>(null);

  /**
   * Comprehensive keyword research for a primary keyword
   */
  const researchKeyword = useCallback(async (
    primaryKeyword: string,
    location: string = 'United States',
    language: string = 'en'
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await keywordResearchService.comprehensiveResearch(
        primaryKeyword,
        location,
        language
      );

      setPrimaryAnalysis(result.primary);
      setKeywords(result.variations);
      setSuggestions(result.suggestions);

      // Automatically create clusters
      const newClusters = await keywordResearchService.createClusters(result.variations);
      setClusters(newClusters);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Keyword research failed';
      setError(errorMessage);
      console.error('Keyword research error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Analyze specific keywords
   */
  const analyzeKeywords = useCallback(async (
    keywordList: string[],
    location: string = 'United States',
    language: string = 'en'
  ) => {
    setLoading(true);
    setError(null);

    try {
      const results = await keywordResearchService.analyzeKeywords(
        keywordList,
        location,
        language
      );

      const keywordData = results.map((result) => ({
        keyword: result.keyword,
        search_volume: result.search_volume || 0,
        keyword_difficulty: result.difficulty,
        competition_level: result.competition,
        cpc: result.cpc,
        related_keywords: result.related_keywords,
        easy_win_score: 0, // Will be calculated by service
        high_value_score: 0,
      }));

      setKeywords(keywordData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Keyword analysis failed';
      setError(errorMessage);
      console.error('Keyword analysis error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create clusters from current keywords
   */
  const createClusters = useCallback(async () => {
    if (keywords.length === 0) {
      setError('No keywords to cluster');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newClusters = await keywordResearchService.createClusters(keywords);
      setClusters(newClusters);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Clustering failed';
      setError(errorMessage);
      console.error('Clustering error:', err);
    } finally {
      setLoading(false);
    }
  }, [keywords]);

  /**
   * Filter for easy win keywords
   */
  const filterEasyWins = useCallback((threshold: number = 60) => {
    return keywordResearchService.filterEasyWins(keywords, threshold);
  }, [keywords]);

  /**
   * Filter for high value keywords
   */
  const filterHighValue = useCallback((threshold: number = 60) => {
    return keywordResearchService.filterHighValue(keywords, threshold);
  }, [keywords]);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setKeywords([]);
    setClusters([]);
    setPrimaryAnalysis(null);
    setSuggestions(null);
  }, []);

  return {
    loading,
    error,
    keywords,
    clusters,
    primaryAnalysis,
    suggestions,
    researchKeyword,
    analyzeKeywords,
    createClusters,
    filterEasyWins,
    filterHighValue,
    reset,
  };
}

/**
 * Hook for keyword selection state
 */
export function useKeywordSelection() {
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());

  const toggleKeyword = useCallback((keyword: string) => {
    setSelectedKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(keyword)) {
        next.delete(keyword);
      } else {
        next.add(keyword);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((keywords: KeywordData[]) => {
    setSelectedKeywords(new Set(keywords.map((k) => k.keyword)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedKeywords(new Set());
  }, []);

  const isSelected = useCallback((keyword: string) => {
    return selectedKeywords.has(keyword);
  }, [selectedKeywords]);

  return {
    selectedKeywords: Array.from(selectedKeywords),
    toggleKeyword,
    selectAll,
    clearSelection,
    isSelected,
    selectedCount: selectedKeywords.size,
  };
}

/**
 * Hook for filter state management
 */
export interface FilterOptions {
  minSearchVolume: number;
  maxDifficulty: number;
  competitionLevels: Array<'LOW' | 'MEDIUM' | 'HIGH'>;
  minEasyWinScore: number;
  minHighValueScore: number;
  searchQuery: string;
}

export function useKeywordFilters() {
  const [filters, setFilters] = useState<FilterOptions>({
    minSearchVolume: 0,
    maxDifficulty: 100,
    competitionLevels: ['LOW', 'MEDIUM', 'HIGH'],
    minEasyWinScore: 0,
    minHighValueScore: 0,
    searchQuery: '',
  });

  const updateFilter = useCallback(<K extends keyof FilterOptions>(
    key: K,
    value: FilterOptions[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      minSearchVolume: 0,
      maxDifficulty: 100,
      competitionLevels: ['LOW', 'MEDIUM', 'HIGH'],
      minEasyWinScore: 0,
      minHighValueScore: 0,
      searchQuery: '',
    });
  }, []);

  const applyFilters = useCallback((keywords: KeywordData[]): KeywordData[] => {
    return keywords.filter((keyword) => {
      // Search query filter
      if (filters.searchQuery && !keyword.keyword.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
        return false;
      }

      // Volume filter
      if (keyword.search_volume < filters.minSearchVolume) {
        return false;
      }

      // Difficulty filter
      if (keyword.keyword_difficulty > filters.maxDifficulty) {
        return false;
      }

      // Competition filter
      if (!filters.competitionLevels.includes(keyword.competition_level)) {
        return false;
      }

      // Easy win score filter
      if (keyword.easy_win_score < filters.minEasyWinScore) {
        return false;
      }

      // High value score filter
      if (keyword.high_value_score < filters.minHighValueScore) {
        return false;
      }

      return true;
    });
  }, [filters]);

  return {
    filters,
    updateFilter,
    resetFilters,
    applyFilters,
  };
}

