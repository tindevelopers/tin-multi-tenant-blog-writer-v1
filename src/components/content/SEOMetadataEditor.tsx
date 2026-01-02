/**
 * SEO Metadata Editor Component
 * 
 * Allows editing of SEO metadata and structured data
 */

"use client";

import React, { useState, useEffect } from 'react';
import { metadataGenerationAPI } from '@/lib/metadata-generation-api';
import { logger } from '@/utils/logger';
import { 
  GlobeAltIcon,
  DocumentTextIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface SEOMetadata {
  og_title?: string;
  og_description?: string;
  og_image?: string;
  og_type?: string;
  twitter_card?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image?: string;
  canonical_url?: string;
  meta_title?: string;
  meta_description?: string;
  [key: string]: string | undefined;
}

interface StructuredData {
  '@context'?: string;
  '@type'?: string;
  [key: string]: any;
}

interface SEOMetadataEditorProps {
  initialMetadata?: SEOMetadata;
  initialStructuredData?: StructuredData;
  onSave?: (metadata: SEOMetadata, structuredData: StructuredData) => void;
  className?: string;
  content?: string;
  title?: string;
  keywords?: string[];
}

export function SEOMetadataEditor({
  initialMetadata = {},
  initialStructuredData = {},
  onSave,
  className = '',
  content = '',
  title = '',
  keywords = [],
}: SEOMetadataEditorProps) {
  const [metadata, setMetadata] = useState<SEOMetadata>(initialMetadata);
  const [structuredData, setStructuredData] = useState<StructuredData>(initialStructuredData);
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    setMetadata(initialMetadata);
    setStructuredData(initialStructuredData);
  }, [initialMetadata, initialStructuredData]);

  const handleSave = () => {
    if (onSave) {
      onSave(metadata, structuredData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const updateMetadata = (key: string, value: string) => {
    setMetadata(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerateFromBackend = async () => {
    if (!content || content.trim().length === 0) {
      setGenerateError('Content is required to generate metadata from backend.');
      return;
    }
    setGenerateError(null);
    setGenerating(true);
    try {
      const result = await metadataGenerationAPI.generateMetaTags({
        content,
        title: title || metadata.meta_title,
        keywords,
        canonical_url: metadata.canonical_url,
        featured_image: metadata.og_image || metadata.twitter_image,
      });

      logger.debug('Metadata generated from backend', { hasOg: !!result.og_title, hasTwitter: !!result.twitter_title });

      setMetadata(prev => ({
        ...prev,
        ...result,
      }));
    } catch (error: any) {
      const message = error?.message || 'Failed to generate metadata from backend';
      setGenerateError(message);
      logger.error('Metadata generation failed', { error: message });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GlobeAltIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            SEO Metadata
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateFromBackend}
            disabled={generating}
            className="px-3 py-2 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:bg-gray-100 disabled:text-gray-500 rounded-lg text-sm font-medium transition-colors dark:bg-gray-800 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-gray-700"
          >
            {generating ? 'Generating…' : 'Generate from Backend'}
          </button>
          {onSave && (
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {saved ? (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  Saved
                </>
              ) : (
                'Save'
              )}
            </button>
          )}
        </div>
      </div>

      {generateError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {generateError}
        </div>
      )}

      <div className="space-y-4">
        {/* Open Graph Metadata */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Open Graph
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                OG Title
              </label>
              <input
                type="text"
                value={metadata.og_title || ''}
                onChange={(e) => updateMetadata('og_title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                placeholder="Open Graph title"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                OG Description
              </label>
              <textarea
                value={metadata.og_description || ''}
                onChange={(e) => updateMetadata('og_description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                placeholder="Open Graph description"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                OG Image URL
              </label>
              <input
                type="url"
                value={metadata.og_image || ''}
                onChange={(e) => updateMetadata('og_image', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>
        </div>

        {/* Twitter Card */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Twitter Card
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Twitter Card Type
              </label>
              <select
                value={metadata.twitter_card || 'summary_large_image'}
                onChange={(e) => updateMetadata('twitter_card', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="summary">Summary</option>
                <option value="summary_large_image">Summary Large Image</option>
                <option value="app">App</option>
                <option value="player">Player</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Twitter Title
              </label>
              <input
                type="text"
                value={metadata.twitter_title || ''}
                onChange={(e) => updateMetadata('twitter_title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                placeholder="Twitter card title"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Twitter Description
              </label>
              <textarea
                value={metadata.twitter_description || ''}
                onChange={(e) => updateMetadata('twitter_description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                placeholder="Twitter card description"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Twitter Image URL
              </label>
              <input
                type="url"
                value={metadata.twitter_image || ''}
                onChange={(e) => updateMetadata('twitter_image', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                placeholder="https://example.com/twitter-image.jpg"
              />
            </div>
          </div>
        </div>
        
        {/* Meta Tags */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Meta Tags
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Meta Title
              </label>
              <input
                type="text"
                value={metadata.meta_title || ''}
                onChange={(e) => updateMetadata('meta_title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                placeholder="Page title"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Meta Description
              </label>
              <textarea
                value={metadata.meta_description || ''}
                onChange={(e) => updateMetadata('meta_description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                placeholder="Page description"
              />
            </div>
          </div>
        </div>

        {/* Canonical URL */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Canonical URL
          </label>
          <input
            type="url"
            value={metadata.canonical_url || ''}
            onChange={(e) => updateMetadata('canonical_url', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
            placeholder="https://example.com/canonical-url"
          />
        </div>

        {/* Structured Data Preview */}
        {structuredData && Object.keys(structuredData).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Structured Data
            </h4>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
                {JSON.stringify(structuredData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

