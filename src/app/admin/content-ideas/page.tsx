"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Filter,
  Search,
  FileText,
  TrendingUp,
  Clock,
  Eye,
  Target,
  CheckCircle,
  XCircle,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { logger } from '@/utils/logger';
import { EnhancedContentClustersService } from '@/lib/enhanced-content-clusters';
import { createClient } from '@/lib/supabase/client';
import type { HumanReadableArticle } from '@/lib/enhanced-content-clusters';
import ContentIdeaDetailModal from '@/components/content-ideas/ContentIdeaDetailModal';

type ContentIdeaWithCluster = HumanReadableArticle & {
  cluster_id?: string;
  cluster_name?: string;
  pillar_keyword?: string;
  keywords?: string[]; // May come from database or seo_insights
  seo_insights?: {
    secondary_keywords?: string[];
    semantic_keywords?: string[];
    [key: string]: any;
  };
  internal_links?: any[]; // May be stored as JSONB
};

export default function ContentIdeasPage() {
  const router = useRouter();
  const [ideas, setIdeas] = useState<ContentIdeaWithCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<ContentIdeaWithCluster | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCluster, setFilterCluster] = useState<string>('all');
  const [clusters, setClusters] = useState<Array<{ id: string; cluster_name: string }>>([]);

  const loadContentIdeas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Please log in to view content ideas');
        return;
      }

      // Get user's org_id
      const { data: userProfile } = await supabase
        .from('users')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (!userProfile?.org_id) {
        setError('User organization not found');
        return;
      }

      // Load all clusters for this org
      const { data: clustersData, error: clustersError } = await supabase
        .from('content_clusters')
        .select('id, cluster_name, pillar_keyword, authority_score')
        .eq('org_id', userProfile.org_id)
        .order('created_at', { ascending: false });

      if (clustersError) {
        logger.error('Error loading clusters:', clustersError);
        throw new Error('Failed to load clusters');
      }

      setClusters(clustersData || []);

      // Load all content ideas from all clusters
      const { data: ideasData, error: ideasError } = await supabase
        .from('cluster_content_ideas')
        .select(`
          *,
          cluster:content_clusters!inner(id, cluster_name, pillar_keyword, authority_score)
        `)
        .eq('cluster.org_id', userProfile.org_id)
        .order('created_at', { ascending: false });

      if (ideasError) {
        logger.error('Error loading content ideas:', ideasError);
        throw new Error('Failed to load content ideas');
      }

      // Transform data to include cluster info
      const ideasWithCluster: ContentIdeaWithCluster[] = (ideasData || []).map((idea: any) => ({
        ...idea,
        cluster_id: idea.cluster?.id,
        cluster_name: idea.cluster?.cluster_name,
        pillar_keyword: idea.cluster?.pillar_keyword,
      }));

      setIdeas(ideasWithCluster);
      logger.debug('✅ Loaded content ideas:', { count: ideasWithCluster.length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load content ideas';
      setError(errorMessage);
      logger.error('Error loading content ideas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContentIdeas();
  }, [loadContentIdeas]);

  // Filter ideas
  const filteredIdeas = ideas.filter((idea) => {
    if (searchTerm && !idea.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !idea.target_keyword.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filterType !== 'all' && idea.content_type !== filterType) {
      return false;
    }
    if (filterStatus !== 'all' && idea.status !== filterStatus) {
      return false;
    }
    if (filterCluster !== 'all' && idea.cluster_id !== filterCluster) {
      return false;
    }
    return true;
  });

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'pillar':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'supporting':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'long_tail':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'text-green-600 dark:text-green-400';
      case 'draft':
        return 'text-blue-600 dark:text-blue-400';
      case 'in_progress':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'planned':
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'text-red-600 dark:text-red-400';
    if (priority >= 5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const handleGenerateContent = (idea: ContentIdeaWithCluster) => {
    // Extract keywords from various sources
    let keywordsArray: string[] = [];
    if (Array.isArray(idea.keywords)) {
      keywordsArray = idea.keywords;
    } else if (idea.seo_insights) {
      keywordsArray = [
        ...(idea.seo_insights.secondary_keywords || []),
        ...(idea.seo_insights.semantic_keywords || [])
      ];
    }
    // Always include target_keyword
    if (idea.target_keyword && !keywordsArray.includes(idea.target_keyword)) {
      keywordsArray.unshift(idea.target_keyword);
    }
    
    const params = new URLSearchParams({
      title: idea.title || '',
      topic: idea.target_keyword || '',
      keywords: keywordsArray.length > 0 ? keywordsArray.join(', ') : idea.target_keyword || '',
      target_audience: idea.target_audience || 'general',
      word_count: idea.estimated_word_count?.toString() || '1500',
      content_type: idea.content_type || 'blog',
    });
    
    router.push(`/admin/drafts/new?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Sparkles className="h-8 w-8 animate-pulse text-purple-600 dark:text-purple-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading content ideas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
              <FileText className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              Content Ideas
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              All content ideas ready for creation ({filteredIdeas.length} of {ideas.length})
            </p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search ideas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="pillar">Pillar</option>
            <option value="supporting">Supporting</option>
            <option value="long_tail">Long-tail</option>
            <option value="news">News</option>
            <option value="tutorial">Tutorial</option>
            <option value="review">Review</option>
            <option value="comparison">Comparison</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="idea">Ideas</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>

          {/* Cluster Filter */}
          <select
            value={filterCluster}
            onChange={(e) => setFilterCluster(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Clusters</option>
            {clusters.map((cluster) => (
              <option key={cluster.id} value={cluster.id}>
                {cluster.cluster_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ideas Grid */}
      {filteredIdeas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIdeas.map((idea) => (
            <div
              key={idea.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setSelectedIdea(idea)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getContentTypeColor(idea.content_type)}`}>
                  {idea.content_type.replace('_', ' ')}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${getPriorityColor(idea.priority)}`}>
                    P{idea.priority}
                  </span>
                  {idea.status && (
                    <span className={`text-xs ${getStatusColor(idea.status)}`}>
                      {idea.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Title */}
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                {idea.title}
              </h3>

              {/* Subtitle */}
              {idea.subtitle && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {idea.subtitle}
                </p>
              )}

              {/* Cluster Info */}
              {idea.cluster_name && (
                <div className="flex items-center gap-2 mb-3 text-xs text-gray-500 dark:text-gray-400">
                  <Layers className="h-3 w-3" />
                  <span className="truncate">{idea.cluster_name}</span>
                </div>
              )}

              {/* Target Keyword */}
              <div className="flex items-center gap-2 mb-4 text-sm">
                <Target className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400 font-medium truncate">
                  {idea.target_keyword}
                </span>
              </div>

              {/* Metrics */}
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {idea.estimated_reading_time || Math.ceil((idea.estimated_word_count || 1500) / 200)} min
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  {idea.estimated_traffic || 'N/A'}
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {idea.difficulty_score || 'N/A'}/10
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {idea.estimated_word_count || 1500} words
                </div>
              </div>

              {/* Keywords Preview */}
              {(() => {
                // Extract keywords from various sources
                let keywordsArray: string[] = [];
                if (Array.isArray(idea.keywords)) {
                  keywordsArray = idea.keywords;
                } else if (idea.seo_insights) {
                  keywordsArray = [
                    ...(idea.seo_insights.secondary_keywords || []),
                    ...(idea.seo_insights.semantic_keywords || [])
                  ];
                }
                // Always include target_keyword
                if (idea.target_keyword && !keywordsArray.includes(idea.target_keyword)) {
                  keywordsArray.unshift(idea.target_keyword);
                }
                
                return keywordsArray.length > 0 ? (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {keywordsArray.slice(0, 3).map((keyword, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                        >
                          {keyword}
                        </span>
                      ))}
                      {keywordsArray.length > 3 && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          +{keywordsArray.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIdea(idea);
                  }}
                  className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
                >
                  View Details
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateContent(idea);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 rounded-lg transition-colors"
                >
                  Generate
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {ideas.length === 0
              ? 'No content ideas found. Generate ideas from keyword research.'
              : 'No ideas match your filters'}
          </p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedIdea && (
        <ContentIdeaDetailModal
          idea={selectedIdea}
          onClose={() => setSelectedIdea(null)}
          onGenerate={handleGenerateContent}
        />
      )}
    </div>
  );
}

