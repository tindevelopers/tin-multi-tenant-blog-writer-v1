"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { KeyIcon, LockClosedIcon, PencilIcon, CheckCircleIcon, ArrowPathIcon, ArrowDownTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";
import EditIntegrationModal from "@/components/admin/EditIntegrationModal";
import { WebflowConfig } from "@/components/integrations/WebflowConfig";
import { CloudinaryConfig } from "@/components/integrations/CloudinaryConfig";
import { IntegrationRequirementsCard } from "@/components/integrations/IntegrationRequirementsCard";
import type { IntegrationType } from "@/lib/integrations/types";

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
  last_tested_at?: string;
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
  {
    name: "Cloudinary",
    type: "cloudinary",
    description: "Connect your Cloudinary account to automatically store generated blog images in your media library",
    icon: "☁️",
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
  const [showWebflowConfig, setShowWebflowConfig] = useState(false);
  const [showCloudinaryConfig, setShowCloudinaryConfig] = useState(false);
  const [orgId, setOrgId] = useState<string>("");
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [selectedIntegrations, setSelectedIntegrations] = useState<Set<string>>(new Set());
  const [testingIntegrationId, setTestingIntegrationId] = useState<string | null>(null);
  const [syncingIntegrationId, setSyncingIntegrationId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    
    // Get current user role and org_id
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("users")
          .select("role, org_id")
          .eq("user_id", user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setUserRole(data.role);
              setOrgId(data.org_id);
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

    // Set up periodic health checks every 30 minutes
    const healthCheckInterval = setInterval(() => {
      console.log('Running periodic health check for integrations...');
      fetchIntegrations();
    }, 30 * 60 * 1000); // 30 minutes

    // Cleanup interval on unmount
    return () => {
      clearInterval(healthCheckInterval);
    };
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

  const handleTestConnection = async (integrationId: string) => {
    setTestingIntegrationId(integrationId);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/integrations/${integrationId}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Refresh integrations to update status
        const refreshResponse = await fetch('/api/integrations', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        if (refreshResponse.ok) {
          const refreshResult = await refreshResponse.json();
          if (refreshResult.success && Array.isArray(refreshResult.data)) {
            setIntegrations(refreshResult.data);
          }
        }
        alert('Connection test successful!');
      } else {
        alert(`Connection test failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error testing connection:', err);
      alert('Failed to test connection');
    } finally {
      setTestingIntegrationId(null);
    }
  };

  const handleSyncNow = async (integrationId: string) => {
    setSyncingIntegrationId(integrationId);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/integrations/${integrationId}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('Sync initiated successfully!');
      } else {
        alert(`Sync failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error syncing:', err);
      alert('Failed to sync');
    } finally {
      setSyncingIntegrationId(null);
    }
  };

  const handleExportConfig = async (integrationId: string) => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/integrations/${integrationId}/export`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Download as JSON file
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `integration-config-${integrationId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert(`Export failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error exporting config:', err);
      alert('Failed to export configuration');
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this integration?')) {
      return;
    }

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        setIntegrations(prev => prev.filter(i => i.integration_id !== integrationId));
        setSelectedIntegrations(prev => {
          const newSet = new Set(prev);
          newSet.delete(integrationId);
          return newSet;
        });
        alert('Integration disconnected successfully');
      } else {
        const data = await response.json();
        alert(`Failed to disconnect: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error disconnecting:', err);
      alert('Failed to disconnect integration');
    }
  };

  const handleBulkTestConnection = async () => {
    if (selectedIntegrations.size === 0) {
      alert('Please select at least one integration');
      return;
    }
    
    const integrationIds = Array.from(selectedIntegrations);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      alert('Please log in to test connections');
      return;
    }
    
    setTestingIntegrationId(integrationIds[0]);
    const results: { id: string; success: boolean; error?: string }[] = [];
    
    try {
      for (const id of integrationIds) {
        try {
          const response = await fetch(`/api/integrations/${id}/test`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });

          const data = await response.json();
          
          if (response.ok && data.success) {
            results.push({ id, success: true });
          } else {
            results.push({ id, success: false, error: data.error || 'Unknown error' });
          }
        } catch (err: any) {
          console.error(`Error testing connection for ${id}:`, err);
          results.push({ id, success: false, error: err.message || 'Failed to test connection' });
        }
      }
      
      // Refresh integrations
      const refreshResponse = await fetch('/api/integrations', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (refreshResponse.ok) {
        const refreshResult = await refreshResponse.json();
        if (refreshResult.success && Array.isArray(refreshResult.data)) {
          setIntegrations(refreshResult.data);
        }
      }
      
      // Show summary
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      if (failCount === 0) {
        alert(`Successfully tested ${successCount} integration(s)`);
      } else {
        alert(`Tested ${successCount} successfully, ${failCount} failed. Check console for details.`);
        console.log('Test results:', results);
      }
    } catch (err) {
      console.error('Error in bulk test connection:', err);
      alert('Failed to test connections');
    } finally {
      setTestingIntegrationId(null);
    }
  };

  const handleBulkSyncNow = async () => {
    if (selectedIntegrations.size === 0) {
      alert('Please select at least one integration');
      return;
    }
    
    const integrationIds = Array.from(selectedIntegrations);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      alert('Please log in to sync integrations');
      return;
    }
    
    setSyncingIntegrationId(integrationIds[0]);
    const results: { id: string; success: boolean; error?: string }[] = [];
    
    try {
      for (const id of integrationIds) {
        try {
          const response = await fetch(`/api/integrations/${id}/sync`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });

          const data = await response.json();
          
          if (response.ok && data.success) {
            results.push({ id, success: true });
          } else {
            results.push({ id, success: false, error: data.error || 'Unknown error' });
          }
        } catch (err: any) {
          console.error(`Error syncing ${id}:`, err);
          results.push({ id, success: false, error: err.message || 'Failed to sync' });
        }
      }
      
      // Show summary
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      if (failCount === 0) {
        alert(`Successfully synced ${successCount} integration(s)`);
      } else {
        alert(`Synced ${successCount} successfully, ${failCount} failed. Check console for details.`);
        console.log('Sync results:', results);
      }
    } catch (err) {
      console.error('Error in bulk sync:', err);
      alert('Failed to sync integrations');
    } finally {
      setSyncingIntegrationId(null);
    }
  };

  const handleBulkExportConfig = async () => {
    if (selectedIntegrations.size === 0) {
      alert('Please select at least one integration');
      return;
    }
    
    const integrationIds = Array.from(selectedIntegrations);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      alert('Please log in to export configurations');
      return;
    }
    
    try {
      for (const id of integrationIds) {
        try {
          const response = await fetch(`/api/integrations/${id}/export`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });

          const data = await response.json();

          if (response.ok && data.success) {
            // Download as JSON file
            const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `integration-config-${id}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          } else {
            console.error(`Export failed for ${id}:`, data.error);
            alert(`Export failed for integration ${id}: ${data.error || 'Unknown error'}`);
          }
        } catch (err: any) {
          console.error(`Error exporting config for ${id}:`, err);
          alert(`Failed to export configuration for integration ${id}`);
        }
      }
    } catch (err) {
      console.error('Error in bulk export:', err);
      alert('Failed to export configurations');
    }
  };

  const handleBulkDisconnect = async () => {
    if (selectedIntegrations.size === 0) {
      alert('Please select at least one integration');
      return;
    }
    
    if (!confirm(`Are you sure you want to disconnect ${selectedIntegrations.size} integration(s)?`)) {
      return;
    }
    
    const integrationIds = Array.from(selectedIntegrations);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      alert('Please log in to disconnect integrations');
      return;
    }
    
    const results: { id: string; success: boolean; error?: string }[] = [];
    
    try {
      for (const id of integrationIds) {
        try {
          const response = await fetch(`/api/integrations/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });

          if (response.ok) {
            results.push({ id, success: true });
            setIntegrations(prev => prev.filter(i => i.integration_id !== id));
          } else {
            const data = await response.json();
            results.push({ id, success: false, error: data.error || 'Unknown error' });
          }
        } catch (err: any) {
          console.error(`Error disconnecting ${id}:`, err);
          results.push({ id, success: false, error: err.message || 'Failed to disconnect' });
        }
      }
      
      // Clear selection
      setSelectedIntegrations(new Set());
      
      // Show summary
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      if (failCount === 0) {
        alert(`Successfully disconnected ${successCount} integration(s)`);
      } else {
        alert(`Disconnected ${successCount} successfully, ${failCount} failed. Check console for details.`);
        console.log('Disconnect results:', results);
      }
    } catch (err) {
      console.error('Error in bulk disconnect:', err);
      alert('Failed to disconnect integrations');
    }
  };

  const handleToggleSelection = (integrationId: string) => {
    setSelectedIntegrations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(integrationId)) {
        newSet.delete(integrationId);
      } else {
        newSet.add(integrationId);
      }
      return newSet;
    });
  };

  const handleConfigureWebflow = (integration: Integration) => {
    setSelectedIntegration(integration);
    setShowWebflowConfig(true);
  };

  const handleConfigureCloudinary = () => {
    setShowCloudinaryConfig(true);
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

      {/* Integration Requirements Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Publishing System Requirements
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Each publishing system has specific credential requirements. Review the requirements below before connecting.
          </p>
        </div>
        
        <div className="space-y-4">
          {availableIntegrations.map((integration) => {
            const existingIntegration = integrations.find(i => i.type === integration.type);
            
            // Cloudinary is handled differently - it's stored in organization settings
            if (integration.type === 'cloudinary') {
              return (
                <div key={integration.type} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{integration.icon}</span>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {integration.name}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {integration.description}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleConfigureCloudinary}
                      disabled={!['owner', 'admin'].includes(userRole)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      Configure Cloudinary
                    </button>
                  </div>
                </div>
              );
            }
            
            return (
              <IntegrationRequirementsCard
                key={integration.type}
                provider={integration.type as IntegrationType}
                config={existingIntegration?.config || {}}
                onConfigure={() => {
                  if (existingIntegration) {
                    if (integration.type === 'webflow') {
                      handleConfigureWebflow(existingIntegration);
                    } else {
                      window.location.href = `/admin/integrations/blog-writer?provider=${integration.type}`;
                    }
                  } else {
                    window.location.href = `/admin/integrations/blog-writer?provider=${integration.type}`;
                  }
                }}
              />
            );
          })}
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

      {/* Bulk Actions Bar */}
      {selectedIntegrations.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-6 py-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800 dark:text-blue-200">
              {selectedIntegrations.size} integration{selectedIntegrations.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkTestConnection}
                disabled={testingIntegrationId !== null}
                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testingIntegrationId ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                onClick={handleBulkSyncNow}
                disabled={syncingIntegrationId !== null}
                className="px-4 py-2 text-sm text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncingIntegrationId ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                onClick={handleBulkExportConfig}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 font-medium"
              >
                Export Config
              </button>
              <button
                onClick={handleBulkDisconnect}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 font-medium"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.map((integration) => (
          <div 
            key={integration.integration_id} 
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 p-6 transition-all ${
              selectedIntegrations.has(integration.integration_id)
                ? 'border-blue-500 dark:border-blue-400'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedIntegrations.has(integration.integration_id)}
                  onChange={() => handleToggleSelection(integration.integration_id)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
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
              {integration.type === 'webflow' && (() => {
                const siteName = integration.config.site_name;
                const siteId = integration.config.site_id;
                if (siteName && typeof siteName === 'string') {
                  return (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Site:</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {siteName}
                      </span>
                    </div>
                  );
                }
                if (siteId && typeof siteId === 'string') {
                  return (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Site ID:</span>
                      <span className="text-gray-900 dark:text-white font-mono text-xs">
                        {siteId.substring(0, 8)}...
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
              {/* Always show health status */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Health:</span>
                <span className={`capitalize ${
                  integration.health_status === 'healthy' 
                    ? 'text-green-600 dark:text-green-400'
                    : integration.health_status === 'warning'
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : integration.health_status === 'error'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {integration.health_status || 'unknown'}
                </span>
              </div>
              {/* Show last tested time if available */}
              {integration.last_tested_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Last Tested:</span>
                  <span className="text-gray-900 dark:text-white text-xs">
                    {new Date(integration.last_tested_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {integration.type === 'webflow' && canManageIntegrations ? (
              <div className="space-y-2">
                <button
                  onClick={() => handleConfigureWebflow(integration)}
                  className="w-full px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
                >
                  Configure Webflow
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleTestConnection(integration.integration_id)}
                    disabled={testingIntegrationId === integration.integration_id}
                    className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {testingIntegrationId === integration.integration_id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    ) : (
                      <CheckCircleIcon className="w-4 h-4" />
                    )}
                    Test
                  </button>
                  <button
                    onClick={() => handleSyncNow(integration.integration_id)}
                    disabled={syncingIntegrationId === integration.integration_id}
                    className="px-3 py-2 text-sm text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {syncingIntegrationId === integration.integration_id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                    ) : (
                      <ArrowPathIcon className="w-4 h-4" />
                    )}
                    Sync
                  </button>
                  <button
                    onClick={() => handleExportConfig(integration.integration_id)}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 flex items-center justify-center gap-1"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Export
                  </button>
                  <button
                    onClick={() => handleDisconnect(integration.integration_id)}
                    className="px-3 py-2 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 flex items-center justify-center gap-1"
                  >
                    <XMarkIcon className="w-4 h-4" />
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
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
            )}
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

      {/* Webflow Configuration Modal */}
      {showWebflowConfig && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => {
              setShowWebflowConfig(false);
              setSelectedIntegration(null);
            }} />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <WebflowConfig
                integrationId={selectedIntegration?.integration_id}
                onSuccess={() => {
                  // Refresh integrations
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
                  setShowWebflowConfig(false);
                  setSelectedIntegration(null);
                }}
                onClose={() => {
                  setShowWebflowConfig(false);
                  setSelectedIntegration(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Cloudinary Configuration Modal */}
      {showCloudinaryConfig && orgId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => {
              setShowCloudinaryConfig(false);
            }} />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Cloudinary Configuration
                </h2>
                <button
                  onClick={() => setShowCloudinaryConfig(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <CloudinaryConfig
                orgId={orgId}
                onSave={() => {
                  setShowCloudinaryConfig(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
