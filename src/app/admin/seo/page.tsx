'use client';

import React, { useState } from "react";
import Link from "next/link";
import { PrimaryKeywordInput } from "@/components/keyword-research/PrimaryKeywordInput";
import { MasterKeywordTable } from "@/components/keyword-research/MasterKeywordTable";
import { KeywordClusterView } from "@/components/keyword-research/KeywordClusterView";
import { useEnhancedKeywordResearch, useKeywordSelection } from "@/hooks/useEnhancedKeywordResearch";
import { TrendingUp, Target, Layers, Search } from "lucide-react";
import Alert from "@/components/ui/alert/Alert";

export default function SEOToolsPage() {
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

  const [activeTab, setActiveTab] = useState('research');

  const handleResearch = async (keyword: string, location: string, language: string) => {
    await researchKeyword(keyword, location, language);
    setActiveTab('keywords');
  };

  const handleSelectAll = () => {
    selectAll(keywords);
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
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-white font-medium transition-colors"
            >
              📊 Research History
            </Link>
            {keywords.length > 0 ? (
              <div className="hidden md:block">
                <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">{keywords.length}</div>
                  <div className="text-sm text-teal-100">Keywords Found</div>
                </div>
              </div>
            ) : (
              <div className="hidden md:block">
                <div className="bg-white bg-opacity-10 rounded-lg p-4 text-center border border-white border-opacity-20">
                  <div className="text-lg text-teal-100">🔍 Ready to Research</div>
                  <div className="text-sm text-teal-200">Enter a keyword below to get started</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {keywords.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Keywords</p>
                <p className="text-2xl font-bold">{keywords.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Easy Wins</p>
                <p className="text-2xl font-bold">{easyWins.length}</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Value</p>
                <p className="text-2xl font-bold">{highValue.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clusters</p>
                <p className="text-2xl font-bold">{clusters.length}</p>
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
                    selectedKeywords={selectedKeywords}
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
                        <button className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors">
                          Create Content ({selectedCount})
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
