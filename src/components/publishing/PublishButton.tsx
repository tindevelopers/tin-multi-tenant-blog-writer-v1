'use client';

import React, { useState } from "react";
import { usePublishing } from "@/hooks/usePublishing";
import { PublishingTargetSelector } from "./PublishingTargetSelector";
import {
  PublishingTarget,
  PublishBlogRequest,
  UserRole,
} from "@/types/publishing";

interface PublishButtonProps {
  orgId: string;
  userId: string;
  userRole: UserRole;
  blogId: string;
  currentTarget?: PublishingTarget;
  onPublished?: (response: any) => void;
}

export const PublishButton: React.FC<PublishButtonProps> = ({
  orgId,
  userId,
  userRole,
  blogId,
  currentTarget,
  onPublished,
}) => {
  const { publishing, error, publishBlog } = usePublishing(orgId, userId, userRole);
  const [showTargetSelector, setShowTargetSelector] = useState(false);
  const [target, setTarget] = useState<PublishingTarget | undefined>(currentTarget);
  const [publishResponse, setPublishResponse] = useState<any>(null);

  const handlePublish = async () => {
    if (!target && !currentTarget) {
      setShowTargetSelector(true);
      return;
    }

    try {
      const request: PublishBlogRequest = {
        blog_id: blogId,
        cms_provider: target?.cms_provider || currentTarget?.cms_provider,
        site_id: target?.site_id || currentTarget?.site_id,
        collection_id: target?.collection_id || currentTarget?.collection_id,
        publish: true,
      };

      const response = await publishBlog(request);
      setPublishResponse(response);

      if (response.success && onPublished) {
        onPublished(response);
      }
    } catch (err) {
      console.error("Publish failed:", err);
    }
  };

  return (
    <div className="space-y-4">
      {showTargetSelector && (
        <div className="p-4 border border-gray-200 rounded-lg">
          <h3 className="font-semibold mb-4">Select Publishing Target</h3>
          <PublishingTargetSelector
            orgId={orgId}
            userId={userId}
            userRole={userRole}
            value={target}
            onChange={setTarget}
            required
          />
          <div className="mt-4 flex gap-2">
            <button
              onClick={handlePublish}
              disabled={!target || publishing}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {publishing ? "Publishing..." : "Publish"}
            </button>
            <button
              onClick={() => setShowTargetSelector(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showTargetSelector && (
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {publishing ? "Publishing..." : "Publish Blog Post"}
        </button>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          Error: {error}
        </div>
      )}

      {publishResponse && (
        <div
          className={`p-3 rounded text-sm ${
            publishResponse.success
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {publishResponse.success ? (
            <div>
              <p className="font-semibold">Published successfully!</p>
              {publishResponse.published_url && (
                <a
                  href={publishResponse.published_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  View published post
                </a>
              )}
            </div>
          ) : (
            <p>Failed to publish: {publishResponse.error_message}</p>
          )}
        </div>
      )}
    </div>
  );
};

