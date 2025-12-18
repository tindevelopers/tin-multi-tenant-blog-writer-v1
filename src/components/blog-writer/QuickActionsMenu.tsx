"use client";

import { useState } from "react";
import Link from "next/link";
import {
  EllipsisVerticalIcon,
  DocumentCheckIcon,
  GlobeAltIcon,
  EyeIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface QuickActionsMenuProps {
  queueId?: string | null;
  approvalId?: string | null;
  postId?: string | null;
  status?: string;
  onRequestApproval?: () => void;
  onPublish?: () => void;
  onViewQueue?: () => void;
  onViewApproval?: () => void;
  className?: string;
}

export default function QuickActionsMenu({
  queueId,
  approvalId,
  postId,
  status,
  onRequestApproval,
  onPublish,
  onViewQueue,
  onViewApproval,
  className = "",
}: QuickActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const canRequestApproval = status === "generated" && !approvalId;
  const canPublish = status === "approved" || approvalId && status === "approved";
  const canViewQueue = queueId;
  const canViewApproval = approvalId;

  if (!canRequestApproval && !canPublish && !canViewQueue && !canViewApproval) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Quick actions"
      >
        <EllipsisVerticalIcon className="w-5 h-5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-30">
            <div className="py-1">
              {canViewQueue && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    if (onViewQueue) {
                      onViewQueue();
                    } else if (queueId) {
                      window.location.href = `/contentmanagement/blog-queue/${queueId}`;
                    }
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <EyeIcon className="w-4 h-4" />
                  View in Queue
                </button>
              )}

              {canViewApproval && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    if (onViewApproval) {
                      onViewApproval();
                    } else if (approvalId) {
                      window.location.href = `/contentmanagement/approvals/${approvalId}`;
                    }
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <DocumentCheckIcon className="w-4 h-4" />
                  View Approval
                </button>
              )}

              {canRequestApproval && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onRequestApproval?.();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <DocumentCheckIcon className="w-4 h-4" />
                  Request Approval
                </button>
              )}

              {canPublish && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onPublish?.();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <GlobeAltIcon className="w-4 h-4" />
                  Publish to Platform
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

