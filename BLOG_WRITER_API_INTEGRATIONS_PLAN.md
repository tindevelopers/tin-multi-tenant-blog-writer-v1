# Blog Writer API Integrations Endpoint - Integration Plan

## 📋 Overview

This document outlines the plan to integrate with the Blog Writer API's new integrations endpoint (`/api/v1/integrations`). This will allow us to leverage the Blog Writer API's native integration capabilities while maintaining our abstraction layer for flexibility.

**API Documentation**: https://blog-writer-api-dev-613248238610.europe-west1.run.app/docs

---

## 🔍 Phase 0: API Research & Discovery

### 0.1 Research API Documentation

**Tasks:**
1. **Access API Documentation**
   - Visit: https://blog-writer-api-dev-613248238610.europe-west1.run.app/docs
   - Document all available endpoints under `/api/v1/integrations`
   - Identify request/response schemas
   - Note authentication requirements
   - Document error codes and handling

2. **Expected Endpoints** (to verify):
   ```
   GET    /api/v1/integrations              # List available integrations
   GET    /api/v1/integrations/{type}       # Get integration details
   POST   /api/v1/integrations/{type}/connect    # Connect to integration
   POST   /api/v1/integrations/{type}/disconnect  # Disconnect
   GET    /api/v1/integrations/{type}/sites       # Get sites/workspaces
   GET    /api/v1/integrations/{type}/collections  # Get collections
   POST   /api/v1/integrations/{type}/publish     # Publish content
   PUT    /api/v1/integrations/{type}/publish/{id} # Update published content
   DELETE /api/v1/integrations/{type}/publish/{id} # Delete published content
   GET    /api/v1/integrations/{type}/status/{id} # Get publish status
   ```

3. **Integration Types** (to verify):
   - `webflow` - Webflow CMS publishing
   - `wordpress` - WordPress publishing
   - `shopify` - Shopify blog publishing
   - `medium` - Medium publishing
   - Others as documented

### 0.2 Create API Client Methods

**File**: `src/lib/blog-writer-api.ts`

**Add new methods:**
```typescript
// Integration-related methods
async getAvailableIntegrations(): Promise<IntegrationType[]>
async getIntegrationDetails(type: IntegrationType): Promise<IntegrationDetails>
async connectIntegration(type: IntegrationType, config: ConnectionConfig): Promise<ConnectionResult>
async disconnectIntegration(type: IntegrationType, integrationId: string): Promise<void>
async getIntegrationSites(type: IntegrationType, config: ConnectionConfig): Promise<Site[]>
async getIntegrationCollections(type: IntegrationType, config: ConnectionConfig, siteId: string): Promise<Collection[]>
async publishToIntegration(type: IntegrationType, config: ConnectionConfig, publishRequest: PublishRequest): Promise<PublishResult>
async updatePublishedContent(type: IntegrationType, config: ConnectionConfig, externalId: string, updates: Partial<PublishRequest>): Promise<PublishResult>
async deletePublishedContent(type: IntegrationType, config: ConnectionConfig, externalId: string): Promise<boolean>
async getPublishStatus(type: IntegrationType, config: ConnectionConfig, externalId: string): Promise<SyncStatus>
```

### 0.3 Create API Route Proxies

**Files to create:**
- `src/app/api/blog-writer/integrations/route.ts` - List/get integrations
- `src/app/api/blog-writer/integrations/[type]/route.ts` - Integration-specific operations
- `src/app/api/blog-writer/integrations/[type]/connect/route.ts` - Connection management
- `src/app/api/blog-writer/integrations/[type]/sites/route.ts` - Get sites
- `src/app/api/blog-writer/integrations/[type]/collections/route.ts` - Get collections
- `src/app/api/blog-writer/integrations/[type]/publish/route.ts` - Publish content
- `src/app/api/blog-writer/integrations/[type]/publish/[id]/route.ts` - Update/delete published content
- `src/app/api/blog-writer/integrations/[type]/status/[id]/route.ts` - Get publish status

**Security Pattern:**
1. Validate Supabase JWT token
2. Extract `user_id` and `org_id`
3. Check API quota for organization
4. Proxy request to Blog Writer API
5. Log usage to `api_usage_logs`
6. Update org quota usage
7. Return response

---

## 🏗️ Phase 1: Blog Writer API Integration Provider

### 1.1 Create BlogWriterAPIProvider

**File**: `src/lib/integrations/providers/blog-writer-api-provider.ts`

**Purpose**: A provider that uses the Blog Writer API as the backend for integration operations, while maintaining our abstraction layer interface.

**Implementation Strategy:**
- Implements `IIntegrationProvider` interface
- Delegates actual integration operations to Blog Writer API
- Handles authentication, error handling, and retries
- Maps Blog Writer API responses to our abstraction layer types

