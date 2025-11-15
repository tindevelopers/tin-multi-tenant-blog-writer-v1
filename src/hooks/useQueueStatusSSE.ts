"use client";

import { useState, useEffect, useRef } from "react";
import { QueueStatus } from "@/lib/blog-queue-state-machine";
import { logger } from '@/utils/logger';

interface QueueStatusUpdate {
  status: QueueStatus;
  progress_percentage: number;
  current_stage: string;
  timestamp: string;
}

/**
 * Hook to subscribe to real-time queue status updates via Server-Sent Events
 * 
 * @param queueId - The queue item ID to monitor
 * @returns Current status, progress percentage, and current stage
 */
export function useQueueStatusSSE(queueId: string | null) {
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [stage, setStage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!queueId) {
      return;
    }

    // Create SSE connection
    const eventSource = new EventSource(
      `/api/blog-queue/${queueId}/status`
    );

    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data: QueueStatusUpdate = JSON.parse(event.data);
        
        setStatus(data.status);
        setProgress(data.progress_percentage || 0);
        setStage(data.current_stage || "");
        setError(null);

        // Close connection if status is terminal
        const terminalStatuses: QueueStatus[] = [
          "published",
          "failed",
          "cancelled",
        ];
        if (terminalStatuses.includes(data.status)) {
          eventSource.close();
        }
      } catch (err) {
        logger.error("Error parsing SSE message:", err);
        setError("Failed to parse status update");
      }
    };

    eventSource.onerror = (err) => {
      logger.error("SSE connection error:", err);
      setError("Connection error");
      eventSource.close();
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [queueId]);

  return {
    status,
    progress,
    stage,
    error,
  };
}

