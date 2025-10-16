"use client";

import React, { useState, useEffect } from 'react';
import { 
  LightBulbIcon, 
  DocumentTextIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  SparklesIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { useContentSuggestions } from '@/hooks/useContentSuggestions';
import { useGenerateBlog } from '@/hooks/useBlogWriterAPI';
import { useBlogPostMutations } from '@/hooks/useBlogPosts';
import type { ContentSuggestion, ContentCluster } from '@/lib/content-suggestions';

interface ContentSuggestionsPanelProps {
  researchResults: any;
  targetAudience: string;
  onSuggestionSelect?: (suggestion: ContentSuggestion) => void;
  onBlogGenerated?: (blogContent: any) => void;
  onDraftSaved?: (draftId: string) => void;
}

const ContentSuggestionsPanel: React.FC<ContentSuggestionsPanelProps> = ({
  researchResults,
  targetAudience,
  onSuggestionSelect,
  onBlogGenerated,
  onDraftSaved,
}) => {
  console.log('🎯 ContentSuggestionsPanel received researchResults:', researchResults);
  console.log('🔍 Research results type:', typeof researchResults);
  console.log('🔍 Research results keys:', researchResults ? Object.keys(researchResults) : 'null');
  const [selectedSuggestion, setSelectedSuggestion] = useState<ContentSuggestion | null>(null);
  const [showClusters, setShowClusters] = useState(false);
  
  const {
    suggestions,
    clusters,
    loading,
    error,
    generateSuggestions,
    getSuggestionsByType,
    getSuggestionsByPriority,
  } = useContentSuggestions();

  const { generateBlog, loading: generatingBlog } = useGenerateBlog();
  const { createDraft, loading: savingDraft } = useBlogPostMutations();

  // Auto-generate suggestions when research results are available
  useEffect(() => {
    if (researchResults && suggestions.length === 0) {
      console.log('🔄 Auto-generating suggestions from research results...');
      handleGenerateSuggestions();
    }
  }, [researchResults, suggestions.length]);

  const handleGenerateSuggestions = async () => {
    if (!researchResults) {
      console.error('❌ No research results available');
      return;
    }
    
    console.log('🎯 Generating suggestions from research results:', researchResults);
    await generateSuggestions(researchResults, targetAudience);
  };

  const handleSuggestionSelect = (suggestion: ContentSuggestion) => {
    setSelectedSuggestion(suggestion);
    onSuggestionSelect?.(suggestion);
  };

  const handleGenerateBlog = async (suggestion: ContentSuggestion) => {
    try {
      console.log('🚀 Generating blog for suggestion:', suggestion.title);
      
      const blogContent = await generateBlog({
        topic: suggestion.title,
        keywords: [suggestion.primary_keyword, ...suggestion.secondary_keywords],
        target_audience: suggestion.target_audience,
        tone: 'professional',
        word_count: suggestion.word_count_target,
      });

      if (blogContent) {
        console.log('📝 Blog content generated, saving as draft...');
        console.log('🔍 Blog content structure:', blogContent);
        console.log('🔍 Blog content keys:', Object.keys(blogContent));
        
        // Extract content properly from the API response
        let content = '';
        let excerpt = '';
        
        // Try different possible content fields
        if (typeof blogContent.content === 'string') {
          content = blogContent.content;
        } else if (typeof blogContent.response === 'string') {
          content = blogContent.response;
        } else if (typeof blogContent.text === 'string') {
          content = blogContent.text;
        } else if (typeof blogContent.article === 'string') {
          content = blogContent.article;
        } else if (typeof blogContent.body === 'string') {
          content = blogContent.body;
        } else {
          // If no direct content field, try to extract from nested objects
          console.log('🔍 No direct content field found, checking nested structure...');
          content = JSON.stringify(blogContent, null, 2);
        }
        
        // Extract excerpt
        if (typeof blogContent.excerpt === 'string') {
          excerpt = blogContent.excerpt;
        } else if (typeof blogContent.summary === 'string') {
          excerpt = blogContent.summary;
        } else if (typeof blogContent.description === 'string') {
          excerpt = blogContent.description;
        } else {
          excerpt = suggestion.content_angle || '';
        }
        
        console.log('🔍 Extracted content length:', content.length);
        console.log('🔍 Extracted excerpt length:', excerpt.length);
        
        // Save the generated content as a draft
        const draftData = {
          title: suggestion.title,
          content: content,
          excerpt: excerpt,
          seo_data: {
            primary_keyword: suggestion.primary_keyword,
            secondary_keywords: suggestion.secondary_keywords,
            seo_potential: suggestion.seo_potential,
            target_audience: suggestion.target_audience,
            word_count_target: suggestion.word_count_target,
            content_angle: suggestion.content_angle,
            difficulty: suggestion.difficulty,
            estimated_traffic: suggestion.estimated_traffic,
            priority: suggestion.priority
          },
          metadata: {
            generated_from_suggestion: true,
            suggestion_id: suggestion.id,
            suggestion_type: suggestion.type,
            research_results: researchResults,
            generation_timestamp: new Date().toISOString(),
            ai_generated: true
          }
        };

        const savedDraft = await createDraft(draftData);
        
        if (savedDraft) {
          console.log('✅ Blog saved as draft successfully:', savedDraft);
          onBlogGenerated?.(blogContent);
          onDraftSaved?.(savedDraft.post_id);
          
          // Show success message
          alert(`✅ Blog "${suggestion.title}" has been generated and saved as a draft! You can find it in your drafts list.`);
        } else {
          console.error('❌ Failed to save draft');
          alert('❌ Blog was generated but failed to save as draft. Please try again.');
        }
      } else {
        console.error('❌ No blog content generated');
        alert('❌ Failed to generate blog content. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error generating blog:', error);
      alert(`❌ Error generating blog: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pillar': return <ChartBarIcon className="w-5 h-5" />;
      case 'how-to': return <DocumentTextIcon className="w-5 h-5" />;
      case 'list': return <CheckCircleIcon className="w-5 h-5" />;
      default: return <DocumentTextIcon className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pillar': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'how-to': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'list': return 'bg-green-100 text-green-800 border-green-200';
      case 'supporting': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrafficColor = (traffic: string) => {
    switch (traffic) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <LightBulbIcon className="w-6 h-6 mr-2 text-yellow-600" />
            Content Suggestions
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            AI-generated content ideas based on your keyword research
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowClusters(!showClusters)}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {showClusters ? 'Hide Clusters' : 'Show Clusters'}
          </button>
          <button
            onClick={handleGenerateSuggestions}
            disabled={loading || !researchResults}
            className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!researchResults ? "Complete keyword research first" : "Generate content ideas from research"}
          >
            {loading ? (
              <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <SparklesIcon className="w-4 h-4 mr-2" />
            )}
            Generate Ideas
          </button>
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={() => {
                console.log('🧪 Test button clicked - Research results:', researchResults);
                console.log('🧪 Target audience:', targetAudience);
                handleGenerateSuggestions();
              }}
              className="flex items-center px-3 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              🧪 Test
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && researchResults && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Debug: Research Results</h4>
          <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
            <p>Keywords: {researchResults.keyword_analysis?.keyword_analysis ? Object.keys(researchResults.keyword_analysis.keyword_analysis).length : 0}</p>
            <p>Titles: {researchResults.title_suggestions?.length || 0}</p>
            <p>Extracted: {researchResults.extracted_keywords?.length || 0}</p>
          </div>
        </div>
      )}

      {/* Content Clusters */}
      {showClusters && clusters.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Content Clusters ({clusters.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clusters.map((cluster) => (
              <div key={cluster.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  {cluster.name}
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p>Pillar: {cluster.pillar_keyword}</p>
                  <p>Supporting topics: {cluster.supporting_topics}</p>
                  <p>Authority potential: {cluster.authority_potential}/100</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Suggested Content ({suggestions.length})
          </h3>
          
          {/* Filter by Type */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setShowClusters(false)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
            >
              All ({suggestions.length})
            </button>
            {['pillar', 'how-to', 'list', 'supporting'].map((type) => {
              const typeSuggestions = getSuggestionsByType(type);
              if (typeSuggestions.length === 0) return null;
              return (
                <button
                  key={type}
                  onClick={() => setShowClusters(false)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  {type} ({typeSuggestions.length})
                </button>
              );
            })}
          </div>

          {/* Suggestions List */}
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={`p-4 border rounded-lg transition-colors ${
                  selectedSuggestion?.id === suggestion.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(suggestion.type)}`}>
                        {getTypeIcon(suggestion.type)}
                        <span className="ml-1 capitalize">{suggestion.type}</span>
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(suggestion.priority)}`}>
                        {suggestion.priority} priority
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTrafficColor(suggestion.estimated_traffic)}`}>
                        {suggestion.estimated_traffic} traffic
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      {suggestion.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {suggestion.content_angle}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Primary: {suggestion.primary_keyword}</span>
                      <span>Words: {suggestion.word_count_target}</span>
                      <span>SEO: {suggestion.seo_potential}/100</span>
                      <span>Difficulty: {suggestion.difficulty}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="flex items-center px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <EyeIcon className="w-4 h-4 mr-1" />
                    Select
                  </button>
                  <button
                    onClick={() => handleGenerateBlog(suggestion)}
                    disabled={generatingBlog || savingDraft}
                    className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingBlog || savingDraft ? (
                      <ArrowPathIcon className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <PencilIcon className="w-4 h-4 mr-1" />
                    )}
                    {generatingBlog ? 'Generating...' : savingDraft ? 'Saving...' : 'Generate & Save'}
                  </button>
                </div>

                {/* Content Outline */}
                {suggestion.outline && suggestion.outline.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Content Outline:</h5>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      {suggestion.outline.slice(0, 4).map((item, index) => (
                        <li key={index} className="flex items-center">
                          <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                          {item}
                        </li>
                      ))}
                      {suggestion.outline.length > 4 && (
                        <li className="text-gray-500">+{suggestion.outline.length - 4} more sections</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && suggestions.length === 0 && (
        <div className="text-center py-8">
          <LightBulbIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Content Suggestions Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Generate content ideas based on your keyword research
          </p>
          <button
            onClick={handleGenerateSuggestions}
            disabled={loading}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin inline" />
                Generating...
              </>
            ) : (
              'Generate Suggestions'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ContentSuggestionsPanel;
