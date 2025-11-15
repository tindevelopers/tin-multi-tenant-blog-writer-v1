/**
 * Webflow OAuth Configuration Component
 * 
 * Allows administrators to configure Webflow OAuth credentials
 * and view connection status.
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';

interface WebflowOAuthConfigProps {
  onClose?: () => void;
}

export function WebflowOAuthConfig({ onClose }: WebflowOAuthConfigProps) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');

  // Check if OAuth is configured (client-side check)
  useEffect(() => {
    checkOAuthStatus();
  }, []);

  const checkOAuthStatus = async () => {
    try {
      // Check if there's an existing Webflow integration
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Check for existing Webflow integrations
      const response = await fetch('/api/integrations?provider=webflow');
      if (response.ok) {
        const data = await response.json();
        if (data.integrations && data.integrations.length > 0) {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('disconnected');
        }
      }
    } catch (err) {
      logger.error('Error checking OAuth status:', err);
    }
  };

  const handleOAuthConnect = () => {
    setLoading(true);
    setError(null);
    // Redirect to OAuth authorization endpoint
    window.location.href = '/api/integrations/oauth/webflow/authorize';
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/integrations/test/webflow', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.connected) {
        setSuccess('Connection test successful!');
        setConnectionStatus('connected');
      } else {
        setError(data.error || 'Connection test failed');
        setConnectionStatus('disconnected');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to test connection');
      setConnectionStatus('disconnected');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Webflow OAuth Configuration
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configure OAuth credentials for Webflow integration
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XCircleIcon className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Connection Status */}
      <div className={`p-4 rounded-lg border ${
        connectionStatus === 'connected'
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : connectionStatus === 'disconnected'
          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-center gap-3">
          {connectionStatus === 'connected' ? (
            <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : connectionStatus === 'disconnected' ? (
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          ) : (
            <KeyIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              Status: {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'disconnected' ? 'Not Connected' : 'Unknown'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {connectionStatus === 'connected'
                ? 'Webflow OAuth is configured and connected'
                : connectionStatus === 'disconnected'
                ? 'Click "Connect with Webflow OAuth" to set up the connection'
                : 'Checking connection status...'}
            </div>
          </div>
        </div>
      </div>

      {/* OAuth Setup Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-3">
          Setup Instructions
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-300">
          <li>
            <strong>Create a Webflow OAuth App:</strong> Go to{' '}
            <a
              href="https://developers.webflow.com/oauth"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-600 dark:hover:text-blue-200"
            >
              Webflow Developer Portal
            </a>{' '}
            and create a new OAuth application
          </li>
          <li>
            <strong>Configure Redirect URI:</strong> Set the redirect URI to:{' '}
            <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
              {typeof window !== 'undefined' ? `${window.location.origin}/api/integrations/oauth/webflow/callback` : 'Your app URL + /api/integrations/oauth/webflow/callback'}
            </code>
          </li>
          <li>
            <strong>Set Environment Variables:</strong> Add the following to your server environment variables:
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li><code>WEBFLOW_CLIENT_ID</code> - Your OAuth Client ID</li>
              <li><code>WEBFLOW_CLIENT_SECRET</code> - Your OAuth Client Secret</li>
              <li><code>NEXT_PUBLIC_APP_URL</code> - Your application URL</li>
            </ul>
          </li>
          <li>
            <strong>Connect:</strong> Click the button below to initiate the OAuth flow
          </li>
        </ol>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleOAuthConnect}
          disabled={loading}
          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Connecting...
            </>
          ) : (
            <>
              <LinkIcon className="w-5 h-5" />
              Connect with Webflow OAuth
            </>
          )}
        </button>
        <button
          onClick={handleTestConnection}
          disabled={testing || connectionStatus === 'unknown'}
          className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {testing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
              Testing...
            </>
          ) : (
            <>
              <KeyIcon className="w-5 h-5" />
              Test Connection
            </>
          )}
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3">
          <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-green-800 dark:text-green-200">{success}</div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-red-800 dark:text-red-200">Error</div>
            <div className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</div>
          </div>
        </div>
      )}

      {/* Note about Environment Variables */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong>Note:</strong> OAuth Client ID and Client Secret must be configured as server-side environment variables for security. 
          Contact your system administrator if you need to update these credentials.
        </p>
      </div>
    </div>
  );
}

