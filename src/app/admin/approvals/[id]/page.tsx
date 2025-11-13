"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  ClockIcon,
  UserIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { BlogApproval } from "@/types/blog-queue";
import { getApprovalStatusMetadata, ApprovalStatus } from "@/lib/blog-queue-state-machine";

export default function ApprovalReviewPage() {
  const router = useRouter();
  const params = useParams();
  const approvalId = params.id as string;

  const [approval, setApproval] = useState<BlogApproval | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchApproval();
  }, [approvalId]);

  const fetchApproval = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/blog-approvals/${approvalId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch approval");
      }
      const data = await response.json();
      setApproval(data);
      setReviewNotes(data.review_notes || "");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load approval");
      console.error("Error fetching approval:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/blog-approvals/${approvalId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_notes: reviewNotes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve");
      }

      await fetchApproval();
      router.push("/admin/approvals");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to approve");
      console.error("Error approving:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/blog-approvals/${approvalId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rejection_reason: rejectionReason,
          review_notes: reviewNotes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reject");
      }

      await fetchApproval();
      router.push("/admin/approvals");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reject");
      console.error("Error rejecting:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!reviewNotes.trim()) {
      alert("Please provide review notes when requesting changes");
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(
        `/api/blog-approvals/${approvalId}/request-changes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ review_notes: reviewNotes }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to request changes");
      }

      await fetchApproval();
      router.push("/admin/approvals");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to request changes");
      console.error("Error requesting changes:", err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      </div>
    );
  }

  if (error || !approval) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">
            {error || "Approval not found"}
          </p>
        </div>
      </div>
    );
  }

  const statusMeta = getApprovalStatusMetadata(approval.status);
  const content = approval.queue?.generated_content || approval.post?.content || "";
  const title = approval.queue?.generated_title || approval.queue?.topic || approval.post?.title || "Untitled";

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
              Review: {title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Approval ID: {approval.approval_id}
            </p>
          </div>
        </div>
        <ApprovalStatusBadge status={approval.status} />
      </div>

      {/* Approval Info */}
      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Approval Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoItem
            label="Requested By"
            value={
              approval.requested_by_user?.full_name ||
              approval.requested_by_user?.email ||
              "Unknown"
            }
          />
          <InfoItem
            label="Requested At"
            value={formatDate(approval.requested_at)}
          />
          <InfoItem
            label="Revision Number"
            value={approval.revision_number.toString()}
          />
          {approval.reviewed_by_user && (
            <>
              <InfoItem
                label="Reviewed By"
                value={
                  approval.reviewed_by_user.full_name ||
                  approval.reviewed_by_user.email
                }
              />
              <InfoItem
                label="Reviewed At"
                value={formatDate(approval.reviewed_at)}
              />
            </>
          )}
        </div>
        {approval.review_notes && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Review Notes
            </label>
            <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              {approval.review_notes}
            </p>
          </div>
        )}
        {approval.rejection_reason && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-2">
              Rejection Reason
            </label>
            <p className="text-sm text-red-900 dark:text-red-200 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              {approval.rejection_reason}
            </p>
          </div>
        )}
      </div>

      {/* Content Preview */}
      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Content Preview
        </h2>
        <div className="prose dark:prose-invert max-w-none">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {title}
          </h3>
          <div className="whitespace-pre-wrap text-gray-900 dark:text-white">
            {content || "No content available"}
          </div>
        </div>
      </div>

      {/* Review Actions */}
      {approval.status === "pending" && (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Review Actions
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Review Notes
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="Add your review notes here..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rejection Reason (if rejecting)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="Provide a reason for rejection..."
              />
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircleIcon className="w-5 h-5" />
                Approve
              </button>
              <button
                onClick={handleRequestChanges}
                disabled={actionLoading || !reviewNotes.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PencilIcon className="w-5 h-5" />
                Request Changes
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircleIcon className="w-5 h-5" />
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision History */}
      {approval.revision_number > 1 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Revision History
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This is revision {approval.revision_number}. Previous revisions can be viewed in the approval history.
          </p>
        </div>
      )}
    </div>
  );
}

function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  const meta = getApprovalStatusMetadata(status);

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

