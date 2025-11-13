"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  ArrowPathIcon,
  XMarkIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { QueueStatus, getQueueStatusMetadata } from "@/lib/blog-queue-state-machine";
import { BlogGenerationQueue } from "@/types/blog-queue";

interface QueueFilters {
  status: QueueStatus | "all";
  priority: string;
  dateRange: string;
  search: string;
}

export default function BlogQueuePage() {
  const router = useRouter();
  const [queueItems, setQueueItems] = useState<BlogGenerationQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<QueueFilters>({
    status: "all",
    priority: "all",
    dateRange: "all",
    search: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Fetch queue items
  useEffect(() => {
    fetchQueueItems();
  }, [filters]);

  const fetchQueueItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.status !== "all") {
        params.append("status", filters.status);
      }
      if (filters.priority !== "all") {
        params.append("priority", filters.priority);
      }
      if (filters.dateRange !== "all") {
        params.append("dateRange", filters.dateRange);
      }
      if (filters.search) {
        params.append("search", filters.search);
      }

      const response = await fetch(`/api/blog-queue?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch queue items");
      }
      const data = await response.json();
      setQueueItems(data.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue items");
      console.error("Error fetching queue items:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (queueId: string, newStatus: QueueStatus) => {
    // Update local state optimistically
    setQueueItems((items) =>
      items.map((item) =>
        item.queue_id === queueId ? { ...item, status: newStatus } : item
      )
    );
  };

  const handleCancel = async (queueId: string) => {
    try {
      const response = await fetch(`/api/blog-queue/${queueId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to cancel");
      await fetchQueueItems();
    } catch (err) {
      console.error("Error cancelling queue item:", err);
      alert("Failed to cancel queue item");
    }
  };

  const handleRetry = async (queueId: string) => {
    try {
      const response = await fetch(`/api/blog-queue/${queueId}/retry`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to retry");
      await fetchQueueItems();
    } catch (err) {
      console.error("Error retrying queue item:", err);
      alert("Failed to retry queue item");
    }
  };

  const filteredItems = queueItems.filter((item) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        item.topic?.toLowerCase().includes(searchLower) ||
        item.generated_title?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    return true;
  });

  const stats = {
    queued: queueItems.filter((i) => i.status === "queued").length,
    generating: queueItems.filter((i) => i.status === "generating").length,
    inReview: queueItems.filter((i) => i.status === "in_review").length,
    published: queueItems.filter((i) => i.status === "published").length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Blog Generation Queue
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track and manage blog content generation
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/drafts/new")}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          New Blog
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Queued"
          value={stats.queued}
          color="gray"
          icon="⏳"
        />
        <StatCard
          label="Generating"
          value={stats.generating}
          color="blue"
          icon="🔄"
        />
        <StatCard
          label="In Review"
          value={stats.inReview}
          color="yellow"
          icon="👀"
        />
        <StatCard
          label="Published"
          value={stats.published}
          color="green"
          icon="🌐"
        />
      </div>

      {/* Filters and Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by topic or title..."
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
          onClick={fetchQueueItems}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Filters
            </h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value as QueueStatus | "all" })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Statuses</option>
                <option value="queued">Queued</option>
                <option value="generating">Generating</option>
                <option value="generated">Generated</option>
                <option value="in_review">In Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="scheduled">Scheduled</option>
                <option value="publishing">Publishing</option>
                <option value="published">Published</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) =>
                  setFilters({ ...filters, priority: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Priorities</option>
                <option value="1">Highest (1)</option>
                <option value="5">Normal (5)</option>
                <option value="10">Lowest (10)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Range
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) =>
                  setFilters({ ...filters, dateRange: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <ExclamationCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Queue Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">
            No queue items found
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Topic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredItems.map((item) => (
                <QueueItemRow
                  key={item.queue_id}
                  item={item}
                  onView={() => router.push(`/admin/blog-queue/${item.queue_id}`)}
                  onCancel={() => handleCancel(item.queue_id)}
                  onRetry={() => handleRetry(item.queue_id)}
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
    gray: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200",
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200",
    yellow: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200",
    green: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200",
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

function QueueItemRow({
  item,
  onView,
  onCancel,
  onRetry,
}: {
  item: BlogGenerationQueue;
  onView: () => void;
  onCancel: () => void;
  onRetry: () => void;
}) {
  const statusMeta = getQueueStatusMetadata(item.status);
  const formatDate = (dateString: string | null) => {
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
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {item.generated_title || item.topic}
          </p>
          {item.generated_title && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {item.topic}
            </p>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge status={item.status} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {item.status === "generating" ? (
          <ProgressIndicator
            percentage={item.progress_percentage || 0}
            stage={item.current_stage || "Starting..."}
          />
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {statusMeta.description}
          </span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm text-gray-900 dark:text-white">
          {item.priority || 5}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <ClockIcon className="w-4 h-4" />
          {formatDate(item.queued_at)}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onView}
            className="text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
          >
            View
          </button>
          {item.status === "failed" && (
            <button
              onClick={onRetry}
              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
            >
              Retry
            </button>
          )}
          {!["published", "cancelled"].includes(item.status) && (
            <button
              onClick={onCancel}
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Cancel
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: QueueStatus }) {
  const meta = getQueueStatusMetadata(status);
  
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

function ProgressIndicator({
  percentage,
  stage,
}: {
  percentage: number;
  stage: string;
}) {
  return (
    <div className="w-full max-w-xs">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {stage}
        </span>
        <span className="text-xs font-medium text-gray-900 dark:text-white">
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-brand-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

