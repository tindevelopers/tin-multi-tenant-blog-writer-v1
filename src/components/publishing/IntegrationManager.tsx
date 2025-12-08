'use client';

import React, { useState } from "react";
import { useIntegrations } from "@/hooks/useIntegrations";
import { PublishingService } from "@/lib/api/publishing";
import {
  CMSProvider,
  UserRole,
  CreateIntegrationRequest,
  CMSIntegration,
} from "@/types/publishing";

interface IntegrationManagerProps {
  orgId: string;
  userId: string;
  userRole: UserRole;
}

export const IntegrationManager: React.FC<IntegrationManagerProps> = ({
  orgId,
  userId,
  userRole,
}) => {
  const { integrations, loading, error, refetch } = useIntegrations(
    orgId,
    userId,
    userRole
  );
  const [showCreateForm, setShowCreateForm] = useState(false);

  const canManageIntegrations = ["admin", "owner", "system_admin", "super_admin"].includes(
    userRole
  );

  if (!canManageIntegrations) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          You don't have permission to manage integrations. Contact an administrator.
        </p>
      </div>
    );
  }

  const handleDelete = async (integrationId: string) => {
    if (!confirm("Are you sure you want to delete this integration?")) return;
    try {
      await PublishingService.deleteIntegration(orgId, userId, userRole, integrationId);
      refetch();
    } catch (err) {
      alert(
        `Failed to delete integration: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  if (loading) return <div className="animate-pulse text-sm">Loading integrations...</div>;
  if (error) return <div className="text-red-600 text-sm">Error: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">CMS Integrations</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showCreateForm ? "Cancel" : "Add Integration"}
        </button>
      </div>

      {showCreateForm && (
        <IntegrationCreateForm
          orgId={orgId}
          userId={userId}
          userRole={userRole}
          onSuccess={() => {
            setShowCreateForm(false);
            refetch();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className="space-y-2">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            orgId={orgId}
            userId={userId}
            userRole={userRole}
            onDelete={handleDelete}
            onUpdate={refetch}
          />
        ))}
      </div>
    </div>
  );
};

const IntegrationCard: React.FC<{
  integration: CMSIntegration;
  orgId: string;
  userId: string;
  userRole: UserRole;
  onDelete: (id: string) => void;
  onUpdate: () => void;
}> = ({ integration, orgId, userId, userRole, onDelete, onUpdate }) => {
  const [updating, setUpdating] = useState(false);

  const handleSetDefault = async () => {
    setUpdating(true);
    try {
      await PublishingService.updateIntegration(orgId, userId, userRole, integration.id!, {
        is_default: true,
      });
      onUpdate();
    } catch (err) {
      alert(`Failed to set default: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold">{integration.site_name}</h3>
            {integration.is_default && (
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                Default
              </span>
            )}
            <span
              className={`px-2 py-1 text-xs rounded ${
                integration.status === "active"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {integration.status}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Provider: {integration.type} | Site ID: {integration.site_id}
          </p>
          {integration.collection_ids.length > 0 && (
            <p className="text-sm text-gray-600">
              Collections: {integration.collection_ids.join(", ")}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {!integration.is_default && (
            <button
              onClick={handleSetDefault}
              disabled={updating}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Set Default
            </button>
          )}
          <button
            onClick={() => onDelete(integration.id!)}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const IntegrationCreateForm: React.FC<{
  orgId: string;
  userId: string;
  userRole: UserRole;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ orgId, userId, userRole, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<CreateIntegrationRequest>({
    org_id: orgId,
    type: CMSProvider.WEBFLOW,
    site_id: "",
    site_name: "",
    api_key: "",
    collection_ids: [],
    is_default: false,
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await PublishingService.createIntegration(orgId, userId, userRole, formData);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border border-gray-200 rounded-lg space-y-4">
      <h3 className="font-semibold">Create New Integration</h3>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Provider</label>
        <select
          value={formData.type}
          onChange={(e) =>
            setFormData({ ...formData, type: e.target.value as CMSProvider })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value={CMSProvider.WEBFLOW}>Webflow</option>
          <option value={CMSProvider.SHOPIFY}>Shopify</option>
          <option value={CMSProvider.WORDPRESS}>WordPress</option>
          <option value={CMSProvider.CUSTOM}>Custom</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Site ID</label>
        <input
          type="text"
          value={formData.site_id}
          onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Site Name</label>
        <input
          type="text"
          value={formData.site_name}
          onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">API Key</label>
        <input
          type="password"
          value={formData.api_key}
          onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      {formData.type === CMSProvider.WEBFLOW && (
        <div>
          <label className="block text-sm font-medium mb-1">Collection IDs (comma-separated)</label>
          <input
            type="text"
            value={formData.collection_ids.join(", ")}
            onChange={(e) =>
              setFormData({
                ...formData,
                collection_ids: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="blog, news"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      )}

      <div className="flex items-center">
        <input
          type="checkbox"
          id="is_default"
          checked={formData.is_default}
          onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
          className="mr-2"
        />
        <label htmlFor="is_default" className="text-sm">
          Set as default for this provider
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={creating}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create Integration"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

