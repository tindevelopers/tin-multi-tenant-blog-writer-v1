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
} from "@heroicons/react/24/outline";
import { BlogPlatformPublishing } from "@/types/blog-queue";
import type { Database } from "@/types/database";
import { getPlatformStatusMetadata, PlatformStatus } from "@/lib/blog-queue-state-machine";

interface PublishingFilters {
  platform: "webflow" | "wordpress" | "shopify" | "all";
  status: PlatformStatus | "all";
  search: string;
}

type BlogPost = Database["public"]["Tables"]["blog_posts"]["Row"];

export default function PublishingPage() {
  const router = useRouter();
  const [publishing, setPublishing] = useState<BlogPlatformPublishing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readyPosts, setReadyPosts] = useState<BlogPost[]>([]);
  const [readyLoading, setReadyLoading] = useState(true);
  const [platformSelections, setPlatformSelections] = useState<Record<string, "webflow" | "wordpress" | "shopify">>({});
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);
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

  useEffect(() => {
    fetchPublishing();
    fetchReadyPosts();
  }, [fetchPublishing, fetchReadyPosts]);

  const stats = {
    pending: publishing.filter((p) => p.status === "pending").length,
    published: publishing.filter((p) => p.status === "published").length,
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

  const handleStartPublishing = async (postId: string) => {
    const platform = platformSelections[postId] || "webflow";
    try {
      setPublishingPostId(postId);
      const response = await fetch("/api/blog-publishing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          post_id: postId,
          platform,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create publishing job");
      }

      alert("Publishing job created. Track progress below.");
      fetchPublishing();
      fetchReadyPosts();
    } catch (err) {
      console.error("Error starting publishing:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Failed to start publishing. Please try again."
      );
    } finally {
      setPublishingPostId(null);
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
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage content publishing across platforms
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
          color="teal"
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
                          href={`/admin/drafts/view/${post.post_id}`}
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
                      <select
                        value={platformSelections[post.post_id] || "webflow"}
                        onChange={(e) =>
                          setPlatformSelections((prev) => ({
                            ...prev,
                            [post.post_id]: e.target.value as "webflow" | "wordpress" | "shopify",
                          }))
                        }
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                      >
                        <option value="webflow">Webflow</option>
                        <option value="wordpress">WordPress</option>
                        <option value="shopify">Shopify</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleStartPublishing(post.post_id)}
                        disabled={publishingPostId === post.post_id}
                        className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {publishingPostId === post.post_id ? "Starting..." : "Send to Publishing"}
                      </button>
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
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Content
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Published At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
                  onRetry={async () => {
                    const response = await fetch(`/api/blog-publishing/${pub.publishing_id}/retry`, {
                      method: "POST",
                    });
                    if (response.ok) {
                      fetchPublishing();
                    }
                  }}
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
  onRetry,
}: {
  publishing: BlogPlatformPublishing;
  platformIcons: Record<string, any>;
  onRetry: () => void;
}) {
  const statusMeta = getPlatformStatusMetadata(publishing.status);
  const PlatformIcon = platformIcons[publishing.platform] || GlobeAltIcon;

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
      <td className="px-6 py-4 whitespace-nowrap">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {contentTitle}
        </p>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <PlatformIcon className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-900 dark:text-white capitalize">
            {publishing.platform}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <PlatformStatusBadge status={publishing.status} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <ClockIcon className="w-4 h-4" />
          {formatDate(publishing.published_at || publishing.scheduled_at)}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {publishing.platform_url ? (
          <a
            href={publishing.platform_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
          >
            View
          </a>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        {publishing.status === "failed" && (
          <button
            onClick={onRetry}
            className="text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300 flex items-center gap-1"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Retry
          </button>
        )}
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
