"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Layers } from 'lucide-react';
import EnhancedContentClustersPanel from '@/components/content-clusters/EnhancedContentClustersPanel';

export default function ContentClustersPage() {
  const router = useRouter();

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

      {/* Enhanced Content Clusters Panel */}
      <EnhancedContentClustersPanel 
        onSuggestionSelect={handleSuggestionSelect}
        onGenerateBlog={handleBlogGenerated}
        onDraftSaved={handleDraftSaved}
      />
    </div>
  );
}


