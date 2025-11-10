/**
 * Blog Writer API Integration Provider
 * 
 * This provider uses the Blog Writer API as the backend for integration operations.
 * It implements the IIntegrationProvider interface while delegating actual operations
 * to the Blog Writer API's integration endpoints.
 */

import { BaseIntegrationProvider } from '../base-provider';
import { blogWriterAPI } from '@/lib/blog-writer-api';
import type {
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
  PublishStatus,
} from '../types';

/**
 * Supported Blog Writer API provider types
 */
type BlogWriterAPIProviderType = 'webflow' | 'wordpress' | 'shopify';

/**
 * Blog Writer API Integration Provider
 * 
 * Delegates integration operations to the Blog Writer API while maintaining
 * compatibility with the abstraction layer interface.
 */
export class BlogWriterAPIProvider extends BaseIntegrationProvider
  implements IIntegrationProvider {
  readonly type: IntegrationType;
  readonly displayName: string;
  readonly description: string;
  readonly icon?: string;
  private readonly apiProviderType: BlogWriterAPIProviderType;

  constructor(type?: BlogWriterAPIProviderType) {
    super();
    // Default to webflow if no type provided (for registry compatibility)
    this.apiProviderType = type || 'webflow';
    this.type = this.apiProviderType as IntegrationType;
    
    // Set display name and description based on provider type
    const providerInfo = this.getProviderInfo(this.apiProviderType);
    this.displayName = `Blog Writer API - ${providerInfo.name}`;
    this.description = `Integration via Blog Writer API for ${providerInfo.name}`;
    this.icon = providerInfo.icon;
  }

  /**
   * Connect to the integration service via Blog Writer API
   */
  async connect(config: ConnectionConfig): Promise<ConnectionResult> {
    try {
      // Extract keywords from config if provided
      const keywords = (config.keywords as string[]) || [];
      
      // Call Blog Writer API's connect-and-recommend endpoint
      const result = await blogWriterAPI.connectAndRecommend({
        provider: this.apiProviderType,
        connection: config as Record<string, unknown>,
        keywords,
      });

      return {
        success: result.saved_integration,
        integrationId: undefined, // Will be set by caller after saving to DB
        metadata: {
          recommended_backlinks: result.recommended_backlinks,
          recommended_interlinks: result.recommended_interlinks,
          per_keyword: result.per_keyword,
          notes: result.notes,
          provider: result.provider,
        },
      };
    } catch (error: any) {
      console.error(`Failed to connect to ${this.type}:`, error);
      return {
        success: false,
        error: error.message || 'Connection failed',
      };
    }
  }

  /**
   * Disconnect from the integration service
   * Note: Blog Writer API doesn't have a disconnect endpoint, so this is a no-op
   */
  async disconnect(integrationId: string): Promise<void> {
    console.log(`Disconnecting ${this.type} integration ${integrationId}`);
    // Blog Writer API doesn't have a disconnect endpoint
    // The integration is managed locally in our database
  }

  /**
   * Validate connection credentials
   */
  async validateConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const health = await this.testConnection(config);
      return health.status === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * Test the connection and return health status
   */
  async testConnection(config: ConnectionConfig): Promise<HealthCheck> {
    try {
      // Test connection by attempting to get recommendations with empty keywords
      // This validates the connection without requiring keywords
      const result = await blogWriterAPI.getRecommendations({
        provider: this.apiProviderType,
        keywords: [], // Empty keywords array for connection test
      });

      return {
        status: 'healthy',
        message: 'Connection successful',
        details: {
          provider: result.provider,
        },
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Connection test failed',
        details: {
          error: error.message,
        },
      };
    }
  }

  /**
   * Get list of available sites/workspaces
   * Note: Blog Writer API doesn't expose this directly, return empty array
   */
  async getSites(config: ConnectionConfig): Promise<Site[]> {
    // Blog Writer API doesn't have a sites endpoint
    // Sites are managed through the connection config
    return [];
  }

  /**
   * Get list of collections/content types for a site
   * Note: Blog Writer API doesn't expose this directly, return empty array
   */
  async getCollections(config: ConnectionConfig, siteId: string): Promise<Collection[]> {
    // Blog Writer API doesn't have a collections endpoint
    // Collections are managed through the connection config
    return [];
  }

  /**
   * Get field schema for a collection
   * Note: Blog Writer API doesn't expose this directly, return empty array
   */
  async getFieldSchema(config: ConnectionConfig, collectionId: string): Promise<Field[]> {
    // Blog Writer API doesn't have a field schema endpoint
    // Field mappings are managed through the connection config
    return [];
  }

  /**
   * Provider-specific publish implementation
   * Note: Blog Writer API integration endpoints focus on recommendations, not publishing
   * Publishing would be handled by platform-specific endpoints (e.g., /api/v1/publish/webflow)
   */
  protected async doPublish(
    request: PublishRequest,
    transformedData: Record<string, unknown>
  ): Promise<PublishResult> {
    // Blog Writer API integration endpoints focus on recommendations, not publishing
    // Publishing would be handled by platform-specific endpoints (e.g., /api/v1/publish/webflow)
    // This is a placeholder that could be extended if Blog Writer API adds publishing to integration endpoints
    
    return {
      success: false,
      error: 'Publishing via Blog Writer API integration endpoint is not yet supported. Use platform-specific publish endpoints.',
    };
  }

  /**
   * Provider-specific update implementation
   */
  protected async doUpdate(
    request: PublishRequest,
    transformedData: Record<string, unknown>,
    externalId: string
  ): Promise<PublishResult> {
    // Similar to publish, this would use platform-specific endpoints
    return {
      success: false,
      error: 'Updating via Blog Writer API integration endpoint is not yet supported. Use platform-specific publish endpoints.',
    };
  }

  /**
   * Delete a published post
   */
  async delete(config: ConnectionConfig, externalId: string): Promise<boolean> {
    // Similar to publish, this would use platform-specific endpoints
    return false;
  }

  /**
   * Get sync status of a published post
   */
  async getStatus(
    config: ConnectionConfig,
    externalId: string
  ): Promise<SyncStatus> {
    // Blog Writer API doesn't expose sync status through integration endpoints
    return {
      status: 'unknown' as PublishStatus,
      error: 'Status check via Blog Writer API integration endpoint is not supported',
    };
  }

  /**
   * Get required configuration fields for this provider
   */
  getRequiredConfigFields(): ConfigField[] {
    const baseFields: ConfigField[] = [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        description: `API key for ${this.getProviderInfo(this.type as BlogWriterAPIProviderType).name}`,
        placeholder: 'Enter your API key',
      },
    ];

    // Add provider-specific fields
    switch (this.type) {
      case 'webflow':
        return [
          ...baseFields,
          {
            key: 'siteId',
            label: 'Site ID',
            type: 'text',
            required: true,
            description: 'Your Webflow site ID',
            placeholder: 'Enter site ID',
          },
          {
            key: 'collectionId',
            label: 'Collection ID',
            type: 'text',
            required: false,
            description: 'Target CMS collection ID',
            placeholder: 'Enter collection ID (optional)',
          },
        ];

      case 'wordpress':
        return [
          ...baseFields,
          {
            key: 'endpoint',
            label: 'WordPress REST API Endpoint',
            type: 'url',
            required: true,
            description: 'Your WordPress site REST API endpoint',
            placeholder: 'https://yoursite.com/wp-json/wp/v2',
          },
        ];

      case 'shopify':
        return [
          ...baseFields,
          {
            key: 'shop',
            label: 'Shop Domain',
            type: 'text',
            required: true,
            description: 'Your Shopify shop domain',
            placeholder: 'your-shop.myshopify.com',
          },
        ];

      default:
        return baseFields;
    }
  }

  /**
   * Validate configuration before saving
   */
  validateConfig(config: ConnectionConfig): ValidationResult {
    const errors: Record<string, string> = {};
    const requiredFields = this.getRequiredConfigFields().filter(f => f.required);

    for (const field of requiredFields) {
      const value = config[field.key];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors[field.key] = `${field.label} is required`;
      }
    }

    // Provider-specific validation
    if (this.type === 'wordpress' && config.endpoint) {
      try {
        new URL(config.endpoint as string);
      } catch {
        errors.endpoint = 'Invalid URL format';
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    };
  }

  /**
   * Get provider-specific information
   */
  private getProviderInfo(type: BlogWriterAPIProviderType): {
    name: string;
    icon?: string;
  } {
    switch (type) {
      case 'webflow':
        return {
          name: 'Webflow',
          icon: '/images/brand/brand-10.svg',
        };
      case 'wordpress':
        return {
          name: 'WordPress',
          icon: '/images/brand/brand-02.svg',
        };
      case 'shopify':
        return {
          name: 'Shopify',
          icon: '/images/brand/brand-09.svg',
        };
      default:
        return {
          name: type,
        };
    }
  }
}

/**
 * Provider-specific wrapper classes for registry compatibility
 * Each provider type needs its own class instance
 */
export class BlogWriterAPIWebflowProvider extends BlogWriterAPIProvider {
  constructor() {
    super('webflow');
  }
}

export class BlogWriterAPIWordPressProvider extends BlogWriterAPIProvider {
  constructor() {
    super('wordpress');
  }
}

export class BlogWriterAPIShopifyProvider extends BlogWriterAPIProvider {
  constructor() {
    super('shopify');
  }
}

