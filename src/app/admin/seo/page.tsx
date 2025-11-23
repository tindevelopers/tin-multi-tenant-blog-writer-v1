'use client';

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PrimaryKeywordInput } from "@/components/keyword-research/PrimaryKeywordInput";
import MasterKeywordTable from "@/components/keyword-research/MasterKeywordTable";
import { KeywordClusterView } from "@/components/keyword-research/KeywordClusterView";
import { useEnhancedKeywordResearch, useKeywordSelection } from "@/hooks/useEnhancedKeywordResearch";
import { useContentIdeas } from "@/hooks/useContentIdeas";
import { TrendingUp, Target, Layers, Search, History, Eye, Sparkles, ArrowRight } from "lucide-react";
import Alert from "@/components/ui/alert/Alert";
import StreamingProgress from "@/components/keywords/StreamingProgress";

export default function SEOToolsPage() {
  const router = useRouter();
  
  const {
    loading,
    error,
    keywords,
    clusters,
    primaryAnalysis,
    suggestions,
    researchKeyword,
    reset,
  } = useEnhancedKeywordResearch();

  const {
    selectedKeywords,
    toggleKeyword,
    selectAll,
    clearSelection,
    selectedCount,
  } = useKeywordSelection();

  const {
    generateContentIdeas,
    saveContentCluster,
    loading: contentIdeasLoading,
    error: contentIdeasError,
    currentCluster,
  } = useContentIdeas();

  const [activeTab, setActiveTab] = useState('research');
  const [showContentIdeasModal, setShowContentIdeasModal] = useState(false);

  const handleResearch = async (keyword: string, location: string, language: string, searchType?: 'traditional' | 'ai' | 'both') => {
    await researchKeyword(keyword, location, language, searchType);
    setActiveTab('keywords');
  };

  const handleSelectAll = () => {
    selectAll(keywords);
  };

  const handleGenerateContentIdeas = async () => {
    const selectedKeywordsList = keywords.filter(k => selectedKeywords.has(k.keyword));
    
    if (selectedKeywordsList.length === 0) {
      alert('Please select at least one keyword');
      return;
    }

    try {
      await generateContentIdeas({
        keywords: selectedKeywordsList.map(k => k.keyword),
        pillar_keyword: primaryAnalysis?.keyword,
        cluster_name: primaryAnalysis?.keyword ? `${primaryAnalysis.keyword} Content Hub` : undefined,
      });

      // Save to database
      const result = await saveContentCluster();
      
      if (result.success) {
        // Navigate to content clusters page
        router.push('/admin/content-clusters');
      } else {
        alert('Failed to save content cluster: ' + result.error);
      }
    } catch (err) {
      console.error('Failed to generate content ideas:', err);
      alert('Failed to generate content ideas');
    }
  };

  const easyWins = keywords.filter((k) => k.easy_win_score >= 60);
  const highValue = keywords.filter((k) => k.high_value_score >= 60);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">🔍 Advanced Keyword Research</h1>
              <p className="text-teal-100">
                Discover high-value keywords, identify easy wins, and build content clusters for authority
              </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/seo/keywords"
              className="px-4 py-2 bg-white rounded-lg text-green-800 font-medium transition-colors border-2 border-green-600 hover:bg-green-50"
            >
              📊 Research History
            </Link>
            {keywords.length > 0 ? (
              <div className="hidden md:block">
                <div className="bg-white rounded-lg p-4 text-center border-2 border-green-600">
                  <div className="text-2xl font-bold text-green-800">{keywords.length}</div>
                  <div className="text-sm font-medium text-green-700">Keywords Found</div>
                  <button 
                    onClick={() => setActiveTab('keywords')}
                    className="mt-2 text-xs text-green-600 hover:text-green-800 underline font-medium"
                  >
                    View Results →
                  </button>
                </div>
              </div>
            ) : (
              <div className="hidden md:block">
                <div className="bg-white rounded-lg p-4 text-center border-2 border-green-300">
                  <div className="text-lg font-medium text-green-800">🔍 Ready to Research</div>
                  <div className="text-sm text-green-700">Enter a keyword below to get started</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Research Section */}
      {keywords.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Research</h3>
            </div>
            <button 
              onClick={() => setActiveTab('keywords')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              <Eye className="h-4 w-4" />
              View All Results
            </button>
          </div>
          
          {primaryAnalysis && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-brand-50 to-blue-50 dark:from-brand-500/10 dark:to-blue-500/10 rounded-lg p-4 border border-brand-200 dark:border-brand-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Primary Keyword: <span className="font-semibold text-brand-600 dark:text-brand-400">&ldquo;{primaryAnalysis.keyword}&rdquo;</span>
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Found {keywords.length} variations • {easyWins.length} easy wins • {highValue.length} high value
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                      {keywords.length} Keywords
                    </span>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                      {clusters.length} Clusters
                    </span>
                  </div>
                </div>
              </div>

              {/* Top Keywords Preview */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Top Keywords Found:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {keywords.slice(0, 6).map((keyword, index) => (
                    <div key={keyword.keyword} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">#{index + 1}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{keyword.keyword}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{keyword.search_volume.toLocaleString()}</span>
                        {keyword.easy_win_score >= 60 && (
                          <span className="w-2 h-2 bg-green-500 rounded-full" title="Easy Win"></span>
                        )}
                        {keyword.high_value_score >= 60 && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full" title="High Value"></span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {keywords.length > 6 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    +{keywords.length - 6} more keywords available in the full results
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Stats */}
      {keywords.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Keywords</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{keywords.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Easy Wins</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{easyWins.length}</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">High Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{highValue.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Clusters</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{clusters.length}</p>
              </div>
              <Layers className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert 
          variant="error" 
          title="Research Error" 
          message={error} 
        />
      )}

      {/* Main Content - Tabs */}
      <div className="w-full">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('research')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'research'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              🔍 Research
            </button>
            <button
              onClick={() => setActiveTab('keywords')}
              disabled={keywords.length === 0}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'keywords'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } ${keywords.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              📊 Keywords {keywords.length > 0 && `(${keywords.length})`}
            </button>
            <button
              onClick={() => setActiveTab('clusters')}
              disabled={clusters.length === 0}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'clusters'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } ${clusters.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              🎯 Clusters {clusters.length > 0 && `(${clusters.length})`}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'research' && (
            <div className="space-y-4">
              <PrimaryKeywordInput onResearch={handleResearch} loading={loading} />
              
              {primaryAnalysis && (
                <Alert
                  variant="success"
                  title="Research Complete!"
                  message={`Found ${keywords.length} keyword variations for "${primaryAnalysis.keyword}". Check the Keywords tab to explore the results.`}
                />
              )}

              {keywords.length === 0 && !loading && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-blue-200 dark:border-gray-600 p-8 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Start Your Keyword Research
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      Enter a primary keyword above to discover variations, search volumes, and content opportunities. 
                      Our system will analyze competition, identify easy wins, and suggest high-value content clusters.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                        🔍 Keyword Discovery
                      </span>
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">
                        📊 Search Volume Analysis
                      </span>
                      <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm">
                        🎯 Content Clustering
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'keywords' && (
            <div className="space-y-4">
              {keywords.length > 0 ? (
                <>
                  <MasterKeywordTable
                    keywords={keywords}
                    selectedKeywords={Array.from(selectedKeywords)}
                    onToggleKeyword={toggleKeyword}
                    onSelectAll={handleSelectAll}
                    onClearSelection={clearSelection}
                    loading={loading}
                  />

                  {selectedCount > 0 && (
                    <div className="flex items-center justify-between p-4 bg-brand-50 dark:bg-brand-500/10 rounded-lg border border-brand-200 dark:border-brand-500/30">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedCount} keyword{selectedCount > 1 ? 's' : ''} selected
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={clearSelection}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                        >
                          Clear Selection
                        </button>
                        <button 
                          onClick={handleGenerateContentIdeas}
                          disabled={contentIdeasLoading}
                          className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Sparkles className="h-4 w-4" />
                          {contentIdeasLoading ? 'Generating...' : `Generate Content Ideas (${selectedCount})`}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 p-8 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No Keywords Yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      Research a primary keyword first to see keyword variations, search volumes, and competition data.
                    </p>
                    <button
                      onClick={() => setActiveTab('research')}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
                    >
                      <Search className="h-4 w-4" />
                      Start Research
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'clusters' && (
            <>
              {clusters.length > 0 ? (
                <KeywordClusterView clusters={clusters} />
              ) : (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-purple-200 dark:border-gray-600 p-8 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Layers className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No Clusters Yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      Keyword clusters will appear here after researching keywords. Clusters help organize related keywords for content planning.
                    </p>
                    <button
                      onClick={() => setActiveTab('research')}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      <Search className="h-4 w-4" />
                      Research Keywords
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
