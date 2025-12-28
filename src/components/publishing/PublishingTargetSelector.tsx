'use client';

import React, { useState, useEffect, useRef } from "react";
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
  const lastEmittedValueRef = useRef<PublishingTarget | null>(null);

  // Initialize from value or default target
  // Only update if the incoming value is different from current state or last emitted value
  useEffect(() => {
    // Check if current state already matches the incoming value
    const currentMatchesValue = value && 
      selectedProvider === value.cms_provider &&
      selectedSiteId === value.site_id &&
      selectedCollectionId === (value.collection_id || "");
    
    // Check if incoming value matches what we last emitted (to avoid resetting after user selection)
    const valueMatchesLastEmitted = value && lastEmittedValueRef.current &&
      value.cms_provider === lastEmittedValueRef.current.cms_provider &&
      value.site_id === lastEmittedValueRef.current.site_id &&
      (value.collection_id || "") === (lastEmittedValueRef.current.collection_id || "");

    // Only update if value is different and doesn't match what we just emitted
    if (value && !currentMatchesValue && !valueMatchesLastEmitted) {
      setSelectedProvider(value.cms_provider);
      setSelectedSiteId(value.site_id);
      setSelectedCollectionId(value.collection_id || "");
    } else if (!value && targets?.default) {
      // Only set default if we don't have a current selection
      if (!selectedProvider || !selectedSiteId) {
        setSelectedProvider(targets.default.cms_provider);
        setSelectedSiteId(targets.default.site_id);
        setSelectedCollectionId(targets.default.collection_id || "");
      }
    }
  }, [value, targets, selectedProvider, selectedSiteId, selectedCollectionId]);

  // Notify parent on change
  useEffect(() => {
    if (selectedProvider && selectedSiteId) {
      const site = targets?.sites.find(
        (s) => s.id === selectedSiteId && s.provider === selectedProvider
      );
      const newTarget: PublishingTarget = {
        cms_provider: selectedProvider as CMSProvider,
        site_id: selectedSiteId,
        collection_id: selectedCollectionId || undefined,
        site_name: site?.name,
      };
      
      // Only emit if different from last emitted value
      if (!lastEmittedValueRef.current ||
          lastEmittedValueRef.current.cms_provider !== newTarget.cms_provider ||
          lastEmittedValueRef.current.site_id !== newTarget.site_id ||
          (lastEmittedValueRef.current.collection_id || "") !== (newTarget.collection_id || "")) {
        lastEmittedValueRef.current = newTarget;
        onChange(newTarget);
      }
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

