/**
 * Interlinking Recommendations Component
 * 
 * Displays interlinking opportunities from publishing target analysis
 * Based on FRONTEND_INTERLINKING_IMPLEMENTATION_GUIDE.md
 */

'use client';

import { useState, useEffect } from 'react';
import { blogWriterAPI } from '@/lib/blog-writer-api';

interface InterlinkingOpportunity {
  target_url: string;
  target_title: string;
  anchor_text: string;
  relevance_score: number;
}

interface KeywordRecommendations {
  keyword: string;
  suggested_interlinks: number;
  interlink_opportunities: InterlinkingOpportunity[];
}

interface Props {
  orgId: string;
  integrationId: string;
  keywords: string[];
  onOpportunitySelect?: (opportunity: InterlinkingOpportunity) => void;
  className?: string;
}

export function InterlinkingRecommendations({
  orgId,
  integrationId,
  keywords,
  onOpportunitySelect,
  className = ''
}: Props) {
  const [recommendations, setRecommendations] = useState<KeywordRecommendations[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (keywords.length === 0 || !integrationId) return;
    
    setLoading(true);
    setError(null);
    
    blogWriterAPI.getInterlinkingRecommendations(orgId, integrationId, keywords)
      .then(result => {
        // Transform result to match component interface
        const transformed = result.per_keyword.map(kw => ({
          keyword: kw.keyword,
          suggested_interlinks: kw.suggested_interlinks,
          interlink_opportunities: kw.interlink_opportunities || []
        }));
        setRecommendations(transformed);
      })
      .catch(err => {
        setError(err.message || 'Failed to load interlinking recommendations');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [orgId, integrationId, keywords.join(',')]);
  
  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Analyzing interlinking opportunities...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800 ${className}`}>
        <p className="text-red-800 dark:text-red-200">Error: {error}</p>
      </div>
    );
  }
  
  if (recommendations.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 dark:bg-gray-800 dark:border-gray-700 ${className}`}>
        <p className="text-gray-600 dark:text-gray-400">No interlinking opportunities found.</p>
      </div>
    );
  }
  
  const totalOpportunities = recommendations.reduce((sum, rec) => sum + rec.suggested_interlinks, 0);
  
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Interlinking Opportunities</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {totalOpportunities} total opportunities
        </span>
      </div>
      
      {recommendations.map((keywordRec, index) => (
        <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">{keywordRec.keyword}</h4>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {keywordRec.suggested_interlinks} opportunities
            </span>
          </div>
          
          <div className="space-y-2">
            {keywordRec.interlink_opportunities.map((opportunity, oppIndex) => (
              <div
                key={oppIndex}
                className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                onClick={() => onOpportunitySelect?.(opportunity)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-white">
                    {opportunity.target_title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {opportunity.target_url}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Anchor: &quot;{opportunity.anchor_text}&quot;
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    {Math.round(opportunity.relevance_score * 100)}% match
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

