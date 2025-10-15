"use client";

import React from 'react';
import { ContentCluster } from '@/lib/content-ideas';
import { Layers, TrendingUp, FileText, CheckCircle, Clock, Link as LinkIcon, Eye } from 'lucide-react';

interface ContentClusterOverviewProps {
  cluster: ContentCluster;
  pillar_count: number;
  supporting_count: number;
  long_tail_count: number;
  onView?: () => void;
}

export function ContentClusterOverview({ 
  cluster, 
  pillar_count, 
  supporting_count, 
  long_tail_count,
  onView 
}: ContentClusterOverviewProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'planning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const total_content = pillar_count + supporting_count + long_tail_count;

  return (
    <div className="group rounded-xl border-2 border-gray-200 bg-white p-6 transition-all duration-200 hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <Layers className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {cluster.cluster_name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Pillar: <span className="font-medium">{cluster.pillar_keyword}</span>
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(cluster.cluster_status)}`}>
          {cluster.cluster_status}
        </span>
      </div>

      {/* Description */}
      {cluster.cluster_description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {cluster.cluster_description}
        </p>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col">
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <FileText className="h-3 w-3" />
            <span>Total Content</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {total_content}
          </div>
        </div>
        
        <div className="flex flex-col">
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <TrendingUp className="h-3 w-3" />
            <span>Authority Score</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {cluster.authority_score}
            <span className="text-sm text-gray-500 dark:text-gray-400">/100</span>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <CheckCircle className="h-3 w-3" />
            <span>Keywords</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {cluster.total_keywords}
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <LinkIcon className="h-3 w-3" />
            <span>Internal Links</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {cluster.internal_links_count}
          </div>
        </div>
      </div>

      {/* Content Type Breakdown */}
      <div className="space-y-3 mb-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pillar Content
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {pillar_count} piece{pillar_count !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full bg-purple-500"
              style={{ width: total_content > 0 ? `${(pillar_count / total_content) * 100}%` : '0%' }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Supporting Content
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {supporting_count} piece{supporting_count !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full bg-blue-500"
              style={{ width: total_content > 0 ? `${(supporting_count / total_content) * 100}%` : '0%' }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Long-tail Content
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {long_tail_count} piece{long_tail_count !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full bg-green-500"
              style={{ width: total_content > 0 ? `${(long_tail_count / total_content) * 100}%` : '0%' }}
            />
          </div>
        </div>
      </div>

      {/* Action Button */}
      {onView && (
        <button
          onClick={onView}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2"
        >
          <Eye className="h-4 w-4" />
          View Cluster Details
        </button>
      )}
    </div>
  );
}

