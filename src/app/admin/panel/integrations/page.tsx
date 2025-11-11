"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { KeyIcon, LockClosedIcon, PencilIcon } from "@heroicons/react/24/outline";
import EditIntegrationModal from "@/components/admin/EditIntegrationModal";

interface Integration {
  integration_id: string;
  org_id: string;
  type: string;
  name: string;
  status: 'active' | 'inactive' | 'error' | 'pending' | 'expired';
  connection_method?: 'api_key' | 'oauth';
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  health_status?: 'healthy' | 'warning' | 'error' | 'unknown';
}

const availableIntegrations = [
  {
    name: "Webflow",
    type: "webflow",
    description: "Connect to Webflow CMS for AI-powered content publishing and SEO optimization",
    icon: "🌐",
  },
  {
    name: "WordPress",
    type: "wordpress",
    description: "Connect to WordPress sites for content publishing",
    icon: "📝",
  },
  {
    name: "Shopify",
    type: "shopify",
    description: "Connect to Shopify stores for product content",
    icon: "🛒",
  },
];

export default function IntegrationsManagementPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userRole, setUserRole] = useState<string>("");
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    
    // Get current user role
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("users")
          .select("role")
          .eq("user_id", user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setUserRole(data.role);
            }
          });
      }
    });

    // Fetch real integrations from API
    const fetchIntegrations = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        const response = await fetch('/api/integrations', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch integrations: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setIntegrations(result.data);
        } else {
          setIntegrations([]);
        }
      } catch (err) {
        console.error('Error fetching integrations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load integrations');
        setIntegrations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchIntegrations();
  }, []);

  const handleIntegrationToggle = async (integrationId: string) => {
    const integration = integrations.find(i => i.integration_id === integrationId);
    if (!integration) return;

    const newStatus = integration.status === 'active' ? 'inactive' : 'active';
    
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setIntegrations(prev => prev.map(integration => 
          integration.integration_id === integrationId 
            ? { ...integration, status: newStatus as Integration['status'] }
            : integration
        ));
      }
    } catch (err) {
      console.error('Error updating integration:', err);
    }
  };

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         integration.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || integration.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const canManageIntegrations = ["system_admin", "super_admin", "admin", "manager"].includes(userRole);

  const getStatusBadge = (status: Integration['status']) => {
    const styles = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      expired: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    };
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.inactive}`;
  };

  const getConnectionMethodBadge = (method?: 'api_key' | 'oauth') => {
    if (!method) return null;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
        method === 'oauth' 
          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
          : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      }`}>
        {method === 'oauth' ? (
          <>
            <LockClosedIcon className="w-3 h-3" />
            OAuth
          </>
        ) : (
          <>
            <KeyIcon className="w-3 h-3" />
            API Key
          </>
        )}
      </span>
    );
  };

  const getProviderIcon = (type: string) => {
    const provider = availableIntegrations.find(p => p.type === type);
    return provider?.icon || '🔌';
  };

  const getProviderName = (type: string) => {
    const provider = availableIntegrations.find(p => p.type === type);
    return provider?.name || type.charAt(0).toUpperCase() + type.slice(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error</h3>
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Integrations
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Connect your favorite tools and automate your workflow
            </p>
          </div>
          {canManageIntegrations && (
            <a
              href="/admin/integrations/blog-writer"
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              Add Integration
            </a>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Active
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {integrations.filter(i => i.status === 'active').length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Inactive
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {integrations.filter(i => i.status === 'inactive').length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Errors
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {integrations.filter(i => i.status === 'error').length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Pending
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {integrations.filter(i => i.status === 'pending').length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Total
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {integrations.length}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Integrations
            </label>
            <input
              type="text"
              placeholder="Search by name or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
              <option value="error">Error</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Blog Writer API Integrations Card */}
      <div className="bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-900/20 dark:to-brand-800/20 rounded-xl shadow-sm border-2 border-brand-200 dark:border-brand-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-brand-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Blog Writer API Integrations
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Connect to Webflow, WordPress, or Shopify for AI-powered content publishing and keyword recommendations
              </p>
            </div>
          </div>
          <a
            href="/admin/integrations/blog-writer"
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
          >
            Connect Now
          </a>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.map((integration) => (
          <div key={integration.integration_id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{getProviderIcon(integration.type)}</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {getProviderName(integration.type)}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                    {integration.type}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={getStatusBadge(integration.status)}>
                  {integration.status}
                </span>
                {getConnectionMethodBadge(integration.connection_method)}
              </div>
            </div>

            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Created:</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(integration.created_at).toLocaleDateString()}
                </span>
              </div>
              {integration.health_status && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Health:</span>
                  <span className={`capitalize ${
                    integration.health_status === 'healthy' 
                      ? 'text-green-600 dark:text-green-400'
                      : integration.health_status === 'warning'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {integration.health_status}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              {canManageIntegrations ? (
                <button
                  onClick={() => handleIntegrationToggle(integration.integration_id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    integration.status === 'active'
                      ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800'
                      : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800'
                  }`}
                >
                  {integration.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  No permissions
                </span>
              )}
              
              <button
                onClick={() => {
                  setEditingIntegration(integration);
                  setShowEditModal(true);
                }}
                className="px-3 py-1 text-sm text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-200 flex items-center gap-1"
              >
                <PencilIcon className="w-4 h-4" />
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredIntegrations.length === 0 && integrations.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No integrations yet</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by connecting your first integration.
          </p>
          {canManageIntegrations && (
            <a
              href="/admin/integrations/blog-writer"
              className="mt-4 inline-block px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              Add Integration
            </a>
          )}
        </div>
      )}

      {filteredIntegrations.length === 0 && integrations.length > 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No integrations found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}

      {/* Edit Integration Modal */}
      <EditIntegrationModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingIntegration(null);
        }}
        onSuccess={() => {
          // Refresh integrations list
          const fetchIntegrations = async () => {
            try {
              const supabase = createClient();
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) return;

              const response = await fetch('/api/integrations', {
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                },
              });

              if (response.ok) {
                const result = await response.json();
                if (result.success && Array.isArray(result.data)) {
                  setIntegrations(result.data);
                }
              }
            } catch (err) {
              console.error('Error fetching integrations:', err);
            }
          };
          fetchIntegrations();
        }}
        integration={editingIntegration}
      />
    </div>
  );
}
