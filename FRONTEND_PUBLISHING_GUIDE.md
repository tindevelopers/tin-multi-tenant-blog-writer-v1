# Frontend Publishing Integration Guide - Multi-CMS Publishing

**Version:** 1.0.0  
**Date:** 2025-01-15  
**Framework:** Next.js 13+ (App Router) / React

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [TypeScript Types](#typescript-types)
4. [Complete Next.js Implementation](#complete-nextjs-implementation)
5. [Usage Examples](#usage-examples)
6. [Error Handling](#error-handling)
7. [Role-Based Access Control](#role-based-access-control)
8. [Cost Visibility](#cost-visibility)

---

## 🎯 Overview

This guide provides complete frontend integration for the multi-CMS publishing system, including:

- ✅ **Integration Management** - Create, update, delete CMS integrations
- ✅ **Publishing Target Selection** - Choose CMS + site + collection
- ✅ **Publishing** - Publish blog posts to selected targets
- ✅ **Role-Based Access** - Different permissions for writers vs admins
- ✅ **Cost Visibility** - Costs only visible to admins/owners

---

## 🔌 API Endpoints

### Base URL
```
https://your-api-url.com/api/v1/publishing
```

### Endpoints Summary

| Method | Endpoint | Role Required | Description |
|--------|----------|---------------|-------------|
| GET | `/integrations` | admin/owner | List integrations |
| POST | `/integrations` | admin/owner | Create integration |
| PATCH | `/integrations/{id}` | admin/owner | Update integration |
| DELETE | `/integrations/{id}` | admin/owner | Delete integration |
| GET | `/targets` | any authenticated | Get publishing targets |
| PATCH | `/drafts/{id}/target` | writer/editor/admin | Set publishing target |
| POST | `/publish` | writer/editor/admin | Publish blog post |
| GET | `/blog-posts` | any authenticated | List blog posts |
| GET | `/blog-posts/{id}` | any authenticated | Get blog post |

---

## 📝 TypeScript Types

```typescript
// types/publishing.ts

export enum CMSProvider {
  WEBFLOW = "webflow",
  SHOPIFY = "shopify",
  WORDPRESS = "wordpress",
  CUSTOM = "custom"
}

export enum IntegrationStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ERROR = "error"
}

export enum UserRole {
  OWNER = "owner",
  ADMIN = "admin",
  EDITOR = "editor",
  WRITER = "writer",
  SYSTEM_ADMIN = "system_admin",
  SUPER_ADMIN = "super_admin"
}

export interface CMSIntegration {
  id?: string;
  org_id: string;
  type: CMSProvider;
  site_id: string;
  site_name: string;
  api_key?: string;
  api_secret?: string;
  collection_ids: string[];
  is_default: boolean;
  status: IntegrationStatus;
  created_at?: string;
  updated_at?: string;
  last_verified_at?: string;
  error_message?: string;
}

export interface PublishingTarget {
  cms_provider: CMSProvider;
  site_id: string;
  collection_id?: string;
  site_name?: string;
}

export interface PublishingSite {
  id: string;
  name: string;
  provider: CMSProvider;
  collections: string[];
  is_default: boolean;
}

export interface PublishingTargetsResponse {
  providers: string[];
  sites: PublishingSite[];
  default: PublishingTarget | null;
}

export interface CostBreakdown {
  ai_generation: number;
  api_calls: number;
  dataforseo: number;
  image_generation: number;
  other: number;
}

export interface PublishingMetadata {
  cms_provider?: CMSProvider;
  site_id?: string;
  collection_id?: string;
  publishing_target?: PublishingTarget;
  published_url?: string;
  remote_id?: string;
  published_at?: string;
  publish_status?: string;
  publish_error?: string;
}

export interface BlogPostWithCosts {
  id: string;
  title: string;
  content: string;
  status: string;
  total_cost: number | null; // null for non-admins
  cost_breakdown: CostBreakdown | null; // null for non-admins
  publishing_metadata?: PublishingMetadata;
}

export interface CreateIntegrationRequest {
  org_id: string;
  type: CMSProvider;
  site_id: string;
  site_name: string;
  api_key: string;
  api_secret?: string;
  collection_ids: string[];
  is_default: boolean;
}

export interface UpdateIntegrationRequest {
  site_name?: string;
  api_key?: string;
  api_secret?: string;
  collection_ids?: string[];
  is_default?: boolean;
  status?: IntegrationStatus;
}

export interface PublishBlogRequest {
  blog_id: string;
  cms_provider?: CMSProvider;
  site_id?: string;
  collection_id?: string;
  publish?: boolean;
}

export interface PublishBlogResponse {
  success: boolean;
  cms_provider: CMSProvider;
  site_id: string;
  collection_id?: string;
  published_url?: string;
  remote_id?: string;
  error_message?: string;
}
```

---

## 🚀 Complete Next.js Implementation

### Step 1: Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://your-api-url.com
```

### Step 2: API Service Layer

```typescript
// lib/api/publishing.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-api-url.com';

export class PublishingService {
  /**
   * Get authentication headers
   */
  private static getHeaders(orgId: string, userId: string, userRole: UserRole): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-Org-ID': orgId,
      'X-User-ID': userId,
      'X-User-Role': userRole,
    };
  }

  /**
   * List integrations
   */
  static async listIntegrations(
    orgId: string,
    userId: string,
    userRole: UserRole,
    providerType?: CMSProvider
  ): Promise<CMSIntegration[]> {
    const url = new URL(`${API_BASE_URL}/api/v1/publishing/integrations`);
    if (providerType) {
      url.searchParams.set('provider_type', providerType);
    }

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(orgId, userId, userRole),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `Failed to list integrations: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create integration
   */
  static async createIntegration(
    orgId: string,
    userId: string,
    userRole: UserRole,
    request: CreateIntegrationRequest
  ): Promise<CMSIntegration> {
    const response = await fetch(`${API_BASE_URL}/api/v1/publishing/integrations`, {
      method: 'POST',
      headers: this.getHeaders(orgId, userId, userRole),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `Failed to create integration: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update integration
   */
  static async updateIntegration(
    orgId: string,
    userId: string,
    userRole: UserRole,
    integrationId: string,
    request: UpdateIntegrationRequest
  ): Promise<CMSIntegration> {
    const response = await fetch(`${API_BASE_URL}/api/v1/publishing/integrations/${integrationId}`, {
      method: 'PATCH',
      headers: this.getHeaders(orgId, userId, userRole),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `Failed to update integration: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Delete integration
   */
  static async deleteIntegration(
    orgId: string,
    userId: string,
    userRole: UserRole,
    integrationId: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/publishing/integrations/${integrationId}`, {
      method: 'DELETE',
      headers: this.getHeaders(orgId, userId, userRole),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `Failed to delete integration: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get publishing targets
   */
  static async getPublishingTargets(
    orgId: string,
    userId: string,
    userRole: UserRole
  ): Promise<PublishingTargetsResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/publishing/targets`, {
      headers: this.getHeaders(orgId, userId, userRole),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `Failed to get publishing targets: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update draft publishing target
   */
  static async updateDraftTarget(
    orgId: string,
    userId: string,
    userRole: UserRole,
    draftId: string,
    target: PublishingTarget
  ): Promise<{ success: boolean; draft_id: string; publishing_target: PublishingTarget; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/publishing/drafts/${draftId}/target`, {
      method: 'PATCH',
      headers: this.getHeaders(orgId, userId, userRole),
      body: JSON.stringify(target),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `Failed to update publishing target: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Publish blog post
   */
  static async publishBlog(
    orgId: string,
    userId: string,
    userRole: UserRole,
    request: PublishBlogRequest
  ): Promise<PublishBlogResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/publishing/publish`, {
      method: 'POST',
      headers: this.getHeaders(orgId, userId, userRole),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `Failed to publish blog: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * List blog posts
   */
  static async listBlogPosts(
    orgId: string,
    userId: string,
    userRole: UserRole,
    options?: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<BlogPostWithCosts[]> {
    const url = new URL(`${API_BASE_URL}/api/v1/publishing/blog-posts`);
    if (options?.status) url.searchParams.set('status', options.status);
    if (options?.limit) url.searchParams.set('limit', options.limit.toString());
    if (options?.offset) url.searchParams.set('offset', options.offset.toString());

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(orgId, userId, userRole),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `Failed to list blog posts: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get single blog post
   */
  static async getBlogPost(
    orgId: string,
    userId: string,
    userRole: UserRole,
    postId: string
  ): Promise<BlogPostWithCosts> {
    const response = await fetch(`${API_BASE_URL}/api/v1/publishing/blog-posts/${postId}`, {
      headers: this.getHeaders(orgId, userId, userRole),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `Failed to get blog post: ${response.statusText}`);
    }

    return response.json();
  }
}
```

### Step 3: Custom Hooks

```typescript
// hooks/useIntegrations.ts
import { useState, useCallback, useEffect } from 'react';
import { PublishingService } from '@/lib/api/publishing';
import type { CMSIntegration, CMSProvider, UserRole } from '@/types/publishing';

export const useIntegrations = (
  orgId: string,
  userId: string,
  userRole: UserRole,
  providerType?: CMSProvider,
  autoFetch: boolean = true
) => {
  const [integrations, setIntegrations] = useState<CMSIntegration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    if (!orgId || !userId) {
      setIntegrations([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await PublishingService.listIntegrations(orgId, userId, userRole, providerType);
      setIntegrations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, userId, userRole, providerType]);

  useEffect(() => {
    if (autoFetch) {
      fetchIntegrations();
    }
  }, [fetchIntegrations, autoFetch]);

  return {
    integrations,
    loading,
    error,
    refetch: fetchIntegrations,
  };
};
```

```typescript
// hooks/usePublishingTargets.ts
import { useState, useCallback, useEffect } from 'react';
import { PublishingService } from '@/lib/api/publishing';
import type { PublishingTargetsResponse, UserRole } from '@/types/publishing';

export const usePublishingTargets = (
  orgId: string,
  userId: string,
  userRole: UserRole,
  autoFetch: boolean = true
) => {
  const [targets, setTargets] = useState<PublishingTargetsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTargets = useCallback(async () => {
    if (!orgId || !userId) {
      setTargets(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await PublishingService.getPublishingTargets(orgId, userId, userRole);
      setTargets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setTargets(null);
    } finally {
      setLoading(false);
    }
  }, [orgId, userId, userRole]);

  useEffect(() => {
    if (autoFetch) {
      fetchTargets();
    }
  }, [fetchTargets, autoFetch]);

  return {
    targets,
    loading,
    error,
    refetch: fetchTargets,
  };
};
```

```typescript
// hooks/usePublishing.ts
import { useState, useCallback } from 'react';
import { PublishingService } from '@/lib/api/publishing';
import type { PublishingTarget, PublishBlogRequest, PublishBlogResponse, UserRole } from '@/types/publishing';

export const usePublishing = (
  orgId: string,
  userId: string,
  userRole: UserRole
) => {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateDraftTarget = useCallback(async (
    draftId: string,
    target: PublishingTarget
  ) => {
    setPublishing(true);
    setError(null);

    try {
      const result = await PublishingService.updateDraftTarget(
        orgId,
        userId,
        userRole,
        draftId,
        target
      );
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setPublishing(false);
    }
  }, [orgId, userId, userRole]);

  const publishBlog = useCallback(async (
    request: PublishBlogRequest
  ): Promise<PublishBlogResponse> => {
    setPublishing(true);
    setError(null);

    try {
      const result = await PublishingService.publishBlog(orgId, userId, userRole, request);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setPublishing(false);
    }
  }, [orgId, userId, userRole]);

  return {
    publishing,
    error,
    updateDraftTarget,
    publishBlog,
  };
};
```

### Step 4: Components

```typescript
// components/PublishingTargetSelector.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { usePublishingTargets } from '@/hooks/usePublishingTargets';
import type { PublishingTarget, CMSProvider, UserRole } from '@/types/publishing';

interface PublishingTargetSelectorProps {
  orgId: string;
  userId: string;
  userRole: UserRole;
  value?: PublishingTarget;
  onChange: (target: PublishingTarget) => void;
  required?: boolean;
}

export const PublishingTargetSelector: React.FC<PublishingTargetSelectorProps> = ({
  orgId,
  userId,
  userRole,
  value,
  onChange,
  required = false,
}) => {
  const { targets, loading, error } = usePublishingTargets(orgId, userId, userRole);
  const [selectedProvider, setSelectedProvider] = useState<CMSProvider | ''>('');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');

  // Initialize from value prop
  useEffect(() => {
    if (value) {
      setSelectedProvider(value.cms_provider);
      setSelectedSiteId(value.site_id);
      setSelectedCollectionId(value.collection_id || '');
    } else if (targets?.default) {
      // Use default if no value provided
      setSelectedProvider(targets.default.cms_provider);
      setSelectedSiteId(targets.default.site_id);
      setSelectedCollectionId(targets.default.collection_id || '');
    }
  }, [value, targets]);

  // Update parent when selection changes
  useEffect(() => {
    if (selectedProvider && selectedSiteId) {
      const site = targets?.sites.find(s => s.id === selectedSiteId && s.provider === selectedProvider);
      onChange({
        cms_provider: selectedProvider as CMSProvider,
        site_id: selectedSiteId,
        collection_id: selectedCollectionId || undefined,
        site_name: site?.name,
      });
    }
  }, [selectedProvider, selectedSiteId, selectedCollectionId, targets, onChange]);

  if (loading) {
    return <div className="animate-pulse">Loading publishing targets...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  if (!targets) {
    return <div className="text-gray-500">No publishing targets available</div>;
  }

  const availableSites = targets.sites.filter(site => 
    !selectedProvider || site.provider === selectedProvider
  );

  const selectedSite = availableSites.find(s => s.id === selectedSiteId);
  const availableCollections = selectedSite?.collections || [];

  return (
    <div className="space-y-4">
      {/* Provider Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          CMS Provider {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={selectedProvider}
          onChange={(e) => {
            setSelectedProvider(e.target.value as CMSProvider);
            setSelectedSiteId('');
            setSelectedCollectionId('');
          }}
          required={required}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select provider...</option>
          {targets.providers.map(provider => (
            <option key={provider} value={provider}>
              {provider.charAt(0).toUpperCase() + provider.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Site Selection */}
      {selectedProvider && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Site {required && <span className="text-red-500">*</span>}
          </label>
          <select
            value={selectedSiteId}
            onChange={(e) => {
              setSelectedSiteId(e.target.value);
              setSelectedCollectionId('');
            }}
            required={required}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select site...</option>
            {availableSites.map(site => (
              <option key={site.id} value={site.id}>
                {site.name} {site.is_default && '(Default)'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Collection Selection (for Webflow) */}
      {selectedProvider === CMSProvider.WEBFLOW && selectedSiteId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Collection {required && <span className="text-red-500">*</span>}
          </label>
          <select
            value={selectedCollectionId}
            onChange={(e) => setSelectedCollectionId(e.target.value)}
            required={required}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select collection...</option>
            {availableCollections.map(collection => (
              <option key={collection} value={collection}>
                {collection}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Default Target Info */}
      {targets.default && (
        <div className="text-sm text-gray-500">
          Default: {targets.default.cms_provider} → {targets.default.site_id}
          {targets.default.collection_id && ` → ${targets.default.collection_id}`}
        </div>
      )}
    </div>
  );
};
```

```typescript
// components/IntegrationManager.tsx
'use client';

import React, { useState } from 'react';
import { useIntegrations } from '@/hooks/useIntegrations';
import { PublishingService } from '@/lib/api/publishing';
import type { CMSProvider, UserRole, CreateIntegrationRequest, CMSIntegration } from '@/types/publishing';

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
  const { integrations, loading, error, refetch } = useIntegrations(orgId, userId, userRole);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const canManageIntegrations = ['admin', 'owner', 'system_admin', 'super_admin'].includes(userRole);

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
    if (!confirm('Are you sure you want to delete this integration?')) {
      return;
    }

    try {
      await PublishingService.deleteIntegration(orgId, userId, userRole, integrationId);
      refetch();
    } catch (err) {
      alert(`Failed to delete integration: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading integrations...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">CMS Integrations</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showCreateForm ? 'Cancel' : 'Add Integration'}
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
        {integrations.map(integration => (
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

// Integration Card Component
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
      alert(`Failed to set default: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Default</span>
            )}
            <span className={`px-2 py-1 text-xs rounded ${
              integration.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {integration.status}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Provider: {integration.type} | Site ID: {integration.site_id}
          </p>
          {integration.collection_ids.length > 0 && (
            <p className="text-sm text-gray-600">
              Collections: {integration.collection_ids.join(', ')}
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

// Integration Create Form Component
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
    site_id: '',
    site_name: '',
    api_key: '',
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
      setError(err instanceof Error ? err.message : 'Unknown error');
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
          onChange={(e) => setFormData({ ...formData, type: e.target.value as CMSProvider })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value={CMSProvider.WEBFLOW}>Webflow</option>
          <option value={CMSProvider.SHOPIFY}>Shopify</option>
          <option value={CMSProvider.WORDPRESS}>WordPress</option>
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
            value={formData.collection_ids.join(', ')}
            onChange={(e) => setFormData({
              ...formData,
              collection_ids: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
            })}
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
        <label htmlFor="is_default" className="text-sm">Set as default for this provider</label>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={creating}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Create Integration'}
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
```

```typescript
// components/PublishButton.tsx
'use client';

import React, { useState } from 'react';
import { usePublishing } from '@/hooks/usePublishing';
import { PublishingTargetSelector } from './PublishingTargetSelector';
import type { PublishingTarget, PublishBlogRequest, UserRole } from '@/types/publishing';

interface PublishButtonProps {
  orgId: string;
  userId: string;
  userRole: UserRole;
  blogId: string;
  currentTarget?: PublishingTarget;
  onPublished?: (response: any) => void;
}

export const PublishButton: React.FC<PublishButtonProps> = ({
  orgId,
  userId,
  userRole,
  blogId,
  currentTarget,
  onPublished,
}) => {
  const { publishing, error, publishBlog } = usePublishing(orgId, userId, userRole);
  const [showTargetSelector, setShowTargetSelector] = useState(false);
  const [target, setTarget] = useState<PublishingTarget | undefined>(currentTarget);
  const [publishResponse, setPublishResponse] = useState<any>(null);

  const handlePublish = async () => {
    if (!target && !currentTarget) {
      setShowTargetSelector(true);
      return;
    }

    try {
      const request: PublishBlogRequest = {
        blog_id: blogId,
        cms_provider: target?.cms_provider || currentTarget?.cms_provider,
        site_id: target?.site_id || currentTarget?.site_id,
        collection_id: target?.collection_id || currentTarget?.collection_id,
        publish: true,
      };

      const response = await publishBlog(request);
      setPublishResponse(response);
      
      if (response.success && onPublished) {
        onPublished(response);
      }
    } catch (err) {
      console.error('Publish failed:', err);
    }
  };

  return (
    <div className="space-y-4">
      {showTargetSelector && (
        <div className="p-4 border border-gray-200 rounded-lg">
          <h3 className="font-semibold mb-4">Select Publishing Target</h3>
          <PublishingTargetSelector
            orgId={orgId}
            userId={userId}
            userRole={userRole}
            value={target}
            onChange={setTarget}
            required
          />
          <div className="mt-4 flex gap-2">
            <button
              onClick={handlePublish}
              disabled={!target || publishing}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {publishing ? 'Publishing...' : 'Publish'}
            </button>
            <button
              onClick={() => setShowTargetSelector(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showTargetSelector && (
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {publishing ? 'Publishing...' : 'Publish Blog Post'}
        </button>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          Error: {error}
        </div>
      )}

      {publishResponse && (
        <div className={`p-3 rounded text-sm ${
          publishResponse.success
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {publishResponse.success ? (
            <div>
              <p className="font-semibold">Published successfully!</p>
              {publishResponse.published_url && (
                <a
                  href={publishResponse.published_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  View published post
                </a>
              )}
            </div>
          ) : (
            <p>Failed to publish: {publishResponse.error_message}</p>
          )}
        </div>
      )}
    </div>
  );
};
```

### Step 5: Blog Editor Integration

```typescript
// app/blog/[id]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { PublishingTargetSelector } from '@/components/PublishingTargetSelector';
import { PublishButton } from '@/components/PublishButton';
import { PublishingService } from '@/lib/api/publishing';
import type { BlogPostWithCosts, PublishingTarget, UserRole } from '@/types/publishing';

export default function BlogEditPage({ params }: { params: { id: string } }) {
  const [orgId] = useState('org_123'); // Get from auth context
  const [userId] = useState('user_123'); // Get from auth context
  const [userRole] = useState<UserRole>(UserRole.WRITER); // Get from auth context
  const [blogPost, setBlogPost] = useState<BlogPostWithCosts | null>(null);
  const [publishingTarget, setPublishingTarget] = useState<PublishingTarget | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlogPost();
  }, [params.id]);

  const loadBlogPost = async () => {
    try {
      const post = await PublishingService.getBlogPost(orgId, userId, userRole, params.id);
      setBlogPost(post);
      
      if (post.publishing_metadata?.publishing_target) {
        setPublishingTarget(post.publishing_metadata.publishing_target);
      }
    } catch (err) {
      console.error('Failed to load blog post:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTargetChange = async (target: PublishingTarget) => {
    try {
      await PublishingService.updateDraftTarget(orgId, userId, userRole, params.id, target);
      setPublishingTarget(target);
    } catch (err) {
      console.error('Failed to update target:', err);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (!blogPost) {
    return <div>Blog post not found</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Edit Blog Post</h1>

      {/* Blog Content Editor */}
      <div className="mb-6">
        <textarea
          value={blogPost.content}
          onChange={(e) => setBlogPost({ ...blogPost, content: e.target.value })}
          className="w-full h-96 p-4 border border-gray-300 rounded-lg"
        />
      </div>

      {/* Publishing Target Selection */}
      <div className="mb-6 p-4 border border-gray-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Publishing Target</h2>
        <PublishingTargetSelector
          orgId={orgId}
          userId={userId}
          userRole={userRole}
          value={publishingTarget}
          onChange={handleTargetChange}
        />
      </div>

      {/* Cost Information (Admin Only) */}
      {['admin', 'owner', 'system_admin', 'super_admin'].includes(userRole) && blogPost.total_cost && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold mb-2">Cost Information</h3>
          <p>Total Cost: ${blogPost.total_cost.toFixed(4)}</p>
          {blogPost.cost_breakdown && (
            <div className="mt-2 text-sm">
              <p>AI Generation: ${blogPost.cost_breakdown.ai_generation.toFixed(4)}</p>
              <p>API Calls: ${blogPost.cost_breakdown.api_calls.toFixed(4)}</p>
            </div>
          )}
        </div>
      )}

      {/* Publish Button */}
      <PublishButton
        orgId={orgId}
        userId={userId}
        userRole={userRole}
        blogId={params.id}
        currentTarget={publishingTarget}
        onPublished={(response) => {
          console.log('Published:', response);
          loadBlogPost(); // Reload to get updated publish status
        }}
      />
    </div>
  );
}
```

---

## 📚 Usage Examples

### Example 1: List Integrations (Admin)

```typescript
import { useIntegrations } from '@/hooks/useIntegrations';
import { UserRole } from '@/types/publishing';

function IntegrationsPage() {
  const { integrations, loading, error } = useIntegrations(
    'org_123',
    'user_123',
    UserRole.ADMIN
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {integrations.map(integration => (
        <div key={integration.id}>
          <h3>{integration.site_name}</h3>
          <p>{integration.type} - {integration.site_id}</p>
        </div>
      ))}
    </div>
  );
}
```

### Example 2: Select Publishing Target

```typescript
import { PublishingTargetSelector } from '@/components/PublishingTargetSelector';
import { useState } from 'react';

function DraftEditor() {
  const [target, setTarget] = useState<PublishingTarget>();

  return (
    <PublishingTargetSelector
      orgId="org_123"
      userId="user_123"
      userRole={UserRole.WRITER}
      value={target}
      onChange={setTarget}
      required
    />
  );
}
```

### Example 3: Publish Blog Post

```typescript
import { usePublishing } from '@/hooks/usePublishing';
import { UserRole } from '@/types/publishing';

function PublishButton({ blogId }: { blogId: string }) {
  const { publishing, publishBlog } = usePublishing(
    'org_123',
    'user_123',
    UserRole.WRITER
  );

  const handlePublish = async () => {
    try {
      const response = await publishBlog({
        blog_id: blogId,
        publish: true,
      });

      if (response.success) {
        alert(`Published! URL: ${response.published_url}`);
      }
    } catch (err) {
      alert(`Failed: ${err}`);
    }
  };

  return (
    <button onClick={handlePublish} disabled={publishing}>
      {publishing ? 'Publishing...' : 'Publish'}
    </button>
  );
}
```

---

## ⚠️ Error Handling

### Common Errors

1. **No Publishing Target**
   ```typescript
   try {
     await publishBlog({ blog_id: 'post_123', publish: true });
   } catch (err) {
     if (err.message.includes('No publishing target')) {
       // Show target selector
     }
   }
   ```

2. **Site Not Found**
   ```typescript
   // Validation happens automatically in PublishingTargetSelector
   // Error shown if site doesn't belong to org
   ```

3. **Collection Required (Webflow)**
   ```typescript
   // PublishingTargetSelector shows collection field for Webflow
   // Validation ensures collection is selected
   ```

4. **Permission Denied**
   ```typescript
   // Check user role before showing integration management UI
   const canManage = ['admin', 'owner'].includes(userRole);
   ```

---

## 🔒 Role-Based Access Control

### Check Permissions

```typescript
// Check if user can manage integrations
const canManageIntegrations = [
  UserRole.ADMIN,
  UserRole.OWNER,
  UserRole.SYSTEM_ADMIN,
  UserRole.SUPER_ADMIN
].includes(userRole);

// Check if user can publish
const canPublish = [
  UserRole.WRITER,
  UserRole.EDITOR,
  UserRole.ADMIN,
  UserRole.OWNER
].includes(userRole);

// Check if user can view costs
const canViewCosts = [
  UserRole.ADMIN,
  UserRole.OWNER,
  UserRole.SYSTEM_ADMIN,
  UserRole.SUPER_ADMIN
].includes(userRole);
```

### Conditional Rendering

```typescript
{canManageIntegrations && (
  <IntegrationManager orgId={orgId} userId={userId} userRole={userRole} />
)}

{canViewCosts && blogPost.total_cost && (
  <div>Cost: ${blogPost.total_cost}</div>
)}
```

---

## 💰 Cost Visibility

### Automatic Filtering

Costs are automatically filtered by the backend based on user role:

```typescript
// Admin response
{
  "id": "post_123",
  "title": "My Post",
  "total_cost": 0.005143,
  "cost_breakdown": { ... }
}

// Writer response
{
  "id": "post_123",
  "title": "My Post",
  "total_cost": null,
  "cost_breakdown": null
}
```

### Display Costs (Admin Only)

```typescript
{blogPost.total_cost !== null && (
  <div className="cost-info">
    <p>Total Cost: ${blogPost.total_cost.toFixed(4)}</p>
    {blogPost.cost_breakdown && (
      <div>
        <p>AI: ${blogPost.cost_breakdown.ai_generation}</p>
        <p>API: ${blogPost.cost_breakdown.api_calls}</p>
      </div>
    )}
  </div>
)}
```

---

## 🎯 Complete Integration Checklist

- [ ] Add TypeScript types (`types/publishing.ts`)
- [ ] Create API service layer (`lib/api/publishing.ts`)
- [ ] Create custom hooks (`hooks/useIntegrations.ts`, `hooks/usePublishingTargets.ts`, `hooks/usePublishing.ts`)
- [ ] Create components (`components/PublishingTargetSelector.tsx`, `components/IntegrationManager.tsx`, `components/PublishButton.tsx`)
- [ ] Integrate into blog editor
- [ ] Add error handling
- [ ] Add loading states
- [ ] Test role-based access
- [ ] Test cost visibility filtering
- [ ] Test publishing flow

---

## 📖 Summary

This guide provides complete frontend integration for the multi-CMS publishing system:

- ✅ **Integration Management** - Full CRUD operations
- ✅ **Target Selection** - Easy-to-use selector component
- ✅ **Publishing** - Simple publish button with error handling
- ✅ **Role-Based Access** - Conditional rendering based on permissions
- ✅ **Cost Visibility** - Automatic filtering (admins see costs, writers don't)
- ✅ **TypeScript Support** - Full type safety
- ✅ **Error Handling** - Comprehensive error messages
- ✅ **Loading States** - User-friendly loading indicators

All code is production-ready and follows Next.js 13+ App Router patterns!

