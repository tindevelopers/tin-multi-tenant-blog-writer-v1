"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ClockIcon,
  ExclamationCircleIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { ApprovalStatus, getApprovalStatusMetadata } from "@/lib/blog-queue-state-machine";
import { BlogApproval } from "@/types/blog-queue";

interface ApprovalFilters {
  status: ApprovalStatus | "all";
  requestedBy: string;
  reviewedBy: string;
  search: string;
}

export default function ApprovalsPage() {
  const router = useRouter();
  const [approvals, setApprovals] = useState<BlogApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ApprovalFilters>({
    status: "all",
    requestedBy: "all",
    reviewedBy: "all",
    search: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.status !== "all") {
        params.append("status", filters.status);
      }
      if (filters.requestedBy !== "all") {
        params.append("requested_by", filters.requestedBy);
      }
      if (filters.reviewedBy !== "all") {
        params.append("reviewed_by", filters.reviewedBy);
      }
      if (filters.search) {
        params.append("search", filters.search);
      }

      const response = await fetch(`/api/blog-approvals?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch approvals");
      }
      const data = await response.json();
      setApprovals(data.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load approvals");
      console.error("Error fetching approvals:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const stats = {
    pending: approvals.filter((a) => a.status === "pending").length,
    approved: approvals.filter((a) => a.status === "approved").length,
    rejected: approvals.filter((a) => a.status === "rejected").length,
    changesRequested: approvals.filter((a) => a.status === "changes_requested").length,
  };

  const filteredApprovals = approvals.filter((approval) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        (approval.queue?.topic?.toLowerCase().includes(searchLower)) ||
        (approval.queue?.generated_title?.toLowerCase().includes(searchLower)) ||
        (approval.post?.title?.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Approval Workflow
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review and approve blog content
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Pending"
          value={stats.pending}
          color="yellow"
          icon="⏳"
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          color="green"
          icon="✅"
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          color="red"
          icon="❌"
        />
        <StatCard
          label="Changes Requested"
          value={stats.changesRequested}
          color="blue"
          icon="📝"
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
          onClick={fetchApprovals}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ClockIcon className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value as ApprovalStatus | "all" })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="changes_requested">Changes Requested</option>
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

      {/* Approvals Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      ) : filteredApprovals.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">
            No approvals found
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
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Requested By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Requested At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Reviewed By
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredApprovals.map((approval) => (
                <ApprovalRow
                  key={approval.approval_id}
                  approval={approval}
                  onView={() => router.push(`/contentmanagement/approvals/${approval.approval_id}`)}
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

function ApprovalRow({
  approval,
  onView,
}: {
  approval: BlogApproval;
  onView: () => void;
}) {
  const statusMeta = getApprovalStatusMetadata(approval.status);
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const contentTitle =
    approval.queue?.generated_title ||
    approval.queue?.topic ||
    approval.post?.title ||
    "Untitled";

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {contentTitle}
          </p>
          {approval.revision_number > 1 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Revision {approval.revision_number}
            </p>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <ApprovalStatusBadge status={approval.status} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-900 dark:text-white">
            {approval.requested_by_user?.full_name ||
              approval.requested_by_user?.email ||
              "Unknown"}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <ClockIcon className="w-4 h-4" />
          {formatDate(approval.requested_at)}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {approval.reviewed_by_user ? (
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-900 dark:text-white">
              {approval.reviewed_by_user.full_name ||
                approval.reviewed_by_user.email}
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Not reviewed</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button
          onClick={onView}
          className="text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
        >
          Review
        </button>
      </td>
    </tr>
  );
}

function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  const meta = getApprovalStatusMetadata(status);
  
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

