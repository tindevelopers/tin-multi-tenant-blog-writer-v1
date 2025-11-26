"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layers, Sparkles } from 'lucide-react';
import EnhancedContentClustersPanel from '@/components/content-clusters/EnhancedContentClustersPanel';
import type { BlogResearchResults } from '@/lib/keyword-research';

function ContentClustersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [researchResults, setResearchResults] = useState<BlogResearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  // Handler for when a suggestion is selected
  const handleSuggestionSelect = (suggestion: any) => {
    console.log('🔍 Suggestion selected in ContentClustersPage:', suggestion);
    
    // Navigate to new draft page with the suggestion data
    // We'll pass the suggestion data as URL parameters or state
    const params = new URLSearchParams({
      title: suggestion.title || '',
      topic: suggestion.primary_keyword || suggestion.target_keyword || '',
      keywords: suggestion.secondary_keywords 
        ? (Array.isArray(suggestion.secondary_keywords) 
          ? suggestion.secondary_keywords.join(', ')
          : String(suggestion.secondary_keywords))
        : suggestion.target_keyword || '',
      target_audience: suggestion.target_audience || 'general',
      word_count: suggestion.word_count_target || suggestion.estimated_word_count || 1500
    });
    
    router.push(`/admin/drafts/new?${params.toString()}`);
  };

  // Handler for when blog content is generated
  const handleBlogGenerated = (blogContent: any) => {
    console.log('🔍 Blog generated in ContentClustersPage:', blogContent);
    // Could show a success message or navigate somewhere
  };

  // Handler for when a draft is saved
  const handleDraftSaved = (draftId: string) => {
    console.log('🔍 Draft saved in ContentClustersPage:', draftId);
    // Could show a success message or navigate to the draft
    router.push(`/admin/drafts/edit/${draftId}`);
  };

  // Load keywords from URL params if present (from keyword history page)
  useEffect(() => {
    const keywordsParam = searchParams?.get('keywords');
    const primaryParam = searchParams?.get('primary');
    const researchResultId = searchParams?.get('research_result_id');
    
    if (researchResultId && keywordsParam && primaryParam) {
      const loadKeywordsForClusters = async () => {
        setLoading(true);
        try {
          // Load keyword terms from research result
          const termsResponse = await fetch(`/api/keywords/list?research_result_id=${researchResultId}`);
          const termsData = await termsResponse.json();
          
          // Load research result details
          const resultResponse = await fetch(`/api/keywords/research-results?id=${researchResultId}`);
          const resultData = await resultResponse.json();
          
          if (termsData.success && termsData.terms && resultData.success && resultData.results) {
            const result = resultData.results[0];
            const keywordList = JSON.parse(decodeURIComponent(keywordsParam));
            const primaryKeyword = decodeURIComponent(primaryParam);
            
            // Filter to only selected keywords
            const selectedTerms = termsData.terms.filter((term: any) => 
              keywordList.includes(term.keyword)
            );
            
            // Transform to BlogResearchResults format
            const keywordDataMap: Record<string, any> = {};
            
            // Add primary keyword
            const primaryTerm = selectedTerms.find((t: any) => t.keyword === primaryKeyword) || 
                               selectedTerms[0] || 
                               { keyword: primaryKeyword, search_volume: 0, keyword_difficulty: 50, competition: 0.5 };
            
            keywordDataMap[primaryKeyword] = {
              keyword: primaryKeyword,
              search_volume: primaryTerm.search_volume || 0,
              keyword_difficulty: primaryTerm.keyword_difficulty || 50,
              competition: primaryTerm.competition || 0.5,
              cpc: primaryTerm.cpc || 0,
              related_keywords: selectedTerms
                .filter((t: any) => t.keyword !== primaryKeyword)
                .map((t: any) => t.keyword),
            };
            
            // Add other selected keywords
            selectedTerms.forEach((term: any) => {
              if (term.keyword !== primaryKeyword) {
                keywordDataMap[term.keyword] = {
                  keyword: term.keyword,
                  search_volume: term.search_volume || 0,
                  keyword_difficulty: term.keyword_difficulty || 50,
                  competition: term.competition || 0.5,
                  cpc: term.cpc || 0,
                  related_keywords: [],
                };
              }
            });
            
            // Create proper KeywordAnalysis object
            const keywordAnalysis = {
              keyword_analysis: keywordDataMap,
              overall_score: primaryTerm.keyword_difficulty ? 100 - primaryTerm.keyword_difficulty : 50,
              recommendations: [],
              cluster_groups: [],
            };
            
            const secondaryKeywords = selectedTerms
              .filter((t: any) => t.keyword !== primaryKeyword)
              .map((t: any) => t.keyword);
            
            const researchResultsData: BlogResearchResults = {
              keyword_analysis: keywordAnalysis,
              title_suggestions: [],
              content_strategy: {
                recommended_approach: `Create comprehensive content focusing on ${primaryKeyword} with supporting topics: ${secondaryKeywords.slice(0, 5).join(', ')}`,
                target_audience: 'general',
                content_angle: `Educational and informative content covering ${primaryKeyword} and related topics`,
                competitor_analysis: `Focus on providing unique insights and comprehensive coverage of ${primaryKeyword}`,
              },
              seo_insights: {
                primary_keyword: primaryKeyword,
                secondary_keywords: secondaryKeywords,
                content_length_recommendation: 1500,
                internal_linking_opportunities: secondaryKeywords.slice(0, 10),
              },
            };
            
            setResearchResults(researchResultsData);
          }
        } catch (err) {
          console.error('Failed to load keywords for content clusters:', err);
        } finally {
          setLoading(false);
        }
      };
      
      loadKeywordsForClusters();
    }
  }, [searchParams]);

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
              AI-powered content strategy with organized topic clusters
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Sparkles className="h-8 w-8 animate-pulse text-purple-600 dark:text-purple-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading keywords for content generation...</p>
        </div>
      )}

      {/* Enhanced Content Clusters Panel */}
      {!loading && (
        <EnhancedContentClustersPanel 
          researchResults={researchResults}
          onSuggestionSelect={handleSuggestionSelect}
          onGenerateBlog={handleBlogGenerated}
          onDraftSaved={handleDraftSaved}
        />
      )}
    </div>
  );
}

export default function ContentClustersPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-7xl">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Sparkles className="h-8 w-8 animate-pulse text-purple-600 dark:text-purple-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <ContentClustersContent />
    </Suspense>
  );
}


