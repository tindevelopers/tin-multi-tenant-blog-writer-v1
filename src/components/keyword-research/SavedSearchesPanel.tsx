"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { History, Search, X, Calendar, Globe, Filter, RefreshCw, Trash2, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface SavedSearch {
  id: string;
  keyword: string;
  search_query?: string; // For backward compatibility
  location: string;
  language: string;
  search_type: 'traditional' | 'ai' | 'both' | string;
  niche?: string;
  keyword_count: number;
  total_search_volume?: number;
  avg_difficulty?: string;
  created_at: string;
  full_api_response?: any;
  traditional_keyword_data?: any;
  ai_keyword_data?: any;
}

interface SavedSearchesPanelProps {
  onRerunSearch: (search: SavedSearch) => void;
  userId?: string;
}

export function SavedSearchesPanel({ onRerunSearch, userId }: SavedSearchesPanelProps) {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    query: '',
    location: '',
    searchType: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadSearches();
  }, [filters]);

  const loadSearches = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user && !userId) {
        setError('Please log in to view saved searches');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        limit: '20',
        offset: '0',
      });
      
      if (filters.query) params.append('keyword', filters.query);
      if (filters.location) params.append('location', filters.location);
      if (filters.searchType) params.append('search_type', filters.searchType);
      
      const response = await fetch(`/api/keywords/research-results?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to load search history');
      }
      
      const data = await response.json();
      
      if (data.success && data.results) {
        // Transform results to SavedSearch format
        const transformedSearches: SavedSearch[] = data.results.map((result: any) => ({
          id: result.id,
          keyword: result.keyword,
          search_query: result.keyword, // For backward compatibility
          location: result.location || 'United States',
          language: result.language || 'en',
          search_type: result.search_type || 'traditional',
          keyword_count: result.keyword_count || 0,
          total_search_volume: result.traditional_keyword_data?.search_volume || 0,
          avg_difficulty: result.traditional_keyword_data?.keyword_difficulty?.toString() || undefined,
          created_at: result.created_at,
          traditional_keyword_data: result.traditional_keyword_data,
          ai_keyword_data: result.ai_keyword_data,
        }));
        
        setSearches(transformedSearches);
      } else {
        setSearches([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load searches');
      setSearches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (searchId: string) => {
    if (!confirm('Are you sure you want to delete this saved search?')) return;
    
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('keyword_research_results')
        .delete()
        .eq('id', searchId);
      
      if (error) throw error;
      
      setSearches(searches.filter(s => s.id !== searchId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete search');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <History className="h-5 w-5" />
          Saved Searches
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Filter className="h-4 w-4" />
          </button>
          <button
            onClick={loadSearches}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Search query..."
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
            />
            <input
              type="text"
              placeholder="Location..."
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
            />
            <input
              type="date"
              placeholder="From date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
            />
            <input
              type="date"
              placeholder="To date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
            />
          </div>
          <button
            onClick={() => setFilters({ query: '', location: '', searchType: '', dateFrom: '', dateTo: '' })}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
          Loading searches...
        </div>
      )}

      {/* Empty State */}
      {!loading && searches.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No saved searches found</p>
          <p className="text-sm mt-2">Your keyword searches will be saved here for easy access</p>
        </div>
      )}

      {/* Search List */}
      {!loading && searches.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {searches.map((search) => (
            <div
              key={search.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {search.keyword || search.search_query}
                    </h4>
                    {search.search_type && search.search_type !== 'general' && (
                      <span className="px-2 py-0.5 text-xs bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 rounded">
                        {search.search_type}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {search.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Search className="h-3 w-3" />
                      {search.keyword_count} keywords
                    </div>
                    {search.total_search_volume && search.total_search_volume > 0 && (
                      <div>
                        Volume: {formatNumber(search.total_search_volume)}
                      </div>
                    )}
                    {search.avg_difficulty && (
                      <div>
                        Difficulty: {search.avg_difficulty}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(search.created_at)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Link
                    href={`/admin/seo/keywords?id=${search.id}`}
                    className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    title="View keywords from this search"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => onRerunSearch(search)}
                    className="p-2 text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded"
                    title="Re-run this search"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(search.id)}
                    className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    title="Delete this search"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

