"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FolderOpen, 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  User,
  Search,
  Filter,
  X,
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  Lightbulb,
  BookOpen,
  Settings,
  ArrowRight
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Alert from '@/components/ui/alert/Alert';
import { Modal } from '@/components/ui/modal';

interface WorkflowSession {
  session_id: string;
  objective: string | null;
  target_audience: string | null;
  industry: string | null;
  current_step: string;
  completed_steps: string[];
  workflow_data: {
    content_goal?: string;
    search_query?: string;
    saved_content_ideas?: any[];
    selected_topics?: any[];
    content_strategy?: any;
    saved_clusters?: any[];
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
  created_by: string;
}

export default function WorkflowManagePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowSession[]>([]);
  const [filteredWorkflows, setFilteredWorkflows] = useState<WorkflowSession[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStep, setFilterStep] = useState<string>('all');
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowSession | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, []);

  useEffect(() => {
    filterWorkflows();
  }, [workflows, searchTerm, filterStep]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Please log in to view workflows');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('workflow_sessions')
        .select('*')
        .order('updated_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setWorkflows(data || []);
    } catch (err: any) {
      console.error('Error loading workflows:', err);
      setError(err.message || 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const filterWorkflows = () => {
    let filtered = [...workflows];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(w => 
        w.objective?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.target_audience?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by step
    if (filterStep !== 'all') {
      filtered = filtered.filter(w => w.current_step === filterStep);
    }

    setFilteredWorkflows(filtered);
  };

  const handleDelete = async (sessionId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('workflow_sessions')
        .delete()
        .eq('session_id', sessionId);

      if (error) throw error;

      setWorkflows(workflows.filter(w => w.session_id !== sessionId));
      setShowDeleteModal(null);
    } catch (err: any) {
      console.error('Error deleting workflow:', err);
      setError(err.message || 'Failed to delete workflow');
    }
  };

  const handleEdit = (workflow: WorkflowSession) => {
    setEditingWorkflow(workflow);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingWorkflow) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('workflow_sessions')
        .update({
          objective: editingWorkflow.objective,
          target_audience: editingWorkflow.target_audience,
          industry: editingWorkflow.industry,
          workflow_data: editingWorkflow.workflow_data,
          updated_at: new Date().toISOString()
        })
        .eq('session_id', editingWorkflow.session_id);

      if (error) throw error;

      setWorkflows(workflows.map(w => 
        w.session_id === editingWorkflow.session_id ? editingWorkflow : w
      ));
      setShowEditModal(false);
      setEditingWorkflow(null);
    } catch (err: any) {
      console.error('Error updating workflow:', err);
      setError(err.message || 'Failed to update workflow');
    }
  };

  const handleResume = (sessionId: string) => {
    localStorage.setItem('workflow_session_id', sessionId);
    router.push('/admin/workflow/objective');
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'objective': return <Target className="w-4 h-4" />;
      case 'keywords': return <Search className="w-4 h-4" />;
      case 'clusters': return <Layers className="w-4 h-4" />;
      case 'ideas': return <Lightbulb className="w-4 h-4" />;
      case 'topics': return <BookOpen className="w-4 h-4" />;
      case 'strategy': return <Settings className="w-4 h-4" />;
      case 'editor': return <FileText className="w-4 h-4" />;
      default: return <FolderOpen className="w-4 h-4" />;
    }
  };

  const getStepLabel = (step: string) => {
    const labels: Record<string, string> = {
      objective: 'Objective',
      keywords: 'Keywords',
      clusters: 'Clusters',
      ideas: 'Content Ideas',
      topics: 'Topic Suggestions',
      strategy: 'Content Strategy',
      editor: 'Content Editor'
    };
    return labels[step] || step;
  };

  const getDataSummary = (workflow: WorkflowSession) => {
    const data = workflow.workflow_data || {};
    const summary = [];
    
    if (data.saved_content_ideas?.length) {
      summary.push(`${data.saved_content_ideas.length} ideas`);
    }
    if (data.selected_topics?.length) {
      summary.push(`${data.selected_topics.length} topics`);
    }
    if (data.saved_clusters?.length) {
      summary.push(`${data.saved_clusters.length} clusters`);
    }
    if (data.content_strategy) {
      summary.push('Strategy');
    }
    
    return summary.length > 0 ? summary.join(', ') : 'No data saved';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Manage Workflows
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              View, edit, delete, and resume your saved workflows
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/workflow/objective')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <FolderOpen className="w-4 h-4" />
            New Workflow
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <select
              value={filterStep}
              onChange={(e) => setFilterStep(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Steps</option>
              <option value="objective">Objective</option>
              <option value="keywords">Keywords</option>
              <option value="clusters">Clusters</option>
              <option value="ideas">Content Ideas</option>
              <option value="topics">Topic Suggestions</option>
              <option value="strategy">Content Strategy</option>
              <option value="editor">Content Editor</option>
            </select>
          </div>
        </div>

        {error && (
          <Alert variant="error" title="Error" message={error} />
        )}

        {/* Workflows List */}
        {filteredWorkflows.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No workflows found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchTerm || filterStep !== 'all' 
                ? 'Try adjusting your filters'
                : 'Start a new workflow to get started'}
            </p>
            {!searchTerm && filterStep === 'all' && (
              <button
                onClick={() => router.push('/admin/workflow/objective')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create New Workflow
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredWorkflows.map((workflow) => (
              <div
                key={workflow.session_id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStepIcon(workflow.current_step)}
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {workflow.objective || 'Untitled Workflow'}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        workflow.current_step === 'editor' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {getStepLabel(workflow.current_step)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        <span><strong>Industry:</strong> {workflow.industry || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span><strong>Audience:</strong> {workflow.target_audience || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span><strong>Updated:</strong> {new Date(workflow.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Saved Data:</strong> {getDataSummary(workflow)}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {workflow.completed_steps.map((step) => (
                          <span
                            key={step}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            {getStepLabel(step)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleResume(workflow.session_id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Resume workflow"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(workflow)}
                      className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Edit workflow"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(workflow.session_id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete workflow"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingWorkflow(null);
        }}
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Edit Workflow
          </h2>
          {editingWorkflow && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Objective
                </label>
                <input
                  type="text"
                  value={editingWorkflow.objective || ''}
                  onChange={(e) => setEditingWorkflow({
                    ...editingWorkflow,
                    objective: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Industry
                </label>
                <input
                  type="text"
                  value={editingWorkflow.industry || ''}
                  onChange={(e) => setEditingWorkflow({
                    ...editingWorkflow,
                    industry: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Audience
                </label>
                <input
                  type="text"
                  value={editingWorkflow.target_audience || ''}
                  onChange={(e) => setEditingWorkflow({
                    ...editingWorkflow,
                    target_audience: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingWorkflow(null);
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal !== null}
        onClose={() => setShowDeleteModal(null)}
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Delete Workflow
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Are you sure you want to delete this workflow? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setShowDeleteModal(null)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => showDeleteModal && handleDelete(showDeleteModal)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

