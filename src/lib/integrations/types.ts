/**
 * Integration Abstraction Layer - Type Definitions
 * 
 * This file defines the core interfaces and types for the integration system.
 * All integration providers must implement IIntegrationProvider.
 */

// Integration Types
export type IntegrationType = 'webflow' | 'wordpress' | 'shopify' | 'medium' | 'google-analytics' | 'slack' | 'zapier' | 'hubspot';

export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending';

export type HealthStatus = 'healthy' | 'warning' | 'error' | 'unknown';

export type PublishStatus = 'pending' | 'success' | 'failed' | 'synced' | 'syncing';

// Site/Collection Types
export interface Site {
  id: string;
  name: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  fields: Field[];
  metadata?: Record<string, unknown>;
}

export interface Field {
  id: string;
  name: string;
  slug: string;
  type: FieldType;
  required?: boolean;
  options?: FieldOption[];
  metadata?: Record<string, unknown>;
}

export type FieldType = 
  | 'text' 
  | 'rich-text' 
  | 'image' 
  | 'date' 
  | 'number' 
  | 'boolean' 
  | 'option' 
  | 'multi-option' 
  | 'file' 
  | 'link' 
  | 'reference';

export interface FieldOption {
  id: string;
  name: string;
  value: string;
}

// Field Mapping Types
export interface FieldMapping {
  blogField: BlogField;
  targetField: string; // Field slug/ID in target system
  transform?: FieldTransform;
}

export type BlogField = 
  | 'title' 
  | 'content' 
  | 'excerpt' 
  | 'author' 
  | 'published_at' 
  | 'featured_image' 
  | 'tags' 
  | 'categories' 
  | 'seo_title' 
  | 'seo_description' 
  | 'slug';

export interface FieldTransform {
  type: 'none' | 'html-to-markdown' | 'markdown-to-html' | 'date-format' | 'custom';
  config?: Record<string, unknown>;
}

// Connection Types
export interface ConnectionConfig {
  apiToken?: string;
  apiKey?: string;
  siteId?: string;
  collectionId?: string;
  endpoint?: string;
  [key: string]: unknown; // Allow provider-specific config
}

export interface ConnectionResult {
  success: boolean;
  integrationId?: string;
  error?: string;
  sites?: Site[];
  metadata?: Record<string, unknown>;
}

// Publishing Types
export interface PublishRequest {
  postId: string;
  integrationId: string;
  siteId?: string;
  collectionId?: string;
  fieldMappings?: FieldMapping[];
  publishImmediately?: boolean;
  metadata?: Record<string, unknown>;
}

export interface PublishResult {
  success: boolean;
  itemId?: string;
  externalUrl?: string;
  publishedAt?: string;
  error?: string;
  errorCode?: string;
  metadata?: Record<string, unknown>;
}

export interface SyncStatus {
  status: PublishStatus;
  lastSyncedAt?: string;
  externalId?: string;
  externalUrl?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Health Check Types
export interface HealthCheck {
  status: HealthStatus;
  message?: string;
  lastChecked?: string;
  details?: Record<string, unknown>;
}

// Integration Provider Interface
export interface IIntegrationProvider {
  /**
   * Get the type/name of this integration provider
   */
  readonly type: IntegrationType;
  
  /**
   * Get display name for this provider
   */
  readonly displayName: string;
  
  /**
   * Get description of this provider
   */
  readonly description: string;
  
  /**
   * Get icon/logo URL for this provider
   */
  readonly icon?: string;
  
  /**
   * Connect to the integration service
   */
  connect(config: ConnectionConfig): Promise<ConnectionResult>;
  
  /**
   * Disconnect from the integration service
   */
  disconnect(integrationId: string): Promise<void>;
  
  /**
   * Validate connection credentials
   */
  validateConnection(config: ConnectionConfig): Promise<boolean>;
  
  /**
   * Test the connection and return health status
   */
  testConnection(config: ConnectionConfig): Promise<HealthCheck>;
  
  /**
   * Get list of available sites/workspaces
   */
  getSites(config: ConnectionConfig): Promise<Site[]>;
  
  /**
   * Get list of collections/content types for a site
   */
  getCollections(config: ConnectionConfig, siteId: string): Promise<Collection[]>;
  
  /**
   * Get field schema for a collection
   */
  getFieldSchema(config: ConnectionConfig, collectionId: string): Promise<Field[]>;
  
  /**
   * Publish a blog post to the integration
   */
  publish(request: PublishRequest, blogPost: BlogPostData): Promise<PublishResult>;
  
  /**
   * Update an existing published post
   */
  update(request: PublishRequest, blogPost: BlogPostData, externalId: string): Promise<PublishResult>;
  
  /**
   * Delete a published post
   */
  delete(config: ConnectionConfig, externalId: string): Promise<boolean>;
  
  /**
   * Get sync status of a published post
   */
  getStatus(config: ConnectionConfig, externalId: string): Promise<SyncStatus>;
  
  /**
   * Get required configuration fields for this provider
   */
  getRequiredConfigFields(): ConfigField[];
  
  /**
   * Validate configuration before saving
   */
  validateConfig(config: ConnectionConfig): ValidationResult;
}

// Blog Post Data Structure
export interface BlogPostData {
  post_id: string;
  title: string;
  content: string | null;
  excerpt: string | null;
  author?: string;
  published_at?: string;
  featured_image?: string;
  tags?: string[];
  categories?: string[];
  seo_title?: string;
  seo_description?: string;
  slug?: string;
  metadata?: Record<string, unknown>;
}

// Configuration Field Types
export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'select' | 'multiselect';
  required: boolean;
  description?: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors?: Record<string, string>;
}

// Integration Instance (Database Model)
export interface Integration {
  integration_id: string;
  org_id: string;
  type: IntegrationType;
  name: string;
  status: IntegrationStatus;
  config: ConnectionConfig;
  field_mappings?: FieldMapping[];
  health_status: HealthStatus;
  last_sync?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// Publish Log Entry
export interface PublishLog {
  log_id: string;
  org_id: string;
  post_id: string;
  integration_id: string;
  status: PublishStatus;
  external_id?: string;
  external_url?: string;
  error_message?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

