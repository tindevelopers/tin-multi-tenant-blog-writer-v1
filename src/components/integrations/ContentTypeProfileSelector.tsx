/**
 * Content Type Profile Selector Component
 * 
 * Allows users to select and manage content type profiles for an integration
 */

'use client';

import { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  PlusIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface ContentTypeProfile {
  id: string;
  profile_name: string;
  content_type: string;
  target_collection_id?: string;
  target_collection_name?: string;
  site_id?: string;
  description?: string;
  is_default: boolean;
  is_active: boolean;
  site?: {
    id: string;
    site_name: string;
    site_id: string;
  };
}

interface ContentTypeProfileSelectorProps {
  integrationId: string;
  siteId?: string | null;
  selectedProfileId?: string;
  onProfileSelect?: (profileId: string | null) => void;
  onProfileCreate?: () => void;
  showCreateButton?: boolean;
}

export function ContentTypeProfileSelector({
  integrationId,
  siteId,
  selectedProfileId,
  onProfileSelect,
  onProfileCreate,
  showCreateButton = true,
}: ContentTypeProfileSelectorProps) {
  const [profiles, setProfiles] = useState<ContentTypeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfiles();
  }, [integrationId, siteId]);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = siteId
        ? `/api/integrations/${integrationId}/content-types?site_id=${siteId}`
        : `/api/integrations/${integrationId}/content-types`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setProfiles(result.data || []);
        
        // Auto-select default profile if no selection and default exists
        if (!selectedProfileId && result.data?.length > 0) {
          const defaultProfile = result.data.find((p: ContentTypeProfile) => p.is_default);
          if (defaultProfile && onProfileSelect) {
            onProfileSelect(defaultProfile.id);
          }
        }
      } else {
        setError(result.error || 'Failed to load content type profiles');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content type profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSelect = (profileId: string) => {
    if (onProfileSelect) {
      onProfileSelect(profileId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Content Type Profile
        </label>
        {showCreateButton && onProfileCreate && (
          <button
            onClick={onProfileCreate}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <PlusIcon className="w-4 h-4" />
            Create Profile
          </button>
        )}
      </div>

      {profiles.length === 0 ? (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
          <DocumentTextIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            No content type profiles configured yet
          </p>
          {showCreateButton && onProfileCreate && (
            <button
              onClick={onProfileCreate}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Create your first profile
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => handleProfileSelect(profile.id)}
              className={`w-full p-3 rounded-lg border text-left transition-all ${
                selectedProfileId === profile.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              } ${!profile.is_active ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {profile.profile_name}
                    </span>
                    {profile.is_default && (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        Default
                      </span>
                    )}
                    {!profile.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        Inactive
                      </span>
                    )}
                  </div>
                  {profile.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-7">
                      {profile.description}
                    </p>
                  )}
                  {profile.target_collection_name && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 ml-7">
                      Collection: {profile.target_collection_name}
                    </p>
                  )}
                  {profile.site && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 ml-7">
                      Site: {profile.site.site_name}
                    </p>
                  )}
                </div>
                {selectedProfileId === profile.id && (
                  <CheckCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

