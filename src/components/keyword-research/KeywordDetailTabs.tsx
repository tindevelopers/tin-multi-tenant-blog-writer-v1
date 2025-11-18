"use client";

import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  List, 
  Link2, 
  HelpCircle, 
  Layers, 
  Search, 
  DollarSign,
  Plus,
  Download,
  Send,
  CheckSquare,
  Square
} from 'lucide-react';

interface KeywordData {
  keyword: string;
  search_volume?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  competition?: number;
  cpc?: number;
  trend_score?: number;
  recommended?: boolean;
  reason?: string;
  related_keywords?: string[];
  long_tail_keywords?: string[];
  parent_topic?: string;
  primary_intent?: string;
  also_rank_for?: string[];
  also_talk_about?: string[];
}

interface ClusterData {
  parent_topic: string;
  keywords: string[];
  cluster_score: number;
  keyword_count: number;
}

interface SERPData {
  serp_features?: {
    has_featured_snippet?: boolean;
    has_people_also_ask?: boolean;
    has_videos?: boolean;
    has_images?: boolean;
  };
  people_also_ask?: Array<{ question: string; answer?: string }>;
  featured_snippet?: { title: string; content: string; url: string };
  top_domains?: Array<{ domain: string; rank: number }>;
}

interface KeywordDetailTabsProps {
  primaryKeyword: string;
  keywords: KeywordData[];
  clusters?: ClusterData[];
  serpData?: SERPData;
  onSelectKeywords?: (keywords: string[]) => void;
  onCreateBlog?: (keyword: string, searchType?: string) => void;
  searchType?: string;
}

