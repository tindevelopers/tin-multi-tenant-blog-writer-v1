"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Settings, 
  Save, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle2,
  AlertCircle,
  Target,
  TrendingUp,
  ShoppingCart,
  Building2
} from 'lucide-react';
import Alert from '@/components/ui/alert/Alert';

type ContentGoal = 'seo' | 'engagement' | 'conversions' | 'brand_awareness';

interface ContentGoalPrompt {
  prompt_id?: string;
  org_id?: string;
  content_goal: ContentGoal;
  prompt_title: string;
  system_prompt: string;
  user_prompt_template?: string;
  instructions?: Record<string, unknown>;
  is_active: boolean;
  is_system_default: boolean;
  priority: number;
}

const contentGoalConfig: Record<ContentGoal, { label: string; icon: React.ReactNode; description: string }> = {
  seo: {
    label: 'SEO & Rankings',
    icon: <TrendingUp className="w-5 h-5" />,
    description: 'Optimize content for search engine rankings'
  },
  engagement: {
    label: 'Engagement',
    icon: <Target className="w-5 h-5" />,
    description: 'Maximize shares, comments, and social interaction'
  },
  conversions: {
    label: 'Conversions',
    icon: <ShoppingCart className="w-5 h-5" />,
    description: 'Drive sales, sign-ups, and desired actions'
  },
  brand_awareness: {
    label: 'Brand Awareness',
    icon: <Building2 className="w-5 h-5" />,
    description: 'Build brand recognition and thought leadership'
  }
};

