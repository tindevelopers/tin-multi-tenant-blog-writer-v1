'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  History, 
  Search, 
  TrendingUp, 
  Eye, 
  Calendar, 
  Filter,
  Download,
  RefreshCw,
  Trash2,
  BarChart3,
  Sparkles,
  Globe,
  Languages,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import Alert from '@/components/ui/alert/Alert';

interface KeywordResearchResult {
  id: string;
  keyword: string;
  location: string;
  language: string;
  search_type: 'traditional' | 'ai' | 'both';
  traditional_keyword_data?: any;
  ai_keyword_data?: any;
  related_terms?: any[];
  matching_terms?: any[];
  keyword_count: number;
  created_at: string;
  accessed_at?: string;
  keyword_preview?: KeywordTerm[]; // Preview of keywords for display
}

interface KeywordTerm {
  id: string;
  keyword: string;
  search_volume: number;
  ai_search_volume: number;
  keyword_difficulty: number;
  competition: number;
  cpc?: number;
  search_intent?: string;
  ai_optimization_score?: number;
  ai_recommended?: boolean;
  is_related_term: boolean;
  is_matching_term: boolean;
  parent_keyword?: string;
  location: string;
  language: string;
  search_type: string;
}

export default function KeywordHistoryPage() {
  const [researchResults, setResearchResults] = useState<KeywordResearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<KeywordResearchResult | null>(null);
  const [keywordTerms, setKeywordTerms] = useState<KeywordTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTypeFilter, setSearchTypeFilter] = useState<'all' | 'traditional' | 'ai' | 'both'>('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const loadResearchResults = useCallback(async (pageNum: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Please log in to view your keyword history');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((pageNum - 1) * limit).toString(),
      });

      if (searchQuery) params.append('keyword', searchQuery);
      if (searchTypeFilter !== 'all') params.append('search_type', searchTypeFilter);
      if (locationFilter) params.append('location', locationFilter);
      if (languageFilter) params.append('language', languageFilter);

      const response = await fetch(`/api/keywords/research-results?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load research results');
      }

      const results = Array.isArray(data.results) ? data.results : [];
      
      // Load keyword previews for each result
      const resultsWithPreviews = await Promise.all(
        results.map(async (result: KeywordResearchResult) => {
          if (result.keyword_count > 0) {
            try {
              const previewParams = new URLSearchParams({
                research_result_id: result.id,
                limit: '10', // Load first 10 keywords for preview
              });
              const previewResponse = await fetch(`/api/keywords/list?${previewParams.toString()}`);
              if (previewResponse.ok) {
                const previewData = await previewResponse.json();
                if (previewData.success && previewData.terms) {
                  return { ...result, keyword_preview: previewData.terms };
                }
              }
            } catch (err) {
              console.warn('Failed to load keyword preview for result', result.id, err);
            }
          }
          return result;
        })
      );
      
      console.log('Loaded research results:', {
        count: resultsWithPreviews.length,
        total: data.total || 0,
        firstResult: resultsWithPreviews[0],
        success: data.success,
      });

      // Use functional update to ensure we're setting the latest state
      console.log('Setting research results state - new count:', resultsWithPreviews.length);
      setResearchResults(resultsWithPreviews);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error loading research results:', err);
      setError(err instanceof Error ? err.message : 'Failed to load keyword history');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, searchTypeFilter, locationFilter, languageFilter, limit]);

  const loadKeywordTerms = useCallback(async (researchResultId: string) => {
    try {
      setLoadingTerms(true);
      
      const params = new URLSearchParams({
        research_result_id: researchResultId,
      });

      const response = await fetch(`/api/keywords/list?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load keyword terms');
      }

      setKeywordTerms(data.terms || []);
    } catch (err) {
      // Error loading keyword terms - silently fail
    } finally {
      setLoadingTerms(false);
    }
  }, []);

  const handleViewDetails = async (result: KeywordResearchResult) => {
    setSelectedResult(result);
    await loadKeywordTerms(result.id);
  };

  const handleFlushCache = async () => {
    if (!confirm('Are you sure you want to flush the keyword cache? This will clear all cached results.')) {
      return;
    }

    try {
      const response = await fetch('/api/keywords/flush-cache', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        alert(`Cache flushed successfully. ${data.deletedCount || 0} entries deleted.`);
        loadResearchResults(page);
      } else {
        throw new Error(data.error || 'Failed to flush cache');
      }
    } catch (err) {
      alert('Failed to flush cache');
    }
  };

  useEffect(() => {
    console.log('useEffect triggered - loading research results', { page });
    loadResearchResults(page);
  }, [page, loadResearchResults]);
  
  // Debug effect to track state changes
  useEffect(() => {
    console.log('Research results state changed:', {
      length: researchResults.length,
      items: researchResults.map(r => ({ id: r.id, keyword: r.keyword })),
    });
  }, [researchResults]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getSearchTypeBadge = (type: string) => {
    const colors = {
      traditional: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      ai: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      both: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    };
    return colors[type as keyof typeof colors] || colors.traditional;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <History className="h-8 w-8" />
                Keyword Storage & History
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                View and manage your stored keyword research results
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleFlushCache}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
                Flush Cache
              </button>
              <button
                onClick={() => loadResearchResults(page)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && loadResearchResults(1)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                <Filter className="h-4 w-4" />
                Filters
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <button
                onClick={() => loadResearchResults(1)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                Search
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search Type
                  </label>
                  <select
                    value={searchTypeFilter}
                    onChange={(e) => setSearchTypeFilter(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="all">All Types</option>
                    <option value="traditional">Traditional</option>
                    <option value="ai">AI</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., United States"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Language
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., en"
                    value={languageFilter}
                    onChange={(e) => setLanguageFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6">
            <Alert variant="error" title="Error" message={error} />
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading keyword history...</p>
          </div>
        ) : researchResults.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No keyword research found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Start researching keywords to see them here
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 mb-6">
              {researchResults.map((result) => (
                <div
                  key={result.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {result.keyword}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSearchTypeBadge(result.search_type)}`}>
                          {result.search_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Globe className="h-4 w-4" />
                          {result.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Languages className="h-4 w-4" />
                          {result.language}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(result.created_at)}
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          {result.keyword_count} keywords
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewDetails(result)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700 border border-green-300 rounded-lg hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </button>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {result.traditional_keyword_data && (
                      <>
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="text-lg font-bold text-blue-900 dark:text-blue-200">
                            {formatNumber(result.traditional_keyword_data.search_volume || 0)}
                          </div>
                          <div className="text-xs text-blue-700 dark:text-blue-300">Search Volume</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                          <div className="text-lg font-bold text-orange-900 dark:text-orange-200">
                            {result.traditional_keyword_data.keyword_difficulty || 0}
                          </div>
                          <div className="text-xs text-orange-700 dark:text-orange-300">Difficulty</div>
                        </div>
                      </>
                    )}
                    {result.ai_keyword_data && (
                      <>
                        <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <div className="text-lg font-bold text-purple-900 dark:text-purple-200">
                            {formatNumber(result.ai_keyword_data.ai_search_volume || 0)}
                          </div>
                          <div className="text-xs text-purple-700 dark:text-purple-300">AI Volume</div>
                        </div>
                        <div className="text-center p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                          <div className="text-lg font-bold text-pink-900 dark:text-pink-200">
                            {result.ai_keyword_data.ai_optimization_score || 0}
                          </div>
                          <div className="text-xs text-pink-700 dark:text-pink-300">AI Score</div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Keywords Preview */}
                  {result.keyword_count > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Keywords ({result.keyword_count})
                        </h4>
                        <button
                          onClick={() => handleViewDetails(result)}
                          className="text-xs text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-medium"
                        >
                          View All →
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {/* Show primary keyword */}
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs font-medium rounded">
                          {result.keyword}
                        </span>
                        {/* Show keyword preview if available */}
                        {result.keyword_preview && result.keyword_preview.length > 0 ? (
                          <>
                            {result.keyword_preview.slice(0, 9).map((term: KeywordTerm) => (
                              <span 
                                key={term.id}
                                className={`px-2 py-1 text-xs rounded ${
                                  term.is_related_term 
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                                    : term.is_matching_term
                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}
                                title={`Volume: ${formatNumber(term.search_volume)} | Difficulty: ${term.keyword_difficulty || 'N/A'}`}
                              >
                                {term.keyword}
                              </span>
                            ))}
                            {result.keyword_count > result.keyword_preview.length + 1 && (
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                                +{result.keyword_count - result.keyword_preview.length - 1} more
                              </span>
                            )}
                          </>
                        ) : (
                          /* Fallback: show related_terms from JSONB if preview not loaded */
                          result.related_terms && result.related_terms.length > 0 && (
                            <>
                              {result.related_terms.slice(0, 9).map((term: any, idx: number) => (
                                <span 
                                  key={idx}
                                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded"
                                >
                                  {typeof term === 'string' ? term : term.keyword}
                                </span>
                              ))}
                              {result.keyword_count > result.related_terms.length + 1 && (
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                                  +{result.keyword_count - result.related_terms.length - 1} more
                                </span>
                              )}
                            </>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} results
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Detail Modal */}
        {selectedResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedResult.keyword}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Research Details • {formatDate(selectedResult.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedResult(null);
                    setKeywordTerms([]);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                {loadingTerms ? (
                  <div className="text-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading keyword terms...</p>
                  </div>
                ) : keywordTerms.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600 dark:text-gray-400">No keyword terms found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Keyword</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Search Volume</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">AI Volume</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Difficulty</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Competition</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">CPC</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">AI Score</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {keywordTerms.map((term) => (
                          <tr key={term.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                              {term.keyword}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {formatNumber(term.search_volume)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {term.ai_search_volume > 0 ? formatNumber(term.ai_search_volume) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {term.keyword_difficulty || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {term.competition ? (term.competition * 100).toFixed(0) + '%' : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {term.cpc ? '$' + term.cpc.toFixed(2) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {term.ai_optimization_score !== null && term.ai_optimization_score !== undefined 
                                ? term.ai_optimization_score + '/100' 
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                {term.is_related_term && (
                                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded dark:bg-blue-900 dark:text-blue-200">
                                    Related
                                  </span>
                                )}
                                {term.is_matching_term && (
                                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded dark:bg-green-900 dark:text-green-200">
                                    Matching
                                  </span>
                                )}
                                {term.ai_recommended && (
                                  <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded dark:bg-purple-900 dark:text-purple-200">
                                    AI Recommended
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
