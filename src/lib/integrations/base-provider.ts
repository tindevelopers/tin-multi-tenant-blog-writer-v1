/**
 * Base Integration Provider
 * 
 * Abstract base class that provides common functionality for all integration providers.
 * All providers should extend this class and implement the abstract methods.
 */

import type {
import { logger } from '@/utils/logger';
  IIntegrationProvider,
  IntegrationType,
  ConnectionConfig,
  ConnectionResult,
  HealthCheck,
  Site,
  Collection,
  Field,
  PublishRequest,
  PublishResult,
  SyncStatus,
  BlogPostData,
  ConfigField,
  ValidationResult,
  FieldMapping,
} from './types';

export abstract class BaseIntegrationProvider implements IIntegrationProvider {
  abstract readonly type: IntegrationType;
  abstract readonly displayName: string;
  abstract readonly description: string;
  abstract readonly icon?: string;

  /**
   * Default retry configuration
   */
  protected readonly retryConfig = {
    maxRetries: 3,
    retryDelay: 1000, // milliseconds
    backoffMultiplier: 2,
  };

  /**
   * Rate limiting configuration
   */
  protected readonly rateLimitConfig = {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
  };

  /**
   * Connect to the integration service
   * Base implementation handles common logic, delegates to provider-specific connect
   */
  async connect(config: ConnectionConfig): Promise<ConnectionResult> {
    try {
      // Validate configuration
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid configuration: ${Object.values(validation.errors || {}).join(', ')}`,
        };
      }

      // Validate connection
      const isValid = await this.validateConnection(config);
      if (!isValid) {
        return {
          success: false,
          error: 'Invalid credentials or connection failed',
        };
      }

      // Get sites if applicable
      let sites: Site[] = [];
      try {
        sites = await this.getSites(config);
      } catch (error) {
        // Some providers might not have sites concept
        logger.warn(`Failed to fetch sites for ${this.type}:`, error);
      }

      return {
        success: true,
        sites,
        metadata: {
          connectedAt: new Date().toISOString(),
          provider: this.type,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during connection',
      };
    }
  }

  /**
   * Disconnect from the integration service
   * Base implementation - providers can override if needed
   */
  async disconnect(integrationId: string): Promise<void> {
    // Base implementation - most providers don't need special disconnect logic
    // Credentials are just removed from database
    logger.debug(`Disconnecting ${this.type} integration: ${integrationId}`);
  }

  /**
   * Validate connection credentials
   * Must be implemented by each provider
   */
  abstract validateConnection(config: ConnectionConfig): Promise<boolean>;

  /**
   * Test the connection and return health status
   * Base implementation with retry logic
   */
  async testConnection(config: ConnectionConfig): Promise<HealthCheck> {
    try {
      const isValid = await this.validateConnection(config);
      return {
        status: isValid ? 'healthy' : 'error',
        message: isValid ? 'Connection successful' : 'Connection failed',
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Connection test failed',
        lastChecked: new Date().toISOString(),
        details: {
          error: error instanceof Error ? error.stack : String(error),
        },
      };
    }
  }

  /**
   * Get list of available sites/workspaces
   * Must be implemented by each provider
   */
  abstract getSites(config: ConnectionConfig): Promise<Site[]>;

  /**
   * Get list of collections/content types for a site
   * Must be implemented by each provider
   */
  abstract getCollections(config: ConnectionConfig, siteId: string): Promise<Collection[]>;

  /**
   * Get field schema for a collection
   * Must be implemented by each provider
   */
  abstract getFieldSchema(config: ConnectionConfig, collectionId: string): Promise<Field[]>;

  /**
   * Publish a blog post to the integration
   * Base implementation handles common logic
   */
  async publish(request: PublishRequest, blogPost: BlogPostData): Promise<PublishResult> {
    try {
      // Validate request
      if (!request.integrationId || !request.postId) {
        return {
          success: false,
          error: 'Missing required fields: integrationId and postId',
        };
      }

      // Transform blog post data using field mappings
      const transformedData = this.transformData(blogPost, request.fieldMappings || []);

      // Delegate to provider-specific publish implementation
      return await this.doPublish(request, transformedData);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Publishing failed',
        errorCode: 'PUBLISH_ERROR',
      };
    }
  }

  /**
   * Provider-specific publish implementation
   * Must be implemented by each provider
   */
  protected abstract doPublish(request: PublishRequest, transformedData: Record<string, unknown>): Promise<PublishResult>;

  /**
   * Update an existing published post
   * Base implementation handles common logic
   */
  async update(request: PublishRequest, blogPost: BlogPostData, externalId: string): Promise<PublishResult> {
    try {
      if (!externalId) {
        return {
          success: false,
          error: 'External ID is required for update',
        };
      }

      // Transform blog post data
      const transformedData = this.transformData(blogPost, request.fieldMappings || []);

      // Delegate to provider-specific update implementation
      return await this.doUpdate(request, transformedData, externalId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed',
        errorCode: 'UPDATE_ERROR',
      };
    }
  }

  /**
   * Provider-specific update implementation
   * Must be implemented by each provider
   */
  protected abstract doUpdate(request: PublishRequest, transformedData: Record<string, unknown>, externalId: string): Promise<PublishResult>;

  /**
   * Delete a published post
   * Must be implemented by each provider
   */
  abstract delete(config: ConnectionConfig, externalId: string): Promise<boolean>;

  /**
   * Get sync status of a published post
   * Must be implemented by each provider
   */
  abstract getStatus(config: ConnectionConfig, externalId: string): Promise<SyncStatus>;

  /**
   * Get required configuration fields for this provider
   * Must be implemented by each provider
   */
  abstract getRequiredConfigFields(): ConfigField[];

  /**
   * Validate configuration before saving
   * Base implementation checks required fields
   */
  validateConfig(config: ConnectionConfig): ValidationResult {
    const requiredFields = this.getRequiredConfigFields();
    const errors: Record<string, string> = {};

    for (const field of requiredFields) {
      if (field.required && !config[field.key]) {
        errors[field.key] = `${field.label} is required`;
      }

      // Additional validation
      if (config[field.key] && field.validation) {
        const value = String(config[field.key]);
        
        if (field.validation.minLength && value.length < field.validation.minLength) {
          errors[field.key] = `${field.label} must be at least ${field.validation.minLength} characters`;
        }
        
        if (field.validation.maxLength && value.length > field.validation.maxLength) {
          errors[field.key] = `${field.label} must be no more than ${field.validation.maxLength} characters`;
        }
        
        if (field.validation.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(value)) {
            errors[field.key] = `${field.label} format is invalid`;
          }
        }
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    };
  }

  /**
   * Transform blog post data using field mappings
   * Common transformation logic
   */
  protected transformData(blogPost: BlogPostData, mappings: FieldMapping[]): Record<string, unknown> {
    const transformed: Record<string, unknown> = {};

    for (const mapping of mappings) {
      const value = this.getBlogFieldValue(blogPost, mapping.blogField);
      if (value !== undefined && value !== null) {
        // Apply transformation if specified
        const transformedValue = mapping.transform
          ? this.applyTransform(value, mapping.transform)
          : value;
        
        transformed[mapping.targetField] = transformedValue;
      }
    }

    return transformed;
  }

  /**
   * Get value from blog post for a specific field
   */
  protected getBlogFieldValue(blogPost: BlogPostData, field: string): unknown {
    switch (field) {
      case 'title':
        return blogPost.title;
      case 'content':
        return blogPost.content;
      case 'excerpt':
        return blogPost.excerpt;
      case 'author':
        return blogPost.author;
      case 'published_at':
        return blogPost.published_at;
      case 'featured_image':
        return blogPost.featured_image;
      case 'tags':
        return blogPost.tags;
      case 'categories':
        return blogPost.categories;
      case 'seo_title':
        return blogPost.seo_title;
      case 'seo_description':
        return blogPost.seo_description;
      case 'slug':
        return blogPost.slug;
      default:
        return blogPost.metadata?.[field];
    }
  }

  /**
   * Apply field transformation
   */
  protected applyTransform(value: unknown, transform: { type: string; config?: Record<string, unknown> }): unknown {
    switch (transform.type) {
      case 'none':
        return value;
      case 'html-to-markdown':
        // Would use a library like turndown
        return value; // Placeholder
      case 'markdown-to-html':
        // Would use a library like marked
        return value; // Placeholder
      case 'date-format':
        // Format date according to config
        return value; // Placeholder
      case 'custom':
        // Custom transformation logic
        return value; // Placeholder
      default:
        return value;
    }
  }

  /**
   * Retry wrapper for API calls
   */
  protected async withRetry<T>(
    fn: () => Promise<T>,
    retries = this.retryConfig.maxRetries,
    delay = this.retryConfig.retryDelay
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.withRetry(fn, retries - 1, delay * this.retryConfig.backoffMultiplier);
      }
      throw error;
    }
  }

  /**
   * Rate limiting helper
   */
  protected async checkRateLimit(): Promise<void> {
    // Implementation would track requests per time window
    // For now, just a placeholder
  }
}