**Key Features:**
- Uses `blogWriterAPI` client for all API calls
- Handles OAuth flows (if required by Blog Writer API)
- Manages connection state
- Provides health checks
- Supports field mapping

### 1.2 Integration Flow

```
User Action → IntegrationManager → BlogWriterAPIProvider → Blog Writer API
                                                              ↓
                                                         External Service
                                                         (Webflow/WordPress/etc.)
```

**Benefits:**
- Single source of truth for integration logic (Blog Writer API)
- Consistent error handling and retry logic
- Centralized authentication management
- Easier to maintain and update

---

## 🔄 Phase 2: Hybrid Integration Strategy

### 2.1 Provider Selection Logic

**Strategy**: Support both direct providers AND Blog Writer API providers

**File**: `src/lib/integrations/registry.ts`

**Update registry to support:**
- **Direct Providers**: Implement integration directly (e.g., `WebflowProvider`)
- **API Providers**: Use Blog Writer API (e.g., `BlogWriterAPIWebflowProvider`)

**Selection Logic:**
```typescript
// Check if Blog Writer API integration is available
if (blogWriterAPI.hasIntegration(type)) {
  return new BlogWriterAPIProvider(type);
} else {
  return getDirectProvider(type); // Fallback to direct implementation
}
```

### 2.2 Configuration Options

**Add to Integration Config:**
```typescript
interface IntegrationConfig {
  // ... existing fields
  useBlogWriterAPI?: boolean; // Default: true if available
  apiEndpoint?: string; // Override Blog Writer API endpoint
}
```

---

## 📊 Phase 3: Implementation Details

### 3.1 Blog Writer API Client Extensions

**File**: `src/lib/blog-writer-api.ts`

**Add integration methods:**

```typescript
class BlogWriterAPI {
  // ... existing methods

  /**
   * Get list of available integrations from Blog Writer API
   */
  async getAvailableIntegrations(): Promise<{
    integrations: Array<{
      type: string;
      name: string;
      description: string;
      supported_operations: string[];
      auth_type: 'oauth' | 'api_key' | 'token';
    }>;
  }> {
    return await this.makeRequest('/api/v1/integrations');
  }

  /**
   * Get integration details
   */
  async getIntegrationDetails(type: string): Promise<IntegrationDetails> {
    return await this.makeRequest(`/api/v1/integrations/${type}`);
  }

  /**
   * Connect to an integration
   */
  async connectIntegration(
    type: string,
    config: Record<string, unknown>
  ): Promise<ConnectionResult> {
    return await this.makeRequest(`/api/v1/integrations/${type}/connect`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  /**
   * Get sites/workspaces for an integration
   */
  async getIntegrationSites(
    type: string,
    config: Record<string, unknown>
  ): Promise<Site[]> {
    return await this.makeRequest(`/api/v1/integrations/${type}/sites`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  /**
   * Get collections for a site
   */
  async getIntegrationCollections(
    type: string,
    siteId: string,
    config: Record<string, unknown>
  ): Promise<Collection[]> {
    return await this.makeRequest(
      `/api/v1/integrations/${type}/collections`,
      {
        method: 'POST',
        body: JSON.stringify({ site_id: siteId, ...config }),
      }
    );
  }

  /**
   * Publish content to integration
   */
  async publishToIntegration(
    type: string,
    publishRequest: {
      site_id?: string;
      collection_id?: string;
      content: Record<string, unknown>;
      config: Record<string, unknown>;
    }
  ): Promise<PublishResult> {
    return await this.makeRequest(`/api/v1/integrations/${type}/publish`, {
      method: 'POST',
      body: JSON.stringify(publishRequest),
    });
  }

  /**
   * Update published content
   */
  async updatePublishedContent(
    type: string,
    externalId: string,
    updates: Record<string, unknown>
  ): Promise<PublishResult> {
    return await this.makeRequest(
      `/api/v1/integrations/${type}/publish/${externalId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );
  }

  /**
   * Delete published content
   */
  async deletePublishedContent(
    type: string,
    externalId: string
  ): Promise<boolean> {
    await this.makeRequest(
      `/api/v1/integrations/${type}/publish/${externalId}`,
      {
        method: 'DELETE',
      }
    );
    return true;
  }

  /**
   * Get publish status
   */
  async getPublishStatus(
    type: string,
    externalId: string
  ): Promise<SyncStatus> {
    return await this.makeRequest(
      `/api/v1/integrations/${type}/status/${externalId}`
    );
  }
}
```

### 3.2 BlogWriterAPIProvider Implementation

**File**: `src/lib/integrations/providers/blog-writer-api-provider.ts`

```typescript
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
} from '../types';

