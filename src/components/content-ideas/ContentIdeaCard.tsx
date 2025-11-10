"use client";

import React from 'react';
import { ContentIdea } from '@/lib/content-ideas';
import { FileText, TrendingUp, CheckCircle, Clock, Target, Link as LinkIcon } from 'lucide-react';

interface ContentIdeaCardProps {
  idea: ContentIdea;
  onSelect?: (ideaId: string) => void;
  onEdit?: (idea: ContentIdea) => void;
  onGenerate?: (idea: ContentIdea) => void;
  selected?: boolean;
}

export function ContentIdeaCard({ idea, onSelect, onEdit, onGenerate, selected = false }: ContentIdeaCardProps) {
  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'pillar':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'supporting':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'long_tail':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'draft':
      case 'review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'text-red-600 dark:text-red-400';
    if (priority >= 5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <div 
      className={`group relative rounded-xl border-2 p-6 transition-all duration-200 ${
        selected 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' 
          : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
      }`}
    >
      {/* Selection Checkbox */}
      {onSelect && (
        <div className="absolute top-4 right-4">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(idea.id || '')}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Content Type and Priority Badges */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getContentTypeColor(idea.content_type)}`}>
          <FileText className="h-3 w-3" />
          {idea.content_type.replace('_', ' ')}
        </span>
        <span className={`text-xs font-bold ${getPriorityColor(idea.priority)}`}>
          P{idea.priority}
        </span>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(idea.status)}`}>
          {idea.status}
        </span>
      </div>

      {/* Title and Target Keyword */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 pr-8">
        {idea.title}
      </h3>
      
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          {idea.target_keyword}
        </span>
      </div>

      {/* Meta Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
        {idea.meta_description}
      </p>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-500" />
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Target</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {idea.word_count_target} words
            </div>
          </div>
        </div>
        {idea.search_volume && (
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Search Volume</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {idea.search_volume.toLocaleString()}/mo
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Additional Metrics */}
      {(idea.keyword_difficulty || idea.content_gap_score) && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          {idea.keyword_difficulty !== undefined && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Difficulty</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    idea.keyword_difficulty <= 30 ? 'bg-green-500' :
                    idea.keyword_difficulty <= 60 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${idea.keyword_difficulty}%` }}
                />
              </div>
            </div>
          )}
          {idea.content_gap_score !== undefined && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gap Score</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${idea.content_gap_score}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Internal Links Planned */}
      {idea.internal_links_planned && idea.internal_links_planned.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <LinkIcon className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {idea.internal_links_planned.length} Internal Link{idea.internal_links_planned.length > 1 ? 's' : ''} Planned
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {onEdit && (
          <button
            onClick={() => onEdit(idea)}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Edit Details
          </button>
        )}
        {onGenerate && idea.status === 'idea' && (
          <button
            onClick={() => onGenerate(idea)}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Generate Content
          </button>
        )}
      </div>

      {/* URL Slug */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          /{idea.url_slug}
        </span>
      </div>
    </div>
  );
}