export function KeywordDetailTabs({
  primaryKeyword,
  keywords,
  clusters = [],
  serpData,
  onSelectKeywords,
  onCreateBlog,
  searchType = 'general',
}: KeywordDetailTabsProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    minVolume: 0,
    maxDifficulty: 'hard' as 'easy' | 'medium' | 'hard',
    minCPC: 0,
  });

  // Filtered keywords based on filters
  const filteredKeywords = useMemo(() => {
    return keywords.filter(kw => {
      if (kw.search_volume && kw.search_volume < filters.minVolume) return false;
      if (kw.cpc && kw.cpc < filters.minCPC) return false;
      if (kw.difficulty) {
        const diffOrder = { easy: 1, medium: 2, hard: 3 };
        const maxDiff = diffOrder[filters.maxDifficulty];
        if (diffOrder[kw.difficulty] > maxDiff) return false;
      }
      return true;
    });
  }, [keywords, filters]);

  // Matching terms (long-tail keywords)
  // NOTE: Only include keywords that have their own individual metrics
  // Long-tail keywords from the array are just strings without metrics, so we don't expand them
  // Instead, we only show keywords that are actual entries in the keywords array with their own data
  const matchingTerms = useMemo(() => {
    // Filter to only show keywords that are actual entries (not expanded from long_tail_keywords)
    // These should have unique metrics, not duplicated from a parent keyword
    return keywords.filter(kw => {
      // Exclude if this keyword appears in any other keyword's long_tail_keywords array
      // (meaning it's a derived keyword, not a primary entry)
      const isDerived = keywords.some(otherKw => 
        otherKw.keyword !== kw.keyword && 
        otherKw.long_tail_keywords?.includes(kw.keyword)
      );
      return !isDerived;
    }).map(kw => ({
      keyword: kw.keyword,
      parent: kw.parent_topic || kw.keyword,
      search_volume: kw.search_volume,
      difficulty: kw.difficulty,
      competition: kw.competition,
      cpc: kw.cpc,
    }));
  }, [keywords]);

  // Question keywords
  const questionKeywords = useMemo(() => {
    return keywords.filter(kw => {
      const q = kw.keyword.toLowerCase();
      return q.startsWith('how ') || q.startsWith('what ') || q.startsWith('why ') ||
             q.startsWith('when ') || q.startsWith('where ') || q.startsWith('who ');
    });
  }, [keywords]);

  const handleToggleKeyword = (keyword: string) => {
    const newSelected = new Set(selectedKeywords);
    if (newSelected.has(keyword)) {
      newSelected.delete(keyword);
    } else {
      newSelected.add(keyword);
    }
    setSelectedKeywords(newSelected);
    onSelectKeywords?.(Array.from(newSelected));
  };

  const handleSelectAll = () => {
    const all = new Set(filteredKeywords.map(k => k.keyword));
    setSelectedKeywords(all);
    onSelectKeywords?.(Array.from(all));
  };

  const handleClearSelection = () => {
    setSelectedKeywords(new Set());
    onSelectKeywords?.([]);
  };

  const formatNumber = (num?: number): string => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText, count: null },
    { id: 'matching', label: 'Matching Terms', icon: List, count: matchingTerms.length },
    { id: 'related', label: 'Related Terms', icon: Link2, count: keywords.reduce((sum, k) => sum + (k.related_keywords?.length || 0), 0) },
    { id: 'questions', label: 'Questions', icon: HelpCircle, count: questionKeywords.length },
    { id: 'clusters', label: 'Clusters', icon: Layers, count: clusters.length },
    { id: 'serp', label: 'SERP Insights', icon: Search, count: null },
    { id: 'ads', label: 'Ads / PPC', icon: DollarSign, count: null },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== null && (
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    isActive
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Keyword: {primaryKeyword}
              </h3>
              <button
                onClick={() => onCreateBlog?.(primaryKeyword, searchType)}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4 inline mr-2" />
                Create Blog
              </button>
            </div>

            {/* Keyword Metadata Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Metric</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {keywords.slice(0, 1).map((kw) => (
                    <React.Fragment key={kw.keyword}>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Search Volume</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatNumber(kw.search_volume)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Difficulty</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white capitalize">{kw.difficulty || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Competition</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {kw.competition ? `${(kw.competition * 100).toFixed(0)}%` : 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">CPC</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {kw.cpc ? `$${kw.cpc.toFixed(2)}` : 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Trend Score</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {kw.trend_score !== undefined ? `${kw.trend_score > 0 ? '+' : ''}${kw.trend_score.toFixed(1)}` : 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Recommended</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {kw.recommended ? (
                            <span className="text-green-600 dark:text-green-400">Yes</span>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                      </tr>
                      {kw.reason && (
                        <tr>
                          <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Reason</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{kw.reason}</td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SERP Snapshot */}
            {serpData && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">SERP Features</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {serpData.serp_features?.has_featured_snippet && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-xs font-medium text-blue-700 dark:text-blue-300">Featured Snippet</div>
                    </div>
                  )}
                  {serpData.serp_features?.has_people_also_ask && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-xs font-medium text-green-700 dark:text-green-300">People Also Ask</div>
                    </div>
                  )}
                  {serpData.serp_features?.has_videos && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="text-xs font-medium text-purple-700 dark:text-purple-300">Videos</div>
                    </div>
                  )}
                  {serpData.serp_features?.has_images && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="text-xs font-medium text-orange-700 dark:text-orange-300">Images</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Matching Terms Tab */}
        {activeTab === 'matching' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Long-Tail Keywords
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Select All
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={handleClearSelection}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Clear
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedKeywords.size} selected
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Min Volume
                </label>
                <input
                  type="number"
                  value={filters.minVolume}
                  onChange={(e) => setFilters({ ...filters, minVolume: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Difficulty
                </label>
                <select
                  value={filters.maxDifficulty}
                  onChange={(e) => setFilters({ ...filters, maxDifficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Min CPC
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={filters.minCPC}
                  onChange={(e) => setFilters({ ...filters, minCPC: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            {/* Keywords Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-12">
                      <CheckSquare className="h-4 w-4" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Keyword</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Volume</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Difficulty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">CPC</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Parent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {matchingTerms.map((term, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleKeyword(term.keyword)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {selectedKeywords.has(term.keyword) ? (
                            <CheckSquare className="h-4 w-4 text-brand-500" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {term.keyword}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatNumber(term.search_volume)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 capitalize">
                        {term.difficulty || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {term.cpc ? `$${term.cpc.toFixed(2)}` : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {term.parent}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bulk Actions */}
            {selectedKeywords.size > 0 && (
              <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium">
                  <Send className="h-4 w-4 inline mr-2" />
                  Send to Content Brief
                </button>
                <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">
                  <Download className="h-4 w-4 inline mr-2" />
                  Export CSV
                </button>
              </div>
            )}
          </div>
        )}

        {/* Related Terms Tab */}
        {activeTab === 'related' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Related Terms</h3>
            <div className="space-y-4">
              {keywords.map((kw) => (
                kw.related_keywords && kw.related_keywords.length > 0 && (
                  <div key={kw.keyword} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Related to: {kw.keyword}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {kw.related_keywords.map((related, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300"
                        >
                          {related}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Question Keywords</h3>
            <div className="space-y-2">
              {questionKeywords.map((kw, idx) => (
                <div
                  key={idx}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{kw.keyword}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Volume: {formatNumber(kw.search_volume)} | 
                        Difficulty: {kw.difficulty || 'N/A'} | 
                        CPC: {kw.cpc ? `$${kw.cpc.toFixed(2)}` : 'N/A'}
                      </div>
                    </div>
                    <button
                      onClick={() => onCreateBlog?.(kw.keyword, 'qa')}
                      className="px-3 py-1 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                    >
                      Use for Q&A
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clusters Tab */}
        {activeTab === 'clusters' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Content Clusters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clusters.map((cluster, idx) => (
                <div
                  key={idx}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">{cluster.parent_topic}</h4>
                    <span className="px-2 py-1 text-xs bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 rounded">
                      Score: {cluster.cluster_score.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {cluster.keyword_count} keywords
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {cluster.keywords.slice(0, 5).map((kw, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                      >
                        {kw}
                      </span>
                    ))}
                    {cluster.keywords.length > 5 && (
                      <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                        +{cluster.keywords.length - 5} more
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onCreateBlog?.(cluster.parent_topic, searchType)}
                    className="w-full px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium"
                  >
                    Generate Brief
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SERP Insights Tab */}
        {activeTab === 'serp' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">SERP Insights</h3>
            {serpData?.people_also_ask && serpData.people_also_ask.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">People Also Ask</h4>
                <div className="space-y-2">
                  {serpData.people_also_ask.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{item.question}</div>
                      {item.answer && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.answer}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {serpData?.top_domains && serpData.top_domains.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Top Competing Domains</h4>
                <div className="space-y-2">
                  {serpData.top_domains.map((domain, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <span className="text-sm text-gray-900 dark:text-white">{domain.domain}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Rank #{domain.rank}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ads / PPC Tab */}
        {activeTab === 'ads' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ads / PPC Data</h3>
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>PPC data will be displayed here when available from DataForSEO</p>
              <p className="text-sm mt-2">This includes competitor ad copy, CPC trends, and bidding insights</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

