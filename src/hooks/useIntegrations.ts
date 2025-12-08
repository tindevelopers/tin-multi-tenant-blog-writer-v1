import { useState, useCallback, useEffect } from "react";
import { PublishingService } from "@/lib/api/publishing";
import { CMSIntegration, CMSProvider, UserRole } from "@/types/publishing";

export const useIntegrations = (
  orgId: string,
  userId: string,
  userRole: UserRole,
  providerType?: CMSProvider,
  autoFetch: boolean = true
) => {
  const [integrations, setIntegrations] = useState<CMSIntegration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    if (!orgId || !userId) {
      setIntegrations([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await PublishingService.listIntegrations(
        orgId,
        userId,
        userRole,
        providerType
      );
      setIntegrations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, userId, userRole, providerType]);

  useEffect(() => {
    if (autoFetch) {
      fetchIntegrations();
    }
  }, [fetchIntegrations, autoFetch]);

  return {
    integrations,
    loading,
    error,
    refetch: fetchIntegrations,
  };
};

