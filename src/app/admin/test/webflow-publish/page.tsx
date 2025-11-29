"use client";

import { useState } from 'react';
import { ArrowPathIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function WebflowPublishTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test/webflow-publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to publish to Webflow');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Webflow Publishing Test
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This page will test the Webflow CMS integration by creating a sample blog post and
            publishing it to your configured Webflow collection.
          </p>

          <div className="mb-6">
            <button
              onClick={handleTest}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Publishing to Webflow...
                </>
              ) : (
                'Test Webflow Publishing'
              )}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <div className="flex">
                <XCircleIcon className="h-5 w-5 text-red-400 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Error
                  </h3>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <div className="flex">
                <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                    Success!
                  </h3>
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {result.message}
                    </p>
                    {result.result && (
                      <div className="mt-3 space-y-1 text-sm">
                        <div>
                          <span className="font-medium">Item ID:</span>{' '}
                          <code className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                            {result.result.itemId}
                          </code>
                        </div>
                        <div>
                          <span className="font-medium">Published:</span>{' '}
                          {result.result.published ? (
                            <span className="text-green-600 dark:text-green-400">Yes</span>
                          ) : (
                            <span className="text-yellow-600 dark:text-yellow-400">No (Draft)</span>
                          )}
                        </div>
                        {result.result.url && (
                          <div>
                            <span className="font-medium">URL:</span>{' '}
                            <a
                              href={result.result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {result.result.url}
                            </a>
                          </div>
                        )}
                        {result.blogPost && (
                          <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                            <div>
                              <span className="font-medium">Blog Post Title:</span>{' '}
                              {result.blogPost.title}
                            </div>
                            <div>
                              <span className="font-medium">Slug:</span>{' '}
                              <code className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                                {result.blogPost.slug}
                              </code>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-md">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              What this test does:
            </h2>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>Finds your configured Webflow integration</li>
              <li>Creates a sample blog post with test content</li>
              <li>Maps fields using your configured field mappings (or defaults)</li>
              <li>Creates the item in your Webflow CMS collection</li>
              <li>Publishes it immediately to make it live</li>
              <li>Returns the Webflow item ID and URL</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <h2 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              Requirements:
            </h2>
            <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>You must have a Webflow integration configured</li>
              <li>The integration must have an API key and Collection ID set</li>
              <li>Your Webflow API key must have access to the collection</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