export class BlogWriterAPIProvider extends BaseIntegrationProvider
  implements IIntegrationProvider {
  readonly type: IntegrationType;
  readonly displayName: string;
  readonly description: string;
  readonly icon?: string;

  constructor(type: IntegrationType) {
    super();
    this.type = type;
    // Initialize from Blog Writer API integration details
    this.displayName = `Blog Writer API - ${type}`;
    this.description = `Publish via Blog Writer API to ${type}`;
  }

  async connect(config: ConnectionConfig): Promise<ConnectionResult> {
    try {
      const result = await blogWriterAPI.connectIntegration(
        this.type,
        config as Record<string, unknown>
      );
      return {
        success: result.success || false,
        integrationId: result.integrationId,
        error: result.error,
        metadata: result.metadata,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Connection failed',
      };
    }
  }

  async disconnect(integrationId: string): Promise<void> {
    await blogWriterAPI.disconnectIntegration(this.type, integrationId);
  }

  async validateConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const health = await this.testConnection(config);
      return health.status === 'healthy';
    } catch {
      return false;
    }
  }

  async testConnection(config: ConnectionConfig): Promise<HealthCheck> {
    try {
      // Use Blog Writer API health check endpoint if available
      const status = await blogWriterAPI.getPublishStatus(
        this.type,
        'test' // Test endpoint
      );
      return {
        status: 'healthy',
        message: 'Connection successful',
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Connection test failed',
      };
    }
  }

  async getSites(config: ConnectionConfig): Promise<Site[]> {
    const sites = await blogWriterAPI.getIntegrationSites(
      this.type,
      config as Record<string, unknown>
    );
    return sites.map((site: any) => ({
      id: site.id,
      name: site.name,
      url: site.url,
      metadata: site.metadata,
    }));
  }

  async getCollections(
    config: ConnectionConfig,
    siteId: string
  ): Promise<Collection[]> {
    const collections = await blogWriterAPI.getIntegrationCollections(
      this.type,
      siteId,
      config as Record<string, unknown>
    );
    return collections.map((coll: any) => ({
      id: coll.id,
      name: coll.name,
      slug: coll.slug,
      fields: coll.fields || [],
      metadata: coll.metadata,
    }));
  }

  async getFieldSchema(
    config: ConnectionConfig,
    collectionId: string
  ): Promise<Field[]> {
    // Get collections and find the one matching collectionId
    const siteId = (config as any).siteId;
    if (!siteId) throw new Error('siteId required in config');

    const collections = await this.getCollections(config, siteId);
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) throw new Error('Collection not found');

    return collection.fields;
  }

  async publish(
    request: PublishRequest,
    blogPost: BlogPostData
  ): Promise<PublishResult> {
    try {
      const result = await blogWriterAPI.publishToIntegration(
        this.type,
        {
          site_id: request.siteId,
          collection_id: request.collectionId,
          content: {
            title: blogPost.title,
            content: blogPost.content,
            excerpt: blogPost.excerpt,
            // Map other fields based on fieldMappings
            ...this.mapBlogPostToIntegration(blogPost, request.fieldMappings),
          },
          config: request.metadata || {},
        }
      );

      return {
        success: result.success || false,
        itemId: result.externalId,
        externalUrl: result.externalUrl,
        publishedAt: result.publishedAt,
        error: result.error,
        metadata: result.metadata,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Publishing failed',
      };
    }
  }

  async update(
    request: PublishRequest,
    blogPost: BlogPostData,
    externalId: string
  ): Promise<PublishResult> {
    try {
      const result = await blogWriterAPI.updatePublishedContent(
        this.type,
        externalId,
        {
          title: blogPost.title,
          content: blogPost.content,
          excerpt: blogPost.excerpt,
          ...this.mapBlogPostToIntegration(blogPost, request.fieldMappings),
        }
      );

      return {
        success: result.success || false,
        itemId: result.externalId,
        externalUrl: result.externalUrl,
        publishedAt: result.publishedAt,
        error: result.error,
        metadata: result.metadata,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Update failed',
      };
    }
  }

  async delete(config: ConnectionConfig, externalId: string): Promise<boolean> {
    try {
      await blogWriterAPI.deletePublishedContent(this.type, externalId);
      return true;
    } catch {
      return false;
    }
  }

  async getStatus(
    config: ConnectionConfig,
    externalId: string
  ): Promise<SyncStatus> {
    try {
      const status = await blogWriterAPI.getPublishStatus(
        this.type,
        externalId
      );
      return {
        status: status.status as any,
        lastSyncedAt: status.lastSyncedAt,
        externalId: status.externalId,
        externalUrl: status.externalUrl,
        error: status.error,
        metadata: status.metadata,
      };
    } catch (error: any) {
      return {
        status: 'error',
        error: error.message || 'Failed to get status',
      };
    }
  }

  // Helper method to map blog post fields to integration fields
  private mapBlogPostToIntegration(
    blogPost: BlogPostData,
    fieldMappings?: FieldMapping[]
  ): Record<string, unknown> {
    if (!fieldMappings || fieldMappings.length === 0) {
      // Default mapping
      return {
        title: blogPost.title,
        content: blogPost.content,
        excerpt: blogPost.excerpt,
      };
    }

    const mapped: Record<string, unknown> = {};
    for (const mapping of fieldMappings) {
      const sourceValue = this.getBlogPostFieldValue(
        blogPost,
        mapping.blogField
      );
      mapped[mapping.targetField] = this.applyTransform(
        sourceValue,
        mapping.transform
      );
    }
    return mapped;
  }

  private getBlogPostFieldValue(
    blogPost: BlogPostData,
    field: BlogField
  ): unknown {
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
        return null;
    }
  }

  private applyTransform(
    value: unknown,
    transform?: FieldTransform
  ): unknown {
    if (!transform || transform.type === 'none') {
      return value;
    }

    // Implement transformations as needed
    // This is a placeholder - implement based on actual needs
    return value;
  }

  getRequiredConfigFields(): ConfigField[] {
    // Return required fields based on integration type
    // This should be fetched from Blog Writer API integration details
    return [];
  }

  validateConfig(config: ConnectionConfig): ValidationResult {
    // Validate config based on integration type requirements
    return { valid: true };
  }
}
```

---

## 🧪 Phase 4: Testing & Validation

### 4.1 API Endpoint Testing

**Create test script**: `scripts/test-blog-writer-integrations.ts`

```typescript
// Test each endpoint:
1. GET /api/v1/integrations - List available integrations
2. GET /api/v1/integrations/webflow - Get Webflow integration details
3. POST /api/v1/integrations/webflow/connect - Test connection
4. GET /api/v1/integrations/webflow/sites - Get sites
5. GET /api/v1/integrations/webflow/collections - Get collections
6. POST /api/v1/integrations/webflow/publish - Test publish
```

### 4.2 Integration Testing

**Test scenarios:**
1. Connect to Webflow via Blog Writer API
2. List sites and collections
3. Publish a blog post
4. Update published post
5. Check publish status
6. Delete published post
7. Disconnect integration

---

## 📝 Phase 5: Documentation & Migration

### 5.1 Update Documentation

**Files to update:**
- `src/lib/integrations/README.md` - Add Blog Writer API provider docs
- `MULTI_TENANT_IMPLEMENTATION_PLAN.md` - Update integration section
- Create `BLOG_WRITER_API_INTEGRATION_GUIDE.md` - User guide

### 5.2 Migration Path

**For existing integrations:**
1. Check if Blog Writer API supports the integration type
2. If yes, migrate to Blog Writer API provider
3. If no, keep using direct provider
4. Update UI to show which provider is being used

---

## 🎯 Implementation Checklist

### Phase 0: Research
- [ ] Access Blog Writer API documentation
- [ ] Document all `/api/v1/integrations` endpoints
- [ ] Document request/response schemas
- [ ] Document authentication requirements
- [ ] Document error codes

### Phase 1: API Client
- [ ] Add integration methods to `blog-writer-api.ts`
- [ ] Create API route proxies
- [ ] Add error handling and retry logic
- [ ] Add request/response logging

### Phase 2: Provider Implementation
- [ ] Create `BlogWriterAPIProvider` class
- [ ] Implement all `IIntegrationProvider` methods
- [ ] Add field mapping logic
- [ ] Add error handling

### Phase 3: Registry Integration
- [ ] Update registry to support Blog Writer API providers
- [ ] Add provider selection logic
- [ ] Add configuration options

### Phase 4: Testing
- [ ] Create test scripts
- [ ] Test all endpoints
- [ ] Test error scenarios
- [ ] Test field mapping

### Phase 5: Documentation
- [ ] Update integration README
- [ ] Create user guide
- [ ] Update API documentation

---

## 🔗 Related Files

- `src/lib/blog-writer-api.ts` - Main API client
- `src/lib/integrations/types.ts` - Type definitions
- `src/lib/integrations/base-provider.ts` - Base provider class
- `src/lib/integrations/registry.ts` - Provider registry
- `src/lib/integrations/integration-manager.ts` - Integration manager service
- `src/app/api/blog-writer/*` - API route proxies

---

## 📚 References

- **Blog Writer API Docs**: https://blog-writer-api-dev-613248238610.europe-west1.run.app/docs
- **Integration Abstraction Layer**: `src/lib/integrations/README.md`
- **Webflow Publishing Plan**: `WEBFLOW_PUBLISHING_IMPLEMENTATION_PLAN.md`

---

## 🚀 Next Steps

1. **Immediate**: Access API documentation and document endpoints
2. **Short-term**: Implement API client methods and route proxies
3. **Medium-term**: Create BlogWriterAPIProvider
4. **Long-term**: Migrate existing integrations to use Blog Writer API where possible

