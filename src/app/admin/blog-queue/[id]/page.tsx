"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  XMarkIcon,
  DocumentCheckIcon,
  PencilIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { BlogGenerationQueueItem } from "@/types/blog-queue";
import { getQueueStatusMetadata, QueueStatus } from "@/lib/blog-queue-state-machine";
import { useQueueStatusSSE } from "@/hooks/useQueueStatusSSE";

export default function QueueItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queueId = params.id as string;
  
  const [item, setItem] = useState<BlogGenerationQueueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    status: true,
    content: true,
    metadata: false,
  });

  // Use SSE for real-time updates
  const { status, progress, stage } = useQueueStatusSSE(queueId);

  useEffect(() => {
    fetchQueueItem();
  }, [queueId]);

  useEffect(() => {
    if (status && item) {
      setItem({ ...item, status: status as QueueStatus, progress_percentage: progress, current_stage: stage });
    }
  }, [status, progress, stage]);

  const fetchQueueItem = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/blog-queue/${queueId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch queue item");
      }
      const data = await response.json();
      // API returns { queue_item: ... } but we need the item directly
      setItem(data.queue_item || data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue item");
      console.error("Error fetching queue item:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this queue item?")) return;
    
    try {
      const response = await fetch(`/api/blog-queue/${queueId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to cancel");
      router.push("/admin/blog-queue");
    } catch (err) {
      console.error("Error cancelling:", err);
      alert("Failed to cancel queue item");
    }
  };

  const handleRetry = async () => {
    try {
      const response = await fetch(`/api/blog-queue/${queueId}/retry`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to retry");
      await fetchQueueItem();
    } catch (err) {
      console.error("Error retrying:", err);
      alert("Failed to retry queue item");
    }
  };

  const handleRequestApproval = async () => {
    try {
      const response = await fetch("/api/blog-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queue_id: queueId,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to request approval");
      }
      await fetchQueueItem();
      alert("Approval requested successfully");
    } catch (err) {
      console.error("Error requesting approval:", err);
      alert(err instanceof Error ? err.message : "Failed to request approval");
    }
  };

  const handleRegenerate = async () => {
    if (!item) return;
    
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
        router.push(`/admin/blog-queue/${result.queue_id}`);
      } else {
        alert("Blog regeneration started!");
      }
    } catch (err) {
      console.error("Error regenerating blog:", err);
      alert("Failed to regenerate blog. Please try again.");
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const postId = item?.post_id || (item?.metadata as any)?.post_id;
  const hasGeneratedContent = item?.status === "generated" && (item?.generated_content || postId);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">
            {error || "Queue item not found"}
          </p>
        </div>
      </div>
    );
  }

  const statusMeta = getQueueStatusMetadata(item?.status);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {item.generated_title || item.topic}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Queue ID: {item.queue_id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Blog button - show when blog is generated */}
          {hasGeneratedContent && (
            <button
              onClick={() => {
                if (postId) {
                  router.push(`/admin/drafts/view/${postId}`);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <EyeIcon className="w-5 h-5" />
              View Blog
            </button>
          )}
          {/* Edit Blog button - show when blog is generated and has post_id */}
          {item.status === "generated" && postId && (
            <button
              onClick={() => router.push(`/admin/drafts/edit/${postId}`)}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <PencilIcon className="w-5 h-5" />
              Edit Blog
            </button>
          )}
          {/* Regenerate button - show when blog is generated */}
          {item.status === "generated" && (
            <button
              onClick={handleRegenerate}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              <ArrowPathIcon className="w-5 h-5" />
              Regenerate
            </button>
          )}
          {item.status === "generated" && (
            <button
              onClick={handleRequestApproval}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <DocumentCheckIcon className="w-5 h-5" />
              Request Approval
            </button>
          )}
          {item.status === "failed" && (
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <ArrowPathIcon className="w-5 h-5" />
              Retry
            </button>
          )}
          {!["published", "cancelled"].includes(item.status) && (
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('status')}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Status
            </h2>
            <StatusBadge status={item.status} />
          </div>
          {expandedSections.status ? (
            <ChevronUpIcon className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-500" />
          )}
        </button>
        
        {expandedSections.status && (
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          {item.status === "generating" && (
            <ProgressIndicator
              percentage={item.progress_percentage || 0}
              stage={item.current_stage || "Starting..."}
            />
          )}

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoItem label="Status" value={statusMeta?.label || "N/A"} />
            <InfoItem
              label="Priority"
              value={item.priority?.toString() || "5"}
            />
            <InfoItem
              label="Queued At"
              value={formatDate(item.queued_at)}
            />
            {item.generation_started_at && (
              <InfoItem
                label="Started At"
                value={formatDate(item.generation_started_at)}
              />
            )}
            {item.generation_completed_at && (
              <InfoItem
                label="Completed At"
                value={formatDate(item.generation_completed_at)}
              />
            )}
          </div>
        </div>
        )}
      </div>

      {/* Generation Details */}
      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('metadata')}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Generation Details
          </h2>
          {expandedSections.metadata ? (
            <ChevronUpIcon className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-500" />
          )}
        </button>
        
        {expandedSections.metadata && (
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoItem label="Topic" value={item.topic} />
          <InfoItem
            label="Target Audience"
            value={item.target_audience || "N/A"}
          />
          <InfoItem label="Tone" value={item.tone || "N/A"} />
          <InfoItem
            label="Word Count"
            value={item.word_count?.toString() || "N/A"}
          />
          <InfoItem
            label="Quality Level"
            value={item.quality_level || "N/A"}
          />
          <InfoItem
            label="Template Type"
            value={item.template_type || "N/A"}
          />
        </div>
            {item.keywords && item.keywords.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Keywords
                </label>
                <div className="flex flex-wrap gap-2">
                  {item.keywords.map((keyword, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generated Content */}
      {item.generated_content && (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('content')}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Generated Content
            </h2>
            {expandedSections.content ? (
              <ChevronUpIcon className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-500" />
            )}
          </button>
          
          {expandedSections.content && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="prose dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-gray-900 dark:text-white">
                {item.generated_content}
              </div>
            </div>
          </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {item.generation_error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                Generation Error
              </h3>
              <p className="text-red-700 dark:text-red-300 text-sm">
                {item.generation_error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Updates */}
      {item.progress_updates && Array.isArray(item.progress_updates) && item.progress_updates.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Progress History
          </h2>
          <div className="space-y-3">
            {item.progress_updates.map((update: any, idx: number) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <ClockIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {update.stage || "Update"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {update.details || update.message || "No details"}
                  </p>
                  {update.timestamp && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatDate(update.timestamp)}
                    </p>
                  )}
                </div>
                {update.percentage !== undefined && (
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {update.percentage}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: QueueStatus | string | null | undefined }) {
  const meta = getQueueStatusMetadata(status);
  
  if (!meta) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
        <span>❓</span>
        Unknown
      </span>
    );
  }
  
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
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
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {stage}
        </span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
        <div
          className="bg-brand-500 h-3 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </label>
      <p className="text-sm text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function formatDate(dateString: string | null) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

