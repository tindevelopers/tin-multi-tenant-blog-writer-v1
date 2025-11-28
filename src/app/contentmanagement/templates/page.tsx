"use client";

import { useState } from "react";
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  StarIcon,
  DocumentTextIcon,
  CodeBracketIcon
} from "@heroicons/react/24/outline";

export default function TemplatesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Mock template data
  const templates = [
    {
      id: "1",
      name: "Product Review Template",
      description: "A comprehensive template for reviewing products with sections for pros, cons, and recommendations.",
      category: "review",
      type: "blog-post",
      thumbnail: "/images/cards/card-01.jpg",
      created: "2024-01-15T10:30:00Z",
      createdBy: "Sarah Johnson",
      tags: ["product", "review", "ecommerce"],
      usageCount: 47,
      rating: 4.8,
      isPublic: true,
      wordCount: 1200,
      sections: ["header", "product-overview", "pros-cons", "conclusion"]
    },
    {
      id: "2",
      name: "How-to Guide Template",
      description: "Step-by-step guide template with clear instructions and visual placeholders for screenshots.",
      category: "tutorial",
      type: "blog-post",
      thumbnail: "/images/cards/card-02.jpg",
      created: "2024-01-14T15:45:00Z",
      createdBy: "Mike Chen",
      tags: ["tutorial", "how-to", "guide"],
      usageCount: 32,
      rating: 4.6,
      isPublic: true,
      wordCount: 800,
      sections: ["introduction", "prerequisites", "steps", "troubleshooting"]
    },
    {
      id: "3",
      name: "Newsletter Template",
      description: "Professional newsletter template with sections for updates, featured content, and call-to-action.",
      category: "newsletter",
      type: "email",
      thumbnail: "/images/cards/card-03.jpg",
      created: "2024-01-13T09:20:00Z",
      createdBy: "Emma Davis",
      tags: ["newsletter", "email", "marketing"],
      usageCount: 28,
      rating: 4.7,
      isPublic: false,
      wordCount: 600,
      sections: ["header", "updates", "featured", "cta"]
    },
    {
      id: "4",
      name: "Case Study Template",
      description: "Detailed case study template for showcasing client success stories and project outcomes.",
      category: "case-study",
      type: "blog-post",
      thumbnail: "/images/cards/card-01.jpg",
      created: "2024-01-12T14:15:00Z",
      createdBy: "Alex Rodriguez",
      tags: ["case-study", "business", "success"],
      usageCount: 19,
      rating: 4.9,
      isPublic: true,
      wordCount: 1500,
      sections: ["challenge", "solution", "results", "testimonial"]
    },
    {
      id: "5",
      name: "Social Media Post Template",
      description: "Versatile template for creating engaging social media posts across different platforms.",
      category: "social",
      type: "social-post",
      thumbnail: "/images/cards/card-02.jpg",
      created: "2024-01-11T11:30:00Z",
      createdBy: "Sarah Johnson",
      tags: ["social", "marketing", "engagement"],
      usageCount: 73,
      rating: 4.5,
      isPublic: true,
      wordCount: 150,
      sections: ["hook", "content", "cta", "hashtags"]
    },
    {
      id: "6",
      name: "Press Release Template",
      description: "Professional press release template following industry standards and best practices.",
      category: "press",
      type: "press-release",
      thumbnail: "/images/cards/card-03.jpg",
      created: "2024-01-10T16:20:00Z",
      createdBy: "Mike Chen",
      tags: ["press", "announcement", "pr"],
      usageCount: 12,
      rating: 4.8,
      isPublic: false,
      wordCount: 400,
      sections: ["headline", "dateline", "body", "boilerplate"]
    }
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "review": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "tutorial": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "newsletter": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "case-study": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "social": return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
      case "press": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "blog-post": return <DocumentTextIcon className="w-4 h-4" />;
      case "email": return <DocumentDuplicateIcon className="w-4 h-4" />;
      case "social-post": return <ShareIcon className="w-4 h-4" />;
      case "press-release": return <DocumentTextIcon className="w-4 h-4" />;
      default: return <DocumentTextIcon className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleSelectAll = () => {
    setSelectedTemplates(
      selectedTemplates.length === filteredTemplates.length 
        ? [] 
        : filteredTemplates.map(template => template.id)
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Content Templates
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Create, manage, and share reusable content templates for consistent and efficient content creation
            </p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <PlusIcon className="w-5 h-5" />
            Create Template
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Templates</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">24</p>
            </div>
            <DocumentDuplicateIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Public Templates</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">18</p>
            </div>
            <ShareIcon className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Usage</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">347</p>
            </div>
            <EyeIcon className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Rating</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">4.7</p>
            </div>
            <StarIcon className="w-8 h-8 text-yellow-600" />
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
              placeholder="Search templates by name, description, or tags..."
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
                <option value="review">Review</option>
                <option value="tutorial">Tutorial</option>
                <option value="newsletter">Newsletter</option>
                <option value="case-study">Case Study</option>
                <option value="social">Social Media</option>
                <option value="press">Press Release</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg ${viewMode === "list" ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Templates Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                selectedTemplates.includes(template.id) ? "ring-2 ring-blue-500" : ""
              }`}
              onClick={() => handleSelectTemplate(template.id)}
            >
              <div className="aspect-video relative bg-gray-100 dark:bg-gray-700">
                <img
                  src={template.thumbnail}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
                
                <div className="absolute top-3 left-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                    {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                  </span>
                </div>
                
                <div className="absolute top-3 right-3">
                  <input
                    type="checkbox"
                    checked={selectedTemplates.includes(template.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectTemplate(template.id);
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                
                <div className="absolute bottom-3 right-3">
                  <div className="flex items-center gap-1 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
                    <StarIcon className="w-3 h-3 fill-current" />
                    {template.rating}
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
                    {template.name}
                  </h3>
                  <div className="flex items-center text-gray-400">
                    {getTypeIcon(template.type)}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {template.description}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <div className="flex items-center">
                    <UserIcon className="w-3 h-3 mr-1" />
                    {template.createdBy}
                  </div>
                  <div className="flex items-center">
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    {formatDate(template.created)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <EyeIcon className="w-3 h-3 mr-1" />
                    {template.usageCount} uses
                  </div>
                  <div className="flex items-center text-xs">
                    <span className={`px-2 py-1 rounded-full ${
                      template.isPublic 
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                    }`}>
                      {template.isPublic ? "Public" : "Private"}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1 mt-3">
                  {template.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      <TagIcon className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                  {template.tags.length > 3 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      +{template.tags.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedTemplates.length === filteredTemplates.length && filteredTemplates.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTemplates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedTemplates.includes(template.id)}
                        onChange={() => handleSelectTemplate(template.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-16">
                          <img
                            src={template.thumbnail}
                            alt={template.name}
                            className="h-12 w-16 rounded object-cover"
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {template.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                            {template.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(template.category)}`}>
                        {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-900 dark:text-white">
                        {getTypeIcon(template.type)}
                        <span className="ml-2">{template.type.replace('-', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {template.usageCount}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <StarIcon className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                        <span className="text-sm text-gray-900 dark:text-white">{template.rating}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(template.created)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
                          <DocumentDuplicateIcon className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
                          <ShareIcon className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-red-600 p-1">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedTemplates.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-6 py-3 mt-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800 dark:text-blue-200">
              {selectedTemplates.length} template{selectedTemplates.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium">
                Duplicate
              </button>
              <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium">
                Export
              </button>
              <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium">
                Share
              </button>
              <button className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 font-medium">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Builder Quick Actions */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Template Builder
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex items-center justify-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <DocumentTextIcon className="w-6 h-6 mr-3 text-blue-600" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Blog Post</span>
          </button>
          
          <button className="flex items-center justify-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <DocumentDuplicateIcon className="w-6 h-6 mr-3 text-green-600" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Email</span>
          </button>
          
          <button className="flex items-center justify-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <ShareIcon className="w-6 h-6 mr-3 text-purple-600" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Social Post</span>
          </button>
          
          <button className="flex items-center justify-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <CodeBracketIcon className="w-6 h-6 mr-3 text-orange-600" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Custom</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <DocumentDuplicateIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No templates found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || selectedCategory !== "all"
              ? "Try adjusting your search or filter criteria."
              : "Get started by creating your first content template."
            }
          </p>
          {(!searchTerm && selectedCategory === "all") && (
            <div className="mt-6">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors">
                <PlusIcon className="w-5 h-5" />
                Create Template
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
