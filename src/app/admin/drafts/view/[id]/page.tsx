"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import type { BlogPost } from "@/types/database";

export default function DraftViewPage() {
  const router = useRouter();
  const params = useParams();
  const draftId = params.id as string;
  
  const [draft, setDraft] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDraft() {
      if (!draftId) {
        setError("Draft ID is required");
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        
        // First, get the current user to ensure they're authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setError("You must be logged in to view drafts");
          setLoading(false);
          return;
        }

        // Fetch the draft from Supabase
        const { data, error: fetchError } = await supabase
          .from("blog_posts")
          .select("*")
          .eq("post_id", draftId)
          .single();

        if (fetchError) {
          console.error("Error fetching draft:", fetchError);
          setError(`Failed to fetch post: ${fetchError.message || "Draft not found"}`);
          setLoading(false);
          return;
        }

        if (!data) {
          setError("Draft not found");
          setLoading(false);
          return;
        }

        setDraft(data as BlogPost);
        setLoading(false);
      } catch (err) {
        console.error("Unexpected error:", err);
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
        setLoading(false);
      }
    }

    fetchDraft();
  }, [draftId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "published": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "scheduled": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "archived": return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading draft...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Error</h3>
              <p className="text-red-600 dark:text-red-300 mt-1">{error || "Draft not found"}</p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => router.push("/admin/drafts")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Drafts
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/admin/drafts")}
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Back to Drafts
        </button>
        
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {draft.title || "Untitled Draft"}
              </h1>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(draft.status)}`}>
                {draft.status.charAt(0).toUpperCase() + draft.status.slice(1)}
              </span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4" />
                <span>Updated {formatDate(draft.updated_at)}</span>
              </div>
              {draft.created_by && (
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  <span>Author ID: {draft.created_by.substring(0, 8)}...</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/admin/drafts/edit/${draftId}`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <PencilIcon className="w-4 h-4" />
              Edit
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
              <ShareIcon className="w-4 h-4" />
              Share
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg transition-colors">
              <TrashIcon className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            {draft.excerpt && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Excerpt</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{draft.excerpt}</p>
              </div>
            )}
            
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content</h2>
              {draft.content ? (
                <div 
                  className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                  dangerouslySetInnerHTML={{ __html: draft.content }}
                />
              ) : (
                <div className="text-gray-500 dark:text-gray-400 italic">
                  No content available. This draft may be empty or content is being generated.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Metadata */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</p>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {formatDate(draft.created_at)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</p>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {formatDate(draft.updated_at)}
                </p>
              </div>
              {draft.published_at && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Published</p>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {formatDate(draft.published_at)}
                  </p>
                </div>
              )}
              {draft.scheduled_at && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Scheduled</p>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {formatDate(draft.scheduled_at)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SEO Data */}
          {draft.seo_data && typeof draft.seo_data === 'object' && Object.keys(draft.seo_data).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">SEO Data</h3>
              <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                {JSON.stringify(draft.seo_data, null, 2)}
              </pre>
            </div>
          )}

          {/* Metadata */}
          {draft.metadata && typeof draft.metadata === 'object' && Object.keys(draft.metadata).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Metadata</h3>
              <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                {JSON.stringify(draft.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

