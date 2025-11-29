"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  CheckCircleIcon, 
  ClockIcon, 
  XCircleIcon,
  ArrowPathIcon,
  DocumentCheckIcon,
  GlobeAltIcon
} from "@heroicons/react/24/outline";
import { getQueueStatusMetadata, QueueStatus } from "@/lib/blog-queue-state-machine";
import { getApprovalStatusMetadata, ApprovalStatus } from "@/lib/blog-queue-state-machine";
import { getPlatformStatusMetadata, PlatformStatus } from "@/lib/blog-queue-state-machine";

interface WorkflowStatusIndicatorProps {
  queueId?: string | null;
  queueStatus?: QueueStatus | null;
  approvalId?: string | null;
  approvalStatus?: ApprovalStatus | null;
  publishingStatus?: Array<{
    platform: string;
    status: PlatformStatus;
    publishing_id?: string;
  }> | null;
  className?: string;
}

export default function WorkflowStatusIndicator({
  queueId,
  queueStatus,
  approvalId,
  approvalStatus,
  publishingStatus,
  className = "",
}: WorkflowStatusIndicatorProps) {
  const [currentStatus, setCurrentStatus] = useState<string>("");

  useEffect(() => {
    // Determine current workflow stage
    if (queueStatus === "generating") {
      setCurrentStatus("generating");
    } else if (queueStatus === "generated" && !approvalStatus) {
      setCurrentStatus("generated");
    } else if (approvalStatus === "pending") {
      setCurrentStatus("in_review");
    } else if (approvalStatus === "approved") {
      setCurrentStatus("approved");
    } else if (approvalStatus === "rejected" || approvalStatus === "changes_requested") {
      setCurrentStatus("rejected");
    } else if (publishingStatus && publishingStatus.length > 0) {
      const allPublished = publishingStatus.every(p => p.status === "published");
      const anyPublishing = publishingStatus.some(p => p.status === "publishing");
      if (allPublished) {
        setCurrentStatus("published");
      } else if (anyPublishing) {
        setCurrentStatus("publishing");
      } else {
        setCurrentStatus("scheduled");
      }
    } else {
      setCurrentStatus("unknown");
    }
  }, [queueStatus, approvalStatus, publishingStatus]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "generating":
        return <ArrowPathIcon className="w-4 h-4 animate-spin" />;
      case "generated":
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case "in_review":
        return <DocumentCheckIcon className="w-4 h-4 text-yellow-500" />;
      case "approved":
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case "rejected":
        return <XCircleIcon className="w-4 h-4 text-red-500" />;
      case "publishing":
        return <ArrowPathIcon className="w-4 h-4 animate-spin text-blue-500" />;
      case "published":
        return <GlobeAltIcon className="w-4 h-4 text-green-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "generating":
        return "Generating";
      case "generated":
        return "Generated";
      case "in_review":
        return "In Review";
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      case "publishing":
        return "Publishing";
      case "published":
        return "Published";
      default:
        return "Unknown";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "generating":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "generated":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "in_review":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "publishing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "published":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(currentStatus)}`}>
        {getStatusIcon(currentStatus)}
        <span>{getStatusLabel(currentStatus)}</span>
      </div>
      
      {queueId && (
        <Link
          href={`/contentmanagement/blog-queue/${queueId}`}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          View Queue
        </Link>
      )}
      
      {approvalId && (
        <Link
          href={`/contentmanagement/approvals/${approvalId}`}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          View Approval
        </Link>
      )}
    </div>
  );
}

