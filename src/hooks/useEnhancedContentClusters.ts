/**
 * Enhanced Content Clusters Hook
 * Provides state management for enhanced content clusters with keyword research integration
 */

import { useState, useCallback } from 'react';
import { 
  EnhancedContentClustersService, 
  ClusterGenerationRequest,
  ClusterGenerationResponse,
  EnhancedContentCluster,
  HumanReadableArticle
} from '@/lib/enhanced-content-clusters';
import { createClient } from '@/lib/supabase/client';
import type { BlogResearchResults } from '@/lib/keyword-research';
import { logger } from '@/utils/logger';

export interface UseEnhancedContentClustersResult {
  // State
  loading: boolean;
  error: string | null;
  clusters: EnhancedContentCluster[];
  currentClusters: ClusterGenerationResponse | null;
  articles: HumanReadableArticle[];
  
  // Actions
  generateClustersFromResearch: (request: ClusterGenerationRequest) => Promise<void>;
  saveEnhancedClusters: () => Promise<{ success: boolean; cluster_ids?: string[]; error?: string }>;
  loadUserClusters: () => Promise<void>;
  loadClusterArticles: (clusterId: string) => Promise<void>;
  deleteCluster: (clusterId: string) => Promise<{ success: boolean; error?: string }>;
  selectArticle: (articleId: string) => void;
  updateArticle: (articleId: string, updates: Partial<HumanReadableArticle>) => void;
  reset: () => void;
}

export function useEnhancedContentClusters(): UseEnhancedContentClustersResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clusters, setClusters] = useState<EnhancedContentCluster[]>([]);
  const [currentClusters, setCurrentClusters] = useState<ClusterGenerationResponse | null>(null);
  const [articles, setArticles] = useState<HumanReadableArticle[]>([]);
  const [selectedArticleIds, setSelectedArticleIds] = useState<Set<string>>(new Set());

  const enhancedClustersService = new EnhancedContentClustersService();

  /**
   * Generate enhanced content clusters from keyword research results
   */
  const generateClustersFromResearch = useCallback(async (request: ClusterGenerationRequest) => {
    try {
      setLoading(true);
      setError(null);

      logger.debug('🔄 Generating enhanced clusters from research...', {
        keywords: request.research_results.keyword_analysis.cluster_groups.length,
        targetAudience: request.target_audience,
        industry: request.industry
      });

      const result = await enhancedClustersService.generateClustersFromResearch(request);
      setCurrentClusters(result);
      
      // Combine all articles from all clusters
      const allArticles: HumanReadableArticle[] = [];
      result.clusters.forEach(cluster => {
        // Note: Articles are generated but not stored in the response yet
        // We'll need to generate them separately or modify the service
      });
      setArticles(allArticles);

      logger.debug('✅ Generated enhanced clusters:', {
        clusters: result.clusters.length,
        articles: result.total_articles_generated,
        trafficEstimate: result.traffic_estimates,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate enhanced clusters';
      setError(errorMessage);
      logger.error('Enhanced clusters generation error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Save the current clusters and articles to database
   */
  const saveEnhancedClusters = useCallback(async () => {
    if (!currentClusters) {
      return { success: false, error: 'No clusters to save' };
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Generate articles for each cluster
      const allArticles: HumanReadableArticle[] = [];
      for (const cluster of currentClusters.clusters) {
        const clusterArticles = await enhancedClustersService['generateHumanReadableArticles'](
          cluster,
          cluster.research_data,
          cluster.target_audience
        );
        allArticles.push(...clusterArticles);
      }

      const result = await enhancedClustersService.saveEnhancedClusters(
        user.id,
        currentClusters.clusters,
        allArticles
      );

      if (result.success) {
        // Refresh clusters list
        await loadUserClusters();
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save enhanced clusters';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [currentClusters]);

  /**
   * Load user's enhanced content clusters
   */
  const loadUserClusters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setError('User not authenticated');
        return;
      }

      logger.debug('🔄 Loading user clusters...');
      const userClusters = await enhancedClustersService.getUserEnhancedClusters(user.id);
      setClusters(userClusters);
      
      logger.debug('✅ Loaded user clusters:', {
        count: userClusters.length,
        clusters: userClusters.map(c => ({ name: c.cluster_name, status: c.cluster_status }))
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load enhanced clusters';
      setError(errorMessage);
      logger.error('Load enhanced clusters error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load articles for a specific cluster
   */
  const loadClusterArticles = useCallback(async (clusterId: string) => {
    try {
      setLoading(true);
      setError(null);

      logger.debug('🔄 Loading cluster articles...', { clusterId });
      const clusterArticles = await enhancedClustersService.getClusterEnhancedArticles(clusterId);
      setArticles(clusterArticles);
      
      logger.debug('✅ Loaded cluster articles:', {
        clusterId,
        count: clusterArticles.length,
        types: clusterArticles.reduce((acc, article) => {
          acc[article.content_type] = (acc[article.content_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load cluster articles';
      setError(errorMessage);
      logger.error('Load cluster articles error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete a saved cluster
   */
  const deleteCluster = useCallback(async (clusterId: string) => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const result = await enhancedClustersService.deleteEnhancedCluster(clusterId, user.id);

      if (result.success) {
        setClusters(prev => prev.filter(cluster => cluster.id !== clusterId));
        setArticles(prev => prev.filter(article => article.cluster_id !== clusterId));
      } else if (result.error) {
        setError(result.error);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete cluster';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Select/deselect an article
   */
  const selectArticle = useCallback((articleId: string) => {
    setSelectedArticleIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(articleId)) {
        newSet.delete(articleId);
      } else {
        newSet.add(articleId);
      }
      return newSet;
    });
  }, []);

  /**
   * Update an article
   */
  const updateArticle = useCallback((articleId: string, updates: Partial<HumanReadableArticle>) => {
    setArticles(prev => 
      prev.map(article => 
        article.id === articleId ? { ...article, ...updates } : article
      )
    );
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setError(null);
    setCurrentClusters(null);
    setArticles([]);
    setSelectedArticleIds(new Set());
  }, []);

  return {
    // State
    loading,
    error,
    clusters,
    currentClusters,
    articles,
    
    // Actions
    generateClustersFromResearch,
    saveEnhancedClusters,
    loadUserClusters,
    loadClusterArticles,
    deleteCluster,
    selectArticle,
    updateArticle,
    reset,
  };
}
