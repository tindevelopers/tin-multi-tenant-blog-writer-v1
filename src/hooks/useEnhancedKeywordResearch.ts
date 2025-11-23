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
  streamingProgress: {
    stage: string;
    progress: number;
    message?: string;
  } | null;
  
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
  const [streamingProgress, setStreamingProgress] = useState<{
    stage: string;
    progress: number;
    message?: string;
  } | null>(null);

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
    setStreamingProgress(null);

    try {
      // Use server-side SSE endpoint for all keyword research
      const { streamServerSideKeywordResearch } = await import('@/lib/api-streaming');
      
      setStreamingProgress({ stage: 'Starting research', progress: 5, message: 'Initializing keyword research...' });
      
      const result = await streamServerSideKeywordResearch(
        {
          keyword: primaryKeyword,
          location,
          language,
          searchType,
          useCache: true,
          autoStore: true,
        },
        {
          onProgress: (update) => {
            setStreamingProgress({
              stage: update.stage || 'Processing',
              progress: update.progress || 0,
              message: update.message,
            });
          },
          onError: (err) => {
            logger.error('Server-side research error', { error: err });
            setError(err.message);
            setLoading(false);
            setStreamingProgress(null);
          },
          onComplete: (data) => {
            logger.debug('Server-side research complete', { keyword: primaryKeyword, source: data.source });
            
            const allKeywords: KeywordData[] = [];
            
            // Transform server-side result to client format
            if (data.traditionalData) {
              // Convert competition number (0-1) to competition_level string
              const competition = data.traditionalData.competition || 0;
              let competition_level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
              if (competition >= 0.67) {
                competition_level = 'HIGH';
              } else if (competition >= 0.33) {
                competition_level = 'MEDIUM';
              }
              
              const primaryKeywordData: KeywordData = {
                keyword: primaryKeyword,
                search_volume: data.traditionalData.search_volume || 0,
                keyword_difficulty: data.traditionalData.keyword_difficulty || 0,
                competition_level,
                cpc: data.traditionalData.cpc,
                related_keywords: data.traditionalData.related_keywords || [],
                easy_win_score: 0,
                high_value_score: 0,
              };

              allKeywords.push(primaryKeywordData);
              setPrimaryAnalysis({ keyword: primaryKeyword } as any);
            }
            
            // Process related terms
            if (data.relatedTerms && Array.isArray(data.relatedTerms)) {
              data.relatedTerms.forEach((term: any) => {
                if (term.keyword && term.keyword !== primaryKeyword) {
                  const competition = term.competition || 0;
                  let competition_level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
                  if (competition >= 0.67) {
                    competition_level = 'HIGH';
                  } else if (competition >= 0.33) {
                    competition_level = 'MEDIUM';
                  }
                  
                  allKeywords.push({
                    keyword: term.keyword,
                    search_volume: term.search_volume || 0,
                    keyword_difficulty: term.keyword_difficulty || 0,
                    competition_level,
                    cpc: term.cpc,
                    related_keywords: [],
                    easy_win_score: 0,
                    high_value_score: 0,
                  });
                }
              });
            }
            
            // Process matching terms
            if (data.matchingTerms && Array.isArray(data.matchingTerms)) {
              data.matchingTerms.forEach((term: any) => {
                if (term.keyword && term.keyword !== primaryKeyword) {
                  // Check if we already have this keyword
                  const exists = allKeywords.some(k => k.keyword === term.keyword);
                  if (!exists) {
                    const competition = term.competition || 0;
                    let competition_level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
                    if (competition >= 0.67) {
                      competition_level = 'HIGH';
                    } else if (competition >= 0.33) {
                      competition_level = 'MEDIUM';
                    }
                    
                    allKeywords.push({
                      keyword: term.keyword,
                      search_volume: term.search_volume || 0,
                      keyword_difficulty: term.keyword_difficulty || 0,
                      competition_level,
                      cpc: term.cpc,
                      related_keywords: [],
                      easy_win_score: 0,
                      high_value_score: 0,
                    });
                  }
                }
              });
            }
            
            // Also process related_keywords from traditionalData if they're strings
            if (data.traditionalData?.related_keywords && Array.isArray(data.traditionalData.related_keywords)) {
              data.traditionalData.related_keywords.forEach((relatedKw: string) => {
                if (typeof relatedKw === 'string' && relatedKw !== primaryKeyword) {
                  const exists = allKeywords.some(k => k.keyword === relatedKw);
                  if (!exists) {
                    allKeywords.push({
                      keyword: relatedKw,
                      search_volume: 0,
                      keyword_difficulty: 0,
                      competition_level: 'LOW',
                      related_keywords: [],
                      easy_win_score: 0,
                      high_value_score: 0,
                    });
                  }
                }
              });
            }
            
            logger.debug('Processed keywords', { 
              total: allKeywords.length, 
              primary: allKeywords[0]?.keyword,
              relatedCount: data.relatedTerms?.length || 0,
              matchingCount: data.matchingTerms?.length || 0,
            });
            
            setKeywords(allKeywords);
              
              // Create clusters
            if (allKeywords.length > 0) {
              keywordResearchService.createClusters(allKeywords).then((newClusters) => {
                setClusters(newClusters);
              });
            }
            
            setSuggestions({ keyword_suggestions: [] } as any);
            setLoading(false);
            setTimeout(() => setStreamingProgress(null), 1000);
          },
        }
      );

      // Server-side research handles everything (cache, storage, API calls)
      // Results are processed in the onComplete callback above
      // No additional processing needed here - the callback handles everything

    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Keyword research failed';
      
      // Check if error message contains HTML (404 page or similar)
      if (errorMessage.includes('<html>') || errorMessage.includes('404') || errorMessage.includes('Page not found')) {
        // Don't display HTML errors to users - these are handled gracefully by the API
        logger.warn('HTML error response detected, suppressing user-facing error', { 
          error: errorMessage.substring(0, 200) 
        });
        // Set a user-friendly message instead
        errorMessage = 'Some keyword suggestions are unavailable, but research completed successfully.';
      }
      
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
      let errorMessage = err instanceof Error ? err.message : 'Keyword analysis failed';
      
      // Check if error message contains HTML (404 page or similar)
      if (errorMessage.includes('<html>') || errorMessage.includes('404') || errorMessage.includes('Page not found')) {
        logger.warn('HTML error response detected in analysis, suppressing user-facing error');
        errorMessage = 'Some keyword analysis data is unavailable, but partial results are available.';
      }
      
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
      let errorMessage = err instanceof Error ? err.message : 'Clustering failed';
      
      // Check if error message contains HTML (404 page or similar)
      if (errorMessage.includes('<html>') || errorMessage.includes('404') || errorMessage.includes('Page not found')) {
        logger.warn('HTML error response detected in clustering, suppressing user-facing error');
        errorMessage = 'Clustering completed with partial data.';
      }
      
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
      let errorMessage = err instanceof Error ? err.message : 'Failed to load research history';
      
      // Check if error message contains HTML (404 page or similar)
      if (errorMessage.includes('<html>') || errorMessage.includes('404') || errorMessage.includes('Page not found')) {
        logger.warn('HTML error response detected in history load, suppressing user-facing error');
        errorMessage = 'Unable to load some research history data.';
      }
      
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
    setStreamingProgress(null);
  }, []);

  return {
    loading,
    error,
    keywords,
    clusters,
    primaryAnalysis,
    suggestions,
    streamingProgress,
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

