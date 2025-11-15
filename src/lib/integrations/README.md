# Integration Abstraction Layer

This directory contains the abstraction layer for managing multiple integration providers (Webflow, WordPress, Shopify, etc.).

## Architecture

### Core Components

1. **Types** (`types.ts`)
   - Defines `IIntegrationProvider` interface
   - Common types for all integrations
   - Field mapping types
   - Publishing types

2. **Base Provider** (`base-provider.ts`)
   - Abstract base class with common functionality
   - Retry logic, rate limiting, field transformation
   - All providers extend this class

3. **Registry** (`registry.ts`)
   - Central registry for provider instances
   - Factory pattern for creating providers
   - Singleton instances

4. **Integration Manager** (`integration-manager.ts`)
   - High-level service for managing integrations
   - CRUD operations
   - Publishing coordination
   - Status tracking

## Usage

### Registering a Provider

```typescript
import { registerProvider } from '@/lib/integrations';
import { WebflowProvider } from '@/lib/integrations/providers/webflow';

registerProvider('webflow', WebflowProvider);
```

### Using the Manager

```typescript
import { integrationManager } from '@/lib/integrations';

// Get all integrations
const integrations = await integrationManager.getIntegrations(orgId);

// Create integration
const integration = await integrationManager.createIntegration(
  orgId,
  'webflow',
  'My Webflow Site',
  { apiToken: '...', siteId: '...' }
);

// Publish a post
const result = await integrationManager.publishPost(
  postId,
  integrationId,
  blogPostData
);
```

### Creating a New Provider

1. Extend `BaseIntegrationProvider`
2. Implement all abstract methods
3. Register in `providers/index.ts`
4. Add to `IntegrationType` union type

Example:

```typescript
import { BaseIntegrationProvider } from '../base-provider';
import type { IIntegrationProvider, IntegrationType } from '../types';

export class WebflowProvider extends BaseIntegrationProvider {
  readonly type: IntegrationType = 'webflow';
  readonly displayName = 'Webflow';
  readonly description = 'Publish to Webflow CMS';
  
  async validateConnection(config: ConnectionConfig): Promise<boolean> {
    // Implementation
  }
  
  async getSites(config: ConnectionConfig): Promise<Site[]> {
    // Implementation
  }
  
  // ... implement other abstract methods
}
```

## Database Schema

See `supabase/migrations/20250110000000_create_integrations_abstraction.sql`

- `integrations` table: Stores integration connections
- `integration_publish_logs` table: Tracks publishing attempts

## API Routes

- `GET /api/integrations` - List all integrations
- `POST /api/integrations` - Create integration
- `GET /api/integrations/[id]` - Get integration
- `PUT /api/integrations/[id]` - Update integration
- `DELETE /api/integrations/[id]` - Delete integration
- `POST /api/integrations/[id]/test` - Test connection

## Security

- All API tokens stored encrypted in `config` JSONB field
- RLS policies ensure org-level isolation
- Only owners/admins can manage integrations
- All providers validate config before saving

