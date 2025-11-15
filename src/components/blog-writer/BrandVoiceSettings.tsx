"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Save, Loader2, CheckCircle2, AlertCircle, Plus, X } from 'lucide-react';
import Alert from '@/components/ui/alert/Alert';
import { logger } from '@/utils/logger';

interface BrandVoiceSettingsProps {
  onSettingsChange?: (settings: any) => void;
  compact?: boolean;
}

export default function BrandVoiceSettings({ onSettingsChange, compact = false }: BrandVoiceSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [brandVoice, setBrandVoice] = useState<any>(null);

  const [formData, setFormData] = useState({
    tone: 'professional',
    style_guidelines: '',
    vocabulary: [] as string[],
    target_audience: '',
    industry_specific_terms: [] as string[],
    brand_voice_description: '',
    examples: [] as string[]
  });

  const [newVocabulary, setNewVocabulary] = useState('');
  const [newIndustryTerm, setNewIndustryTerm] = useState('');
  const [newExample, setNewExample] = useState('');

  const tones = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'authoritative', label: 'Authoritative' },
    { value: 'conversational', label: 'Conversational' },
    { value: 'humorous', label: 'Humorous' },
    { value: 'technical', label: 'Technical' },
    { value: 'creative', label: 'Creative' }
  ];

  // Load existing brand voice settings
  useEffect(() => {
    loadBrandVoice();
  }, []);

  const loadBrandVoice = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/brand-settings');
      const data = await response.json();

      if (response.ok && data.brand_settings) {
        const settings = data.brand_settings;
        setBrandVoice(settings);
        setFormData({
          tone: settings.tone || 'professional',
          style_guidelines: settings.style_guidelines || '',
          vocabulary: Array.isArray(settings.vocabulary) ? settings.vocabulary : [],
          target_audience: settings.target_audience || '',
          industry_specific_terms: Array.isArray(settings.industry_specific_terms) ? settings.industry_specific_terms : [],
          brand_voice_description: settings.brand_voice_description || '',
          examples: Array.isArray(settings.examples) ? settings.examples : []
        });
        
        if (onSettingsChange) {
          onSettingsChange(settings);
        }
      }
    } catch (err: any) {
      logger.error('Error loading brand voice:', err);
      setError('Failed to load brand voice settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/brand-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Brand voice settings saved successfully!');
        setBrandVoice(data.brand_settings);
        if (onSettingsChange) {
          onSettingsChange(data.brand_settings);
        }
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to save brand voice settings');
      }
    } catch (err: any) {
      logger.error('Error saving brand voice:', err);
      setError('Failed to save brand voice settings');
    } finally {
      setSaving(false);
    }
  };

  const addVocabulary = () => {
    if (newVocabulary.trim()) {
      setFormData(prev => ({
        ...prev,
        vocabulary: [...prev.vocabulary, newVocabulary.trim()]
      }));
      setNewVocabulary('');
    }
  };

  const removeVocabulary = (index: number) => {
    setFormData(prev => ({
      ...prev,
      vocabulary: prev.vocabulary.filter((_, i) => i !== index)
    }));
  };

  const addIndustryTerm = () => {
    if (newIndustryTerm.trim()) {
      setFormData(prev => ({
        ...prev,
        industry_specific_terms: [...prev.industry_specific_terms, newIndustryTerm.trim()]
      }));
      setNewIndustryTerm('');
    }
  };

  const removeIndustryTerm = (index: number) => {
    setFormData(prev => ({
      ...prev,
      industry_specific_terms: prev.industry_specific_terms.filter((_, i) => i !== index)
    }));
  };

  const addExample = () => {
    if (newExample.trim()) {
      setFormData(prev => ({
        ...prev,
        examples: [...prev.examples, newExample.trim()]
      }));
      setNewExample('');
    }
  };

  const removeExample = (index: number) => {
    setFormData(prev => ({
      ...prev,
      examples: prev.examples.filter((_, i) => i !== index)
    }));
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
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Brand Voice</h3>
          {brandVoice && (
            <span className="text-xs text-green-600 dark:text-green-400">Active</span>
          )}
        </div>
        {brandVoice ? (
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Tone: </span>
              <span className="font-medium text-gray-900 dark:text-white">{brandVoice.tone}</span>
            </div>
            {brandVoice.target_audience && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Audience: </span>
                <span className="font-medium text-gray-900 dark:text-white">{brandVoice.target_audience}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No brand voice configured</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Brand Voice Settings
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configure your organization&apos;s brand voice for consistent content generation
          </p>
        </div>
        {brandVoice && (
          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
            Active
          </span>
        )}
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

      <div className="space-y-6">
        {/* Tone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tone
          </label>
          <select
            value={formData.tone}
            onChange={(e) => setFormData(prev => ({ ...prev, tone: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            {tones.map(tone => (
              <option key={tone.value} value={tone.value}>
                {tone.label}
              </option>
            ))}
          </select>
        </div>

        {/* Brand Voice Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Brand Voice Description
          </label>
          <textarea
            value={formData.brand_voice_description}
            onChange={(e) => setFormData(prev => ({ ...prev, brand_voice_description: e.target.value }))}
            rows={3}
            placeholder="Describe your brand voice in a few sentences..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Target Audience */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Audience
          </label>
          <input
            type="text"
            value={formData.target_audience}
            onChange={(e) => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
            placeholder="e.g., Business professionals, Tech enthusiasts"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Style Guidelines */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Style Guidelines
          </label>
          <textarea
            value={formData.style_guidelines}
            onChange={(e) => setFormData(prev => ({ ...prev, style_guidelines: e.target.value }))}
            rows={4}
            placeholder="Enter style guidelines (e.g., Use clear, concise language. Avoid jargon. Use active voice.)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Vocabulary */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Preferred Vocabulary
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newVocabulary}
              onChange={(e) => setNewVocabulary(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addVocabulary()}
              placeholder="Add preferred term or phrase"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={addVocabulary}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.vocabulary.map((term, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm"
              >
                {term}
                <button
                  onClick={() => removeVocabulary(index)}
                  className="hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Industry-Specific Terms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Industry-Specific Terms
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newIndustryTerm}
              onChange={(e) => setNewIndustryTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addIndustryTerm()}
              placeholder="Add industry term"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={addIndustryTerm}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.industry_specific_terms.map((term, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm"
              >
                {term}
                <button
                  onClick={() => removeIndustryTerm(index)}
                  className="hover:text-purple-600 dark:hover:text-purple-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Examples */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Example Content Snippets
          </label>
          <div className="flex gap-2 mb-2">
            <textarea
              value={newExample}
              onChange={(e) => setNewExample(e.target.value)}
              placeholder="Add example content that exemplifies your brand voice"
              rows={2}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={addExample}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors self-start"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {formData.examples.map((example, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <p className="flex-1 text-sm text-gray-700 dark:text-gray-300">{example}</p>
                <button
                  onClick={() => removeExample(index)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Brand Voice Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


