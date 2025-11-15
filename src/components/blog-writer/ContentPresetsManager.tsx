"use client";

import React, { useState, useEffect } from 'react';
import { Save, Loader2, Plus, X, CheckCircle2, Edit2, Trash2 } from 'lucide-react';
import Alert from '@/components/ui/alert/Alert';
import { logger } from '@/utils/logger';

interface ContentPreset {
  preset_id?: string;
  name: string;
  description?: string;
  word_count?: number;
  content_format?: string;
  quality_level?: string;
  is_default?: boolean;
  is_active?: boolean;
}

interface ContentPresetsManagerProps {
  onPresetSelect?: (preset: ContentPreset | null) => void;
  selectedPresetId?: string;
  compact?: boolean;
}

export default function ContentPresetsManager({ 
  onPresetSelect, 
  selectedPresetId,
  compact = false 
}: ContentPresetsManagerProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [presets, setPresets] = useState<ContentPreset[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPreset, setEditingPreset] = useState<ContentPreset | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    word_count: 1500,
    content_format: '',
    quality_level: 'standard',
    is_default: false
  });

  const contentFormats = [
    { value: 'how-to', label: 'How-To Guide' },
    { value: 'listicle', label: 'Listicle' },
    { value: 'guide', label: 'Guide' },
    { value: 'tutorial', label: 'Tutorial' },
    { value: 'review', label: 'Review' },
    { value: 'news', label: 'News Article' },
    { value: 'opinion', label: 'Opinion Piece' },
    { value: 'case-study', label: 'Case Study' }
  ];

  const qualityLevels = [
    { value: 'standard', label: 'Standard' },
    { value: 'premium', label: 'Premium' },
    { value: 'enterprise', label: 'Enterprise' }
  ];

  useEffect(() => {
    loadPresets();
  }, []);

  useEffect(() => {
    if (selectedPresetId && presets.length > 0) {
      const preset = presets.find(p => p.preset_id === selectedPresetId);
      if (preset && onPresetSelect) {
        onPresetSelect(preset);
      }
    }
  }, [selectedPresetId, presets, onPresetSelect]);

  const loadPresets = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/content-presets');
      const data = await response.json();

      if (response.ok && data.presets) {
        setPresets(Array.isArray(data.presets) ? data.presets : []);
      }
    } catch (err: any) {
      logger.error('Error loading presets:', err);
      setError('Failed to load content presets');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload: any = {
        ...formData,
        preset_id: editingPreset?.preset_id
      };

      const response = await fetch('/api/content-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(editingPreset ? 'Preset updated successfully!' : 'Preset created successfully!');
        setShowForm(false);
        setEditingPreset(null);
        setFormData({
          name: '',
          description: '',
          word_count: 1500,
          content_format: '',
          quality_level: 'standard',
          is_default: false
        });
        await loadPresets();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to save preset');
      }
    } catch (err: any) {
      logger.error('Error saving preset:', err);
      setError('Failed to save preset');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (preset: ContentPreset) => {
    setEditingPreset(preset);
    setFormData({
      name: preset.name || '',
      description: preset.description || '',
      word_count: preset.word_count || 1500,
      content_format: preset.content_format || '',
      quality_level: preset.quality_level || 'standard',
      is_default: preset.is_default || false
    });
    setShowForm(true);
  };

  const handleDelete = async (presetId: string) => {
    if (!confirm('Are you sure you want to delete this preset?')) {
      return;
    }

    try {
      const response = await fetch(`/api/content-presets?preset_id=${presetId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadPresets();
        setSuccess('Preset deleted successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete preset');
      }
    } catch (err: any) {
      logger.error('Error deleting preset:', err);
      setError('Failed to delete preset');
    }
  };

  const handleSelectPreset = (preset: ContentPreset | null) => {
    if (onPresetSelect) {
      onPresetSelect(preset);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Content Preset</h3>
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Manage
          </button>
        </div>
        <select
          value={selectedPresetId || ''}
          onChange={(e) => {
            const preset = presets.find(p => p.preset_id === e.target.value);
            handleSelectPreset(preset || null);
          }}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">None (Use defaults)</option>
          {presets.map(preset => (
            <option key={preset.preset_id} value={preset.preset_id}>
              {preset.name} {preset.is_default && '(Default)'}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Content Presets
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Create and manage content presets for consistent blog generation
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPreset(null);
            setFormData({
              name: '',
              description: '',
              word_count: 1500,
              content_format: '',
              quality_level: 'standard',
              is_default: false
            });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Preset
        </button>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error" title="Error" message={error} />
        </div>
      )}

      {success && (
        <div className="mb-4">
          <Alert variant="success" title="Success" message={success} />
        </div>
      )}

      {showForm ? (
        <div className="space-y-6 mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <h3 className="text-md font-semibold text-gray-900 dark:text-white">
            {editingPreset ? 'Edit Preset' : 'Create New Preset'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preset Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., SEO Blog Post"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content Format
              </label>
              <select
                value={formData.content_format}
                onChange={(e) => setFormData(prev => ({ ...prev, content_format: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select format</option>
                {contentFormats.map(format => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Word Count
              </label>
              <input
                type="number"
                value={formData.word_count}
                onChange={(e) => setFormData(prev => ({ ...prev, word_count: parseInt(e.target.value) || 1500 }))}
                min="100"
                max="5000"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quality Level
              </label>
              <select
                value={formData.quality_level}
                onChange={(e) => setFormData(prev => ({ ...prev, quality_level: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {qualityLevels.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Describe this preset..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_default"
              checked={formData.is_default}
              onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_default" className="text-sm text-gray-700 dark:text-gray-300">
              Set as default preset
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !formData.name}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Preset
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingPreset(null);
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {/* Presets List */}
      <div className="space-y-3">
        {presets.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No presets created yet. Create your first preset to get started.</p>
          </div>
        ) : (
          presets.map(preset => (
            <div
              key={preset.preset_id}
              className={`p-4 border rounded-lg ${
                selectedPresetId === preset.preset_id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {preset.name}
                    </h4>
                    {preset.is_default && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs font-medium">
                        Default
                      </span>
                    )}
                  </div>
                  {preset.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {preset.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {preset.content_format && (
                      <span>Format: {contentFormats.find(f => f.value === preset.content_format)?.label || preset.content_format}</span>
                    )}
                    {preset.word_count && (
                      <span>Words: {preset.word_count.toLocaleString()}</span>
                    )}
                    {preset.quality_level && (
                      <span>Quality: {preset.quality_level}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSelectPreset(preset)}
                    className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  >
                    Select
                  </button>
                  <button
                    onClick={() => handleEdit(preset)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => preset.preset_id && handleDelete(preset.preset_id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


