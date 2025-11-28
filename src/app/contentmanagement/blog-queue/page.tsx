"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  ArrowPathIcon,
  XMarkIcon,
  ClockIcon,
  ExclamationCircleIcon,
  EyeIcon,
  PencilIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { QueueStatus, getQueueStatusMetadata } from "@/lib/blog-queue-state-machine";
import { BlogGenerationQueueItem } from "@/types/blog-queue";

interface QueueFilters {
  status: QueueStatus | "all";
  priority: string;
  dateRange: string;
  search: string;
}

export default function BlogQueuePage() {
  const router = useRouter();
  const [queueItems, setQueueItems] = useState<BlogGenerationQueueItem[]>([]);
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
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [stats, setStats] = useState({
    queued: 0,
    generating: 0,
    generated: 0,
    in_review: 0,
    approved: 0,
    published: 0,
    failed: 0,
    total: 0,
    recent_24h: 0,
    average_generation_time_minutes: 0,
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    stats: true,
    filters: false,
  });

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/blog-queue/stats');
      if (response.ok) {
        const data = await response.json();
        setStats({
          queued: data.by_status?.queued || 0,
          generating: data.by_status?.generating || 0,
          generated: data.by_status?.generated || 0,
          in_review: data.by_status?.in_review || 0,
          approved: data.by_status?.approved || 0,
          published: data.by_status?.published || 0,
          failed: data.by_status?.failed || 0,
          total: data.total || 0,
          recent_24h: data.recent_24h || 0,
          average_generation_time_minutes: data.average_generation_time_minutes || 0,
        });
      }
    } catch (err) {
      // Error fetching stats - non-critical, silently fail
    }
  }, []);

  const fetchQueueItems = useCallback(async () => {
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
      // Error fetching queue items - already handled via error state
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch queue items and stats
  useEffect(() => {
    fetchQueueItems();
    fetchStats();
  }, [fetchQueueItems, fetchStats]);

  // Poll for updates on generating items
  useEffect(() => {
    const generatingItems = queueItems.filter(item => item.status === "generating" || item.status === "queued");
    
    if (generatingItems.length === 0) {
      return; // No items to poll
    }

    const pollInterval = setInterval(async () => {
      try {
        // Fetch updated status for all generating items
        const updatePromises = generatingItems.map(async (item) => {
          try {
            const response = await fetch(`/api/blog-queue/${item.queue_id}`);
            if (response.ok) {
              const data = await response.json();
              return data.queue_item || data;
            }
          } catch (err) {
            // Silently fail for individual items
            return null;
          }
          return null;
        });

        const updatedItems = await Promise.all(updatePromises);
        
        // Update queue items state with new data
        setQueueItems(prevItems => {
          const updatedMap = new Map(updatedItems.filter(Boolean).map(item => [item.queue_id, item]));
          
          return prevItems.map(item => {
            const updated = updatedMap.get(item.queue_id);
            if (updated) {
              return updated;
            }
            return item;
          });
        });

        // Refresh stats if any item changed status
        const hasStatusChange = updatedItems.some((updated, idx) => {
          if (!updated) return false;
          const original = generatingItems[idx];
          return original && updated.status !== original.status;
        });

        if (hasStatusChange) {
          fetchStats();
        }
      } catch (err) {
        // Silently fail polling errors
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [queueItems, fetchStats]);


  const handleCancel = async (queueId: string) => {
    try {
      const response = await fetch(`/api/blog-queue/${queueId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete' }));
        throw new Error(errorData.error || "Failed to delete queue item");
      }
      const result = await response.json();
      // Refresh the queue to reflect changes
      await fetchQueueItems();
      await fetchStats();
      // Show success message
      if (result.message) {
        // Success message is already shown via the API response
      }
    } catch (err) {
      // Error deleting queue item - already shown to user via alert
      alert(err instanceof Error ? err.message : "Failed to delete queue item");
    }
  };

  const handleRetry = async (queueId: string) => {
    try {
      const response = await fetch(`/api/blog-queue/${queueId}/retry`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to retry");
      await fetchQueueItems();
      await fetchStats();
    } catch (err) {
      // Error retrying queue item - already shown to user via alert
      alert("Failed to retry queue item");
    }
  };

  const handleSelectItem = (queueId: string) => {
    setSelectedItems(prev => 
      prev.includes(queueId) 
        ? prev.filter(id => id !== queueId)
        : [...prev, queueId]
    );
  };

  const handleSelectAll = () => {
    setSelectedItems(
      selectedItems.length === filteredItems.length 
        ? [] 
        : filteredItems.map(item => item.queue_id)
    );
  };

  const handleBatchDelete = async () => {
    if (selectedItems.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedItems.length} item(s)? This action cannot be undone.`)) {
      return;
    }

    setBatchActionLoading(true);
    try {
      const results = await Promise.allSettled(
        selectedItems.map(queueId => 
          fetch(`/api/blog-queue/${queueId}`, { method: "DELETE" })
        )
      );

      // Check each result for success
      const successful: string[] = [];
      const failed: string[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.ok) {
          successful.push(selectedItems[index]);
        } else {
          failed.push(selectedItems[index]);
        }
      });

      if (failed.length > 0) {
        alert(`${successful.length} item(s) deleted successfully. ${failed.length} item(s) failed to delete.`);
      } else if (successful.length > 0) {
        alert(`${successful.length} item(s) deleted successfully.`);
      }

      setSelectedItems([]);
      await fetchQueueItems();
      await fetchStats();
    } catch (err) {
      // Error batch deleting - already shown to user via alert
      alert("Failed to delete items. Please try again.");
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchStatusChange = async (newStatus: QueueStatus) => {
    if (selectedItems.length === 0) return;

    const confirmMessage = `Are you sure you want to change status of ${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''} to ${newStatus}?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setBatchActionLoading(true);
    try {
      const results = await Promise.allSettled(
        selectedItems.map(queueId => 
          fetch(`/api/blog-queue/${queueId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
      const failed = results.length - successful;

      if (failed > 0) {
        alert(`${successful} item(s) updated successfully. ${failed} item(s) failed to update.`);
      } else {
        alert(`${successful} item(s) updated successfully.`);
      }

      setSelectedItems([]);
      await fetchQueueItems();
      await fetchStats();
    } catch (err) {
      // Error batch updating status - already shown to user via alert
      alert("Failed to update items. Please try again.");
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleRegenerate = async (item: BlogGenerationQueueItem) => {
    if (!confirm(`Are you sure you want to regenerate "${item.generated_title || item.topic}"?`)) {
      return;
    }
    
    try {
      // Create a new queue entry with the same parameters
      const response = await fetch('/api/blog-writer/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: item.topic,
          keywords: item.keywords || [],
          target_audience: item.target_audience,
          tone: item.tone,
          word_count: item.word_count,
          quality_level: item.quality_level,
          template_type: item.template_type,
          custom_instructions: item.custom_instructions,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to regenerate");
      
      const result = await response.json();
      if (result.queue_id) {
        router.push(`/contentmanagement/blog-queue/${result.queue_id}`);
      } else {
        await fetchQueueItems();
        await fetchStats();
        alert("Blog regeneration started!");
      }
    } catch (err) {
      // Error regenerating blog - already shown to user via alert
      alert("Failed to regenerate blog. Please try again.");
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

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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
          onClick={() => router.push("/contentmanagement/drafts/new")}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          New Blog
        </button>
      </div>

      {/* Stats Cards */}
      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('stats')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Statistics
          </h2>
          {expandedSections.stats ? (
            <ChevronUpIcon className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-500" />
          )}
        </button>
        
        {expandedSections.stats && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <StatCard
                label="Total"
                value={stats.total}
                color="gray"
                icon="📊"
              />
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
                label="Generated"
                value={stats.generated}
                color="green"
                icon="✅"
              />
              <StatCard
                label="In Review"
                value={stats.in_review}
                color="yellow"
                icon="👀"
              />
              <StatCard
                label="Published"
                value={stats.published}
                color="green"
                icon="🌐"
              />
              <StatCard
                label="Failed"
                value={stats.failed}
                color="red"
                icon="❌"
              />
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Recent (24h)</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.recent_24h}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Generation Time</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.average_generation_time_minutes > 0 
                    ? `${Math.round(stats.average_generation_time_minutes)}m`
                    : 'N/A'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.approved}
                </p>
              </div>
            </div>
          </div>
        )}
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
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('filters')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Filters
            </h3>
            <div className="flex items-center gap-2">
              {expandedSections.filters ? (
                <ChevronUpIcon className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-gray-500" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFilters(false);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </button>
          
          {expandedSections.filters && (
          <div className="p-4 space-y-4 border-t border-gray-200 dark:border-gray-700">
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
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
                  selected={selectedItems.includes(item.queue_id)}
                  onSelect={() => handleSelectItem(item.queue_id)}
                  onView={() => router.push(`/contentmanagement/blog-queue/${item.queue_id}`)}
                  onCancel={() => handleCancel(item.queue_id)}
                  onRetry={() => handleRetry(item.queue_id)}
                  onRegenerate={() => handleRegenerate(item)}
                />
              ))}
            </tbody>
          </table>
          </div>
          
          {/* Batch Actions Bar */}
          {selectedItems.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800 px-6 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-3">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBatchStatusChange(e.target.value as QueueStatus);
                        e.target.value = ''; // Reset select
                      }
                    }}
                    disabled={batchActionLoading}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Change Status...</option>
                    <option value="queued">Queued</option>
                    <option value="generated">Generated</option>
                    <option value="in_review">In Review</option>
                    <option value="approved">Approved</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button
                    onClick={handleBatchDelete}
                    disabled={batchActionLoading}
                    className="px-4 py-1.5 text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <XMarkIcon className="w-4 h-4" />
                    Delete Selected
                  </button>
                  <button
                    onClick={() => setSelectedItems([])}
                    className="px-4 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>
          )}
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
    red: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200",
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
  selected,
  onSelect,
  onView,
  onCancel,
  onRetry,
  onRegenerate,
}: {
  item: BlogGenerationQueueItem;
  selected: boolean;
  onSelect: () => void;
  onView: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onRegenerate?: () => void;
}) {
  const router = useRouter();
  const statusMeta = getQueueStatusMetadata(item?.status);
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const postId = item.post_id || (item.metadata as any)?.post_id;
  const hasGeneratedContent = item.status === "generated" && (item.generated_content || postId);

  return (
    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
      <td className="px-6 py-4 whitespace-nowrap">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </td>
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
        <StatusBadge 
          status={item.status} 
          currentStage={item.status === "generating" ? (item.current_stage !== null ? item.current_stage : undefined) : undefined}
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {item.status === "generating" || item.status === "queued" ? (
          <ProgressIndicator
            percentage={item.progress_percentage || 0}
            stage={item.current_stage || (item.status === "queued" ? "Queued" : "Starting...")}
          />
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {statusMeta?.description || "N/A"}
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
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {/* View Queue Details */}
          <button
            onClick={onView}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded transition-colors"
            title="View Queue Details"
          >
            <EyeIcon className="w-4 h-4" />
            <span className="text-xs">Details</span>
          </button>
          
          {/* View in Editor / Create Draft - show when blog is generated */}
          {hasGeneratedContent && (
            <button
              onClick={() => {
                if (postId) {
                  // Draft exists - go directly to editor
                  router.push(`/contentmanagement/drafts/edit/${postId}`);
                } else {
                  // No draft yet - go to detail page to create one
                  onView?.();
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
              title={postId ? "Edit in Drafts" : "Create & Edit Draft"}
            >
              <PencilIcon className="w-4 h-4" />
              <span className="text-xs">{postId ? "Edit" : "Create Draft"}</span>
            </button>
          )}
          
          {/* Regenerate - show when blog is generated */}
          {item.status === "generated" && (
            <button
              onClick={() => onRegenerate?.()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
              title="Regenerate Blog"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span className="text-xs">Regenerate</span>
            </button>
          )}
          
          {/* Retry - show when failed */}
          {item.status === "failed" && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
              title="Retry"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span className="text-xs">Retry</span>
            </button>
          )}
          
          {/* Cancel - show when not published or cancelled */}
          {!["published", "cancelled"].includes(item.status) && (
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              title="Cancel"
            >
              <XMarkIcon className="w-4 h-4" />
              <span className="text-xs">Cancel</span>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({ 
  status, 
  currentStage 
}: { 
  status: QueueStatus | string | null | undefined;
  currentStage?: string;
}) {
  const meta = getQueueStatusMetadata(status);
  
  if (!meta) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
        <span>❓</span>
        Unknown
      </span>
    );
  }
  
  // Show current stage if generating and stage is available
  const displayLabel = status === "generating" && currentStage 
    ? currentStage 
    : meta.label;
  
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${meta.color}20`,
        color: meta.color,
      }}
      title={status === "generating" && currentStage ? `Generating: ${currentStage}` : undefined}
    >
      <span>{meta.icon}</span>
      {displayLabel}
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

