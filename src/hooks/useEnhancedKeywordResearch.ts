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
import { KeywordStorageService } from '@/lib/keyword-storage';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';

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
    language?: string,
    searchType?: 'traditional' | 'ai' | 'both'
  ) => Promise<void>;
  analyzeKeywords: (
    keywords: string[],
    location?: string,
    language?: string
  ) => Promise<void>;
  createClusters: () => Promise<void>;
  filterEasyWins: (threshold?: number) => KeywordData[];
  filterHighValue: (threshold?: number) => KeywordData[];
  loadFromHistory: (historyId: string) => Promise<void>;
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
    language: string = 'en',
    searchType: 'traditional' | 'ai' | 'both' = 'traditional'
  ) => {
    setLoading(true);
    setError(null);

    try {
      // Use keyword research with storage (includes caching)
      const keywordResearchWithStorage = (await import('@/lib/keyword-research-with-storage')).default;
      
      // Check cache first
      const cachedResult = await keywordResearchWithStorage.researchKeyword(
        primaryKeyword,
        {
          searchType,
          location,
          language,
          autoStore: true,
          useCache: true,
          includeRelatedTerms: true,
        }
      );

      // If we got cached data, use it
      if (cachedResult.cached && cachedResult.traditionalData) {
        logger.debug('Using cached keyword data', { keyword: primaryKeyword, source: cachedResult.source });
        
        // Transform cached data to match expected format
        const cachedKeywordData: KeywordData = {
          keyword: primaryKeyword,
          search_volume: cachedResult.traditionalData.search_volume || 0,
          keyword_difficulty: cachedResult.traditionalData.keyword_difficulty || 0,
          competition: cachedResult.traditionalData.competition || 0,
          cpc: cachedResult.traditionalData.cpc,
          related_keywords: cachedResult.traditionalData.related_keywords || [],
          recommended: false,
          reason: 'Cached data',
        };

        setPrimaryAnalysis({ keyword: primaryKeyword } as any);
        setKeywords([cachedKeywordData]);
        setSuggestions({ keyword_suggestions: [] } as any);
        
        // Still create clusters from cached data
        const newClusters = await keywordResearchService.createClusters([cachedKeywordData]);
        setClusters(newClusters);
        
        setLoading(false);
        return;
      }

      // If not cached, proceed with full research
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

      // Save to database
      try {
        logger.debug('🔍 Attempting to save keywords to database...');
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        logger.debug('🔍 User auth result:', { user: user?.id, error: userError?.message });
        
        if (userError) {
          logger.error('❌ Auth error when saving keywords:', userError);
          throw userError;
        }
        
        if (!user) {
          logger.error('❌ No user authenticated when saving keywords');
          throw new Error('User not authenticated');
        }

        logger.debug('✅ User authenticated:', user.id);
        
        // Use enhanced keyword storage with automatic caching
        const enhancedKeywordStorage = (await import('@/lib/keyword-storage-enhanced')).default;
        
        // Store primary keyword research with full data
        const primaryKeywordData = result.variations.find(k => 
          k.keyword.toLowerCase() === primaryKeyword.toLowerCase()
        ) || result.variations[0];
        
        if (primaryKeywordData) {
          const storeResult = await enhancedKeywordStorage.storeKeywordResearch(
            user.id,
            {
              keyword: primaryKeyword,
              location,
              language,
              search_type: searchType,
              traditional_data: {
                keyword: primaryKeywordData.keyword,
                search_volume: primaryKeywordData.search_volume || 0,
                keyword_difficulty: primaryKeywordData.keyword_difficulty || 0,
                competition: primaryKeywordData.competition || 0,
                cpc: primaryKeywordData.cpc,
                related_keywords: primaryKeywordData.related_keywords || [],
              },
              related_terms: result.variations.slice(1, 51).map(k => ({
                keyword: k.keyword,
                search_volume: k.search_volume || 0,
                keyword_difficulty: k.keyword_difficulty || 0,
                competition: k.competition || 0,
                cpc: k.cpc,
              })),
            }
          );
          
          if (storeResult.success) {
            logger.debug('✅ Keyword research stored with caching');
          }
        }
        
        // Also save to legacy storage for compatibility
        const keywordStorage = new KeywordStorageService();
        const storageKeywords = result.variations.map(k => ({
          keyword: k.keyword,
          search_volume: k.search_volume,
          difficulty: (k.keyword_difficulty <= 30 ? 'easy' : k.keyword_difficulty <= 60 ? 'medium' : 'hard') as 'easy' | 'medium' | 'hard',
          competition: k.competition_level === 'LOW' ? 0.2 : k.competition_level === 'MEDIUM' ? 0.5 : 0.8,
          cpc: k.cpc,
          trend_score: k.high_value_score,
          recommended: k.easy_win_score >= 60 || k.high_value_score >= 60,
          reason: k.easy_win_score >= 60 ? 'Easy win opportunity' : 'High value keyword',
          related_keywords: k.related_keywords || [],
          long_tail_keywords: (k.related_keywords || []).slice(0, 3)
        }));

        const saveResult = await keywordStorage.saveKeywords(
          user.id,
          primaryKeyword,
          storageKeywords,
          {
            location,
            language,
            clusters: newClusters,
            primaryAnalysis: result.primary
          }
        );
        
        if (saveResult.success) {
          logger.debug('✅ Keywords saved to database successfully');
        }
      } catch (saveError) {
        logger.error('⚠️ Failed to save keywords to database:', saveError);
        // Don't fail the entire research if saving fails
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Keyword research failed';
      setError(errorMessage);
      logger.error('Keyword research error:', err);
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

      // Transform results using the service's transform method
      const keywordData = results.map((result) => {
        // Convert string difficulty to number
        const difficultyMap: Record<string, number> = {
          'easy': 20,
          'medium': 50,
          'hard': 80,
        };
        const difficultyScore = difficultyMap[result.difficulty.toLowerCase()] || 50;
        
        // Convert decimal competition to level
        const competitionLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 
          result.competition < 0.3 ? 'LOW' :
          result.competition < 0.7 ? 'MEDIUM' : 'HIGH';

        return {
          keyword: result.keyword,
          search_volume: result.search_volume || 0,
          keyword_difficulty: difficultyScore,
          competition_level: competitionLevel,
          cpc: result.cpc || 0,
          related_keywords: result.related_keywords,
          easy_win_score: 0, // Will be calculated
          high_value_score: 0,
        };
      });

      setKeywords(keywordData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Keyword analysis failed';
      setError(errorMessage);
      logger.error('Keyword analysis error:', err);
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
      logger.error('Clustering error:', err);
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
   * Load research from history
   */
  const loadFromHistory = useCallback(async (historyId: string) => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('User not authenticated');
        return;
      }

      const keywordStorage = new KeywordStorageService();
      const history = await keywordStorage.getUserResearchSessions(user.id);
      const selectedHistory = history.find((h: any) => h.id === historyId);
      
      if (!selectedHistory) {
        setError('Research history not found');
        return;
      }

      // Transform stored keywords back to KeywordData format
      const keywordData: KeywordData[] = selectedHistory.keywords.map((k: any) => ({
        keyword: k.keyword,
        search_volume: k.search_volume || 0,
        keyword_difficulty: k.difficulty === 'easy' ? 20 : k.difficulty === 'medium' ? 50 : 80,
        competition_level: k.competition < 0.3 ? 'LOW' : k.competition < 0.7 ? 'MEDIUM' : 'HIGH',
        cpc: k.cpc || 0,
        related_keywords: k.related_keywords,
        easy_win_score: k.difficulty === 'easy' ? 70 : k.difficulty === 'medium' ? 40 : 20,
        high_value_score: (k.search_volume || 0) > 1000 ? 70 : (k.search_volume || 0) > 500 ? 50 : 30,
      }));

      setKeywords(keywordData);
      setPrimaryAnalysis({
        keyword: selectedHistory.topic,
        search_volume: keywordData[0]?.search_volume || 0,
        difficulty: 'medium' as 'easy' | 'medium' | 'hard',
        competition: 0.5,
        cpc: keywordData[0]?.cpc || 0,
        related_keywords: keywordData.flatMap(k => k.related_keywords),
        long_tail_keywords: keywordData[0]?.related_keywords?.slice(0, 3) || [],
        recommended: (keywordData[0]?.easy_win_score || 0) >= 60 || (keywordData[0]?.high_value_score || 0) >= 60,
        reason: (keywordData[0]?.easy_win_score || 0) >= 60 ? 'Easy win opportunity' : 'High value keyword'
      } as any);

      // Create clusters from loaded keywords
      const keywordClusters = await keywordResearchService.createClusters(keywordData);
      setClusters(keywordClusters);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load research history';
      setError(errorMessage);
      logger.error('Load history error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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
    loadFromHistory,
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
    selectedKeywords,
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

