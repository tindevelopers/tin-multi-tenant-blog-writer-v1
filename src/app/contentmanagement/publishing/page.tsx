"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ClockIcon,
  XCircleIcon,
  ArrowPathIcon,
  GlobeAltIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  EyeIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  TrashIcon,
  PencilSquareIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import { BlogPlatformPublishing } from "@/types/blog-queue";
import type { Database } from "@/types/database";
import { getPlatformStatusMetadata, PlatformStatus } from "@/lib/blog-queue-state-machine";
import { PublishingSite } from "@/types/publishing";

interface PublishingFilters {
  platform: "webflow" | "wordpress" | "shopify" | "all";
  status: PlatformStatus | "all";
  search: string;
}

type BlogPost = Database["public"]["Tables"]["blog_posts"]["Row"];

// Tracks which site is selected per post (site_id -> provider + collection)
interface SiteSelection {
  platform: "webflow" | "wordpress" | "shopify";
  site_id: string;
  site_name?: string;
  collection_id?: string;
}

export default function PublishingPage() {
  const router = useRouter();
  const [publishing, setPublishing] = useState<BlogPlatformPublishing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readyPosts, setReadyPosts] = useState<BlogPost[]>([]);
  const [readyLoading, setReadyLoading] = useState(true);
  const [platformSelections, setPlatformSelections] = useState<Record<string, SiteSelection>>({});
  const [availableSites, setAvailableSites] = useState<PublishingSite[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null); // publishingId of item being processed
  const [filters, setFilters] = useState<PublishingFilters>({
    platform: "all",
    status: "all",
    search: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchPublishing = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.platform !== "all") {
        params.append("platform", filters.platform);
      }
      if (filters.status !== "all") {
        params.append("status", filters.status);
      }

      const response = await fetch(`/api/blog-publishing?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch publishing records");
      }
      const data = await response.json();
      setPublishing(data.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load publishing records");
      console.error("Error fetching publishing:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchReadyPosts = useCallback(async () => {
    try {
      setReadyLoading(true);
      const response = await fetch("/api/drafts/list?status=published");
      if (!response.ok) {
        throw new Error("Failed to fetch published posts");
      }
      const data = await response.json();
      setReadyPosts(data.data || []);
    } catch (err) {
      console.error("Error fetching ready posts:", err);
    } finally {
      setReadyLoading(false);
    }
  }, []);

  const fetchAvailableSites = useCallback(async () => {
    try {
      setSitesLoading(true);
      const response = await fetch("/api/publishing/targets");
      if (!response.ok) {
        console.warn("Failed to fetch publishing targets");
        return;
      }
      const data = await response.json();
      setAvailableSites(data.sites || []);
      
      // Set default selection for posts that don't have one
      if (data.default) {
        const defaultSelection: SiteSelection = {
          platform: data.default.cms_provider,
          site_id: data.default.site_id,
          site_name: data.default.site_name,
          collection_id: data.default.collection_id,
        };
        // We'll apply this default when rendering if no selection exists
      }
    } catch (err) {
      console.error("Error fetching available sites:", err);
    } finally {
      setSitesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPublishing();
    fetchReadyPosts();
    fetchAvailableSites();
  }, [fetchPublishing, fetchReadyPosts, fetchAvailableSites]);

  const stats = {
    pending: publishing.filter((p) => p.status === "pending").length,
    published: publishing.filter((p) => p.status === "published").length,
    unpublished: publishing.filter((p) => p.status === "unpublished").length,
    failed: publishing.filter((p) => p.status === "failed").length,
    scheduled: publishing.filter((p) => p.status === "scheduled").length,
    ready: readyPosts.length,
  };

  const filteredPublishing = publishing.filter((pub) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        (pub.post?.title?.toLowerCase().includes(searchLower)) ||
        (pub.queue?.topic?.toLowerCase().includes(searchLower)) ||
        (pub.queue?.generated_title?.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }
    return true;
  });

  const platformIcons = {
    webflow: GlobeAltIcon,
    wordpress: DocumentTextIcon,
    shopify: ShoppingBagIcon,
  };

  const handleStartPublishing = async (postId: string, isDraft: boolean = false) => {
    // Get the selected site, or use the first available site as default
    const selection = platformSelections[postId];
    const defaultSite = availableSites[0];
    
    const platform = selection?.platform || defaultSite?.provider || "webflow";
    const siteId = selection?.site_id || defaultSite?.id;
    const collectionId = selection?.collection_id || defaultSite?.collections?.[0];
    const siteName = selection?.site_name || defaultSite?.name || platform;

    try {
      setPublishingPostId(postId);
      
      // Step 1: Create publishing record with site-specific info
      const response = await fetch("/api/blog-publishing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          post_id: postId,
          platform,
          site_id: siteId,
          collection_id: collectionId,
          is_draft: isDraft,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.details || "Failed to create publishing record");
      }

      const publishingRecord = await response.json();
      
      // Step 2: Trigger actual publishing to platform (with enhanced fields)
      try {
        const publishResponse = await fetch(`/api/blog-publishing/${publishingRecord.publishing_id}/publish`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_draft: isDraft,
          }),
        });

        if (!publishResponse.ok) {
          const publishError = await publishResponse.json();
          throw new Error(publishError.message || publishError.error || "Failed to publish to platform");
        }

        const publishResult = await publishResponse.json();
        
        // Wait a moment for database to commit the update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Show success message with details
        const successMessage = isDraft 
          ? `✅ Blog post saved as draft on ${siteName}.\n\n` +
            (publishResult.result?.itemId ? `Item ID: ${publishResult.result.itemId}\n` : '') +
            `Track progress in the publishing table below.`
          : `✅ Blog post published successfully to ${siteName}!\n\n` +
            (publishResult.result?.itemId ? `Item ID: ${publishResult.result.itemId}\n` : '') +
            (publishResult.result?.url ? `URL: ${publishResult.result.url}\n` : '') +
            `\nEnhanced fields (SEO title, meta description, slug, alt text) were automatically optimized using OpenAI.`;
        
        alert(successMessage);
      } catch (publishErr) {
        // Publishing record was created, but actual publish failed
        console.error("Error publishing to platform:", publishErr);
        const errorMessage = publishErr instanceof Error ? publishErr.message : "Unknown error";
        alert(
          `⚠️ Publishing record created, but failed to publish to ${siteName}:\n\n${errorMessage}\n\n` +
          `You can retry from the publishing table below.`
        );
      }
      
      // Refresh data after publishing completes
      await Promise.all([
        fetchPublishing(),
        fetchReadyPosts(),
      ]);
    } catch (err) {
      console.error("Error starting publishing:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to start publishing. Please try again.";
      alert(`❌ Error: ${errorMessage}`);
    } finally {
      setPublishingPostId(null);
    }
  };

  // Handler: Unpublish from platform (set to draft)
  const handleUnpublish = async (publishingId: string) => {
    if (!confirm("Are you sure you want to unpublish this blog? It will be set to draft on Webflow and hidden from the live site.")) {
      return;
    }
    try {
      setActionInProgress(publishingId);
      const response = await fetch(`/api/blog-publishing/${publishingId}/unpublish`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || result.error || "Failed to unpublish");
      }
      alert("✅ Blog unpublished successfully! It's now a draft on Webflow.");
      await fetchPublishing();
    } catch (err) {
      console.error("Error unpublishing:", err);
      alert(`❌ Error: ${err instanceof Error ? err.message : "Failed to unpublish"}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Handler: Update/Sync changes to platform
  const handleUpdate = async (publishingId: string) => {
    try {
      setActionInProgress(publishingId);
      const response = await fetch(`/api/blog-publishing/${publishingId}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publish_after_update: true,
          enhance_fields: true,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || result.error || "Failed to update");
      }
      alert("✅ Blog updated successfully on Webflow!\n\nChanges are now live.");
      await fetchPublishing();
    } catch (err) {
      console.error("Error updating:", err);
      alert(`❌ Error: ${err instanceof Error ? err.message : "Failed to update"}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Handler: Republish (make draft live again)
  const handleRepublish = async (publishingId: string) => {
    try {
      setActionInProgress(publishingId);
      const response = await fetch(`/api/blog-publishing/${publishingId}/republish`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || result.error || "Failed to republish");
      }
      alert("✅ Blog republished successfully! It's now live on Webflow.");
      await fetchPublishing();
    } catch (err) {
      console.error("Error republishing:", err);
      alert(`❌ Error: ${err instanceof Error ? err.message : "Failed to republish"}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Handler: Delete from platform
  const handleDeleteFromPlatform = async (publishingId: string, keepRecord: boolean = true) => {
    const confirmMsg = keepRecord
      ? "Are you sure you want to DELETE this blog from Webflow?\n\nThis will remove it from your Webflow site. The publishing record will be kept so you can republish later."
      : "Are you sure you want to PERMANENTLY DELETE this blog from Webflow and remove the publishing record?\n\nThis cannot be undone.";
    
    if (!confirm(confirmMsg)) {
      return;
    }
    
    try {
      setActionInProgress(publishingId);
      const response = await fetch(`/api/blog-publishing/${publishingId}/delete-from-platform`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publish_site_after: true,
          delete_local_record: !keepRecord,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || result.error || "Failed to delete");
      }
      alert("✅ Blog deleted from Webflow successfully!");
      await fetchPublishing();
    } catch (err) {
      console.error("Error deleting:", err);
      alert(`❌ Error: ${err instanceof Error ? err.message : "Failed to delete"}`);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Publishing Dashboard
          </h1>
          {/* v2.0 - Webflow CMS Management: Sync, Unpublish, Republish, Delete */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage content publishing across platforms
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard
          label="Pending"
          value={stats.pending}
          color="yellow"
          icon="⏳"
        />
        <StatCard
          label="Published"
          value={stats.published}
          color="green"
          icon="✅"
        />
        <StatCard
          label="Unpublished"
          value={stats.unpublished}
          color="orange"
          icon="📄"
        />
        <StatCard
          label="Failed"
          value={stats.failed}
          color="red"
          icon="❌"
        />
        <StatCard
          label="Scheduled"
          value={stats.scheduled}
          color="blue"
          icon="📅"
        />
        <StatCard
          label="Ready"
          value={stats.ready}
          color="purple"
          icon="📝"
        />
      </div>
      {/* Ready to Publish Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Ready for Publishing
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              These posts have status "Published" and can now be sent to Webflow, WordPress, or Shopify.
              <br />
              <span className="text-xs text-brand-600 dark:text-brand-400 mt-1 inline-block">
                ✨ Enhanced fields (SEO title, meta description, slug, alt text) will be automatically optimized using OpenAI before publishing.
              </span>
            </p>
          </div>
          <button
            onClick={fetchReadyPosts}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {readyLoading ? (
          <div className="py-6 text-center text-gray-500 dark:text-gray-400">
            Loading ready posts...
          </div>
        ) : readyPosts.length === 0 ? (
          <div className="py-6 text-center text-gray-500 dark:text-gray-400">
            No published posts are waiting for distribution. Once you change a draft’s status to
            <span className="font-semibold"> Published</span>, it will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {readyPosts.map((post) => (
                  <tr key={post.post_id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <span className="flex-1">{post.title}</span>
                        <a
                          href={`/contentmanagement/drafts/view/${post.post_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300 text-xs font-medium hover:underline"
                          title="View blog post details"
                        >
                          <EyeIcon className="w-4 h-4" />
                          View
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {post.updated_at
                        ? new Date(post.updated_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {sitesLoading ? (
                        <div className="text-sm text-gray-400 animate-pulse">Loading sites...</div>
                      ) : availableSites.length === 0 ? (
                        <div className="text-sm text-gray-500">
                          <span>No sites configured</span>
                          <a 
                            href="/admin/panel/integrations" 
                            className="ml-2 text-brand-600 hover:underline"
                          >
                            Add →
                          </a>
                        </div>
                      ) : (
                        <select
                          value={platformSelections[post.post_id]?.site_id || availableSites[0]?.id || ""}
                          onChange={(e) => {
                            const selectedSite = availableSites.find(s => s.id === e.target.value);
                            if (selectedSite) {
                              setPlatformSelections((prev) => ({
                                ...prev,
                                [post.post_id]: {
                                  platform: selectedSite.provider as "webflow" | "wordpress" | "shopify",
                                  site_id: selectedSite.id,
                                  site_name: selectedSite.name,
                                  collection_id: selectedSite.collections?.[0],
                                },
                              }));
                            }
                          }}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white min-w-[180px]"
                        >
                          {availableSites.map((site) => (
                            <option key={site.id} value={site.id}>
                              {site.name} ({site.provider})
                              {site.is_default ? " ★" : ""}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStartPublishing(post.post_id, false)}
                          disabled={publishingPostId === post.post_id || availableSites.length === 0}
                          className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                          title={`Publish immediately to ${platformSelections[post.post_id]?.site_name || availableSites[0]?.name || 'selected site'} with enhanced SEO fields`}
                        >
                          {publishingPostId === post.post_id ? "Publishing..." : "Publish Now"}
                        </button>
                        <button
                          onClick={() => handleStartPublishing(post.post_id, true)}
                          disabled={publishingPostId === post.post_id || availableSites.length === 0}
                          className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          title={`Save as draft on ${platformSelections[post.post_id]?.site_name || availableSites[0]?.name || 'selected site'}`}
                        >
                          Draft
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* Filters and Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title or topic..."
            value={filters.search}
            onChange={(e) =>
              setFilters({ ...filters, search: e.target.value })
            }
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            showFilters
              ? "bg-brand-500 text-white border-brand-500"
              : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          <FunnelIcon className="w-5 h-5" />
          Filters
        </button>
        <button
          onClick={fetchPublishing}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ClockIcon className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Platform
              </label>
              <select
                value={filters.platform}
                onChange={(e) =>
                  setFilters({ ...filters, platform: e.target.value as any })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Platforms</option>
                <option value="webflow">Webflow</option>
                <option value="wordpress">WordPress</option>
                <option value="shopify">Shopify</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value as PlatformStatus | "all" })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="published">Published</option>
                <option value="unpublished">Unpublished</option>
                <option value="failed">Failed</option>
                <option value="scheduled">Scheduled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Publishing Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      ) : filteredPublishing.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">
            No publishing records found
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Content
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  Published
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Mode
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky right-0 bg-gray-50 dark:bg-gray-900 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPublishing.map((pub) => (
                <PublishingRow
                  key={pub.publishing_id}
                  publishing={pub}
                  platformIcons={platformIcons}
                  actionInProgress={actionInProgress}
                  onRetry={async () => {
                    const response = await fetch(`/api/blog-publishing/${pub.publishing_id}/retry`, {
                      method: "POST",
                    });
                    if (response.ok) {
                      fetchPublishing();
                    }
                  }}
                  onUnpublish={() => handleUnpublish(pub.publishing_id)}
                  onUpdate={() => handleUpdate(pub.publishing_id)}
                  onRepublish={() => handleRepublish(pub.publishing_id)}
                  onDeleteFromPlatform={(keepRecord) => handleDeleteFromPlatform(pub.publishing_id, keepRecord)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: string;
}) {
  const colorClasses = {
    yellow: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200",
    green: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200",
    red: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200",
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200",
    orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200",
    purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200",
  };

  return (
    <div
      className={`${colorClasses[color as keyof typeof colorClasses]} rounded-lg p-4`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

function PublishingRow({
  publishing,
  platformIcons,
  actionInProgress,
  onRetry,
  onUnpublish,
  onUpdate,
  onRepublish,
  onDeleteFromPlatform,
}: {
  publishing: BlogPlatformPublishing;
  platformIcons: Record<string, any>;
  actionInProgress: string | null;
  onRetry: () => void;
  onUnpublish: () => void;
  onUpdate: () => void;
  onRepublish: () => void;
  onDeleteFromPlatform: (keepRecord: boolean) => void;
}) {
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const statusMeta = getPlatformStatusMetadata(publishing.status);
  const PlatformIcon = platformIcons[publishing.platform] || GlobeAltIcon;
  const isProcessing = actionInProgress === publishing.publishing_id;
  const hasPlatformItem = !!publishing.platform_post_id;
  const isWebflow = publishing.platform === "webflow";

  const contentTitle =
    publishing.post?.title ||
    publishing.queue?.generated_title ||
    publishing.queue?.topic ||
    "Untitled";

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      {/* Content */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex flex-col">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]" title={contentTitle}>
            {contentTitle}
          </p>
          {publishing.platform_url && (
            <a
              href={publishing.platform_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
            >
              View Live →
            </a>
          )}
        </div>
      </td>
      {/* Platform */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <PlatformIcon className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-700 dark:text-gray-300 capitalize">
            {publishing.platform}
          </span>
        </div>
      </td>
      {/* Status */}
      <td className="px-3 py-3 whitespace-nowrap">
        <PlatformStatusBadge status={publishing.status} />
      </td>
      {/* Published At */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatDate(publishing.published_at || publishing.scheduled_at)}
        </span>
      </td>
      {/* Mode */}
      <td className="px-3 py-3 whitespace-nowrap">
        <DraftModeBadge 
          isDraft={(publishing as any).is_draft}
          platformDraftStatus={(publishing as any).platform_draft_status}
        />
      </td>
      {/* Actions - Sticky */}
      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium sticky right-0 bg-white dark:bg-gray-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-end gap-1 flex-wrap">
          {/* Processing indicator */}
          {isProcessing && (
            <span className="text-xs text-gray-500 dark:text-gray-400 animate-pulse mr-2">
              Processing...
            </span>
          )}

          {/* Retry button - for failed items */}
          {publishing.status === "failed" && (
            <button
              onClick={onRetry}
              disabled={isProcessing}
              className="text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors disabled:opacity-50"
              title="Retry publishing"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Retry
            </button>
          )}

          {/* Update/Sync button - for published or unpublished items with platform ID */}
          {hasPlatformItem && isWebflow && ["published", "unpublished"].includes(publishing.status) && (
            <button
              onClick={onUpdate}
              disabled={isProcessing}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
              title="Sync local changes to Webflow"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              Sync
            </button>
          )}

          {/* Unpublish button - for published items */}
          {publishing.status === "published" && hasPlatformItem && isWebflow && (
            <button
              onClick={onUnpublish}
              disabled={isProcessing}
              className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-50"
              title="Set to draft on Webflow (hide from live site)"
            >
              <PauseCircleIcon className="w-4 h-4" />
              Unpublish
            </button>
          )}

          {/* Republish button - for unpublished items */}
          {publishing.status === "unpublished" && hasPlatformItem && isWebflow && (
            <button
              onClick={onRepublish}
              disabled={isProcessing}
              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
              title="Republish to Webflow (make live again)"
            >
              <PlayCircleIcon className="w-4 h-4" />
              Republish
            </button>
          )}

          {/* Delete dropdown - for items with platform ID */}
          {hasPlatformItem && isWebflow && (
            <div className="relative">
              <button
                onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                disabled={isProcessing}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                title="Delete from Webflow"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
              {showDeleteMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowDeleteMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowDeleteMenu(false);
                          onDeleteFromPlatform(true);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <div className="font-medium">Delete from Webflow</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Keep record (can republish)
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteMenu(false);
                          onDeleteFromPlatform(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <div className="font-medium">Delete Permanently</div>
                        <div className="text-xs text-red-500 dark:text-red-400">
                          Remove from Webflow & delete record
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Enhanced badge */}
          {publishing.status === "published" && isWebflow && (
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 ml-1" title="Enhanced fields were optimized using OpenAI">
              ✨
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

function PlatformStatusBadge({ status }: { status: PlatformStatus }) {
  const meta = getPlatformStatusMetadata(status);
  
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${meta.color}20`,
        color: meta.color,
      }}
    >
      <span>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

function DraftModeBadge({ 
  isDraft, 
  platformDraftStatus 
}: { 
  isDraft?: boolean | null;
  platformDraftStatus?: string | null;
}) {
  if (isDraft || platformDraftStatus === 'draft') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
        title="Published as draft on platform"
      >
        📝 Draft
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
      title="Published live on platform"
    >
      🌐 Live
    </span>
  );
}

function SyncStatusBadge({ 
  syncStatus, 
  isDraft, 
  platformDraftStatus,
  lastSyncedAt 
}: { 
  syncStatus?: string | null; 
  isDraft?: boolean | null;
  platformDraftStatus?: string | null;
  lastSyncedAt?: string | null;
}) {
  const getSyncStatusInfo = () => {
    if (!syncStatus || syncStatus === 'never_synced') {
      return { label: 'Not Synced', color: '#6B7280', icon: '⏳' };
    }
    if (syncStatus === 'in_sync') {
      const draftLabel = isDraft ? ' (Draft)' : '';
      const platformStatus = platformDraftStatus === 'draft' ? ' (Platform Draft)' : '';
      return { 
        label: `Synced${draftLabel}${platformStatus}`, 
        color: '#10B981', 
        icon: '✅' 
      };
    }
    if (syncStatus === 'out_of_sync') {
      return { label: 'Out of Sync', color: '#F59E0B', icon: '⚠️' };
    }
    if (syncStatus === 'syncing') {
      return { label: 'Syncing...', color: '#3B82F6', icon: '🔄' };
    }
    if (syncStatus === 'sync_failed') {
      return { label: 'Sync Failed', color: '#EF4444', icon: '❌' };
    }
    return { label: 'Unknown', color: '#6B7280', icon: '❓' };
  };

  const info = getSyncStatusInfo();
  
  return (
    <div className="flex flex-col gap-1">
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{
          backgroundColor: `${info.color}20`,
          color: info.color,
        }}
        title={lastSyncedAt ? `Last synced: ${new Date(lastSyncedAt).toLocaleString()}` : undefined}
      >
        <span>{info.icon}</span>
        {info.label}
      </span>
      {lastSyncedAt && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(lastSyncedAt).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}
