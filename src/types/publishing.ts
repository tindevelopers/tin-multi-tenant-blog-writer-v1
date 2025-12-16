export enum CMSProvider {
  WEBFLOW = "webflow",
  SHOPIFY = "shopify",
  WORDPRESS = "wordpress",
  CUSTOM = "custom",
}

export enum IntegrationStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ERROR = "error",
}

export enum UserRole {
  OWNER = "owner",
  ADMIN = "admin",
  MANAGER = "manager",
  EDITOR = "editor",
  WRITER = "writer",
  SYSTEM_ADMIN = "system_admin",
  SUPER_ADMIN = "super_admin",
}

export interface CMSIntegration {
  id?: string;
  org_id: string;
  type: CMSProvider;
  site_id: string;
  site_name: string;
  api_key?: string;
  api_secret?: string;
  collection_ids: string[];
  is_default: boolean;
  status: IntegrationStatus;
  created_at?: string;
  updated_at?: string;
  last_verified_at?: string;
  error_message?: string;
}

export interface PublishingTarget {
  cms_provider: CMSProvider;
  site_id: string;
  collection_id?: string;
  site_name?: string;
}

export interface PublishingSite {
  id: string;
  name: string;
  provider: CMSProvider;
  collections: string[];
  is_default: boolean;
  integration_id?: string;
}

export interface PublishingTargetsResponse {
  providers: string[];
  sites: PublishingSite[];
  default: PublishingTarget | null;
}

export interface CostBreakdown {
  ai_generation?: number;
  api_calls?: number;
  dataforseo?: number;
  image_generation?: number;
  other?: number;
}

export interface PublishingMetadata {
  cms_provider?: CMSProvider;
  site_id?: string;
  collection_id?: string;
  publishing_target?: PublishingTarget;
  published_url?: string;
  remote_id?: string;
  published_at?: string;
  publish_status?: string;
  publish_error?: string;
}

export interface BlogPostWithCosts {
  id: string;
  title: string;
  content: string;
  status: string;
  total_cost: number | null;
  cost_breakdown: CostBreakdown | null;
  publishing_metadata?: PublishingMetadata;
}

export interface CreateIntegrationRequest {
  org_id: string;
  type: CMSProvider;
  site_id: string;
  site_name: string;
  api_key: string;
  api_secret?: string;
  collection_ids: string[];
  is_default: boolean;
}

export interface UpdateIntegrationRequest {
  site_name?: string;
  api_key?: string;
  api_secret?: string;
  collection_ids?: string[];
  is_default?: boolean;
  status?: IntegrationStatus;
}

export interface PublishBlogRequest {
  blog_id: string;
  cms_provider?: CMSProvider;
  site_id?: string;
  collection_id?: string;
  publish?: boolean;
}

export interface PublishBlogResponse {
  success: boolean;
  cms_provider: CMSProvider;
  site_id: string;
  collection_id?: string;
  published_url?: string;
  remote_id?: string;
  error_message?: string;
}

