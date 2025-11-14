"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { 
  Layers, 
  Plus, 
  Search, 
  Filter,
  TrendingUp,
  Users,
  Target,
  BarChart3,
  Lightbulb,
  FileText,
  Clock,
  Eye,
  ArrowRight,
  Sparkles,
  Zap
} from 'lucide-react';
import { useEnhancedContentClusters } from '@/hooks/useEnhancedContentClusters';
import type { BlogResearchResults } from '@/lib/keyword-research';
import type { ClusterGenerationRequest } from '@/lib/enhanced-content-clusters';

interface EnhancedContentClustersPanelProps {
  researchResults?: BlogResearchResults | null;
  onClustersGenerated?: (clusters: any) => void;
  onSuggestionSelect?: (suggestion: any) => void;
  onGenerateBlog?: (blogContent: any) => void;
  onDraftSaved?: (draftId: string) => void;
  targetAudience?: string;
  industry?: string;
}

function EnhancedContentClustersPanel({
  researchResults,
  onClustersGenerated,
  onSuggestionSelect,
  onGenerateBlog,
  onDraftSaved,
  targetAudience,
  industry
}: EnhancedContentClustersPanelProps) {
  const router = useRouter();
  const {
    loading,
    error,
    clusters,
    currentClusters,
    articles,
    generateClustersFromResearch,
    saveEnhancedClusters,
    loadUserClusters,
    loadClusterArticles,
    selectArticle,
    updateArticle,
    reset
  } = useEnhancedContentClusters();

  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showClusterDetails, setShowClusterDetails] = useState(false);

  useEffect(() => {
    loadUserClusters();
  }, [loadUserClusters]);

  const handleGenerateClusters = useCallback(async () => {
    if (!researchResults) {
      logger.warn('No research results available');
      return;
    }

    const request: ClusterGenerationRequest = {
      research_results: researchResults,
      target_audience: targetAudience,
      industry: industry,
      content_strategy: 'hub-and-spoke',
      max_keywords_per_cluster: 25 // Optimize beyond 15 limit
    };

    await generateClustersFromResearch(request);
  }, [researchResults, targetAudience, industry, generateClustersFromResearch]);

  const handleSaveClusters = async () => {
    const result = await saveEnhancedClusters();
    if (result.success && onClustersGenerated) {
      onClustersGenerated(currentClusters);
    }
  };

  const selectedCluster = clusters.find(c => c.id === selectedClusterId);
  const filteredArticles = articles.filter(article => {
    if (filterStatus !== 'all' && article.status !== filterStatus) return false;
    if (filterType !== 'all' && article.content_type !== filterType) return false;
    return true;
  });

  const pillarArticles = articles.filter(a => a.content_type === 'pillar');
  const supportingArticles = articles.filter(a => a.content_type === 'supporting');
  const longTailArticles = articles.filter(a => a.content_type === 'long_tail');

  const getContentTypeColor = (type: string) => {
    const colors = {
      pillar: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      supporting: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      long_tail: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      news: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      tutorial: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      review: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      comparison: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    };
    return (colors as any)[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'text-red-600 dark:text-red-400';
    if (priority >= 6) return 'text-orange-600 dark:text-orange-400';
    if (priority >= 4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getTrafficColor = (potential: string) => {
    const colors = {
      high: 'text-green-600 dark:text-green-400',
      medium: 'text-yellow-600 dark:text-yellow-400',
      low: 'text-gray-600 dark:text-gray-400'
    };
    return (colors as any)[potential] || 'text-gray-600 dark:text-gray-400';
  };

  if (loading && !clusters.length) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading content clusters...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Generate Clusters Button */}
      {researchResults && !currentClusters && (
        <div className="flex justify-end">
          <button
            onClick={handleGenerateClusters}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Generate Clusters
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Research Results Available */}
      {researchResults && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Keyword Research Complete
              </h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Found {researchResults.keyword_analysis.cluster_groups.length} keyword clusters and {researchResults.title_suggestions.length} title suggestions
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Clusters (Generated but not saved) */}
      {currentClusters && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  Clusters Generated Successfully
                </h3>
                <p className="text-green-700 dark:text-green-300 text-sm">
                  {currentClusters.clusters.length} clusters with {currentClusters.total_articles_generated} articles
                </p>
              </div>
            </div>
            <button
              onClick={handleSaveClusters}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Save Clusters
            </button>
          </div>

          {/* Traffic Estimates */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {currentClusters.traffic_estimates.low.toLocaleString()}
              </div>
              <div className="text-xs text-green-700 dark:text-green-300">Low Traffic</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {currentClusters.traffic_estimates.medium.toLocaleString()}
              </div>
              <div className="text-xs text-yellow-700 dark:text-yellow-300">Medium Traffic</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {currentClusters.traffic_estimates.high.toLocaleString()}
              </div>
              <div className="text-xs text-red-700 dark:text-red-300">High Traffic</div>
            </div>
          </div>

          {/* Generated Clusters Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentClusters.clusters.map((cluster, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {cluster.cluster_name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Pillar: {cluster.pillar_keyword}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${getTrafficColor(cluster.estimated_traffic_potential)}`}>
                    {cluster.estimated_traffic_potential} potential
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {cluster.content_count} articles
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Strategy Summary */}
          <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Strategy Summary</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {currentClusters.content_strategy_summary}
            </p>
          </div>

          {/* Recommendations */}
          <div className="mt-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Recommendations</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              {currentClusters.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !clusters.length && !currentClusters && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
              <Layers className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Content Clusters Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {researchResults 
              ? "Click 'Generate Clusters' to create content clusters from your keyword research."
              : "Start by researching keywords to create your first content cluster and generate content ideas."
            }
          </p>
          {!researchResults && (
            <button
              onClick={() => router.push('/admin/drafts/new')}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Search className="h-4 w-4" />
              Start Keyword Research
            </button>
          )}
        </div>
      )}

      {/* Saved Clusters List */}
      {clusters.length > 0 && !selectedClusterId && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clusters.map(cluster => (
            <div key={cluster.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {cluster.cluster_name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Pillar: <span className="font-medium">{cluster.pillar_keyword}</span>
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTrafficColor(cluster.estimated_traffic_potential)} bg-opacity-20`}>
                  {cluster.estimated_traffic_potential}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {cluster.pillar_content_count}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Pillar</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {cluster.supporting_content_count}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Supporting</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    {cluster.long_tail_content_count}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Long-tail</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Authority: {cluster.authority_score}/10
                </div>
                <button
                  onClick={() => {
                    setSelectedClusterId(cluster.id || null);
                    if (cluster.id) loadClusterArticles(cluster.id);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                >
                  View Articles
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cluster Detail View */}
      {selectedClusterId && selectedCluster && (
        <div>
          {/* Back Button and Cluster Header */}
          <div className="mb-6">
            <button
              onClick={() => setSelectedClusterId(null)}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              Back to Clusters
            </button>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {selectedCluster.cluster_name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    Pillar Keyword: <span className="font-semibold">{selectedCluster.pillar_keyword}</span>
                  </p>
                  {selectedCluster.cluster_description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedCluster.cluster_description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedCluster.authority_score}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Authority</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold ${getTrafficColor(selectedCluster.estimated_traffic_potential)}`}>
                      {selectedCluster.estimated_traffic_potential}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Traffic</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {pillarArticles.length}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Pillar</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {supportingArticles.length}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Supporting</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {longTailArticles.length}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Long-tail</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {articles.length}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex gap-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="pillar">Pillar Content</option>
              <option value="supporting">Supporting Content</option>
              <option value="long_tail">Long-tail Content</option>
              <option value="news">News</option>
              <option value="tutorial">Tutorial</option>
              <option value="review">Review</option>
              <option value="comparison">Comparison</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="idea">Ideas</option>
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          {/* Articles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(() => {
              logger.debug('Rendering articles grid', {
                totalArticles: articles.length,
                filteredArticles: filteredArticles.length,
                selectedClusterId,
                articles: articles.map(a => ({ id: a.id, title: a.title, content_type: a.content_type }))
              });
              return null;
            })()}
            {filteredArticles.map(article => (
              <div key={article.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getContentTypeColor(article.content_type)}`}>
                    {article.content_type.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getPriorityColor(article.priority)}`}>
                      P{article.priority}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {article.estimated_word_count} words
                    </span>
                  </div>
                </div>

                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {article.title}
                </h3>

                {article.subtitle && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {article.subtitle}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {article.estimated_reading_time} min
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    {article.estimated_traffic}
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {article.difficulty_score}/10
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    {article.target_keyword}
                  </span>
                  <button
                    onClick={() => {
                      logger.debug('Generate button clicked for article', {
                        articleId: article.id,
                        articleTitle: article.title,
                        hasOnSuggestionSelect: !!onSuggestionSelect
                      });
                      
                      if (onSuggestionSelect) {
                        onSuggestionSelect(article);
                      } else {
                        logger.warn('onSuggestionSelect is not available', { articleId: article.id });
                      }
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                  >
                    <FileText className="h-3 w-3" />
                    Generate
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Empty Filtered Results */}
          {filteredArticles.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No articles match your filters
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(EnhancedContentClustersPanel);
