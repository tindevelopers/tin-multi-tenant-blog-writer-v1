import { useState, useCallback } from "react";
import { PublishingService } from "@/lib/api/publishing";
import {
  PublishingTarget,
  PublishBlogRequest,
  PublishBlogResponse,
  UserRole,
} from "@/types/publishing";

export const usePublishing = (
  orgId: string,
  userId: string,
  userRole: UserRole
) => {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateDraftTarget = useCallback(
    async (draftId: string, target: PublishingTarget) => {
      setPublishing(true);
      setError(null);
      try {
        const result = await PublishingService.updateDraftTarget(
          orgId,
          userId,
          userRole,
          draftId,
          target
        );
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        throw err;
      } finally {
        setPublishing(false);
      }
    },
    [orgId, userId, userRole]
  );

  const publishBlog = useCallback(
    async (request: PublishBlogRequest): Promise<PublishBlogResponse> => {
      setPublishing(true);
      setError(null);
      try {
        return await PublishingService.publishBlog(orgId, userId, userRole, request);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        throw err;
      } finally {
        setPublishing(false);
      }
    },
    [orgId, userId, userRole]
  );

  return {
    publishing,
    error,
    updateDraftTarget,
    publishBlog,
  };
};

