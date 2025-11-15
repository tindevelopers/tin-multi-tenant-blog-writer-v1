/**
 * Simple Integration Connection Form
 * 
 * Connects to an integration (Webflow, WordPress, Shopify) without keywords.
 * Keywords and backlink recommendations belong in the blog creation workflow.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';

interface ConnectIntegrationFormProps {
  provider: 'webflow' | 'wordpress' | 'shopify';
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export function ConnectIntegrationForm({
  provider,
  onSuccess,
  onError,
}: ConnectIntegrationFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [connection, setConnection] = useState<Record<string, string>>({});
  const [useOAuth, setUseOAuth] = useState(provider === 'webflow'); // Default to OAuth for Webflow
  const [oauthInProgress, setOauthInProgress] = useState(false);
  const [testConnection, setTestConnection] = useState(true); // Test connection by default

  // Provider-specific config fields
  const getConfigFields = () => {
    switch (provider) {
      case 'webflow':
        return [
          { key: 'api_key', label: 'Webflow API Key', type: 'password', required: true },
          { key: 'collection_id', label: 'Collection ID', type: 'text', required: true },
        ];
      case 'wordpress':
        return [
          { key: 'api_key', label: 'WordPress API Key', type: 'password', required: true },
          { key: 'endpoint', label: 'REST API Endpoint', type: 'url', required: true },
        ];
      case 'shopify':
        return [
          { key: 'api_key', label: 'Shopify API Key', type: 'password', required: true },
          { key: 'shop', label: 'Shop Domain', type: 'text', required: true },
        ];
      default:
        return [];
    }
  };

  const handleConfigChange = (key: string, value: string) => {
    setConnection((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // If using OAuth, connection should already be established
      if (useOAuth && provider === 'webflow') {
        // OAuth connections are handled separately via callback
        throw new Error('OAuth connection not completed. Please connect via OAuth first.');
      }

      // Validate required fields (for API key method)
      if (!useOAuth) {
        const configFields = getConfigFields();
        const requiredFields = configFields.filter((f) => f.required);
        const missingFields = requiredFields.filter(
          (f) => !connection[f.key] || connection[f.key].trim() === ''
        );

        if (missingFields.length > 0) {
          throw new Error(
            `Missing required fields: ${missingFields.map((f) => f.label).join(', ')}`
          );
        }
      }

      // Call API to connect (without keywords)
      const response = await fetch('/api/integrations/connect-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          connection,
          test_connection: testConnection,
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch {
        const text = await response.text();
        throw new Error(`Failed to parse response: ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        const errorMsg = data?.error || data?.detail || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMsg);
      }

      // Validate response structure
      if (!data || !data.success || !data.data) {
        throw new Error('Invalid response format from server');
      }

      setSuccess(`Successfully connected to ${provider}!`);
      onSuccess?.(data.data);
    } catch (err: any) {
      logger.error('ConnectIntegrationForm error:', err);
      const errorMessage = err?.message || err?.toString() || 'An error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const configFields = getConfigFields();

  // Handle OAuth flow initiation
  const handleOAuthConnect = () => {
    setOauthInProgress(true);
    // Redirect to OAuth authorization endpoint
    window.location.href = `/api/integrations/oauth/${provider}/authorize`;
  };

  // Check for OAuth success/error in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get('oauth_success');
    const oauthError = params.get('error');
    const oauthErrorDesc = params.get('error_description');

    if (oauthSuccess === 'true') {
      setSuccess('OAuth connection successful! Integration is now connected.');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      // Trigger success callback if OAuth was successful
      onSuccess?.({ connection_method: 'oauth', provider });
    } else if (oauthError) {
      setError(`OAuth error: ${oauthErrorDesc || oauthError}`);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [provider, onSuccess]);

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Connection Method Selection (OAuth vs API Key) */}
        {provider === 'webflow' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Connection Method</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="connection_method"
                  checked={useOAuth}
                  onChange={() => setUseOAuth(true)}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    OAuth (Recommended)
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Secure connection using Webflow OAuth. No API keys needed.
                  </div>
                </div>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="connection_method"
                  checked={!useOAuth}
                  onChange={() => setUseOAuth(false)}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    API Key (Manual)
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Connect using Webflow API key and Collection ID.
                  </div>
                </div>
              </label>
            </div>

            {useOAuth && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  Click the button below to connect via OAuth. You&apos;ll be redirected to Webflow to authorize access.
                </p>
                <button
                  type="button"
                  onClick={handleOAuthConnect}
                  disabled={oauthInProgress}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {oauthInProgress ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-5 h-5" />
                      Connect with Webflow OAuth
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Connection Configuration (API Key method) */}
        {!useOAuth && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Connection Configuration</h3>
            <div className="space-y-4">
              {configFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type={field.type}
                    value={connection[field.key] || ''}
                    onChange={(e) => handleConfigChange(field.key, e.target.value)}
                    placeholder={field.label}
                    required={field.required}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              ))}
            </div>
            
            {/* Test Connection Option */}
            <div className="mt-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={testConnection}
                  onChange={(e) => setTestConnection(e.target.checked)}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Test connection before saving
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Submit Button */}
        {!useOAuth && (
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : (
              `Connect ${provider.charAt(0).toUpperCase() + provider.slice(1)}`
            )}
          </button>
        )}
      </form>

      {/* Success Display */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3">
          <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-green-800 dark:text-green-200">Success</h4>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">{success}</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              You can now use this integration when creating blog posts. Keywords and backlink recommendations are available in the blog creation workflow.
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-800 dark:text-red-200">Error</h4>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

