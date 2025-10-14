'use client';

import { useState } from 'react';
import InputField from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Select from '@/components/form/Select';
import { Search, Loader2 } from 'lucide-react';

interface PrimaryKeywordInputProps {
  onResearch: (keyword: string, location: string, language: string) => void;
  loading?: boolean;
}

const LOCATIONS = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Netherlands',
  'Sweden',
  'Brazil',
  'India',
  'Japan',
  'Singapore',
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
];

export function PrimaryKeywordInput({ onResearch, loading = false }: PrimaryKeywordInputProps) {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('United States');
  const [language, setLanguage] = useState('en');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      onResearch(keyword.trim(), location, language);
    }
  };

  const locationOptions = LOCATIONS.map((loc) => ({ value: loc, label: loc }));
  const languageOptions = LANGUAGES.map((lang) => ({ value: lang.code, label: lang.name }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
          <Search className="h-5 w-5" />
          Primary Keyword Research
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Enter a primary keyword to discover variations, search volumes, and content opportunities
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="keyword">Primary Keyword</Label>
          <input
            id="keyword"
            type="text"
            placeholder="e.g., content marketing, SEO tools, productivity apps"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            disabled={loading}
            required
            maxLength={100}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Enter the main keyword you want to research and build content around
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="location">Target Location</Label>
            <Select
              options={locationOptions}
              defaultValue={location}
              onChange={setLocation}
              placeholder="Select location"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select
              options={languageOptions}
              defaultValue={language}
              onChange={setLanguage}
              placeholder="Select language"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !keyword.trim()}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:bg-brand-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Researching Keywords...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Research Keywords
            </>
          )}
        </button>
      </form>
    </div>
  );
}

