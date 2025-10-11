"use client";

import { useState } from "react";
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  LinkIcon,
  KeyIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  CalendarIcon,
  CogIcon,
  CloudIcon,
  ChatBubbleLeftRightIcon,
  PhotoIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ShoppingCartIcon
} from "@heroicons/react/24/outline";

export default function IntegrationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);

  // Mock integrations data
  const integrations = [
    {
      id: "1",
      name: "Google Analytics",
      description: "Track website traffic and user behavior with detailed analytics and reporting.",
      category: "analytics",
      status: "connected",
      icon: "/images/brand/brand-01.svg",
      connectedDate: "2024-01-15T10:30:00Z",
      lastSync: "2024-01-15T14:30:00Z",
      apiKey: "ga_****_****_****_****_****",
      endpoints: ["/analytics/overview", "/analytics/reports", "/analytics/events"],
      syncFrequency: "real-time",
      permissions: ["read_analytics", "read_reports"],
      healthStatus: "healthy"
    },
    {
      id: "2",
      name: "WordPress",
      description: "Publish content directly to your WordPress website with automatic formatting.",
      category: "cms",
      status: "connected",
      icon: "/images/brand/brand-02.svg",
      connectedDate: "2024-01-14T15:45:00Z",
      lastSync: "2024-01-15T09:15:00Z",
      apiKey: "wp_****_****_****_****_****",
      endpoints: ["/posts", "/media", "/categories", "/tags"],
      syncFrequency: "on-demand",
      permissions: ["create_posts", "upload_media", "manage_categories"],
      healthStatus: "healthy"
    },
    {
      id: "3",
      name: "Mailchimp",
      description: "Sync your blog subscribers and send automated email campaigns.",
      category: "email",
      status: "connected",
      icon: "/images/brand/brand-03.svg",
      connectedDate: "2024-01-13T09:20:00Z",
      lastSync: "2024-01-14T16:45:00Z",
      apiKey: "mc_****_****_****_****_****",
      endpoints: ["/lists", "/campaigns", "/subscribers", "/automation"],
      syncFrequency: "daily",
      permissions: ["read_lists", "create_campaigns", "manage_subscribers"],
      healthStatus: "warning"
    },
    {
      id: "4",
      name: "Twitter API",
      description: "Automatically share your blog posts on Twitter with custom formatting.",
      category: "social",
      status: "connected",
      icon: "/images/brand/brand-04.svg",
      connectedDate: "2024-01-12T14:15:00Z",
      lastSync: "2024-01-15T11:20:00Z",
      apiKey: "tw_****_****_****_****_****",
      endpoints: ["/tweets", "/user", "/media", "/followers"],
      syncFrequency: "real-time",
      permissions: ["read_tweets", "write_tweets", "read_user"],
      healthStatus: "healthy"
    },
    {
      id: "5",
      name: "LinkedIn",
      description: "Share professional content on LinkedIn with company page integration.",
      category: "social",
      status: "error",
      icon: "/images/brand/brand-05.svg",
      connectedDate: "2024-01-11T11:30:00Z",
      lastSync: "2024-01-12T08:30:00Z",
      apiKey: "li_****_****_****_****_****",
      endpoints: ["/posts", "/companies", "/people", "/shares"],
      syncFrequency: "hourly",
      permissions: ["read_posts", "write_posts", "read_companies"],
      healthStatus: "error"
    },
    {
      id: "6",
      name: "Slack",
      description: "Get notifications and collaborate with your team through Slack channels.",
      category: "communication",
      status: "pending",
      icon: "/images/brand/brand-06.svg",
      connectedDate: null,
      lastSync: null,
      apiKey: null,
      endpoints: ["/chat", "/channels", "/users", "/webhooks"],
      syncFrequency: "real-time",
      permissions: ["read_messages", "write_messages", "read_channels"],
      healthStatus: "unknown"
    },
    {
      id: "7",
      name: "Unsplash",
      description: "Access millions of high-quality stock photos for your blog content.",
      category: "media",
      status: "connected",
      icon: "/images/brand/brand-07.svg",
      connectedDate: "2024-01-10T16:20:00Z",
      lastSync: "2024-01-15T13:10:00Z",
      apiKey: "us_****_****_****_****_****",
      endpoints: ["/photos", "/search", "/collections", "/users"],
      syncFrequency: "on-demand",
      permissions: ["read_photos", "download_photos"],
      healthStatus: "healthy"
    },
    {
      id: "8",
      name: "Zapier",
      description: "Connect with 5000+ apps to automate your content workflows.",
      category: "automation",
      status: "connected",
      icon: "/images/brand/brand-08.svg",
      connectedDate: "2024-01-09T12:45:00Z",
      lastSync: "2024-01-15T10:30:00Z",
      apiKey: "zp_****_****_****_****_****",
      endpoints: ["/triggers", "/actions", "/webhooks", "/zaps"],
      syncFrequency: "real-time",
      permissions: ["create_zaps", "read_zaps", "manage_webhooks"],
      healthStatus: "healthy"
    },
    {
      id: "9",
      name: "Shopify",
      description: "Sync your blog content with Shopify store products and collections for seamless e-commerce integration.",
      category: "ecommerce",
      status: "connected",
      icon: "/images/brand/brand-09.svg",
      connectedDate: "2024-01-08T14:20:00Z",
      lastSync: "2024-01-15T12:45:00Z",
      apiKey: "sh_****_****_****_****_****",
      endpoints: ["/products", "/collections", "/orders", "/customers", "/inventory"],
      syncFrequency: "real-time",
      permissions: ["read_products", "write_products", "read_orders", "read_customers"],
      healthStatus: "healthy"
    },
    {
      id: "10",
      name: "Webflow",
      description: "Publish blog posts directly to your Webflow website with custom styling and responsive design.",
      category: "cms",
      status: "connected",
      icon: "/images/brand/brand-10.svg",
      connectedDate: "2024-01-07T10:15:00Z",
      lastSync: "2024-01-15T08:30:00Z",
      apiKey: "wf_****_****_****_****_****",
      endpoints: ["/sites", "/collections", "/items", "/assets", "/forms"],
      syncFrequency: "on-demand",
      permissions: ["read_sites", "write_items", "upload_assets", "read_forms"],
      healthStatus: "healthy"
    }
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "analytics": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "cms": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "email": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "social": return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
      case "communication": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "media": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
      case "automation": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "ecommerce": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "error": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "disconnected": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case "healthy": return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case "warning": return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case "error": return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default: return <ExclamationTriangleIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "analytics": return <ChartBarIcon className="w-5 h-5" />;
      case "cms": return <DocumentTextIcon className="w-5 h-5" />;
      case "email": return <ChatBubbleLeftRightIcon className="w-5 h-5" />;
      case "social": return <ShareIcon className="w-5 h-5" />;
      case "communication": return <ChatBubbleLeftRightIcon className="w-5 h-5" />;
      case "media": return <PhotoIcon className="w-5 h-5" />;
      case "automation": return <CogIcon className="w-5 h-5" />;
      case "ecommerce": return <ShoppingCartIcon className="w-5 h-5" />;
      default: return <LinkIcon className="w-5 h-5" />;
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

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || integration.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || integration.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleSelectIntegration = (integrationId: string) => {
    setSelectedIntegrations(prev => 
      prev.includes(integrationId) 
        ? prev.filter(id => id !== integrationId)
        : [...prev, integrationId]
    );
  };


  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Integrations
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Connect your blog writer with external services and APIs to streamline your content workflow
            </p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <PlusIcon className="w-5 h-5" />
            Add Integration
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Integrations</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">24</p>
            </div>
            <LinkIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Connected</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">18</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Syncs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">12</p>
            </div>
            <CloudIcon className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">API Calls Today</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">2,847</p>
            </div>
            <ChartBarIcon className="w-8 h-8 text-orange-600" />
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
              placeholder="Search integrations by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                <option value="analytics">Analytics</option>
                <option value="cms">CMS</option>
                <option value="email">Email</option>
                <option value="social">Social Media</option>
                <option value="communication">Communication</option>
                <option value="media">Media</option>
                <option value="automation">Automation</option>
                <option value="ecommerce">E-commerce</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="connected">Connected</option>
                <option value="pending">Pending</option>
                <option value="error">Error</option>
                <option value="disconnected">Disconnected</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {filteredIntegrations.map((integration) => (
          <div
            key={integration.id}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all hover:shadow-md ${
              selectedIntegrations.includes(integration.id) ? "ring-2 ring-blue-500" : ""
            }`}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <img
                      src={integration.icon}
                      alt={integration.name}
                      className="w-8 h-8"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {integration.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(integration.category)}`}>
                        {getCategoryIcon(integration.category)}
                        <span className="ml-1">{integration.category}</span>
                      </span>
                    </div>
                  </div>
                </div>
                
                <input
                  type="checkbox"
                  checked={selectedIntegrations.includes(integration.id)}
                  onChange={() => handleSelectIntegration(integration.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                {integration.description}
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(integration.status)}`}>
                      {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
                    </span>
                    {getHealthIcon(integration.healthStatus)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Sync Frequency</span>
                  <span className="text-sm text-gray-900 dark:text-white">{integration.syncFrequency}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Last Sync</span>
                  <span className="text-sm text-gray-900 dark:text-white">{formatDate(integration.lastSync)}</span>
                </div>
                
                {integration.apiKey && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">API Key</span>
                    <div className="flex items-center gap-2">
                      <KeyIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white font-mono">
                        {integration.apiKey}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {integration.endpoints.length} endpoints
                  </span>
                  <div className="flex items-center gap-2">
                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-red-600 p-1">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk Actions */}
      {selectedIntegrations.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-6 py-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800 dark:text-blue-200">
              {selectedIntegrations.length} integration{selectedIntegrations.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium">
                Test Connection
              </button>
              <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium">
                Sync Now
              </button>
              <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium">
                Export Config
              </button>
              <button className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 font-medium">
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Available Integrations */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Available Integrations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <ChartBarIcon className="w-8 h-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Google Analytics</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Analytics & Reports</span>
          </button>
          
          <button className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <DocumentTextIcon className="w-8 h-8 text-green-600 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">WordPress</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">CMS Integration</span>
          </button>
          
          <button className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <ShareIcon className="w-8 h-8 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Social Media</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Auto-publishing</span>
          </button>
          
          <button className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <CogIcon className="w-8 h-8 text-orange-600 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Zapier</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Workflow Automation</span>
          </button>
          
          <button className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <PhotoIcon className="w-8 h-8 text-indigo-600 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Unsplash</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Stock Photos</span>
          </button>
          
          <button className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <ChatBubbleLeftRightIcon className="w-8 h-8 text-pink-600 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Slack</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Team Notifications</span>
          </button>
          
          <button className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <CalendarIcon className="w-8 h-8 text-red-600 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Google Calendar</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Content Scheduling</span>
          </button>
          
          <button className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <LinkIcon className="w-8 h-8 text-gray-600 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Custom API</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Connect your own</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredIntegrations.length === 0 && (
        <div className="text-center py-12">
          <LinkIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No integrations found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || selectedCategory !== "all" || selectedStatus !== "all"
              ? "Try adjusting your search or filter criteria."
              : "Get started by connecting your first integration."
            }
          </p>
          {(!searchTerm && selectedCategory === "all" && selectedStatus === "all") && (
            <div className="mt-6">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors">
                <PlusIcon className="w-5 h-5" />
                Add Integration
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
