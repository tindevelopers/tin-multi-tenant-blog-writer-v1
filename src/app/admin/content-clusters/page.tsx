"use client";

import React, { useEffect, useState } from 'react';
import { useContentIdeas } from '@/hooks/useContentIdeas';
import { ContentIdeaCard } from '@/components/content-ideas/ContentIdeaCard';
import { ContentClusterOverview } from '@/components/content-ideas/ContentClusterOverview';
import { useRouter } from 'next/navigation';
import { Layers, Plus, Search, Filter } from 'lucide-react';
import Alert from '@/components/common/Alert';

export default function ContentClustersPage() {
  const router = useRouter();
  const {
    loading,
    error,
    clusters,
    contentIdeas,
    loadUserClusters,
    loadClusterContent,
  } = useContentIdeas();

  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadUserClusters();
  }, [loadUserClusters]);

  const selectedCluster = clusters.find(c => c.id === selectedClusterId);
  const filteredIdeas = contentIdeas.filter(idea => {
    if (filterStatus !== 'all' && idea.status !== filterStatus) return false;
    if (filterType !== 'all' && idea.content_type !== filterType) return false;
    return true;
  });

  const pillarIdeas = contentIdeas.filter(i => i.content_type === 'pillar');
  const supportingIdeas = contentIdeas.filter(i => i.content_type === 'supporting');
  const longTailIdeas = contentIdeas.filter(i => i.content_type === 'long_tail');

  return (
    <div className="mx-auto max-w-7xl">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
              <Layers className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              Content Clusters
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your content strategy with organized topic clusters
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/seo')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create New Cluster
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6">
          <Alert type="error" title="Error">
            {error}
          </Alert>
        </div>
      )}

      {/* Loading State */}
      {loading && !clusters.length && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading clusters...</p>
        </div>
      )}

      {/* Clusters List */}
      {!selectedClusterId && clusters.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clusters.map(cluster => {
            const clusterIdeas = contentIdeas.filter(i => i.cluster_id === cluster.id);
            const pillar = clusterIdeas.filter(i => i.content_type === 'pillar').length;
            const supporting = clusterIdeas.filter(i => i.content_type === 'supporting').length;
            const longTail = clusterIdeas.filter(i => i.content_type === 'long_tail').length;

            return (
              <ContentClusterOverview
                key={cluster.id}
                cluster={cluster}
                pillar_count={pillar}
                supporting_count={supporting}
                long_tail_count={longTail}
                onView={() => {
                  setSelectedClusterId(cluster.id || null);
                  if (cluster.id) loadClusterContent(cluster.id);
                }}
              />
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !clusters.length && (
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
            Create your first content cluster by researching keywords and generating content ideas.
          </p>
          <button
            onClick={() => router.push('/admin/seo')}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Start Keyword Research
          </button>
        </div>
      )}

      {/* Cluster Detail View */}
      {selectedClusterId && selectedCluster && (
        <div>
          {/* Back Button and Cluster Header */}
          <div className="mb-6">
            <button
              onClick={() => setSelectedClusterId(null)}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
            >
              ← Back to Clusters
            </button>
            <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {selectedCluster.cluster_name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Pillar Keyword: <span className="font-semibold">{selectedCluster.pillar_keyword}</span>
              </p>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{pillarIdeas.length}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Pillar</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{supportingIdeas.length}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Supporting</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{longTailIdeas.length}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Long-tail</div>
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

          {/* Content Ideas Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIdeas.map(idea => (
              <ContentIdeaCard
                key={idea.id}
                idea={idea}
                onGenerate={(idea) => {
                  // TODO: Integrate with blog generation in Phase 3
                  console.log('Generate content for:', idea.title);
                }}
              />
            ))}
          </div>

          {/* Empty Filtered Results */}
          {filteredIdeas.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700">
              <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No content ideas match your filters
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

