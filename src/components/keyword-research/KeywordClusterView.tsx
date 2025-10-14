'use client';

import Badge from '@/components/ui/badge/Badge';
import { Layers, TrendingUp, Target } from 'lucide-react';
import type { KeywordCluster } from '@/lib/keyword-research-enhanced';

interface KeywordClusterViewProps {
  clusters: KeywordCluster[];
  onSelectCluster?: (cluster: KeywordCluster) => void;
  selectedClusterId?: string;
}

export function KeywordClusterView({
  clusters,
  onSelectCluster,
  selectedClusterId,
}: KeywordClusterViewProps) {
  const getClusterTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'pillar':
        return 'primary';
      case 'supporting':
        return 'info';
      case 'long-tail':
        return 'success';
      default:
        return 'light';
    }
  };

  const getAuthorityColor = (score: number) => {
    if (score >= 80) return 'text-success-600';
    if (score >= 60) return 'text-blue-light-600';
    if (score >= 40) return 'text-warning-600';
    return 'text-gray-600';
  };

  if (clusters.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <Layers className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No clusters created yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Research keywords to automatically generate content clusters
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Clusters</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{clusters.length}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <Layers className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pillar Content</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {clusters.filter((c) => c.cluster_type === 'pillar').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Keywords</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {clusters.reduce((sum, c) => sum + c.keywords.length, 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Cluster Cards */}
      <div className="space-y-4">
        {clusters.map((cluster) => (
          <div
            key={cluster.id}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all cursor-pointer ${
              selectedClusterId === cluster.id
                ? 'ring-2 ring-brand-500 border-brand-500'
                : 'border-gray-200 dark:border-gray-700 hover:shadow-md'
            }`}
            onClick={() => onSelectCluster?.(cluster)}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{cluster.name}</h4>
                    <Badge color={getClusterTypeBadgeColor(cluster.cluster_type)} size="sm" variant="solid">
                      {cluster.cluster_type.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Primary keyword: <span className="font-medium text-gray-700 dark:text-gray-300">{cluster.primary_keyword}</span>
                  </p>
                </div>
              </div>

              {/* Authority Potential Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Authority Potential</span>
                  <span className={`text-sm font-bold ${getAuthorityColor(cluster.authority_potential)}`}>
                    {cluster.authority_potential}/100
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      cluster.authority_potential >= 80
                        ? 'bg-success-500'
                        : cluster.authority_potential >= 60
                        ? 'bg-blue-light-500'
                        : cluster.authority_potential >= 40
                        ? 'bg-warning-500'
                        : 'bg-gray-400'
                    }`}
                    style={{ width: `${cluster.authority_potential}%` }}
                  />
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Keywords</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{cluster.keywords.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total MSV</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {cluster.total_search_volume.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg. Difficulty</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {Math.round(
                      cluster.keywords.reduce((sum, k) => sum + k.keyword_difficulty, 0) /
                        cluster.keywords.length
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Easy Wins</p>
                  <p className="text-lg font-semibold text-success-600 dark:text-success-400">
                    {cluster.keywords.filter((k) => k.easy_win_score >= 60).length}
                  </p>
                </div>
              </div>

              {/* Top Keywords Preview */}
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Top Keywords:</p>
                <div className="flex flex-wrap gap-2">
                  {cluster.keywords.slice(0, 5).map((keyword, idx) => (
                    <Badge key={`${cluster.id}-keyword-${idx}`} color="light" size="sm">
                      {keyword.keyword}
                    </Badge>
                  ))}
                  {cluster.keywords.length > 5 && (
                    <Badge color="dark" size="sm">
                      +{cluster.keywords.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>

              {/* Content Strategy Recommendations */}
              {cluster.cluster_type === 'pillar' && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-4 rounded-lg">
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-300 mb-1">
                    📝 Content Strategy Recommendation
                  </p>
                  <p className="text-xs text-purple-700 dark:text-purple-400">
                    Create a comprehensive pillar article (3000+ words) targeting this cluster.
                    Support with {cluster.keywords.length - 1} related articles for maximum authority.
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
