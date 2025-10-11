"use client";

import { useState } from "react";
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CogIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

export default function WorkflowsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([]);

  // Mock workflow data
  const workflows = [
    {
      id: "1",
      name: "Standard Blog Post Review",
      description: "Standard workflow for reviewing and publishing blog posts with editor approval.",
      status: "active",
      created: "2024-01-15T10:30:00Z",
      createdBy: "Sarah Johnson",
      lastRun: "2024-01-15T14:30:00Z",
      runsCount: 47,
      successRate: 95,
      steps: [
        { id: "1", name: "Draft Submission", type: "trigger", status: "completed" },
        { id: "2", name: "Editor Review", type: "approval", status: "pending", assignedTo: "Mike Chen" },
        { id: "3", name: "SEO Check", type: "automated", status: "completed" },
        { id: "4", name: "Final Approval", type: "approval", status: "pending", assignedTo: "Sarah Johnson" },
        { id: "5", name: "Publish", type: "action", status: "pending" }
      ],
      triggers: ["draft_submitted"],
      actions: ["send_notification", "publish_post"]
    },
    {
      id: "2",
      name: "Guest Post Approval",
      description: "Workflow for managing guest post submissions with multiple review stages.",
      status: "active",
      created: "2024-01-14T15:45:00Z",
      createdBy: "Mike Chen",
      lastRun: "2024-01-14T16:20:00Z",
      runsCount: 23,
      successRate: 87,
      steps: [
        { id: "1", name: "Guest Submission", type: "trigger", status: "completed" },
        { id: "2", name: "Initial Review", type: "approval", status: "completed", assignedTo: "Emma Davis" },
        { id: "3", name: "Content Check", type: "automated", status: "completed" },
        { id: "4", name: "Editor Review", type: "approval", status: "in_progress", assignedTo: "Mike Chen" },
        { id: "5", name: "Final Approval", type: "approval", status: "pending", assignedTo: "Sarah Johnson" },
        { id: "6", name: "Schedule Publication", type: "action", status: "pending" }
      ],
      triggers: ["guest_post_submitted"],
      actions: ["send_notification", "schedule_post"]
    },
    {
      id: "3",
      name: "Content Quality Check",
      description: "Automated workflow for checking content quality and SEO optimization.",
      status: "paused",
      created: "2024-01-13T09:20:00Z",
      createdBy: "Emma Davis",
      lastRun: "2024-01-12T11:15:00Z",
      runsCount: 156,
      successRate: 92,
      steps: [
        { id: "1", name: "Content Created", type: "trigger", status: "completed" },
        { id: "2", name: "SEO Analysis", type: "automated", status: "completed" },
        { id: "3", name: "Readability Check", type: "automated", status: "completed" },
        { id: "4", name: "Plagiarism Check", type: "automated", status: "completed" },
        { id: "5", name: "Quality Report", type: "action", status: "completed" }
      ],
      triggers: ["content_created"],
      actions: ["generate_report", "send_notification"]
    },
    {
      id: "4",
      name: "Social Media Publishing",
      description: "Workflow for automatically publishing content to social media platforms.",
      status: "active",
      created: "2024-01-12T14:15:00Z",
      createdBy: "Alex Rodriguez",
      lastRun: "2024-01-15T09:30:00Z",
      runsCount: 89,
      successRate: 98,
      steps: [
        { id: "1", name: "Post Published", type: "trigger", status: "completed" },
        { id: "2", name: "Extract Content", type: "automated", status: "completed" },
        { id: "3", name: "Format for Social", type: "automated", status: "completed" },
        { id: "4", name: "Publish to Twitter", type: "action", status: "completed" },
        { id: "5", name: "Publish to LinkedIn", type: "action", status: "completed" },
        { id: "6", name: "Publish to Facebook", type: "action", status: "completed" }
      ],
      triggers: ["post_published"],
      actions: ["publish_social", "send_notification"]
    },
    {
      id: "5",
      name: "Content Archival",
      description: "Workflow for archiving old content and updating sitemaps.",
      status: "draft",
      created: "2024-01-11T11:30:00Z",
      createdBy: "Sarah Johnson",
      lastRun: null,
      runsCount: 0,
      successRate: 0,
      steps: [
        { id: "1", name: "Content Age Check", type: "trigger", status: "pending" },
        { id: "2", name: "Archive Content", type: "action", status: "pending" },
        { id: "3", name: "Update Sitemap", type: "action", status: "pending" },
        { id: "4", name: "Notify Team", type: "action", status: "pending" }
      ],
      triggers: ["content_aged"],
      actions: ["archive_content", "update_sitemap", "send_notification"]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "paused": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "draft": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "error": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "in_progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "pending": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "failed": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStepTypeIcon = (type: string) => {
    switch (type) {
      case "trigger": return <PlayIcon className="w-4 h-4" />;
      case "approval": return <UserIcon className="w-4 h-4" />;
      case "automated": return <CogIcon className="w-4 h-4" />;
      case "action": return <ArrowPathIcon className="w-4 h-4" />;
      default: return <DocumentTextIcon className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === "all" || workflow.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleSelectWorkflow = (workflowId: string) => {
    setSelectedWorkflows(prev => 
      prev.includes(workflowId) 
        ? prev.filter(id => id !== workflowId)
        : [...prev, workflowId]
    );
  };


  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Workflow Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Create and manage automated workflows for content approval, publishing, and collaboration
            </p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <PlusIcon className="w-5 h-5" />
            Create Workflow
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Workflows</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">12</p>
            </div>
            <ArrowPathIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">8</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Runs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">315</p>
            </div>
            <PlayIcon className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">94%</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search workflows by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-gray-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="draft">Draft</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Workflows List */}
      <div className="space-y-6">
        {filteredWorkflows.map((workflow) => (
          <div
            key={workflow.id}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${
              selectedWorkflows.includes(workflow.id) ? "ring-2 ring-blue-500" : ""
            }`}
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedWorkflows.includes(workflow.id)}
                    onChange={() => handleSelectWorkflow(workflow.id)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {workflow.name}
                      </h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(workflow.status)}`}>
                        {workflow.status.charAt(0).toUpperCase() + workflow.status.slice(1)}
                      </span>
                      {workflow.status === "active" && (
                        <CheckCircleIcon className="w-5 h-5 text-green-500" />
                      )}
                      {workflow.status === "paused" && (
                        <PauseIcon className="w-5 h-5 text-yellow-500" />
                      )}
                      {workflow.status === "error" && (
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {workflow.description}
                    </p>
                    
                    {/* Workflow Steps */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Workflow Steps</h4>
                      <div className="flex items-center space-x-2 overflow-x-auto">
                        {workflow.steps.map((step, index) => (
                          <div key={step.id} className="flex items-center">
                            <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2 min-w-0">
                              <div className={`p-1 rounded ${getStepStatusColor(step.status)}`}>
                                {getStepTypeIcon(step.type)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                  {step.name}
                                </div>
                                {'assignedTo' in step && step.assignedTo && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {step.assignedTo}
                                  </div>
                                )}
                              </div>
                            </div>
                            {index < workflow.steps.length - 1 && (
                              <div className="w-4 h-0.5 bg-gray-300 dark:bg-gray-600 mx-2"></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Workflow Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Runs:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{workflow.runsCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Success Rate:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{workflow.successRate}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Last Run:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{formatDate(workflow.lastRun)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Created by:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{workflow.createdBy}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2">
                    <EyeIcon className="w-5 h-5" />
                  </button>
                  <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2">
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  {workflow.status === "active" ? (
                    <button className="text-yellow-600 hover:text-yellow-700 p-2">
                      <PauseIcon className="w-5 h-5" />
                    </button>
                  ) : (
                    <button className="text-green-600 hover:text-green-700 p-2">
                      <PlayIcon className="w-5 h-5" />
                    </button>
                  )}
                  <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2">
                    <ShareIcon className="w-5 h-5" />
                  </button>
                  <button className="text-gray-400 hover:text-red-600 p-2">
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk Actions */}
      {selectedWorkflows.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-6 py-3 mt-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800 dark:text-blue-200">
              {selectedWorkflows.length} workflow{selectedWorkflows.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium">
                Activate
              </button>
              <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium">
                Pause
              </button>
              <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium">
                Export
              </button>
              <button className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 font-medium">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Templates */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Workflow Templates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <DocumentTextIcon className="w-8 h-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Content Review</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Editor approval workflow</span>
          </button>
          
          <button className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <ShareIcon className="w-8 h-8 text-green-600 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Social Publishing</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Auto-publish to social media</span>
          </button>
          
          <button className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <UserIcon className="w-8 h-8 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Guest Post</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Guest content approval</span>
          </button>
          
          <button className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <CogIcon className="w-8 h-8 text-orange-600 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Quality Check</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Automated content analysis</span>
          </button>
          
          <button className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <ClockIcon className="w-8 h-8 text-red-600 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Scheduling</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Content scheduling workflow</span>
          </button>
          
          <button className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <ArrowPathIcon className="w-8 h-8 text-indigo-600 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Custom</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Build your own workflow</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredWorkflows.length === 0 && (
        <div className="text-center py-12">
          <ArrowPathIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No workflows found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || selectedStatus !== "all"
              ? "Try adjusting your search or filter criteria."
              : "Get started by creating your first workflow."
            }
          </p>
          {(!searchTerm && selectedStatus === "all") && (
            <div className="mt-6">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors">
                <PlusIcon className="w-5 h-5" />
                Create Workflow
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
