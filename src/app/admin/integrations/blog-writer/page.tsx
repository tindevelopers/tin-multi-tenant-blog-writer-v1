/**
 * Blog Writer API Integrations Page
 * 
 * Allows users to connect to integrations via Blog Writer API
 * and get keyword-based recommendations.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  LinkIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { ConnectAndRecommendForm } from '@/components/integrations/ConnectAndRecommendForm';
import { RecommendationsForm } from '@/components/integrations/RecommendationsForm';

type Provider = 'webflow' | 'wordpress' | 'shopify';
type ViewMode = 'connect' | 'recommend';

export default function BlogWriterIntegrationsPage() {
  const router = useRouter();
  const [selectedProvider, setSelectedProvider] = useState<Provider>('webflow');
  const [viewMode, setViewMode] = useState<ViewMode>('connect');

  const providers: Array<{ value: Provider; label: string; description: string }> = [
    {
      value: 'webflow',
      label: 'Webflow',
      description: 'Connect to Webflow CMS and get content recommendations',
    },
    {
      value: 'wordpress',
      label: 'WordPress',
      description: 'Connect to WordPress and get content recommendations',
    },
    {
      value: 'shopify',
      label: 'Shopify',
      description: 'Connect to Shopify and get content recommendations',
    },
  ];

  const handleSuccess = (result: any) => {
    console.log('Integration connected successfully:', result);
    // Optionally redirect or show success message
  };

  const handleError = (error: string) => {
    console.error('Integration error:', error);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Blog Writer API Integrations
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Connect to integrations and get keyword-based recommendations
            </p>
          </div>
        </div>
      </div>

      {/* Provider Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Select Integration Provider</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {providers.map((provider) => (
            <button
              key={provider.value}
              onClick={() => setSelectedProvider(provider.value)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                selectedProvider === provider.value
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="font-semibold text-gray-900 dark:text-white">
                {provider.label}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {provider.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex gap-4">
          <button
            onClick={() => setViewMode('connect')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              viewMode === 'connect'
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <LinkIcon className="w-5 h-5" />
            Connect & Get Recommendations
          </button>
          <button
            onClick={() => setViewMode('recommend')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              viewMode === 'recommend'
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <ChartBarIcon className="w-5 h-5" />
            Preview Recommendations
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">
          {viewMode === 'connect'
            ? `Connect ${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)}`
            : `Get Recommendations for ${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)}`}
        </h2>

        {viewMode === 'connect' ? (
          <ConnectAndRecommendForm
            provider={selectedProvider}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        ) : (
          <RecommendationsForm
            provider={selectedProvider}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        )}
      </div>
    </div>
  );
}

