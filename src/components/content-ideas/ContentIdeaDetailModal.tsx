"use client";

import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Target,
  TrendingUp,
  Clock,
  Eye,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  ArrowRight,
  Layers,
  BarChart3,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';
import type { HumanReadableArticle } from '@/lib/enhanced-content-clusters';
import { Modal } from '@/components/ui/modal/index';

type ContentIdeaWithCluster = HumanReadableArticle & {
  cluster_id?: string;
  cluster_name?: string;
  pillar_keyword?: string;
  cluster_authority_score?: number;
  keywords?: string[]; // May come from database or seo_insights
  seo_insights?: {
    secondary_keywords?: string[];
    semantic_keywords?: string[];
    [key: string]: any;
  };
  internal_links?: any[]; // May be stored as JSONB
};

interface ContentIdeaDetailModalProps {
  idea: ContentIdeaWithCluster;
  onClose: () => void;
  onGenerate: (idea: ContentIdeaWithCluster) => void;
}

export default function ContentIdeaDetailModal({
  idea,
  onClose,
  onGenerate,
}: ContentIdeaDetailModalProps) {
  const [clusterAuthority, setClusterAuthority] = useState<number | null>(null);

  useEffect(() => {
    // Load cluster authority score if not already included
    if (idea.cluster_id && !idea.cluster_authority_score) {
      const loadClusterAuthority = async () => {
        try {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const { data } = await supabase
            .from('content_clusters')
            .select('authority_score')
            .eq('id', idea.cluster_id)
            .single();
          
          if (data?.authority_score) {
            setClusterAuthority(data.authority_score);
          }
        } catch (error) {
          console.error('Error loading cluster authority:', error);
        }
      };
      loadClusterAuthority();
    } else if (idea.cluster_authority_score) {
      setClusterAuthority(idea.cluster_authority_score);
    }
  }, [idea.cluster_id, idea.cluster_authority_score]);

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

  const getDifficultyColor = (score: number) => {
    if (score >= 8) return 'text-red-600 dark:text-red-400';
    if (score >= 5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  // Extract keywords from various sources
  let keywords: string[] = [];
  if (Array.isArray(idea.keywords)) {
    keywords = idea.keywords;
  } else if (idea.seo_insights) {
    const seoInsightsObj = typeof idea.seo_insights === 'object' ? idea.seo_insights as Record<string, any> : {};
    keywords = [
      ...(seoInsightsObj.secondary_keywords || []),
      ...(seoInsightsObj.semantic_keywords || [])
    ];
  }
  // Always include target_keyword
  if (idea.target_keyword && !keywords.includes(idea.target_keyword)) {
    keywords.unshift(idea.target_keyword);
  }
  
  const internalLinks = idea.internal_links && Array.isArray(idea.internal_links) ? idea.internal_links : [];
  const seoInsights = idea.seo_insights && typeof idea.seo_insights === 'object' ? idea.seo_insights as Record<string, any> : {};
  const contentOutline = idea.content_outline && typeof idea.content_outline === 'object' ? idea.content_outline as Record<string, any> : {};

  return (
    <Modal isOpen={true} onClose={onClose} className="max-w-5xl max-h-[90vh]">
      <div className="p-6 overflow-y-auto max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getContentTypeColor(idea.content_type)}`}>
                {idea.content_type.replace('_', ' ')}
              </span>
              {idea.status && (
                <span className={`text-sm font-medium ${getStatusColor(idea.status)}`}>
                  {idea.status}
                </span>
              )}
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Priority: {idea.priority}/10
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {idea.title}
            </h2>
            {idea.subtitle && (
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                {idea.subtitle}
              </p>
            )}
            {idea.cluster_name && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Layers className="h-4 w-4" />
                <span>Cluster: {idea.cluster_name}</span>
                {clusterAuthority !== null && (
                  <span className="ml-2 px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs font-medium">
                    Authority: {clusterAuthority}/10
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Target Keyword</span>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {idea.target_keyword}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Reading Time</span>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {idea.estimated_reading_time || Math.ceil((idea.estimated_word_count || 1500) / 200)} min
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Difficulty</span>
            </div>
            <p className={`text-sm font-semibold ${getDifficultyColor(idea.difficulty_score || 5)}`}>
              {idea.difficulty_score || 'N/A'}/10
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Word Count</span>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {idea.estimated_word_count || 1500} words
            </p>
          </div>
        </div>

        {/* Keywords Section */}
        {keywords.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Keywords to Include ({keywords.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-lg text-sm font-medium"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* SEO Insights */}
        {Object.keys(seoInsights).length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              SEO Insights
            </h3>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {JSON.stringify(seoInsights, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Content Outline */}
        {Object.keys(contentOutline).length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
              Content Outline
            </h3>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              {Array.isArray(contentOutline.sections) ? (
                <ul className="space-y-2">
                  {contentOutline.sections.map((section: any, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {typeof section === 'string' ? section : section.title || section.heading || JSON.stringify(section)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {JSON.stringify(contentOutline, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Internal Linking Opportunities */}
        {internalLinks.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Internal Linking Opportunities ({internalLinks.length})
            </h3>
            <div className="space-y-2">
              {internalLinks.map((link: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg"
                >
                  <LinkIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {typeof link === 'string' ? link : link.anchor_text || link.keyword || link.title}
                    </p>
                    {typeof link === 'object' && link.context && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {link.context}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meta Description */}
        {idea.meta_description && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Meta Description
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              {idea.meta_description}
            </p>
          </div>
        )}

        {/* Decision Elements */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            Decision Elements
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Traffic Potential
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {idea.estimated_traffic || 'Medium'}
              </p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Content Gap Score
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {idea.content_gaps ? (typeof idea.content_gaps === 'object' ? JSON.stringify(idea.content_gaps) : idea.content_gaps) : 'N/A'}
              </p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Target Audience
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {idea.target_audience || 'General'}
              </p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Freshness Score
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {idea.freshness_score || 'N/A'}/10
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              onGenerate(idea);
              onClose();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 rounded-lg transition-colors"
          >
            Generate Content
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Modal>
  );
}

