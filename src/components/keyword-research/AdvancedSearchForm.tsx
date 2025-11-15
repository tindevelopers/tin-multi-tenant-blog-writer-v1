"use client";

import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Globe, FileText, Save, X } from 'lucide-react';
import { DATAFORSEO_LOCATIONS, SEARCH_TYPES, SEARCH_MODES, LANGUAGES } from '@/lib/dataforseo-locations';

interface AdvancedSearchFormProps {
  onSearch: (params: {
    query: string;
    location: string;
    language: string;
    searchType: string;
    niche?: string;
    searchMode: string;
    saveSearch: boolean;
  }) => void;
  loading?: boolean;
  defaultQuery?: string;
  defaultLocation?: string;
  defaultSearchType?: string;
}

export function AdvancedSearchForm({
  onSearch,
  loading = false,
  defaultQuery = '',
  defaultLocation = 'United States',
  defaultSearchType = 'general',
}: AdvancedSearchFormProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [location, setLocation] = useState(defaultLocation);
  const [language, setLanguage] = useState('en');
  const [searchType, setSearchType] = useState(defaultSearchType);
  const [niche, setNiche] = useState('');
  const [searchMode, setSearchMode] = useState('keywords');
  const [saveSearch, setSaveSearch] = useState(true);
  const [locationSearch, setLocationSearch] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  // Load saved preferences from localStorage
  useEffect(() => {
    const savedLocation = localStorage.getItem('keyword_research_location');
    const savedLanguage = localStorage.getItem('keyword_research_language');
    const savedSearchType = localStorage.getItem('keyword_research_type');
    
    if (savedLocation) setLocation(savedLocation);
    if (savedLanguage) setLanguage(savedLanguage);
    if (savedSearchType) setSearchType(savedSearchType);
  }, []);

  // Save preferences to localStorage
  const savePreferences = () => {
    localStorage.setItem('keyword_research_location', location);
    localStorage.setItem('keyword_research_language', language);
    localStorage.setItem('keyword_research_type', searchType);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      savePreferences();
      onSearch({
        query: query.trim(),
        location,
        language,
        searchType,
        niche: niche.trim() || undefined,
        searchMode,
        saveSearch,
      });
    }
  };

  const filteredLocations = DATAFORSEO_LOCATIONS.filter(loc =>
    loc.name.toLowerCase().includes(locationSearch.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
          <Search className="h-5 w-5" />
          Advanced Keyword Research
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Discover high-value keywords with comprehensive search options
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Search Query */}
        <div className="space-y-2">
          <label htmlFor="query" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Search Query <span className="text-red-500">*</span>
          </label>
          <input
            id="query"
            type="text"
            placeholder="e.g., dog grooming, content marketing, SEO tools"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            required
            maxLength={200}
            className="h-11 w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:border-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Search Type and Niche Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="searchType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Search Type
            </label>
            <select
              id="searchType"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              disabled={loading}
              className="h-11 w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500 disabled:opacity-50"
            >
              {SEARCH_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {SEARCH_TYPES.find(t => t.value === searchType)?.description}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="niche" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Niche / Industry
            </label>
            <input
              id="niche"
              type="text"
              placeholder="e.g., pet care, local services, SaaS"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              disabled={loading}
              maxLength={100}
              className="h-11 w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:border-brand-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Location and Language Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Location
            </label>
            <div className="relative">
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setShowLocationDropdown(true);
                }}
                onFocus={() => setShowLocationDropdown(true)}
                placeholder="Search countries..."
                disabled={loading}
                className="h-11 w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:border-brand-500 disabled:opacity-50"
              />
              {showLocationDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                  <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                    <input
                      type="text"
                      placeholder="Search countries..."
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-auto">
                    {filteredLocations.map((loc) => (
                      <button
                        key={loc.code}
                        type="button"
                        onClick={() => {
                          setLocation(loc.name);
                          setShowLocationDropdown(false);
                          setLocationSearch('');
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        {loc.flag && <span className="text-lg">{loc.flag}</span>}
                        <span className="font-medium">{loc.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">({loc.code})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Language
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={loading}
              className="h-11 w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500 disabled:opacity-50"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Mode Tabs */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Search Mode
          </label>
          <div className="flex flex-wrap gap-2">
            {SEARCH_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setSearchMode(mode.value)}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  searchMode === mode.value
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                } disabled:opacity-50`}
              >
                <span className="mr-2">{mode.icon}</span>
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save Search Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="saveSearch"
            checked={saveSearch}
            onChange={(e) => setSaveSearch(e.target.checked)}
            disabled={loading}
            className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
          />
          <label htmlFor="saveSearch" className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Save className="h-4 w-4" />
            Save this search to history
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="w-full h-11 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Searching...
            </>
          ) : (
            <>
              <Search className="h-5 w-5" />
              Search Keywords
            </>
          )}
        </button>
      </form>
    </div>
  );
}

