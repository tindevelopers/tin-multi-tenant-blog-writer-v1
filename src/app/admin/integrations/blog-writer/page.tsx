/**
 * Blog Writer API Integrations Page
 * 
 * Allows users to connect to integrations via Blog Writer API
 * and get keyword-based recommendations.
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeftIcon,
  LinkIcon,
  ChartBarIcon,
  KeyIcon,
  LockClosedIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { ConnectIntegrationForm } from '@/components/integrations/ConnectIntegrationForm';
import { RecommendationsForm } from '@/components/integrations/RecommendationsForm';
import { WebflowOAuthConfig } from '@/components/integrations/WebflowOAuthConfig';

type Provider = 'webflow' | 'wordpress' | 'shopify';
type ViewMode = 'connect' | 'recommend';

interface ExistingIntegration {
  integration_id: string;
  type: string;
  status: 'active' | 'inactive' | 'error' | 'pending' | 'expired';
  connection_method?: 'api_key' | 'oauth';
  created_at: string;
  updated_at: string;
}

function BlogWriterIntegrationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const providerParam = searchParams.get('provider') as Provider | null;
  const [userRole, setUserRole] = useState<string>("");
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  
  // Initialize provider from URL param or default to webflow
  const [selectedProvider, setSelectedProvider] = useState<Provider>(
    (providerParam && ['webflow', 'wordpress', 'shopify'].includes(providerParam))
      ? providerParam
      : 'webflow'
  );
  const [viewMode, setViewMode] = useState<ViewMode>('connect');
  const [error, setError] = useState<string | null>(null);
  const [showOAuthConfig, setShowOAuthConfig] = useState(false);
  const [existingIntegrations, setExistingIntegrations] = useState<ExistingIntegration[]>([]);

  // Check user role and authorization
  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAuthorized(false);
          return;
        }

        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (userData) {
          setUserRole(userData.role);
          // Only organization admins (admin, owner, manager) can access this page
          // System admins should NOT access target publisher integrations
          const allowedRoles = ["admin", "owner", "manager"];
          setIsAuthorized(allowedRoles.includes(userData.role));
          
          if (!allowedRoles.includes(userData.role)) {
            setError("Access denied. This page is only available to organization administrators.");
          }
        } else {
          setIsAuthorized(false);
        }
      } catch (err) {
        console.error("Error checking authorization:", err);
        setIsAuthorized(false);
      }
    };

    checkAuthorization();
  }, []);

  // Update provider if URL param changes
  useEffect(() => {
    if (providerParam && ['webflow', 'wordpress', 'shopify'].includes(providerParam)) {
      setSelectedProvider(providerParam);
    }
  }, [providerParam]);

  // Fetch existing integrations
  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          return;
        }

        const response = await fetch('/api/integrations', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            setExistingIntegrations(result.data);
          }
        }
      } catch (err) {
        console.error('Error fetching integrations:', err);
      }
    };

    fetchIntegrations();
  }, []);

  const getExistingIntegration = (provider: Provider) => {
    return existingIntegrations.find(i => i.type === provider);
  };

  const getStatusBadge = (status: ExistingIntegration['status']) => {
    const styles = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      expired: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    };
    return `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.inactive}`;
  };

  const getStatusIcon = (status: ExistingIntegration['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'error':
        return <XCircleIcon className="w-4 h-4" />;
      case 'pending':
        return <ClockIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Check authorization first
  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Access Denied</h3>
          <p className="text-red-700 dark:text-red-300">
            {error || "This page is only available to organization administrators. System administrators should manage system-level API integrations through System Settings."}
          </p>
          <button
            onClick={() => router.push("/admin/panel/integrations")}
            className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
          >
            Go to Organization Integrations
          </button>
        </div>
      </div>
    );
  }

  // Catch any initialization errors
  if (error && !error.includes("Access denied")) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error</h3>
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

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
    setError(error);
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Select Integration Provider</h2>
          {selectedProvider === 'webflow' && (
            <button
              onClick={() => setShowOAuthConfig(true)}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium flex items-center gap-2"
            >
              <KeyIcon className="w-4 h-4" />
              Configure OAuth
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {providers.map((provider) => {
            const existing = getExistingIntegration(provider.value);
            return (
              <button
                key={provider.value}
                onClick={() => setSelectedProvider(provider.value)}
                className={`p-4 border-2 rounded-lg text-left transition-all relative ${
                  selectedProvider === provider.value
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      {provider.label}
                      {existing && (
                        <span className={getStatusBadge(existing.status)}>
                          {getStatusIcon(existing.status)}
                          {existing.status}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {provider.description}
                    </div>
                    {existing && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        {existing.connection_method === 'oauth' ? (
                          <>
                            <LockClosedIcon className="w-3 h-3" />
                            Connected via OAuth
                          </>
                        ) : (
                          <>
                            <KeyIcon className="w-3 h-3" />
                            Connected via API Key
                          </>
                        )}
                        <span>•</span>
                        <span>Updated {new Date(existing.updated_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
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
        {viewMode === 'connect' && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Connect your {selectedProvider} integration to enable publishing. Keywords and backlink recommendations are available when creating blog posts in the content workflow.
          </p>
        )}

        {viewMode === 'connect' ? (
          <ConnectIntegrationForm
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

      {/* OAuth Configuration Modal */}
      {showOAuthConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <WebflowOAuthConfig onClose={() => setShowOAuthConfig(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function BlogWriterIntegrationsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    }>
      <BlogWriterIntegrationsContent />
    </Suspense>
  );
}

