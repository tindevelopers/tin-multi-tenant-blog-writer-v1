"use client";

import { useState, useEffect } from "react";
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { validateBlogFields, type BlogFieldData } from "@/lib/blog-field-validator";

interface BlogFieldConfigurationProps {
  initialData: BlogFieldData;
  onSave: (data: BlogFieldData) => void;
  onCancel: () => void;
  show: boolean;
}

export default function BlogFieldConfiguration({
  initialData,
  onSave,
  onCancel,
  show,
}: BlogFieldConfigurationProps) {
  const [formData, setFormData] = useState<BlogFieldData>(initialData);
  const [validation, setValidation] = useState(validateBlogFields(initialData));

  useEffect(() => {
    setFormData(initialData);
    setValidation(validateBlogFields(initialData));
  }, [initialData]);

  const handleFieldChange = (field: keyof BlogFieldData, value: unknown) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    setValidation(validateBlogFields(updated));
  };

  const handleSave = () => {
    onSave(formData);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Blog Field Configuration
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure all fields before creating your blog post
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </button>
        </div>

        {/* Validation Summary */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-4">
            {validation.isValid ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircleIcon className="w-5 h-5" />
                <span className="font-medium">All required fields are complete</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <ExclamationTriangleIcon className="w-5 h-5" />
                <span className="font-medium">
                  Missing required fields: {validation.missingRequired.join(", ")}
                </span>
              </div>
            )}
          </div>
          
          {validation.missingRecommended.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <InformationCircleIcon className="w-5 h-5" />
              <span className="text-sm">
                Recommended fields missing: {validation.missingRecommended.join(", ")}
              </span>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {validation.warnings.map((warning, idx) => (
                <div key={idx} className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm">
                  <InformationCircleIcon className="w-4 h-4" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="px-6 py-6 space-y-6">
          {/* Basic Info Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Basic Information
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title || ""}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter blog post title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Slug
              </label>
              <input
                type="text"
                value={formData.slug || ""}
                onChange={(e) => handleFieldChange("slug", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Auto-generated from title"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                URL-friendly version of the title (auto-generated if left empty)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Excerpt/Summary <span className="text-yellow-500">*</span>
              </label>
              <textarea
                value={formData.excerpt || ""}
                onChange={(e) => handleFieldChange("excerpt", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Brief summary of the blog post"
              />
            </div>
          </div>

          {/* SEO Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              SEO Fields
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                SEO Title
              </label>
              <input
                type="text"
                value={formData.seo_title || ""}
                onChange={(e) => handleFieldChange("seo_title", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="SEO optimized title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Meta Description <span className="text-yellow-500">*</span>
              </label>
              <textarea
                value={formData.meta_description || ""}
                onChange={(e) => handleFieldChange("meta_description", e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Meta description for search engines"
              />
            </div>
          </div>

          {/* Image Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Images
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Featured Image URL <span className="text-yellow-500">*</span>
              </label>
              <input
                type="url"
                value={formData.featured_image || ""}
                onChange={(e) => handleFieldChange("featured_image", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Featured Image Alt Text
              </label>
              <input
                type="text"
                value={formData.featured_image_alt || ""}
                onChange={(e) => handleFieldChange("featured_image_alt", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Description of featured image"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Thumbnail Image URL
              </label>
              <input
                type="url"
                value={formData.thumbnail_image || ""}
                onChange={(e) => handleFieldChange("thumbnail_image", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="https://example.com/thumbnail.jpg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Thumbnail Image Alt Text
              </label>
              <input
                type="text"
                value={formData.thumbnail_image_alt || ""}
                onChange={(e) => handleFieldChange("thumbnail_image_alt", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Description of thumbnail image"
              />
            </div>
          </div>

          {/* Author Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Author Information
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Author Name <span className="text-yellow-500">*</span>
              </label>
              <input
                type="text"
                value={formData.author_name || ""}
                onChange={(e) => handleFieldChange("author_name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Author name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Author Image URL
              </label>
              <input
                type="url"
                value={formData.author_image || ""}
                onChange={(e) => handleFieldChange("author_image", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="https://example.com/author.jpg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Author Bio
              </label>
              <textarea
                value={formData.author_bio || ""}
                onChange={(e) => handleFieldChange("author_bio", e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Brief author biography"
              />
            </div>
          </div>

          {/* Publishing Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Publishing Settings
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Locale
              </label>
              <select
                value={formData.locale || "en"}
                onChange={(e) => handleFieldChange("locale", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Publication Date
              </label>
              <input
                type="datetime-local"
                value={formData.published_at ? new Date(formData.published_at).toISOString().slice(0, 16) : ""}
                onChange={(e) => handleFieldChange("published_at", e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_featured || false}
                onChange={(e) => handleFieldChange("is_featured", e.target.checked)}
                className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
              />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Mark as Featured Post
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!validation.isValid}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

