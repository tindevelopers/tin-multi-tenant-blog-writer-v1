/**
 * Webflow Configuration Component
 * 
 * Allows organization admins to configure Webflow integration with:
 * - API Key (for API key connections)
 * - Collection ID (required for Webflow CMS)
 * - Test Connection
 * - Sync Now
 * - Export Config
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import {
  CheckCircleIcon,
  XCircleIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { WebflowFieldMapping } from './WebflowFieldMapping';
import { SiteSelector } from './SiteSelector';
import { ContentTypeProfileSelector } from './ContentTypeProfileSelector';

interface WebflowConfigProps {
  integrationId?: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

export function WebflowConfig({ integrationId, onSuccess, onClose }: WebflowConfigProps) {
  const [apiKey, setApiKey] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [siteName, setSiteName] = useState("");
  const [integrationName, setIntegrationName] = useState(""); // Custom name for multiple integrations
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  
  // Multi-site and content type support
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [showSiteManagement, setShowSiteManagement] = useState(false);
  const [showContentTypeManagement, setShowContentTypeManagement] = useState(false);

  useEffect(() => {
    if (integrationId) {
      loadIntegration();
    }
  }, [integrationId]);

  const loadIntegration = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/integrations/${integrationId}`);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const integration = result.data;
          
          // Check if integration has valid config (API key and collection ID)
          const config = integration.config as Record<string, unknown> | undefined;
          const hasApiKey = config?.api_key && typeof config.api_key === 'string' && config.api_key.length > 0;
          const hasCollectionId = config?.collection_id && typeof config.collection_id === 'string' && config.collection_id.length > 0;
          
          // If integration is active and has required config, consider it connected
          // Also check health_status if available
          if (integration.status === 'active' && hasApiKey && hasCollectionId) {
            // If health_status is healthy, definitely connected
            if (integration.health_status === 'healthy') {
              setConnectionStatus('connected');
            } else if (integration.health_status === 'error') {
              setConnectionStatus('disconnected');
            } else {
              // If status is active but health unknown, assume connected (API might be working)
              setConnectionStatus('connected');
            }
          } else {
            setConnectionStatus('disconnected');
          }
          
          // Extract config values
          if (integration.config) {
            const config = integration.config as Record<string, unknown>;
            
            // Extract API key (masked)
            if (config.api_key && typeof config.api_key === 'string') {
              if (config.api_key.includes('****')) {
                setApiKey(config.api_key);
              } else {
                // Mask the API key
                const key = config.api_key;
                if (key.length > 8) {
                  setApiKey(`${key.substring(0, 4)}${'*'.repeat(key.length - 8)}${key.substring(key.length - 4)}`);
                } else {
                  setApiKey('****');
                }
              }
            }
            
            // Extract Collection ID
            if (config.collection_id && typeof config.collection_id === 'string') {
              setCollectionId(config.collection_id);
            }
            
            // Extract Site ID
            if (config.site_id && typeof config.site_id === 'string') {
              setSiteId(config.site_id);
            }
            
            // Extract Site Name (if available)
            if (config.site_name && typeof config.site_name === 'string') {
              setSiteName(config.site_name);
            }
            
            // Extract custom integration name from metadata if available
            // This is used to distinguish multiple Webflow integrations
            if (integration.metadata?.name && typeof integration.metadata.name === 'string') {
              setIntegrationName(integration.metadata.name);
            } else if (config.site_name && typeof config.site_name === 'string') {
              // Use site name as default name if no custom name set
              setIntegrationName(config.site_name);
            }
          }
        }
      }
    } catch (err) {
      logger.error('Error loading integration:', err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!apiKey || (!apiKey.includes('****') && !collectionId)) {
        setError("API Key and Collection ID are required");
        setLoading(false);
        return;
      }

      // Prepare connection config
      const connection: Record<string, unknown> = {
        collection_id: collectionId,
      };

      // Only include API key if it was changed (not masked)
      if (apiKey && !apiKey.includes('****')) {
        connection.api_key = apiKey;
      }
      
      // Include Site ID if provided
      if (siteId) {
        connection.site_id = siteId;
      }
      
      // Include Site Name if available
      if (siteName) {
        connection.site_name = siteName;
      }

      // Prepare request body with optional name for multiple integrations
      const requestBody: Record<string, unknown> = {
        provider: 'webflow',
        connection,
        test_connection: false,
      };
      
      if (integrationName) {
        requestBody.name = integrationName;
      }

      let response;
      if (integrationId) {
        // Update existing integration - need to merge with existing config
        // First get current integration to merge configs
        const getResponse = await fetch(`/api/integrations/${integrationId}`);
        
        if (!getResponse.ok) {
          throw new Error("Failed to fetch current integration");
        }
        
        const getData = await getResponse.json();
        // Handle both 'config' and 'connection' properties for backward compatibility
        const currentConfig = getData.success && getData.data 
          ? (getData.data.config || getData.data.connection || {})
          : {};
        
        // Merge configs - preserve field_mappings and other existing config
        const mergedConfig = {
          ...currentConfig,
          ...connection,
          // Explicitly preserve field_mappings if they exist
          ...(currentConfig.field_mappings && { field_mappings: currentConfig.field_mappings }),
        };

        // Update existing integration
        const updateBody: Record<string, unknown> = {
          connection: mergedConfig,
          connection_method: 'api_key',
        };
        
        if (integrationName) {
          updateBody.metadata = { name: integrationName };
        }

        response = await fetch(`/api/integrations/${integrationId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateBody),
        });
      } else {
        // Create new integration using connect-api-key endpoint
        response = await fetch('/api/integrations/connect-api-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save configuration");
      }

      // If Site ID was auto-detected, update local state
      if (data.data?.config?.site_id) {
        setSiteId(data.data.config.site_id);
      }
      if (data.data?.config?.site_name) {
        setSiteName(data.data.config.site_name);
      }

      setSuccess("Configuration saved successfully!");
      setConnectionStatus('connected');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!integrationId) {
      setError("Please save the configuration first");
      return;
    }

    setTesting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/integrations/${integrationId}/test`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update Site ID if it was auto-detected during test
        if (data.data?.site_id) {
          setSiteId(data.data.site_id);
        }
        if (data.data?.site_name) {
          setSiteName(data.data.site_name);
        }
        
        setSuccess(data.data?.message || 'Connection test successful!');
        setConnectionStatus('connected');
        
        // Refresh integration to get updated health status
        if (integrationId) {
          loadIntegration();
        }
      } else {
        // Only show error if it's a real failure, not just a warning
        const errorMsg = data.error || data.data?.error || 'Connection test failed';
        setError(errorMsg);
        // Don't automatically set to disconnected - might be a temporary issue
        // Only set disconnected if it's a clear authentication/configuration error
        if (errorMsg.toLowerCase().includes('unauthorized') || 
            errorMsg.toLowerCase().includes('invalid') ||
            errorMsg.toLowerCase().includes('not found')) {
          setConnectionStatus('disconnected');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to test connection');
      setConnectionStatus('disconnected');
    } finally {
      setTesting(false);
    }
  };

  const handleSyncNow = async () => {
    if (!integrationId) {
      setError("Please save the configuration first");
      return;
    }

    setSyncing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/integrations/${integrationId}/sync`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('Sync initiated successfully!');
      } else {
        setError(data.error || 'Sync failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sync');
    } finally {
      setSyncing(false);
    }
  };

  const handleExportConfig = async () => {
    if (!integrationId) {
      setError("Please save the configuration first");
      return;
    }

    try {
      const response = await fetch(`/api/integrations/${integrationId}/export`);

      const data = await response.json();

      if (response.ok && data.success) {
        // Download as JSON file
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `webflow-config-${integrationId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setSuccess('Configuration exported successfully!');
      } else {
        setError(data.error || 'Export failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to export configuration');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Webflow Configuration
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configure your Webflow CMS integration at the organization level
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
            <XCircleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          ) : (
            <KeyIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              Status: {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'disconnected' ? 'Not Connected' : 'Unknown'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {connectionStatus === 'connected'
                ? 'Webflow integration is configured and active'
                : connectionStatus === 'disconnected'
                ? 'Configure your Webflow API key and Collection ID below'
                : 'Checking connection status...'}
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="space-y-4">
        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Webflow API Key *
          </label>
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
              className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
              placeholder="wf_xxxxxxxxxxxxxxxx"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showApiKey ? (
                <EyeSlashIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Get your API key from Webflow Account Settings → Integrations → API Access
          </p>
        </div>

        {/* Collection ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Collection ID *
          </label>
          <input
            type="text"
            value={collectionId}
            onChange={(e) => setCollectionId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            The Collection ID of your Webflow CMS collection where blog posts will be published
          </p>
        </div>

        {/* Site ID (Auto-detected) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Site ID {siteId && <span className="text-green-600 dark:text-green-400 text-xs">(Auto-detected)</span>}
          </label>
          <div className="relative">
            <input
              type="text"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
              placeholder="Will be auto-detected from API key"
            />
            {siteId && !siteId.includes('****') && (
              <div className="absolute right-3 top-2">
                <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                  Auto-detected
                </span>
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {siteId 
              ? siteName 
                ? `Site: ${siteName} (Auto-detected from your API key)`
                : 'Auto-detected from your API key'
              : 'This will be automatically detected when you save or test the connection'}
          </p>
        </div>

        {/* Integration Name (for multiple Webflow sites) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Integration Name (Optional)
          </label>
          <input
            type="text"
            value={integrationName}
            onChange={(e) => setIntegrationName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
            placeholder={siteName || "e.g., Main Site, Blog Site, etc."}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Give this integration a custom name to distinguish it from other Webflow integrations. If left empty, the site name will be used.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleSave}
          disabled={loading || !apiKey || !collectionId}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            'Save Configuration'
          )}
        </button>
        
        {integrationId && (
          <>
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {testing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Testing...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  Test Connection
                </>
              )}
            </button>
            
            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {syncing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Syncing...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="w-5 h-5" />
                  Sync Now
                </>
              )}
            </button>
            
            <button
              onClick={handleExportConfig}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Export Config
            </button>
          </>
        )}
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

      {/* Multi-Site and Content Type Management Section */}
      {integrationId && (
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Multi-Site & Content Type Configuration
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Manage multiple sites and content type profiles for this integration.
            </p>
          </div>

          {/* Site Selection */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <SiteSelector
              integrationId={integrationId}
              selectedSiteId={selectedSiteId || undefined}
              onSiteSelect={(siteId) => {
                setSelectedSiteId(siteId);
                // When site changes, reset profile selection
                setSelectedProfileId(null);
              }}
              onSiteCreate={() => setShowSiteManagement(true)}
              showCreateButton={true}
            />
          </div>

          {/* Content Type Profile Selection */}
          {/* Content Type Profile Selection */}
          {selectedSiteId && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <ContentTypeProfileSelector
                integrationId={integrationId}
                siteId={selectedSiteId}
                selectedProfileId={selectedProfileId || undefined}
                onProfileSelect={(profileId) => setSelectedProfileId(profileId)}
                onProfileCreate={() => setShowContentTypeManagement(true)}
                showCreateButton={true}
              />
            </div>
          )}

          {/* Legacy Field Mapping Section - Show if integration exists and collection ID is set */}
          {collectionId && !selectedProfileId && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <WebflowFieldMapping 
                integrationId={integrationId} 
                collectionId={collectionId}
              />
            </div>
          )}

          {/* New Field Mapping Section - Show if profile is selected */}
          {selectedProfileId && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                Field Mappings for Selected Profile
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Configure field mappings for the selected content type profile.
              </p>
              {/* TODO: Add new field mapping component that uses content_type_field_mappings */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Field mapping management for content type profiles is coming soon. 
                  For now, use the legacy field mapping section above.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

