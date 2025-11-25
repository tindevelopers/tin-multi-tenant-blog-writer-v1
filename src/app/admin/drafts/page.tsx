"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDrafts, useBlogPostMutations } from "@/hooks/useBlogPosts";
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  DocumentTextIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  DocumentIcon,
  CheckCircleIcon,
  BookOpenIcon,
  ChartBarIcon
} from "@heroicons/react/24/outline";

export default function DraftsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedDrafts, setSelectedDrafts] = useState<string[]>([]);

  // Get real draft data from Supabase
  const { posts: drafts, loading, error, refetch } = useDrafts();
  const { deletePost } = useBlogPostMutations();

  // Calculate stats from real data
  const stats = {
    totalDrafts: drafts.length,
    inReview: drafts.filter(d => d.status === 'scheduled').length, // Scheduled posts are "in review"
    published: drafts.filter(d => d.status === 'published').length,
    thisMonth: drafts.filter(d => {
      const draftDate = new Date(d.created_at || d.updated_at);
      const now = new Date();
      return draftDate.getMonth() === now.getMonth() && draftDate.getFullYear() === now.getFullYear();
    }).length,
  };

  // All drafts are from Supabase database - no mock fallback

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "scheduled": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "archived": return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      case "published": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft": return <DocumentIcon className="w-4 h-4" />;
      case "scheduled": return <ClockIcon className="w-4 h-4" />;
      case "archived": return <DocumentTextIcon className="w-4 h-4" />;
      case "published": return <CheckCircleIcon className="w-4 h-4" />;
      default: return <DocumentIcon className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const filteredDrafts = drafts.filter(draft => {
    const matchesSearch = draft.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (draft.excerpt && draft.excerpt.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (draft.content && typeof draft.content === 'string' && draft.content.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = selectedFilter === "all" || draft.status === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  const handleSelectDraft = (draftId: string) => {
    setSelectedDrafts(prev => 
      prev.includes(draftId) 
        ? prev.filter(id => id !== draftId)
        : [...prev, draftId]
    );
  };

  const handleSelectAll = () => {
    setSelectedDrafts(
      selectedDrafts.length === filteredDrafts.length 
        ? [] 
        : filteredDrafts.map(draft => draft.post_id)
    );
  };

  // Action handlers
  const handleViewDraft = (draftId: string) => {
    console.log('👁️ Viewing draft:', draftId);
    router.push(`/admin/drafts/view/${draftId}`);
  };

  const handleEditDraft = (draftId: string) => {
    console.log('✏️ Editing draft:', draftId);
    router.push(`/admin/drafts/edit/${draftId}`);
  };

  const handleShareDraft = (draftId: string) => {
    console.log('📤 Sharing draft:', draftId);
    // TODO: Implement share functionality
    alert('Share functionality coming soon!');
  };

  const handleDeleteDraft = async (draftId: string) => {
    console.log('🗑️ Deleting draft:', draftId);
    if (confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      try {
        const success = await deletePost(draftId);
        if (success) {
          alert('Draft deleted successfully!');
          // Refresh the drafts list
          refetch();
        } else {
          alert('Failed to delete draft. Please try again.');
        }
      } catch (error) {
        console.error('Error deleting draft:', error);
        alert('Error deleting draft. Please try again.');
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Draft Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your content drafts, collaborate with your team, and track your writing progress
            </p>
          </div>
          <button 
            onClick={() => router.push('/admin/drafts/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            New Draft
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Drafts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalDrafts}</p>
            </div>
            <DocumentTextIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Review</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inReview}</p>
            </div>
            <ClockIcon className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Published</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.published}</p>
            </div>
            <EyeIcon className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Month</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.thisMonth}</p>
            </div>
            <CalendarIcon className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading drafts...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error loading drafts
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={refetch}
                  className="bg-red-100 dark:bg-red-900/30 px-3 py-2 rounded-md text-sm font-medium text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/50"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search drafts by title, content, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-gray-400" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Drafts Table */}
      {!loading && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedDrafts.length === filteredDrafts.length && filteredDrafts.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Draft</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Status</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Author</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Modified</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="flex items-center gap-2">
                    <BookOpenIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Stats</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredDrafts.map((draft) => (
                <tr key={draft.post_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedDrafts.includes(draft.post_id)}
                      onChange={() => handleSelectDraft(draft.post_id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-md">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {draft.title || 'Untitled'}
                      </h3>
                      {draft.excerpt && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {draft.excerpt}
                        </p>
                      )}
                      {(() => {
                        // Extract tags from seo_data
                        const tags = draft.seo_data && typeof draft.seo_data === 'object' && 'secondary_keywords' in draft.seo_data 
                          ? (draft.seo_data as any).secondary_keywords || []
                          : [];
                        
                        if (tags.length > 0) {
                          return (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {tags.slice(0, 3).map((tag: string, index: number) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                >
                                  <TagIcon className="w-3 h-3 mr-1" />
                                  {tag}
                                </span>
                              ))}
                              {tags.length > 3 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  +{tags.length - 3} more
                                </span>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full ${getStatusColor(draft.status)}`}>
                      {getStatusIcon(draft.status)}
                      <span>{draft.status.charAt(0).toUpperCase() + draft.status.slice(1)}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      <span className="text-base text-gray-900 dark:text-white font-medium truncate max-w-[200px]">
                        {draft.created_by || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-base text-gray-700 dark:text-gray-300">
                      <ClockIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      <span className="font-medium">
                        {formatDate(draft.updated_at || draft.created_at)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-base text-gray-900 dark:text-white">
                        <DocumentTextIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        <span className="font-medium">
                          {(() => {
                            // Calculate word count from content
                            if (draft.content && typeof draft.content === 'string') {
                              // Remove HTML tags for accurate word count
                              const textContent = draft.content.replace(/<[^>]*>/g, ' ').trim();
                              const words = textContent.split(/\s+/).filter((word: string) => word.length > 0);
                              return words.length.toLocaleString();
                            }
                            return '0';
                          })()} words
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-base text-gray-500 dark:text-gray-400">
                        <ClockIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        <span>
                          {(() => {
                            // Calculate read time from content
                            if (draft.content && typeof draft.content === 'string') {
                              // Remove HTML tags for accurate word count
                              const textContent = draft.content.replace(/<[^>]*>/g, ' ').trim();
                              const words = textContent.split(/\s+/).filter((word: string) => word.length > 0);
                              const readTime = Math.max(1, Math.ceil(words.length / 200)); // Average reading speed: 200 words per minute
                              return `${readTime} min read`;
                            }
                            return '0 min read';
                          })()}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleViewDraft(draft.post_id)}
                        className="relative group text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 transition-colors rounded"
                      >
                        <EyeIcon className="w-4 h-4" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                          View
                          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></span>
                        </span>
                      </button>
                      <button 
                        onClick={() => handleEditDraft(draft.post_id)}
                        className="relative group text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1.5 transition-colors rounded"
                      >
                        <PencilIcon className="w-4 h-4" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                          Edit
                          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></span>
                        </span>
                      </button>
                      <button 
                        onClick={() => handleShareDraft(draft.post_id)}
                        className="relative group text-gray-400 hover:text-green-600 dark:hover:text-green-400 p-1.5 transition-colors rounded"
                      >
                        <ShareIcon className="w-4 h-4" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                          Share
                          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></span>
                        </span>
                      </button>
                      <button 
                        onClick={() => handleDeleteDraft(draft.post_id)}
                        className="relative group text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 transition-colors rounded"
                      >
                        <TrashIcon className="w-4 h-4" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                          Delete
                          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></span>
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {selectedDrafts.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800 px-6 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800 dark:text-blue-200">
                {selectedDrafts.length} draft{selectedDrafts.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium">
                  Bulk Edit
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
      </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredDrafts.length === 0 && (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No drafts found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || selectedFilter !== "all" 
              ? "Try adjusting your search or filter criteria."
              : "Get started by creating your first draft."
            }
          </p>
          {(!searchTerm && selectedFilter === "all") && (
            <div className="mt-6">
              <button 
                onClick={() => router.push('/admin/drafts/new')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                Create Draft
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

