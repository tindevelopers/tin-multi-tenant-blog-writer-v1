"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  UserIcon
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import type { BlogPost } from "@/types/database";

interface DraftListItem {
  id: string;
  title: string;
  excerpt: string;
  status: string;
  lastModified: string;
  author: string;
  tags: string[];
  wordCount: number;
  readTime: string;
}

export default function DraftsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedDrafts, setSelectedDrafts] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<DraftListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDrafts() {
      try {
        const supabase = createClient();
        
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setError("You must be logged in to view drafts");
          setLoading(false);
          return;
        }

        // Fetch drafts from Supabase
        const { data, error: fetchError } = await supabase
          .from("blog_posts")
          .select("*")
          .order("updated_at", { ascending: false });

        if (fetchError) {
          console.error("Error fetching drafts:", fetchError);
          setError(`Failed to fetch drafts: ${fetchError.message}`);
          setLoading(false);
          return;
        }

        // Transform data to match our interface
        const transformedDrafts: DraftListItem[] = (data || []).map((post: BlogPost) => {
          // Calculate word count from content
          const wordCount = post.content 
            ? post.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length
            : 0;
          
          // Calculate read time (average reading speed: 200 words per minute)
          const readTime = Math.max(1, Math.ceil(wordCount / 200));

          // Extract tags from metadata if available
          const tags: string[] = [];
          const metadataTags = (post.metadata as any)?.tags;
          if (Array.isArray(metadataTags)) {
            const stringTags = metadataTags.filter((tag: unknown): tag is string => typeof tag === "string");
            tags.push(...stringTags);
          }

          return {
            id: post.post_id,
            title: post.title || "Untitled Draft",
            excerpt: post.excerpt || post.content?.replace(/<[^>]*>/g, '').substring(0, 150) + "..." || "No excerpt available",
            status: post.status,
            lastModified: post.updated_at,
            author: post.created_by ? post.created_by.substring(0, 8) + "..." : "Unknown",
            tags: tags.length > 0 ? tags : [],
            wordCount,
            readTime: `${readTime} min read`
          };
        });

        setDrafts(transformedDrafts);
        setLoading(false);
      } catch (err) {
        console.error("Unexpected error:", err);
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
        setLoading(false);
      }
    }

    fetchDrafts();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "scheduled": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "archived": return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      case "published": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
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
    const matchesSearch = draft.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         draft.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         draft.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = selectedFilter === "all" || draft.status === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  // Calculate stats from actual data
  const stats = {
    total: drafts.length,
    inReview: drafts.filter(d => d.status === "scheduled").length,
    published: drafts.filter(d => d.status === "published").length,
    thisMonth: drafts.filter(d => {
      const draftDate = new Date(d.lastModified);
      const now = new Date();
      return draftDate.getMonth() === now.getMonth() && draftDate.getFullYear() === now.getFullYear();
    }).length
  };

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
        : filteredDrafts.map(draft => draft.id)
    );
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
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? "..." : stats.total}
              </p>
            </div>
            <DocumentTextIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Scheduled</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? "..." : stats.inReview}
              </p>
            </div>
            <ClockIcon className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Published</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? "..." : stats.published}
              </p>
            </div>
            <EyeIcon className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Month</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? "..." : stats.thisMonth}
              </p>
            </div>
            <CalendarIcon className="w-8 h-8 text-purple-600" />
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

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-600 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading drafts...</p>
        </div>
      )}

      {/* Drafts Table */}
      {!loading && (
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Draft
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Modified
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Stats
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredDrafts.map((draft) => (
                <tr key={draft.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedDrafts.includes(draft.id)}
                      onChange={() => handleSelectDraft(draft.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-md">
                      <button
                        onClick={() => router.push(`/admin/drafts/view/${draft.id}`)}
                        className="text-left w-full"
                      >
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {draft.title}
                        </h3>
                      </button>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {draft.excerpt}
                      </p>
                      {draft.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {draft.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            >
                              <TagIcon className="w-3 h-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                          {draft.tags.length > 3 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              +{draft.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(draft.status)}`}>
                      {draft.status.charAt(0).toUpperCase() + draft.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <UserIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {draft.author}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <ClockIcon className="w-4 h-4 mr-2" />
                      {formatDate(draft.lastModified)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      <div>{draft.wordCount.toLocaleString()} words</div>
                      <div className="text-gray-500 dark:text-gray-400">{draft.readTime}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => router.push(`/admin/drafts/view/${draft.id}`)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                        title="View draft"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => router.push(`/admin/drafts/edit/${draft.id}`)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                        title="Edit draft"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1" title="Share draft">
                        <ShareIcon className="w-4 h-4" />
                      </button>
                      <button className="text-gray-400 hover:text-red-600 p-1" title="Delete draft">
                        <TrashIcon className="w-4 h-4" />
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
      {filteredDrafts.length === 0 && (
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

