'use client';

import React, { useState, useEffect } from "react";
import { usePublishingTargets } from "@/hooks/usePublishingTargets";
import {
  CMSProvider,
  PublishingTarget,
  UserRole,
} from "@/types/publishing";

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
  const [selectedProvider, setSelectedProvider] = useState<CMSProvider | "">("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");

  // Initialize from value or default target
  useEffect(() => {
    if (value) {
      setSelectedProvider(value.cms_provider);
      setSelectedSiteId(value.site_id);
      setSelectedCollectionId(value.collection_id || "");
    } else if (targets?.default) {
      setSelectedProvider(targets.default.cms_provider);
      setSelectedSiteId(targets.default.site_id);
      setSelectedCollectionId(targets.default.collection_id || "");
    }
  }, [value, targets]);

  // Notify parent on change
  useEffect(() => {
    if (selectedProvider && selectedSiteId) {
      const site = targets?.sites.find(
        (s) => s.id === selectedSiteId && s.provider === selectedProvider
      );
      onChange({
        cms_provider: selectedProvider as CMSProvider,
        site_id: selectedSiteId,
        collection_id: selectedCollectionId || undefined,
        site_name: site?.name,
      });
    }
  }, [selectedProvider, selectedSiteId, selectedCollectionId, targets, onChange]);

  if (loading) {
    return <div className="animate-pulse text-sm text-gray-500">Loading publishing targets...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-sm">Error: {error}</div>;
  }

  if (!targets) {
    return <div className="text-gray-500 text-sm">No publishing targets available</div>;
  }

  const availableSites = targets.sites.filter(
    (site) => !selectedProvider || site.provider === selectedProvider
  );

  const selectedSite = availableSites.find((s) => s.id === selectedSiteId);
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
            setSelectedSiteId("");
            setSelectedCollectionId("");
          }}
          required={required}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select provider...</option>
          {targets.providers.map((provider) => (
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
              setSelectedCollectionId("");
            }}
            required={required}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select site...</option>
            {availableSites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} {site.is_default && "(Default)"}
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
            {availableCollections.map((collection) => (
              <option key={collection} value={collection}>
                {collection}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Default Target Info */}
      {targets.default && (
        <div className="text-xs text-gray-500">
          Default: {targets.default.cms_provider} → {targets.default.site_id}
          {targets.default.collection_id && ` → ${targets.default.collection_id}`}
        </div>
      )}
    </div>
  );
};

