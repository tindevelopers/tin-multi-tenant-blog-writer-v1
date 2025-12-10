import {
  CMSIntegration,
  CreateIntegrationRequest,
  PublishBlogRequest,
  PublishBlogResponse,
  PublishingTargetsResponse,
  UpdateIntegrationRequest,
  BlogPostWithCosts,
  UserRole,
} from "@/types/publishing";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "";

function getHeaders(orgId?: string, userId?: string, userRole?: UserRole): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (orgId) headers["X-Org-ID"] = orgId;
  if (userId) headers["X-User-ID"] = userId;
  if (userRole) headers["X-User-Role"] = userRole;
  return headers;
}

export class PublishingService {
  static async listIntegrations(
    orgId: string,
    userId: string,
    userRole: UserRole,
    providerType?: string
  ): Promise<CMSIntegration[]> {
    const url = new URL(`${API_BASE_URL}/api/v1/publishing/integrations`);
    if (providerType) {
      url.searchParams.set("provider_type", providerType);
    }
    const response = await fetch(url.toString(), {
      headers: getHeaders(orgId, userId, userRole),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || response.statusText);
    }
    return response.json();
  }

  static async createIntegration(
    orgId: string,
    userId: string,
    userRole: UserRole,
    request: CreateIntegrationRequest
  ): Promise<CMSIntegration> {
    const response = await fetch(`${API_BASE_URL}/api/v1/publishing/integrations`, {
      method: "POST",
      headers: getHeaders(orgId, userId, userRole),
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || response.statusText);
    }
    return response.json();
  }

  static async updateIntegration(
    orgId: string,
    userId: string,
    userRole: UserRole,
    integrationId: string,
    request: UpdateIntegrationRequest
  ): Promise<CMSIntegration> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/publishing/integrations/${integrationId}`,
      {
        method: "PATCH",
        headers: getHeaders(orgId, userId, userRole),
        body: JSON.stringify(request),
      }
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || response.statusText);
    }
    return response.json();
  }

  static async deleteIntegration(
    orgId: string,
    userId: string,
    userRole: UserRole,
    integrationId: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/publishing/integrations/${integrationId}`,
      {
        method: "DELETE",
        headers: getHeaders(orgId, userId, userRole),
      }
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || response.statusText);
    }
    return response.json();
  }

  static async getPublishingTargets(
    orgId: string,
    userId: string,
    userRole: UserRole
  ): Promise<PublishingTargetsResponse> {
    const url =
      API_BASE_URL && API_BASE_URL.trim().length > 0
        ? `${API_BASE_URL}/api/v1/publishing/targets`
        : "/api/v1/publishing/targets";

    const response = await fetch(url, {
      headers: getHeaders(orgId, userId, userRole),
    });

    // If the endpoint isn't available (404), fall back to an empty target list
    if (response.status === 404) {
      return { providers: [], sites: [], default: null };
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || response.statusText);
    }
    return response.json();
  }

  static async updateDraftTarget(
    orgId: string,
    userId: string,
    userRole: UserRole,
    draftId: string,
    target: any
  ) {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/publishing/drafts/${draftId}/target`,
      {
        method: "PATCH",
        headers: getHeaders(orgId, userId, userRole),
        body: JSON.stringify(target),
      }
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || response.statusText);
    }
    return response.json();
  }

  static async publishBlog(
    orgId: string,
    userId: string,
    userRole: UserRole,
    request: PublishBlogRequest
  ): Promise<PublishBlogResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/publishing/publish`, {
      method: "POST",
      headers: getHeaders(orgId, userId, userRole),
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || response.statusText);
    }
    return response.json();
  }

  static async listBlogPosts(
    orgId: string,
    userId: string,
    userRole: UserRole,
    options?: { status?: string; limit?: number; offset?: number }
  ): Promise<BlogPostWithCosts[]> {
    const url = new URL(`${API_BASE_URL}/api/v1/publishing/blog-posts`);
    if (options?.status) url.searchParams.set("status", options.status);
    if (options?.limit) url.searchParams.set("limit", `${options.limit}`);
    if (options?.offset) url.searchParams.set("offset", `${options.offset}`);

    const response = await fetch(url.toString(), {
      headers: getHeaders(orgId, userId, userRole),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || response.statusText);
    }
    return response.json();
  }

  static async getBlogPost(
    orgId: string,
    userId: string,
    userRole: UserRole,
    postId: string
  ): Promise<BlogPostWithCosts> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/publishing/blog-posts/${postId}`,
      {
        headers: getHeaders(orgId, userId, userRole),
      }
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || response.statusText);
    }
    return response.json();
  }
}

