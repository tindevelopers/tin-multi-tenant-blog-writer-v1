/**
 * API Test Component
 * Used to test Blog Writer API connection and endpoints
 */

import React, { useState } from 'react';
import { useAPIHealth, usePosts, useMetrics } from '@/hooks/useBlogWriterAPI';
import { blogWriterAPI } from '@/lib/blog-writer-api';

const APITest: React.FC = () => {
  const { isHealthy, checking } = useAPIHealth();
  const { data: posts, loading: postsLoading, error: postsError } = usePosts();
  const { data: metrics, loading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useMetrics();
  const [testResults, setTestResults] = useState<string[]>([]);

  const runTests = async () => {
    setTestResults(['Starting API tests...']);
    
    const tests = [
      {
        name: 'Health Check',
        test: async () => {
          const health = await blogWriterAPI.getDetailedHealth();
          return health ? `✅ API is healthy - Version: ${health.version}` : '❌ API is not responding';
        }
      },
      {
        name: 'Metrics Endpoint',
        test: async () => {
          await refetchMetrics();
          if (metricsError) return `❌ Metrics error: ${metricsError}`;
          if (metricsLoading) return '⏳ Metrics loading...';
          return `✅ Metrics loaded: ${metrics ? `${metrics.totalPosts} posts generated` : 'No data'}`;
        }
      },
      {
        name: 'Presets Endpoint',
        test: async () => {
          const presets = await blogWriterAPI.getPresets();
          return `✅ Presets loaded: ${presets.length} available presets`;
        }
      },
      {
        name: 'Quality Levels',
        test: async () => {
          const levels = await blogWriterAPI.getQualityLevels();
          return `✅ Quality levels: ${levels.length} available levels`;
        }
      },
      {
        name: 'Blog Generation Test',
        test: async () => {
          const result = await blogWriterAPI.generateBlog({
            topic: 'Test Blog Post',
            word_count: 100
          });
          return result ? '✅ Blog generation endpoint working' : '❌ Blog generation failed';
        }
      }
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        setTestResults(prev => [...prev, `${test.name}: ${result}`]);
      } catch (error) {
        setTestResults(prev => [...prev, `${test.name}: ❌ Error - ${error}`]);
      }
    }
  };

  const getStatusColor = () => {
    if (checking) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (isHealthy === true) return 'bg-green-100 text-green-800 border-green-200';
    if (isHealthy === false) return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = () => {
    if (checking) return '⏳';
    if (isHealthy === true) return '✅';
    if (isHealthy === false) return '❌';
    return '❓';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Blog Writer API Test
        </h2>
        <button
          onClick={runTests}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Run Tests
        </button>
      </div>

      {/* API Status */}
      <div className={`border rounded-lg p-4 mb-6 ${getStatusColor()}`}>
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getStatusIcon()}</span>
          <span className="font-medium">
            {checking ? 'Checking API...' : 
             isHealthy === true ? 'API Connected' : 
             isHealthy === false ? 'API Disconnected' : 
             'Unknown Status'}
          </span>
        </div>
        <p className="text-sm mt-1 opacity-75">
          API URL: {process.env.NEXT_PUBLIC_BLOG_WRITER_API_URL || 'Not configured'}
        </p>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">Test Results:</h3>
          <div className="space-y-1">
            {testResults.map((result, index) => (
              <div key={index} className="text-sm font-mono text-gray-700 dark:text-gray-300">
                {result}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Data Status */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">Posts Data</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {postsLoading && 'Loading posts...'}
            {postsError && `Error: ${postsError}`}
            {!postsLoading && !postsError && `Loaded ${posts?.length || 0} posts`}
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">Metrics Data</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {metricsLoading && 'Loading metrics...'}
            {metricsError && `Error: ${metricsError}`}
            {!metricsLoading && !metricsError && (metrics ? 'Metrics loaded' : 'No metrics data')}
          </div>
        </div>
      </div>

      {/* Environment Info */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Environment Info</h3>
        <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
          <div>API URL: {process.env.NEXT_PUBLIC_BLOG_WRITER_API_URL || 'Not set'}</div>
          <div>API Key: {process.env.NEXT_PUBLIC_BLOG_WRITER_API_KEY ? 'Set' : 'Not set'}</div>
          <div>Node Environment: {process.env.NODE_ENV}</div>
        </div>
      </div>
    </div>
  );
};

export default APITest;
