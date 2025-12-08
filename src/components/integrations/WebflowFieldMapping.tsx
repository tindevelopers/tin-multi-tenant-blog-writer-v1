'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import { ArrowPathIcon, CheckCircleIcon, XCircleIcon, ArrowPathRoundedSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { FieldMapping, BlogField } from '@/lib/integrations/types';
import { getDefaultWebflowFieldMappings } from '@/lib/integrations/webflow-field-mapping';

interface WebflowField {
  id: string;
  displayName: string;
  slug: string;
  type: string;
  isRequired: boolean;
}

interface WebflowFieldMappingProps {
  integrationId: string;
  collectionId: string;
}

// Available blog post fields that can be mapped
const BLOG_FIELDS: Array<{ value: BlogField; label: string; description: string }> = [
  { value: 'title', label: 'Title', description: 'Blog post title' },
  { value: 'content', label: 'Content', description: 'Main blog post content (HTML)' },
  { value: 'excerpt', label: 'Excerpt', description: 'Short summary/description' },
  { value: 'slug', label: 'Slug', description: 'URL-friendly slug' },
  { value: 'featured_image', label: 'Featured Image', description: 'Main image URL' },
  { value: 'published_at', label: 'Published Date', description: 'Publication date/time' },
  { value: 'seo_title', label: 'SEO Title', description: 'Meta title for SEO' },
  { value: 'seo_description', label: 'SEO Description', description: 'Meta description for SEO' },
  { value: 'author', label: 'Author', description: 'Author name' },
  { value: 'tags', label: 'Tags', description: 'Comma-separated tags' },
  { value: 'categories', label: 'Categories', description: 'Comma-separated categories' },
];

export function WebflowFieldMapping({ integrationId, collectionId }: WebflowFieldMappingProps) {
  const [webflowFields, setWebflowFields] = useState<WebflowField[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [collectionName, setCollectionName] = useState<string>('');

  useEffect(() => {
    if (integrationId && collectionId) {
      fetchCollectionFields();
      loadFieldMappings();
    }
  }, [integrationId, collectionId]);

  const fetchCollectionFields = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(`/api/integrations/${integrationId}/webflow-fields`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch collection fields');
      }

      const result = await response.json();
      if (result.success && result.collection) {
        setWebflowFields(result.collection.fields);
        setCollectionName(result.collection.displayName);
      }
    } catch (err) {
      logger.error('Error fetching Webflow fields:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch collection fields');
    } finally {
      setLoading(false);
    }
  };

  const loadFieldMappings = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/integrations/${integrationId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // field_mappings can be in the integration data directly or in connection config
          let mappings: FieldMapping[] = [];
          
          if (result.data.field_mappings && Array.isArray(result.data.field_mappings)) {
            mappings = result.data.field_mappings;
          } else if (result.data.config && typeof result.data.config === 'object') {
            const config = result.data.config as Record<string, unknown>;
            if (config.field_mappings && Array.isArray(config.field_mappings)) {
              mappings = config.field_mappings;
            }
          }
          
          // If no mappings found, use defaults but don't save them yet
          if (mappings.length === 0) {
            logger.debug('No saved mappings found, using defaults for display');
            // Don't set defaults here - let user see empty state and choose to use defaults
          }
          
          setFieldMappings(mappings);
        }
      }
    } catch (err) {
      logger.error('Error loading field mappings:', err);
    }
  };

  const handleResetToDefaults = () => {
    if (confirm('Are you sure you want to reset all mappings to default values? This will overwrite your current mappings.')) {
      const defaults = getDefaultWebflowFieldMappings();
      setFieldMappings(defaults);
      setSuccess('Mappings reset to defaults. Click "Save Field Mappings" to persist.');
    }
  };

  const handleClearMapping = (blogField: BlogField) => {
    setFieldMappings(prev => prev.filter(m => m.blogField !== blogField));
    setSuccess(`Mapping cleared for ${BLOG_FIELDS.find(f => f.value === blogField)?.label}. Click "Save Field Mappings" to persist.`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleMappingChange = (blogField: BlogField, webflowFieldSlug: string) => {
    setFieldMappings(prev => {
      // Remove existing mapping for this blog field
      const filtered = prev.filter(m => m.blogField !== blogField);
      
      // Add new mapping if a field is selected
      if (webflowFieldSlug) {
        return [...filtered, { blogField, targetField: webflowFieldSlug }];
      }
      
      return filtered;
    });
  };

  const handleSaveMappings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          field_mappings: fieldMappings,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('Field mappings saved successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(data.error || 'Failed to save field mappings');
      }
    } catch (err) {
      logger.error('Error saving field mappings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save field mappings');
    } finally {
      setSaving(false);
    }
  };

  const getMappedField = (blogField: BlogField): string => {
    const mapping = fieldMappings.find(m => m.blogField === blogField);
    return mapping?.targetField || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading collection fields...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Field Mapping Configuration
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Map your blog post fields to Webflow CMS collection fields
            {collectionName && ` (${collectionName})`}
            {fieldMappings.length > 0 && (
              <span className="ml-2 text-green-600 dark:text-green-400">
                • {fieldMappings.length} mapping{fieldMappings.length !== 1 ? 's' : ''} configured
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {fieldMappings.length > 0 && (
            <button
              onClick={handleResetToDefaults}
              className="text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 flex items-center gap-1 px-2 py-1 border border-amber-200 dark:border-amber-800 rounded"
            >
              <ArrowPathRoundedSquareIcon className="w-4 h-4" />
              Reset to Defaults
            </button>
          )}
          <button
            onClick={fetchCollectionFields}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Refresh Fields
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
          <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-start gap-2">
          <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-700 dark:text-green-300">{success}</div>
        </div>
      )}

      {webflowFields.length === 0 ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            No collection fields found. Please ensure your Collection ID is correct and the integration is properly configured.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Blog Post Field</h4>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Webflow CMS Field</h4>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {BLOG_FIELDS.map(blogField => {
              const currentMapping = fieldMappings.find(m => m.blogField === blogField.value);
              const isMapped = !!currentMapping;
              
              return (
                <div
                  key={blogField.value}
                  className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-lg border ${
                    isMapped
                      ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <label className="font-medium text-gray-900 dark:text-white">
                        {blogField.label}
                      </label>
                      {isMapped && (
                        <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {blogField.description}
                    </span>
                    {isMapped && (
                      <span className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                        → {currentMapping.targetField}
                      </span>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    <select
                      value={getMappedField(blogField.value)}
                      onChange={(e) => handleMappingChange(blogField.value, e.target.value)}
                      className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white ${
                        isMapped
                          ? 'border-green-300 dark:border-green-700'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <option value="">-- Select Webflow Field --</option>
                      {webflowFields.map(field => (
                        <option key={field.id} value={field.slug}>
                          {field.displayName} ({field.type})
                          {field.isRequired && ' *'}
                        </option>
                      ))}
                    </select>
                    {isMapped && (
                      <button
                        onClick={() => handleClearMapping(blogField.value)}
                        className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Clear mapping"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSaveMappings}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  Save Field Mappings
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

