"use client";

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';
import keywordResearchService, { 
  BlogResearchResults, 
  KeywordAnalysis, 
  TitleSuggestion,
  KeywordData 
} from '@/lib/keyword-research';

export interface UseKeywordResearchReturn {
  // Research state
  isResearching: boolean;
  researchResults: BlogResearchResults | null;
  researchError: string | null;
  
  // Individual research functions
  extractKeywords: (text: string) => Promise<string[]>;
  analyzeKeywords: (keywords: string[]) => Promise<KeywordAnalysis>;
  getKeywordSuggestions: (keywords: string[]) => Promise<string[]>;
  generateTitles: (primaryKeyword: string, secondaryKeywords: string[], audience?: string) => Promise<TitleSuggestion[]>;
  
  // Full research workflow
  performFullResearch: (topic: string, audience?: string, userId?: string) => Promise<BlogResearchResults>;
  
  // Utilities
  reset: () => void;
}

export function useKeywordResearch(): UseKeywordResearchReturn {
  const [isResearching, setIsResearching] = useState(false);
  const [researchResults, setResearchResults] = useState<BlogResearchResults | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);

  const extractKeywords = useCallback(async (text: string): Promise<string[]> => {
    try {
      setResearchError(null);
      return await keywordResearchService.extractKeywords(text);
    } catch (error: any) {
      setResearchError(error.message);
      throw error;
    }
  }, []);

  const analyzeKeywords = useCallback(async (keywords: string[]): Promise<KeywordAnalysis> => {
    try {
      setResearchError(null);
      return await keywordResearchService.analyzeKeywords(keywords);
    } catch (error: any) {
      setResearchError(error.message);
      throw error;
    }
  }, []);

  const getKeywordSuggestions = useCallback(async (keywords: string[]): Promise<string[]> => {
    try {
      setResearchError(null);
      return await keywordResearchService.getKeywordSuggestions(keywords);
    } catch (error: any) {
      setResearchError(error.message);
      throw error;
    }
  }, []);

  const generateTitles = useCallback(async (
    primaryKeyword: string, 
    secondaryKeywords: string[], 
    audience: string = 'general'
  ): Promise<TitleSuggestion[]> => {
    try {
      setResearchError(null);
      return await keywordResearchService.generateTitleSuggestions(primaryKeyword, secondaryKeywords, audience);
    } catch (error: any) {
      setResearchError(error.message);
      throw error;
    }
  }, []);

  const performFullResearch = useCallback(async (
    topic: string, 
    audience: string = 'general',
    userId?: string
  ): Promise<BlogResearchResults> => {
    setIsResearching(true);
    setResearchError(null);
    setResearchResults(null);

    try {
      logger.debug('🔬 Starting full keyword research for:', topic);
      const results = await keywordResearchService.performBlogResearch(topic, audience, userId);
      
      setResearchResults(results);
      logger.debug('✅ Keyword research completed:', results);
      
      return results;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to perform keyword research';
      setResearchError(errorMessage);
      logger.error('❌ Keyword research failed:', error);
      throw error;
    } finally {
      setIsResearching(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsResearching(false);
    setResearchResults(null);
    setResearchError(null);
  }, []);

  return {
    isResearching,
    researchResults,
    researchError,
    extractKeywords,
    analyzeKeywords,
    getKeywordSuggestions,
    generateTitles,
    performFullResearch,
    reset,
  };
}

// Hook for keyword analysis display
export function useKeywordAnalysis(keywords: string[] | null) {
  const [analysis, setAnalysis] = useState<KeywordAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { analyzeKeywords } = useKeywordResearch();

  useEffect(() => {
    if (!keywords || keywords.length === 0) {
      setAnalysis(null);
      return;
    }

    const performAnalysis = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await analyzeKeywords(keywords);
        setAnalysis(result);
      } catch (err: any) {
        setError(err.message);
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    };

    performAnalysis();
  }, [keywords, analyzeKeywords]);

  return { analysis, loading, error };
}

// Hook for title suggestions
export function useTitleSuggestions(
  primaryKeyword: string | null,
  secondaryKeywords: string[] | null,
  targetAudience: string = 'general'
) {
  const [titles, setTitles] = useState<TitleSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { generateTitles } = useKeywordResearch();

  useEffect(() => {
    if (!primaryKeyword) {
      setTitles([]);
      return;
    }

    const generateTitleSuggestions = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await generateTitles(
          primaryKeyword, 
          secondaryKeywords || [], 
          targetAudience
        );
        setTitles(result);
      } catch (err: any) {
        setError(err.message);
        setTitles([]);
      } finally {
        setLoading(false);
      }
    };

    generateTitleSuggestions();
  }, [primaryKeyword, secondaryKeywords, targetAudience, generateTitles]);

  return { titles, loading, error };
}

// Hook for keyword clustering visualization
export function useKeywordClusters(keywordAnalysis: KeywordAnalysis | null) {
  const [clusters, setClusters] = useState<any[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  useEffect(() => {
    if (keywordAnalysis?.cluster_groups) {
      const clusterData = keywordAnalysis.cluster_groups.map(cluster => ({
        ...cluster,
        size: cluster.keywords.length,
        difficulty: cluster.avg_difficulty,
        competition: cluster.avg_competition,
      }));
      setClusters(clusterData);
    } else {
      setClusters([]);
    }
  }, [keywordAnalysis]);

  const selectCluster = useCallback((clusterId: string | null) => {
    setSelectedCluster(clusterId);
  }, []);

  const getClusterById = useCallback((clusterId: string) => {
    return clusters.find(cluster => cluster.id === clusterId);
  }, [clusters]);

  return {
    clusters,
    selectedCluster,
    selectCluster,
    getClusterById,
  };
}

// Hook for research progress tracking
export function useResearchProgress() {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [totalSteps] = useState<number>(5);
  const [stepNames] = useState<string[]>([
    'Extracting keywords',
    'Getting suggestions',
    'Analyzing competition',
    'Generating titles',
    'Creating strategy'
  ]);

  const [isComplete, setIsComplete] = useState(false);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => {
      const next = prev + 1;
      if (next >= totalSteps) {
        setIsComplete(true);
        return prev;
      }
      return next;
    });
  }, [totalSteps]);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setIsComplete(false);
  }, []);

  const progress = (currentStep / totalSteps) * 100;

  return {
    currentStep,
    totalSteps,
    stepNames,
    isComplete,
    progress,
    nextStep,
    reset,
    currentStepName: stepNames[currentStep] || '',
  };
}
