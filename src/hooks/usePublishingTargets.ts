import { useState, useCallback, useEffect } from "react";
import { PublishingService } from "@/lib/api/publishing";
import { PublishingTargetsResponse, UserRole } from "@/types/publishing";

export const usePublishingTargets = (
  orgId: string,
  userId: string,
  userRole: UserRole,
  autoFetch: boolean = true
) => {
  const [targets, setTargets] = useState<PublishingTargetsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTargets = useCallback(async () => {
    if (!orgId || !userId) {
      setTargets(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await PublishingService.getPublishingTargets(
        orgId,
        userId,
        userRole
      );
      setTargets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setTargets(null);
    } finally {
      setLoading(false);
    }
  }, [orgId, userId, userRole]);

  useEffect(() => {
    if (autoFetch) {
      fetchTargets();
    }
  }, [fetchTargets, autoFetch]);

  return {
    targets,
    loading,
    error,
    refetch: fetchTargets,
  };
};

