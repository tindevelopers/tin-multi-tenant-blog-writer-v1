"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { XMarkIcon, KeyIcon, LockClosedIcon } from "@heroicons/react/24/outline";

interface EditIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  integration: {
    integration_id: string;
    type: string;
    name: string;
    status: 'active' | 'inactive' | 'error' | 'pending' | 'expired';
    connection_method?: 'api_key' | 'oauth';
    config: Record<string, unknown>;
  } | null;
}

export default function EditIntegrationModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  integration 
}: EditIntegrationModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [endpoints, setEndpoints] = useState<string[]>([]);
  const [newEndpoint, setNewEndpoint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'active' | 'inactive' | 'error' | 'pending' | 'expired'>('active');

  useEffect(() => {
    if (isOpen && integration) {
      // Load integration data
      setStatus(integration.status);
      
      // Extract API key from config (masked)
      if (integration.config && typeof integration.config === 'object') {
        const config = integration.config as Record<string, unknown>;
        if (config.api_key && typeof config.api_key === 'string') {
          // If it's already masked, show as-is, otherwise mask it
          if (config.api_key.includes('****')) {
            setApiKey(config.api_key);
          } else {
            // Mask the API key (show first 4 and last 4 chars)
            const key = config.api_key;
            if (key.length > 8) {
              setApiKey(`${key.substring(0, 4)}${'*'.repeat(key.length - 8)}${key.substring(key.length - 4)}`);
            } else {
              setApiKey('****');
            }
          }
        }
        
        // Extract Collection ID (for Webflow)
        if (config.collection_id && typeof config.collection_id === 'string') {
          setCollectionId(config.collection_id);
        }
        
        // Extract endpoints
        if (config.endpoints && Array.isArray(config.endpoints)) {
          setEndpoints(config.endpoints as string[]);
        } else if (config.endpoint && typeof config.endpoint === 'string') {
          setEndpoints([config.endpoint]);
        }
      }
    }
  }, [isOpen, integration]);

  const handleAddEndpoint = () => {
    if (newEndpoint.trim() && !endpoints.includes(newEndpoint.trim())) {
      setEndpoints([...endpoints, newEndpoint.trim()]);
      setNewEndpoint("");
    }
  };

  const handleRemoveEndpoint = (index: number) => {
    setEndpoints(endpoints.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      if (!integration) {
        setError("No integration selected");
        setLoading(false);
        return;
      }

      // Prepare config update
      const configUpdate: Record<string, unknown> = {
        ...integration.config,
        endpoints: endpoints,
      };

      // Only update API key if it was changed (not masked)
      if (apiKey && !apiKey.includes('****')) {
        configUpdate.api_key = apiKey;
      }

      // Update Collection ID for Webflow
      if (integration.type === 'webflow' && collectionId) {
        configUpdate.collection_id = collectionId;
      }

      const response = await fetch(`/api/integrations/${integration.integration_id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          config: configUpdate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update integration");
      }

      // Reset form
      setApiKey("");
      setEndpoints([]);
      setNewEndpoint("");
      setError(null);

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setApiKey("");
    setCollectionId("");
    setEndpoints([]);
    setNewEndpoint("");
    setError(null);
    onClose();
  };

  if (!isOpen || !integration) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Edit {integration.name} Integration
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="error">Error</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* API Key (only for API key connections) */}
            {integration.connection_method === 'api_key' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Key *
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    required
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter API key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showApiKey ? (
                      <LockClosedIcon className="w-5 h-5" />
                    ) : (
                      <KeyIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {apiKey.includes('****') 
                    ? "Enter a new API key to replace the existing one, or leave as-is to keep current key."
                    : "Enter a new API key or leave blank to keep the current one."}
                </p>
              </div>
            )}

            {/* Collection ID (for Webflow) */}
            {integration.type === 'webflow' && (
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
                  placeholder="Enter Collection ID"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  The Collection ID of your Webflow CMS collection where blog posts will be published
                </p>
              </div>
            )}

            {/* OAuth Info */}
            {integration.connection_method === 'oauth' && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <LockClosedIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    This integration is connected via OAuth. To update credentials, disconnect and reconnect.
                  </p>
                </div>
              </div>
            )}

            {/* Endpoints */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Endpoints
              </label>
              <div className="space-y-2">
                {endpoints.map((endpoint, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={endpoint}
                      onChange={(e) => {
                        const newEndpoints = [...endpoints];
                        newEndpoints[index] = e.target.value;
                        setEndpoints(newEndpoints);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                      placeholder="/api/endpoint"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveEndpoint(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newEndpoint}
                    onChange={(e) => setNewEndpoint(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEndpoint();
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Add new endpoint (e.g., /api/posts)"
                  />
                  <button
                    type="button"
                    onClick={handleAddEndpoint}
                    className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Add or modify API endpoints for this integration.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

