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
  Building2,
  Search,
  Filter,
  Download,
  Upload,
  Copy,
  Eye,
  EyeOff,
  Clock,
  Users,
  Globe
} from 'lucide-react';
import Alert from '@/components/ui/alert/Alert';

type ContentGoal = 'seo' | 'engagement' | 'conversions' | 'brand_awareness';

interface ContentGoalPrompt {
  prompt_id: string;
  org_id?: string;
  content_goal: ContentGoal;
  prompt_title: string;
  system_prompt: string;
  user_prompt_template?: string;
  instructions?: Record<string, unknown>;
  is_active: boolean;
  is_system_default: boolean;
  priority: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

interface UserProfile {
  user_id: string;
  email: string;
  org_id: string;
  role: string;
}

const contentGoalConfig: Record<ContentGoal, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  seo: {
    label: 'SEO & Rankings',
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'blue',
    description: 'Optimize content for search engine rankings'
  },
  engagement: {
    label: 'Engagement',
    icon: <Target className="w-5 h-5" />,
    color: 'purple',
    description: 'Maximize shares, comments, and social interaction'
  },
  conversions: {
    label: 'Conversions',
    icon: <ShoppingCart className="w-5 h-5" />,
    color: 'green',
    description: 'Drive sales, sign-ups, and desired actions'
  },
  brand_awareness: {
    label: 'Brand Awareness',
    icon: <Building2 className="w-5 h-5" />,
    color: 'orange',
    description: 'Build brand recognition and thought leadership'
  }
};

type ViewMode = 'grid' | 'table';
type FilterMode = 'all' | 'system' | 'org' | 'active' | 'inactive';

