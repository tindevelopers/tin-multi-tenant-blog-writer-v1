"use client";

import React, { useState } from 'react';
import { 
  MagnifyingGlassIcon, 
  ChartBarIcon, 
  LightBulbIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { useKeywordResearch, useResearchProgress } from '@/hooks/useKeywordResearch';
import type { BlogResearchResults, TitleSuggestion, KeywordData } from '@/lib/keyword-research';

interface BlogResearchPanelProps {
  onResearchComplete?: (results: BlogResearchResults) => void;
  onTitleSelect?: (title: TitleSuggestion) => void;
  userId?: string;
}

const BlogResearchPanel: React.FC<BlogResearchPanelProps> = ({
  onResearchComplete,
  onTitleSelect,
  userId,
}) => {
  const [topic, setTopic] = useState('');
  const [targetAudience, setTargetAudience] = useState('general');
  const [selectedTitle, setSelectedTitle] = useState<TitleSuggestion | null>(null);
  
  const {
    isResearching,
    researchResults,
    researchError,
    performFullResearch,
    reset,
  } = useKeywordResearch();

  const {
    currentStep,
    totalSteps,
    stepNames,
    isComplete,
    progress,
    nextStep,
    reset: resetProgress,
  } = useResearchProgress();

  const handleStartResearch = async () => {
    if (!topic.trim()) {
      alert('Please enter a topic for research');
      return;
    }

    reset();
    resetProgress();

    try {
      const results = await performFullResearch(topic.trim(), targetAudience, userId);
      onResearchComplete?.(results);
    } catch (error) {
      console.error('Research failed:', error);
    }
  };

  const handleTitleSelect = (title: TitleSuggestion) => {
    setSelectedTitle(title);
    onTitleSelect?.(title);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
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
            <MagnifyingGlassIcon className="w-6 h-6 mr-2 text-blue-600" />
            Blog Research & Strategy
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Research keywords, analyze competition, and get title suggestions before writing
          </p>
        </div>
        {isResearching && (
          <div className="flex items-center text-blue-600">
            <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
            <span className="text-sm font-medium">Researching...</span>
          </div>
        )}
      </div>

      {/* Research Form */}
      <div className="space-y-4 mb-6">
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Blog Topic <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., How to groom german shepherds"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            disabled={isResearching}
          />
        </div>
        
        <div>
          <label htmlFor="audience" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Audience
          </label>
          <select
            id="audience"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            disabled={isResearching}
          >
            <option value="general">General Audience</option>
            <option value="beginners">Beginners</option>
            <option value="professionals">Professionals</option>
            <option value="business owners">Business Owners</option>
            <option value="students">Students</option>
            <option value="parents">Parents</option>
            <option value="seniors">Seniors</option>
          </select>
        </div>

        <button
          onClick={handleStartResearch}
          disabled={isResearching || !topic.trim()}
          className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isResearching ? (
            <>
              <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
              Researching...
            </>
          ) : (
            <>
              <SparklesIcon className="w-5 h-5 mr-2" />
              Start Research
            </>
          )}
        </button>
      </div>

      {/* Research Progress */}
      {isResearching && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
              {stepNames[currentStep] || 'Processing...'}
            </span>
            <span className="text-sm text-blue-700 dark:text-blue-400">
              {currentStep + 1} of {totalSteps}
            </span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Display */}
      {researchError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
            <span className="text-sm text-red-800 dark:text-red-200">
              {researchError}
            </span>
          </div>
        </div>
      )}

      {/* Research Results */}
      {researchResults && (
        <div className="space-y-6">
          {/* Keyword Analysis */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <ChartBarIcon className="w-5 h-5 mr-2 text-green-600" />
              Keyword Analysis
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Overall SEO Score</div>
                <div className="text-2xl font-bold text-green-600">
                  {researchResults.keyword_analysis.overall_score}/100
                </div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Keywords Analyzed</div>
                <div className="text-2xl font-bold text-blue-600">
                  {Object.keys(researchResults.keyword_analysis.keyword_analysis).length}
                </div>
              </div>
            </div>

            {/* Keyword Details */}
            <div className="space-y-3">
              {Object.entries(researchResults.keyword_analysis.keyword_analysis).map(([keyword, data]) => (
                <div key={keyword} className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">{keyword}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(data.difficulty)}`}>
                        {data.difficulty}
                      </span>
                      <span className="text-xs text-gray-500">
                        Competition: {Math.round(data.competition * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {data.recommended && (
                      <span className="inline-flex items-center text-green-600 mr-2">
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        Recommended
                      </span>
                    )}
                    {data.reason}
                  </div>
                  {data.related_keywords.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-500 mb-1">Related keywords:</div>
                      <div className="flex flex-wrap gap-1">
                        {data.related_keywords.slice(0, 5).map((related: string) => (
                          <span key={related} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                            {related}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Title Suggestions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <LightBulbIcon className="w-5 h-5 mr-2 text-yellow-600" />
              Title Suggestions
            </h3>
            
            <div className="space-y-3">
              {researchResults.title_suggestions.map((title, index) => (
                <div 
                  key={index} 
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTitle === title 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                  onClick={() => handleTitleSelect(title)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white flex-1 mr-4">
                      {title.title}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTrafficColor(title.estimated_traffic)}`}>
                        {title.estimated_traffic} traffic
                      </span>
                      <span className="text-xs text-gray-500">
                        SEO: {title.seo_score}/100
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {title.reasoning}
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>Type: {title.type}</span>
                    <span>Readability: {title.readability_score}/100</span>
                    <span>Keyword density: {title.keyword_density}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content Strategy */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <DocumentTextIcon className="w-5 h-5 mr-2 text-purple-600" />
              Content Strategy
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h4 className="font-medium text-purple-900 dark:text-purple-300 mb-2">Recommended Approach</h4>
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  {researchResults.content_strategy.recommended_approach}
                </p>
              </div>
              
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">Content Angle</h4>
                <p className="text-sm text-green-800 dark:text-green-200">
                  {researchResults.content_strategy.content_angle}
                </p>
              </div>
              
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">SEO Insights</h4>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <p><strong>Primary Keyword:</strong> {researchResults.seo_insights.primary_keyword}</p>
                  <p><strong>Recommended Length:</strong> {researchResults.seo_insights.content_length_recommendation} words</p>
                  <p><strong>Secondary Keywords:</strong> {researchResults.seo_insights.secondary_keywords.join(', ')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Button */}
      {researchResults && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={reset}
            className="w-full px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Start New Research
          </button>
        </div>
      )}
    </div>
  );
};

export default BlogResearchPanel;
