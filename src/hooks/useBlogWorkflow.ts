"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from '@/utils/logger';

interface WorkflowStatus {
  queueId: string | null;
  queueStatus: string | null;
  approvalId: string | null;
  approvalStatus: string | null;
  publishingStatus: Array<{
    platform: string;
    status: string;
    publishing_id?: string;
  }> | null;
}

export function useBlogWorkflow(postId: string | null, queueId: string | null) {
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>({
    queueId: null,
    queueStatus: null,
    approvalId: null,
    approvalStatus: null,
    publishingStatus: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!postId && !queueId) return;

    const fetchWorkflowStatus = async () => {
      setLoading(true);
      try {
        const supabase = createClient();

        // Fetch queue status if queueId is provided
        if (queueId) {
          const { data: queueData } = await supabase
            .from("blog_generation_queue")
            .select("queue_id, status")
            .eq("queue_id", queueId)
            .single();

          if (queueData) {
            setWorkflowStatus((prev) => ({
              ...prev,
              queueId: queueData.queue_id,
              queueStatus: queueData.status,
            }));
          }
        }

        // Fetch approval status if postId or queueId is provided
        const approvalQuery = postId
          ? supabase
              .from("blog_approvals")
              .select("approval_id, status")
              .eq("post_id", postId)
              .order("revision_number", { ascending: false })
              .limit(1)
          : queueId
          ? supabase
              .from("blog_approvals")
              .select("approval_id, status")
              .eq("queue_id", queueId)
              .order("revision_number", { ascending: false })
              .limit(1)
          : null;

        if (approvalQuery) {
          const { data: approvalData } = await approvalQuery;
          if (approvalData && approvalData.length > 0) {
            setWorkflowStatus((prev) => ({
              ...prev,
              approvalId: approvalData[0].approval_id,
              approvalStatus: approvalData[0].status,
            }));
          }
        }

        // Fetch publishing status if postId is provided
        if (postId) {
          const { data: publishingData } = await supabase
            .from("blog_platform_publishing")
            .select("publishing_id, platform, status")
            .eq("post_id", postId);

          if (publishingData) {
            setWorkflowStatus((prev) => ({
              ...prev,
              publishingStatus: publishingData.map((p) => ({
                platform: p.platform,
                status: p.status,
                publishing_id: p.publishing_id,
              })),
            }));
          }
        }
      } catch (error) {
        logger.error("Error fetching workflow status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflowStatus();
  }, [postId, queueId]);

  return { workflowStatus, loading };
}