export default function ContentPromptsPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<Record<ContentGoal, ContentGoalPrompt | null>>({
    seo: null,
    engagement: null,
    conversions: null,
    brand_awareness: null
  });
  const [editingGoal, setEditingGoal] = useState<ContentGoal | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Load prompts
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError('Please log in');
          return;
        }

        // Get user's org_id
        const { data: userData } = await supabase
          .from('users')
          .select('org_id')
          .eq('user_id', user.id)
          .single();

        if (!userData?.org_id) {
          setError('Organization not found');
          return;
        }

        setOrgId(userData.org_id);

        // Load prompts for each content goal
        const goals: ContentGoal[] = ['seo', 'engagement', 'conversions', 'brand_awareness'];
        const promptsData: Record<ContentGoal, ContentGoalPrompt | null> = {
          seo: null,
          engagement: null,
          conversions: null,
          brand_awareness: null
        };

        for (const goal of goals) {
          // Try to get org-specific prompt first, then system default
          const { data: orgPrompt } = await supabase
            .from('content_goal_prompts')
            .select('*')
            .eq('content_goal', goal)
            .eq('is_active', true)
            .eq('org_id', userData.org_id)
            .order('priority', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (orgPrompt) {
            promptsData[goal] = orgPrompt as ContentGoalPrompt;
          } else {
            // Get system default
            const { data: systemPrompt } = await supabase
              .from('content_goal_prompts')
              .select('*')
              .eq('content_goal', goal)
              .eq('is_system_default', true)
              .eq('is_active', true)
              .order('priority', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (systemPrompt) {
              promptsData[goal] = systemPrompt as ContentGoalPrompt;
            }
          }
        }

        setPrompts(promptsData);
      } catch (err: any) {
        console.error('Error loading prompts:', err);
        setError(err.message || 'Failed to load prompts');
      } finally {
        setLoading(false);
      }
    };

    loadPrompts();
  }, []);

  const handleSavePrompt = async (goal: ContentGoal, promptData: Partial<ContentGoalPrompt>) => {
    if (!orgId) {
      setError('Organization not found');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const supabase = createClient();

      const promptToSave: Partial<ContentGoalPrompt> = {
        ...promptData,
        content_goal: goal,
        org_id: orgId,
        is_system_default: false,
        is_active: true,
        priority: promptData.priority || 0
      };

      if (prompts[goal]?.prompt_id) {
        // Update existing
        const { error: updateError } = await supabase
          .from('content_goal_prompts')
          .update({
            prompt_title: promptToSave.prompt_title,
            system_prompt: promptToSave.system_prompt,
            user_prompt_template: promptToSave.user_prompt_template,
            instructions: promptToSave.instructions,
            priority: promptToSave.priority,
            updated_at: new Date().toISOString()
          })
          .eq('prompt_id', prompts[goal]!.prompt_id)
          .eq('org_id', orgId);

        if (updateError) throw updateError;
      } else {
        // Create new
        const { error: insertError } = await supabase
          .from('content_goal_prompts')
          .insert({
            ...promptToSave,
            org_id: orgId
          });

        if (insertError) throw insertError;
      }

      // Reload prompts
      const { data: updatedPrompt } = await supabase
        .from('content_goal_prompts')
        .select('*')
        .eq('content_goal', goal)
        .eq('org_id', orgId)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(1)
        .single();

      if (updatedPrompt) {
        setPrompts(prev => ({
          ...prev,
          [goal]: updatedPrompt as ContentGoalPrompt
        }));
      }

      setEditingGoal(null);
      setSuccess('Prompt saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving prompt:', err);
      setError(err.message || 'Failed to save prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePrompt = async (goal: ContentGoal) => {
    if (!prompts[goal]?.prompt_id || !orgId) return;

    if (!confirm('Are you sure you want to delete this prompt? You will fall back to the system default.')) {
      return;
    }

    try {
      setSaving(true);
      const supabase = createClient();

      const { error } = await supabase
        .from('content_goal_prompts')
        .update({ is_active: false })
        .eq('prompt_id', prompts[goal]!.prompt_id)
        .eq('org_id', orgId);

      if (error) throw error;

      // Reload system default
      const { data: systemPrompt } = await supabase
        .from('content_goal_prompts')
        .select('*')
        .eq('content_goal', goal)
        .eq('is_system_default', true)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(1)
        .maybeSingle();

      setPrompts(prev => ({
        ...prev,
        [goal]: systemPrompt as ContentGoalPrompt | null
      }));

      setSuccess('Prompt deleted, using system default');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting prompt:', err);
      setError(err.message || 'Failed to delete prompt');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading prompts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
            <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Content Goal Prompts
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Configure AI instructions for each content goal type
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6">
          <Alert variant="error" title="Error" message={error} />
        </div>
      )}
      {success && (
        <div className="mb-6">
          <Alert variant="success" title="Success" message={success} />
        </div>
      )}

      {/* Prompts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(Object.keys(contentGoalConfig) as ContentGoal[]).map((goal) => {
          const config = contentGoalConfig[goal];
          const prompt = prompts[goal];
          const isEditing = editingGoal === goal;
          const isSystemDefault = prompt?.is_system_default || false;

          return (
            <div
              key={goal}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    {config.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {config.label}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {config.description}
                    </p>
                  </div>
                </div>
                {isSystemDefault && (
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                    System Default
                  </span>
                )}
              </div>

              {/* Prompt Content */}
              {isEditing ? (
                <PromptEditor
                  goal={goal}
                  prompt={prompt}
                  onSave={(data) => handleSavePrompt(goal, data)}
                  onCancel={() => setEditingGoal(null)}
                  saving={saving}
                />
              ) : (
                <>
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      System Prompt:
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {prompt?.system_prompt || 'No prompt configured'}
                    </div>
                  </div>

                  {prompt?.user_prompt_template && (
                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        User Prompt Template:
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {prompt.user_prompt_template}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setEditingGoal(goal)}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      {prompt && !isSystemDefault ? (
                        <>
                          <Edit className="w-4 h-4" />
                          Edit
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Create Custom
                        </>
                      )}
                    </button>
                    {prompt && !isSystemDefault && (
                      <button
                        onClick={() => handleDeletePrompt(goal)}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              How Content Goal Prompts Work
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-2 list-disc list-inside">
              <li>System prompts are sent to the AI to guide content generation</li>
              <li>Each content goal (SEO, Engagement, Conversions, Brand Awareness) has its own prompt</li>
              <li>You can create custom prompts for your organization that override system defaults</li>
              <li>Prompts are automatically applied when users select a content goal during workflow setup</li>
              <li>Prompts include instructions on tone, structure, focus areas, and content elements</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Prompt Editor Component
function PromptEditor({
  goal,
  prompt,
  onSave,
  onCancel,
  saving
}: {
  goal: ContentGoal;
  prompt: ContentGoalPrompt | null;
  onSave: (data: Partial<ContentGoalPrompt>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState({
    prompt_title: prompt?.prompt_title || `${contentGoalConfig[goal].label} - Custom`,
    system_prompt: prompt?.system_prompt || '',
    user_prompt_template: prompt?.user_prompt_template || '',
    priority: prompt?.priority || 0
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Prompt Title
        </label>
        <input
          type="text"
          value={formData.prompt_title}
          onChange={(e) => setFormData({ ...formData, prompt_title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          System Prompt <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.system_prompt}
          onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
          rows={12}
          placeholder="Enter detailed instructions for the AI on how to write content for this goal..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          This prompt is sent to the AI to guide content generation. Be specific about tone, structure, and focus areas.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          User Prompt Template (Optional)
        </label>
        <textarea
          value={formData.user_prompt_template}
          onChange={(e) => setFormData({ ...formData, user_prompt_template: e.target.value })}
          rows={4}
          placeholder="Optional template for user-facing instructions..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => onSave(formData)}
          disabled={saving || !formData.system_prompt}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Prompt'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