export default function ContentGoalPromptsManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<ContentGoalPrompt[]>([]);
  const [filteredPrompts, setFilteredPrompts] = useState<ContentGoalPrompt[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<ContentGoal | 'all'>('all');
  const [editingPrompt, setEditingPrompt] = useState<ContentGoalPrompt | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);

  // Load user profile and prompts
  useEffect(() => {
    loadData();
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [prompts, filterMode, searchQuery, selectedGoal]);

  const loadData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Please log in');
        return;
      }

      // Get user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id, email, org_id, role')
        .eq('user_id', user.id)
        .single();

      if (userError || !userData) {
        setError('Failed to load user profile');
        return;
      }

      setUserProfile(userData as UserProfile);
      const isSysAdmin = ['system_admin', 'super_admin'].includes(userData.role);
      setIsSystemAdmin(isSysAdmin);

      // Load all prompts (system admins see all, others see their org + system defaults)
      let query = supabase
        .from('content_goal_prompts')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (!isSysAdmin) {
        query = query.or(`is_system_default.eq.true,org_id.eq.${userData.org_id}`);
      }

      const { data: promptsData, error: promptsError } = await query;

      if (promptsError) {
        throw promptsError;
      }

      setPrompts(promptsData as ContentGoalPrompt[] || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...prompts];

    // Filter by mode
    switch (filterMode) {
      case 'system':
        filtered = filtered.filter(p => p.is_system_default);
        break;
      case 'org':
        filtered = filtered.filter(p => !p.is_system_default && p.org_id);
        break;
      case 'active':
        filtered = filtered.filter(p => p.is_active);
        break;
      case 'inactive':
        filtered = filtered.filter(p => !p.is_active);
        break;
    }

    // Filter by goal
    if (selectedGoal !== 'all') {
      filtered = filtered.filter(p => p.content_goal === selectedGoal);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.prompt_title.toLowerCase().includes(query) ||
        p.system_prompt.toLowerCase().includes(query) ||
        p.content_goal.toLowerCase().includes(query)
      );
    }

    setFilteredPrompts(filtered);
  };

  const handleSavePrompt = async (promptData: Partial<ContentGoalPrompt>) => {
    if (!userProfile) {
      setError('User profile not loaded');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const supabase = createClient();

      if (editingPrompt?.prompt_id) {
        // Update existing
        const updateData: any = {
          prompt_title: promptData.prompt_title,
          system_prompt: promptData.system_prompt,
          user_prompt_template: promptData.user_prompt_template,
          instructions: promptData.instructions,
          priority: promptData.priority,
          is_active: promptData.is_active,
          updated_at: new Date().toISOString()
        };

        // Only system admins can update system defaults
        if (isSystemAdmin && promptData.is_system_default) {
          updateData.is_system_default = true;
        }

        const { error: updateError } = await supabase
          .from('content_goal_prompts')
          .update(updateData)
          .eq('prompt_id', editingPrompt.prompt_id);

        if (updateError) throw updateError;
      } else {
        // Create new
        const insertData: any = {
          ...promptData,
          org_id: promptData.is_system_default ? null : userProfile.org_id,
          created_by: userProfile.user_id,
          is_active: promptData.is_active !== false,
        };

        const { error: insertError } = await supabase
          .from('content_goal_prompts')
          .insert(insertData);

        if (insertError) throw insertError;
      }

      await loadData();
      setShowModal(false);
      setEditingPrompt(null);
      setSuccess('Prompt saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving prompt:', err);
      setError(err.message || 'Failed to save prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePrompt = async (prompt: ContentGoalPrompt) => {
    if (!confirm(`Are you sure you want to delete "${prompt.prompt_title}"?`)) {
      return;
    }

    try {
      setSaving(true);
      const supabase = createClient();

      const { error } = await supabase
        .from('content_goal_prompts')
        .delete()
        .eq('prompt_id', prompt.prompt_id);

      if (error) throw error;

      await loadData();
      setSuccess('Prompt deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting prompt:', err);
      setError(err.message || 'Failed to delete prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (prompt: ContentGoalPrompt) => {
    try {
      setSaving(true);
      const supabase = createClient();

      const { error } = await supabase
        .from('content_goal_prompts')
        .update({ is_active: !prompt.is_active })
        .eq('prompt_id', prompt.prompt_id);

      if (error) throw error;

      await loadData();
      setSuccess(`Prompt ${!prompt.is_active ? 'activated' : 'deactivated'}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error toggling prompt:', err);
      setError(err.message || 'Failed to toggle prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleClonePrompt = (prompt: ContentGoalPrompt) => {
    setEditingPrompt({
      ...prompt,
      prompt_id: '', // Clear ID for new prompt
      prompt_title: `${prompt.prompt_title} (Copy)`,
      is_system_default: false,
      org_id: userProfile?.org_id
    } as ContentGoalPrompt);
    setShowModal(true);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(filteredPrompts, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `content-prompts-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Content Goal Prompts
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage AI instructions for content generation
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingPrompt(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Prompt
          </button>
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

      {/* Filters & Search */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Goal Filter */}
          <select
            value={selectedGoal}
            onChange={(e) => setSelectedGoal(e.target.value as ContentGoal | 'all')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Goals</option>
            {Object.entries(contentGoalConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          {/* Mode Filter */}
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as FilterMode)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Prompts</option>
            <option value="system">System Defaults</option>
            <option value="org">Organization</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Prompts"
          value={prompts.length}
          icon={<Settings className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          label="System Defaults"
          value={prompts.filter(p => p.is_system_default).length}
          icon={<Globe className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          label="Organization"
          value={prompts.filter(p => !p.is_system_default && p.org_id).length}
          icon={<Users className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          label="Active"
          value={prompts.filter(p => p.is_active).length}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="teal"
        />
      </div>

      {/* Prompts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Prompt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Goal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPrompts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No prompts found
                  </td>
                </tr>
              ) : (
                filteredPrompts.map((prompt) => (
                  <PromptRow
                    key={prompt.prompt_id}
                    prompt={prompt}
                    onEdit={() => {
                      setEditingPrompt(prompt);
                      setShowModal(true);
                    }}
                    onDelete={() => handleDeletePrompt(prompt)}
                    onToggleActive={() => handleToggleActive(prompt)}
                    onClone={() => handleClonePrompt(prompt)}
                    isSystemAdmin={isSystemAdmin}
                    canEdit={isSystemAdmin || (!prompt.is_system_default && prompt.org_id === userProfile?.org_id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Create Modal */}
      {showModal && (
        <PromptModal
          prompt={editingPrompt}
          onSave={handleSavePrompt}
          onClose={() => {
            setShowModal(false);
            setEditingPrompt(null);
          }}
          saving={saving}
          isSystemAdmin={isSystemAdmin}
        />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    teal: 'bg-teal-100 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Prompt Row Component
function PromptRow({
  prompt,
  onEdit,
  onDelete,
  onToggleActive,
  onClone,
  isSystemAdmin,
  canEdit
}: {
  prompt: ContentGoalPrompt;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onClone: () => void;
  isSystemAdmin: boolean;
  canEdit: boolean;
}) {
  const config = contentGoalConfig[prompt.content_goal];

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <td className="px-6 py-4">
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {prompt.prompt_title}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
            {prompt.system_prompt.substring(0, 100)}...
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${config.color}-100 dark:bg-${config.color}-900/20 text-${config.color}-600 dark:text-${config.color}-400`}>
            {config.icon}
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {config.label}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        {prompt.is_system_default ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded">
            <Globe className="w-3 h-3" />
            System Default
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded">
            <Users className="w-3 h-3" />
            Organization
          </span>
        )}
      </td>
      <td className="px-6 py-4">
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {prompt.priority}
        </span>
      </td>
      <td className="px-6 py-4">
        {prompt.is_active ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
            <AlertCircle className="w-3 h-3" />
            Inactive
          </span>
        )}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onToggleActive}
            className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            title={prompt.is_active ? 'Deactivate' : 'Activate'}
          >
            {prompt.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={onClone}
            className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            title="Clone"
          >
            <Copy className="w-4 h-4" />
          </button>
          {canEdit && (
            <>
              <button
                onClick={onEdit}
                className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// Prompt Modal Component
function PromptModal({
  prompt,
  onSave,
  onClose,
  saving,
  isSystemAdmin
}: {
  prompt: ContentGoalPrompt | null;
  onSave: (data: Partial<ContentGoalPrompt>) => void;
  onClose: () => void;
  saving: boolean;
  isSystemAdmin: boolean;
}) {
  const [formData, setFormData] = useState<Partial<ContentGoalPrompt>>({
    content_goal: prompt?.content_goal || 'seo',
    prompt_title: prompt?.prompt_title || '',
    system_prompt: prompt?.system_prompt || '',
    user_prompt_template: prompt?.user_prompt_template || '',
    priority: prompt?.priority || 0,
    is_active: prompt?.is_active !== false,
    is_system_default: prompt?.is_system_default || false,
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {prompt?.prompt_id ? 'Edit Prompt' : 'Create New Prompt'}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content Goal <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.content_goal}
                onChange={(e) => setFormData({ ...formData, content_goal: e.target.value as ContentGoal })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {Object.entries(contentGoalConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prompt Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.prompt_title}
              onChange={(e) => setFormData({ ...formData, prompt_title: e.target.value })}
              placeholder="e.g., SEO & Rankings - Custom"
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
              Length: {formData.system_prompt?.length || 0} characters
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

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
            </label>

            {isSystemAdmin && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_system_default}
                  onChange={(e) => setFormData({ ...formData, is_system_default: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">System Default</span>
              </label>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            disabled={saving || !formData.prompt_title || !formData.system_prompt}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Prompt'}
          </button>
        </div>
      </div>
    </div>
  );
}
