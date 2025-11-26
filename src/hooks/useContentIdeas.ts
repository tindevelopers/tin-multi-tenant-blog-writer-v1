/**
 * React Hook for Content Ideas Generation
 * Provides state management and actions for creating content clusters and ideas
 */

import { useState, useCallback } from 'react';
import { 
  ContentIdeasService, 
  ContentIdeaGenerationRequest,
  ContentIdeaGenerationResponse,
  ContentCluster,
  ContentIdea
} from '@/lib/content-ideas';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';

export interface UseContentIdeasResult {
  // State
  loading: boolean;
  error: string | null;
  clusters: ContentCluster[];
  currentCluster: ContentIdeaGenerationResponse | null;
  contentIdeas: ContentIdea[];
  
  // Actions
  generateContentIdeas: (request: ContentIdeaGenerationRequest) => Promise<void>;
  saveContentCluster: () => Promise<{ success: boolean; cluster_id?: string; error?: string }>;
  loadUserClusters: () => Promise<void>;
  loadClusterContent: (clusterId: string) => Promise<void>;
  selectIdea: (ideaId: string) => void;
  updateIdea: (ideaId: string, updates: Partial<ContentIdea>) => void;
  reset: () => void;
}

export function useContentIdeas(): UseContentIdeasResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clusters, setClusters] = useState<ContentCluster[]>([]);
  const [currentCluster, setCurrentCluster] = useState<ContentIdeaGenerationResponse | null>(null);
  const [contentIdeas, setContentIdeas] = useState<ContentIdea[]>([]);
  const [selectedIdeaIds, setSelectedIdeaIds] = useState<Set<string>>(new Set());

  const contentIdeasService = new ContentIdeasService();

  /**
   * Generate content ideas from keywords
   * Returns the generated cluster so it can be used immediately
   */
  const generateContentIdeas = useCallback(async (request: ContentIdeaGenerationRequest): Promise<ContentIdeaGenerationResponse | null> => {
    try {
      setLoading(true);
      setError(null);

      const result = await contentIdeasService.generateContentIdeas(request);
      setCurrentCluster(result);
      
      // Combine all ideas
      const allIdeas = [
        ...result.pillar_ideas,
        ...result.supporting_ideas,
        ...result.long_tail_ideas,
      ];
      setContentIdeas(allIdeas);

      logger.debug('✅ Generated content ideas:', {
        pillar: result.pillar_ideas.length,
        supporting: result.supporting_ideas.length,
        longTail: result.long_tail_ideas.length,
        total: allIdeas.length,
      });
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate content ideas';
      setError(errorMessage);
      logger.error('Content ideas generation error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Save the current cluster and content ideas to database
   * Can optionally accept a cluster directly to avoid state timing issues
   */
  const saveContentCluster = useCallback(async (clusterOverride?: ContentIdeaGenerationResponse | null) => {
    const clusterToSave = clusterOverride || currentCluster;
    
    if (!clusterToSave) {
      return { success: false, error: 'No cluster to save' };
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const allIdeas = [
        ...clusterToSave.pillar_ideas,
        ...clusterToSave.supporting_ideas,
        ...clusterToSave.long_tail_ideas,
      ];

      const result = await contentIdeasService.saveContentCluster(
        user.id,
        clusterToSave.cluster,
        allIdeas
      );

      if (result.success) {
        // Refresh clusters list
        await loadUserClusters();
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save cluster';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [currentCluster, loadUserClusters]);

  /**
   * Load user's content clusters
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

      const userClusters = await contentIdeasService.getUserClusters(user.id);
      setClusters(userClusters);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load clusters';
      setError(errorMessage);
      logger.error('Load clusters error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load content ideas for a specific cluster
   */
  const loadClusterContent = useCallback(async (clusterId: string) => {
    try {
      setLoading(true);
      setError(null);

      const ideas = await contentIdeasService.getClusterContentIdeas(clusterId);
      setContentIdeas(ideas);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load content ideas';
      setError(errorMessage);
      logger.error('Load content ideas error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Select/deselect an idea
   */
  const selectIdea = useCallback((ideaId: string) => {
    setSelectedIdeaIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ideaId)) {
        newSet.delete(ideaId);
      } else {
        newSet.add(ideaId);
      }
      return newSet;
    });
  }, []);

  /**
   * Update an idea
   */
  const updateIdea = useCallback((ideaId: string, updates: Partial<ContentIdea>) => {
    setContentIdeas(prev => 
      prev.map(idea => 
        idea.id === ideaId ? { ...idea, ...updates } : idea
      )
    );
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setError(null);
    setCurrentCluster(null);
    setContentIdeas([]);
    setSelectedIdeaIds(new Set());
  }, []);

  return {
    // State
    loading,
    error,
    clusters,
    currentCluster,
    contentIdeas,
    
    // Actions
    generateContentIdeas,
    saveContentCluster,
    loadUserClusters,
    loadClusterContent,
    selectIdea,
    updateIdea,
    reset,
  };
}

