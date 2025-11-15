# Phased Implementation Plan: Blog Writer API Integrations + Environment-Suffixed Schema

## 📋 Executive Summary

This plan integrates the Blog Writer API's integration endpoints with our abstraction layer while supporting environment-suffixed database tables (dev/staging/prod) as shown in `supabase_schema.sql`.

**Key Findings from API Research:**
- ✅ API Documentation available at `/docs` and `/openapi.json`
- ✅ Integration endpoints exist: `/api/v1/integrations/connect-and-recommend` and `/api/v1/integrations/recommend`
- ✅ Supports providers: `webflow`, `wordpress`, `shopify` (via `ContentSystemProvider` enum)
- ✅ Provides keyword-based recommendations for backlinks/interlinks
- ✅ Environment-aware schema pattern (dev/staging/prod tables)

---

## 🎯 Phase 0: API Discovery & Schema Analysis (Week 1)

### 0.1 Document Actual API Endpoints

**Status**: ✅ Completed via research script

**Discovered Endpoints:**
```
POST /api/v1/integrations/connect-and-recommend
POST /api/v1/integrations/recommend
```

**Request Schema** (`IntegrationConnectAndRecommendRequest`):
```typescript
{
  tenant_id?: string;
  provider: 'webflow' | 'wordpress' | 'shopify';
  connection: Record<string, unknown>; // Provider-specific config
  keywords: string[]; // 1-50 keywords
}
```

**Response Schema** (`IntegrationRecommendationResponse`):
```typescript
{
  provider: string;
  tenant_id?: string;
  saved_integration: boolean;
  recommended_backlinks: number;
  recommended_interlinks: number;
  per_keyword: Array<{
    keyword: string;
    difficulty?: number;
    suggested_backlinks: number;
    suggested_interlinks: number;
  }>;
  notes?: string;
}
```

### 0.2 Schema Comparison & Migration Strategy

**Current Schema** (`supabase/migrations/20250110000000_create_integrations_abstraction.sql`):
- Unified `integrations` table (single table for all environments)
- Uses `org_id` for multi-tenancy
- Includes `field_mappings`, `health_status`, `last_sync`

**New Schema** (`supabase_schema.sql`):
- Environment-suffixed tables: `integrations_dev`, `integrations_staging`, `integrations_prod`
- Uses `tenant_id` instead of `org_id`
- Simpler structure: `id`, `tenant_id`, `provider`, `connection` (JSONB)
- Separate `recommendations_dev/staging/prod` tables

**Decision**: Support BOTH schemas with an abstraction layer

---

## 🏗️ Phase 1: Environment-Aware Database Layer (Week 1-2)

### 1.1 Create Environment Detection Utility

**File**: `src/lib/environment.ts`

```typescript
export type Environment = 'dev' | 'staging' | 'prod';

export function getEnvironment(): Environment {
  const env = process.env.NODE_ENV || 'development';
  const vercelEnv = process.env.VERCEL_ENV;
  
  if (vercelEnv === 'production') return 'prod';
  if (vercelEnv === 'preview' || env === 'staging') return 'staging';
  return 'dev';
}

export function getTableSuffix(env?: Environment): string {
  const environment = env || getEnvironment();
  return `_${environment}`;
}

export function getTableName(baseName: string, env?: Environment): string {
  return `${baseName}${getTableSuffix(env)}`;
}
```

### 1.2 Create Environment-Aware Database Service

**File**: `src/lib/integrations/database/environment-integrations-db.ts`

```typescript
import { createServiceClient } from '@/lib/supabase/service';
import { getTableName, type Environment } from '@/lib/environment';
import type { Integration, IntegrationRecommendation } from '../types';

export class EnvironmentIntegrationsDB {
  private supabase = createServiceClient();
  private env: Environment;

  constructor(env?: Environment) {
    this.env = env || getEnvironment();
  }

  async getIntegrations(tenantId: string): Promise<Integration[]> {
    const tableName = getTableName('integrations', this.env);
    const { data, error } = await this.supabase
      .from(tableName)
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) throw new Error(`Failed to fetch integrations: ${error.message}`);
    return (data || []).map(this.mapToIntegration);
  }

  async createIntegration(
    tenantId: string,
    provider: string,
    connection: Record<string, unknown>
  ): Promise<Integration> {
    const tableName = getTableName('integrations', this.env);
    const { data, error } = await this.supabase
      .from(tableName)
      .insert({
        tenant_id: tenantId,
        provider,
        connection,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create integration: ${error.message}`);
    return this.mapToIntegration(data);
  }

  async getRecommendations(
    tenantId: string,
    provider: string
  ): Promise<IntegrationRecommendation[]> {
    const tableName = getTableName('recommendations', this.env);
    const { data, error } = await this.supabase
      .from(tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider', provider)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch recommendations: ${error.message}`);
    return (data || []).map(this.mapToRecommendation);
  }

  async saveRecommendation(
    tenantId: string,
    provider: string,
    recommendation: IntegrationRecommendation
  ): Promise<void> {
    const tableName = getTableName('recommendations', this.env);
    const { data, error } = await this.supabase
      .from(tableName)
      .insert({
        tenant_id: tenantId,
        provider,
        keywords: recommendation.keywords,
        recommended_backlinks: recommendation.recommended_backlinks,
        recommended_interlinks: recommendation.recommended_interlinks,
        per_keyword: recommendation.per_keyword,
        notes: recommendation.notes,
      });

    if (error) throw new Error(`Failed to save recommendation: ${error.message}`);
  }

  private mapToIntegration(row: any): Integration {
    return {
      integration_id: row.id,
      org_id: row.tenant_id, // Map tenant_id to org_id for compatibility
      type: row.provider as IntegrationType,
      name: `${row.provider} Integration`,
      status: 'active', // Default status
      config: row.connection || {},
      field_mappings: {},
      health_status: 'unknown',
      created_at: row.created_at,
      updated_at: row.created_at,
    };
  }

  private mapToRecommendation(row: any): IntegrationRecommendation {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      provider: row.provider,
      keywords: row.keywords || [],
      recommended_backlinks: row.recommended_backlinks,
      recommended_interlinks: row.recommended_interlinks,
      per_keyword: row.per_keyword || [],
      notes: row.notes,
      created_at: row.created_at,
    };
  }
}
```

### 1.3 Create Unified Database Adapter

**File**: `src/lib/integrations/database/integrations-db-adapter.ts`

```typescript
import { EnvironmentIntegrationsDB } from './environment-integrations-db';
import { IntegrationManager } from '../integration-manager';
import type { Integration } from '../types';

/**
 * Unified adapter that supports both:
 * 1. Environment-suffixed tables (integrations_dev, integrations_staging, integrations_prod)
 * 2. Unified table (integrations) for backward compatibility
 */
export class IntegrationsDBAdapter {
  private useEnvironmentTables: boolean;
  private envDB?: EnvironmentIntegrationsDB;
  private unifiedManager?: IntegrationManager;

  constructor(useEnvironmentTables = true) {
    this.useEnvironmentTables = useEnvironmentTables;
    if (useEnvironmentTables) {
      this.envDB = new EnvironmentIntegrationsDB();
    } else {
      this.unifiedManager = new IntegrationManager();
    }
  }

  async getIntegrations(tenantId: string): Promise<Integration[]> {
    if (this.useEnvironmentTables && this.envDB) {
      return await this.envDB.getIntegrations(tenantId);
    } else if (this.unifiedManager) {
      // Map tenant_id to org_id lookup
      return await this.unifiedManager.getIntegrations(tenantId);
    }
    throw new Error('Database adapter not properly initialized');
  }

  // ... other methods following same pattern
}
```

---

## 🔌 Phase 2: Blog Writer API Integration Client (Week 2)

### 2.1 Extend Blog Writer API Client

**File**: `src/lib/blog-writer-api.ts`

**Add integration methods:**

```typescript
class BlogWriterAPI {
  // ... existing methods

  /**
   * Connect to an integration and get recommendations
   */
  async connectAndRecommend(params: {
    tenant_id?: string;
    provider: 'webflow' | 'wordpress' | 'shopify';
    connection: Record<string, unknown>;
    keywords: string[];
  }): Promise<{
    provider: string;
    tenant_id?: string;
    saved_integration: boolean;
    recommended_backlinks: number;
    recommended_interlinks: number;
    per_keyword: Array<{
      keyword: string;
      difficulty?: number;
      suggested_backlinks: number;
      suggested_interlinks: number;
    }>;
    notes?: string;
  }> {
    return await this.makeRequest('/api/v1/integrations/connect-and-recommend', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Get recommendations for keywords without connecting
   */
  async getRecommendations(params: {
    tenant_id?: string;
    provider: 'webflow' | 'wordpress' | 'shopify';
    keywords: string[];
  }): Promise<{
    provider: string;
    tenant_id?: string;
    recommended_backlinks: number;
    recommended_interlinks: number;
    per_keyword: Array<{
      keyword: string;
      difficulty?: number;
      suggested_backlinks: number;
      suggested_interlinks: number;
    }>;
    notes?: string;
  }> {
    return await this.makeRequest('/api/v1/integrations/recommend', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }
}
```

### 2.2 Create Blog Writer API Integration Provider

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
    this.displayName = `Blog Writer API - ${type}`;
    this.description = `Integration via Blog Writer API for ${type}`;
  }

  async connect(config: ConnectionConfig): Promise<ConnectionResult> {
    try {
      // Use Blog Writer API's connect-and-recommend endpoint
      const result = await blogWriterAPI.connectAndRecommend({
        provider: this.type as 'webflow' | 'wordpress' | 'shopify',
        connection: config as Record<string, unknown>,
        keywords: [], // Can be provided in config
      });

      return {
        success: result.saved_integration,
        integrationId: undefined, // Will be set by caller
        metadata: {
          recommended_backlinks: result.recommended_backlinks,
          recommended_interlinks: result.recommended_interlinks,
          per_keyword: result.per_keyword,
          notes: result.notes,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Connection failed',
      };
    }
  }

  // ... implement other methods
}
```

---

## 🗄️ Phase 3: Database Migration & Schema Unification (Week 2-3)

### 3.1 Create Migration Script

**File**: `supabase/migrations/20250115000000_add_environment_integrations.sql`

```sql
-- Migration: Add environment-suffixed integration tables
-- This migration adds support for environment-specific tables while maintaining backward compatibility

-- Check if environment tables already exist (from supabase_schema.sql)
-- If they don't exist, create them

-- DEV tables (if not exists)
CREATE TABLE IF NOT EXISTS integrations_dev (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid null,
  provider text not null,
  connection jsonb not null default '{}',
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS recommendations_dev (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid null,
  provider text not null,
  keywords text[] not null default '{}',
  recommended_backlinks int not null,
  recommended_interlinks int not null,
  per_keyword jsonb not null default '[]',
  notes text null,
  created_at timestamptz default now()
);

-- STAGING tables
CREATE TABLE IF NOT EXISTS integrations_staging (like integrations_dev including all);
CREATE TABLE IF NOT EXISTS recommendations_staging (like recommendations_dev including all);

-- PROD tables
CREATE TABLE IF NOT EXISTS integrations_prod (like integrations_dev including all);
CREATE TABLE IF NOT EXISTS recommendations_prod (like recommendations_dev including all);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_integrations_dev_tenant ON integrations_dev(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_dev_provider ON integrations_dev(provider);
CREATE INDEX IF NOT EXISTS idx_recs_dev_tenant ON recommendations_dev(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recs_dev_provider ON recommendations_dev(provider);

-- Repeat for staging and prod
CREATE INDEX IF NOT EXISTS idx_integrations_staging_tenant ON integrations_staging(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_staging_provider ON integrations_staging(provider);
CREATE INDEX IF NOT EXISTS idx_recs_staging_tenant ON recommendations_staging(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recs_staging_provider ON recommendations_staging(provider);

CREATE INDEX IF NOT EXISTS idx_integrations_prod_tenant ON integrations_prod(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_prod_provider ON integrations_prod(provider);
CREATE INDEX IF NOT EXISTS idx_recs_prod_tenant ON recommendations_prod(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recs_prod_provider ON recommendations_prod(provider);

-- Optional: Add RLS policies (uncomment if needed)
-- ALTER TABLE integrations_dev ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE recommendations_dev ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "read own integrations dev" ON integrations_dev FOR SELECT USING (auth.uid() = tenant_id);
-- CREATE POLICY "insert own integrations dev" ON integrations_dev FOR INSERT WITH CHECK (auth.uid() = tenant_id);
```

### 3.2 Create Data Migration Utility

**File**: `scripts/migrate-integrations-to-environment-tables.ts`

```typescript
/**
 * Migration script to move data from unified 'integrations' table
 * to environment-specific tables (integrations_dev, integrations_staging, integrations_prod)
 */
import { createServiceClient } from '../src/lib/supabase/service';

async function migrateIntegrations() {
  const supabase = createServiceClient();
  const environment = process.env.NODE_ENV || 'development';
  const tableSuffix = environment === 'production' ? 'prod' : environment === 'staging' ? 'staging' : 'dev';

  // Fetch all integrations from unified table
  const { data: integrations, error } = await supabase
    .from('integrations')
    .select('*');

  if (error) {
    console.error('Error fetching integrations:', error);
    return;
  }

  console.log(`Found ${integrations?.length || 0} integrations to migrate`);

  // Migrate to environment-specific table
  const targetTable = `integrations_${tableSuffix}`;
  
  for (const integration of integrations || []) {
    const { error: insertError } = await supabase
      .from(targetTable)
      .insert({
        id: integration.integration_id,
        tenant_id: integration.org_id, // Map org_id to tenant_id
        provider: integration.type,
        connection: {
          ...integration.config,
          field_mappings: integration.field_mappings,
          health_status: integration.health_status,
        },
        created_at: integration.created_at,
      });

    if (insertError) {
      console.error(`Error migrating integration ${integration.integration_id}:`, insertError);
    } else {
      console.log(`✅ Migrated integration ${integration.integration_id}`);
    }
  }

  console.log('Migration complete!');
}

migrateIntegrations();
```

---

## 🎨 Phase 4: API Routes & Frontend Integration (Week 3-4)

### 4.1 Create Integration API Routes

**File**: `src/app/api/integrations/connect-and-recommend/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { blogWriterAPI } from '@/lib/blog-writer-api';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant_id (org_id)
    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    const tenantId = userProfile?.org_id;

    const body = await request.json();
    const { provider, connection, keywords } = body;

    // Call Blog Writer API
    const result = await blogWriterAPI.connectAndRecommend({
      tenant_id: tenantId,
      provider,
      connection,
      keywords,
    });

    // Save integration if successful
    if (result.saved_integration && tenantId) {
      const db = new EnvironmentIntegrationsDB();
      await db.createIntegration(tenantId, provider, connection);
    }

    // Save recommendations
    if (tenantId) {
      const db = new EnvironmentIntegrationsDB();
      await db.saveRecommendation(tenantId, provider, {
        id: '', // Will be generated
        tenant_id: tenantId,
        provider,
        keywords,
        recommended_backlinks: result.recommended_backlinks,
        recommended_interlinks: result.recommended_interlinks,
        per_keyword: result.per_keyword,
        notes: result.notes,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error in connect-and-recommend:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**File**: `src/app/api/integrations/recommend/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { blogWriterAPI } from '@/lib/blog-writer-api';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    const body = await request.json();
    const { provider, keywords } = body;

    const result = await blogWriterAPI.getRecommendations({
      tenant_id: userProfile?.org_id,
      provider,
      keywords,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error in recommend:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4.2 Create Frontend Components

**File**: `src/components/integrations/ConnectAndRecommendForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { blogWriterAPI } from '@/lib/blog-writer-api';

export function ConnectAndRecommendForm() {
  const [provider, setProvider] = useState<'webflow' | 'wordpress' | 'shopify'>('webflow');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [connection, setConnection] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/integrations/connect-and-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, connection, keywords }),
      });

      const data = await response.json();
      setResult(data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Provider selection, connection config, keywords input */}
      {/* Display recommendations */}
    </form>
  );
}
```

---

## 🧪 Phase 5: Testing & Validation (Week 4)

### 5.1 Unit Tests

**File**: `src/lib/integrations/__tests__/blog-writer-api-provider.test.ts`

```typescript
import { BlogWriterAPIProvider } from '../providers/blog-writer-api-provider';
import { blogWriterAPI } from '@/lib/blog-writer-api';

jest.mock('@/lib/blog-writer-api');

describe('BlogWriterAPIProvider', () => {
  it('should connect and get recommendations', async () => {
    const provider = new BlogWriterAPIProvider('webflow');
    const mockResult = {
      saved_integration: true,
      recommended_backlinks: 10,
      recommended_interlinks: 5,
      per_keyword: [],
    };

    (blogWriterAPI.connectAndRecommend as jest.Mock).mockResolvedValue(mockResult);

    const result = await provider.connect({
      apiKey: 'test-key',
      siteId: 'test-site',
    });

    expect(result.success).toBe(true);
    expect(result.metadata?.recommended_backlinks).toBe(10);
  });
});
```

### 5.2 Integration Tests

**File**: `tests/integrations/api.test.ts`

```typescript
describe('Integration API Routes', () => {
  it('should connect and get recommendations', async () => {
    const response = await fetch('/api/integrations/connect-and-recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'webflow',
        connection: { apiKey: 'test' },
        keywords: ['test', 'keyword'],
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.recommended_backlinks).toBeGreaterThan(0);
  });
});
```

---

## 📊 Phase 6: Documentation & Deployment (Week 4-5)

### 6.1 Update Documentation

- Update `BLOG_WRITER_API_INTEGRATIONS_PLAN.md` with actual findings
- Create `ENVIRONMENT_INTEGRATIONS_GUIDE.md` for environment-specific tables
- Update API documentation

### 6.2 Deployment Checklist

- [ ] Run database migrations
- [ ] Set environment variables
- [ ] Test in dev environment
- [ ] Deploy to staging
- [ ] Test in staging
- [ ] Deploy to production
- [ ] Monitor for errors

---

## 🎯 Implementation Checklist

### Phase 0: Discovery ✅
- [x] Research API endpoints
- [x] Document API schemas
- [x] Analyze schema differences

### Phase 1: Database Layer
- [ ] Create environment detection utility
- [ ] Create environment-aware DB service
- [ ] Create unified adapter

### Phase 2: API Integration
- [ ] Extend Blog Writer API client
- [ ] Create Blog Writer API provider
- [ ] Register provider in registry

### Phase 3: Migration
- [ ] Create migration script
- [ ] Create data migration utility
- [ ] Test migration

### Phase 4: API Routes
- [ ] Create connect-and-recommend route
- [ ] Create recommend route
- [ ] Create frontend components

### Phase 5: Testing
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Manual testing

### Phase 6: Documentation
- [ ] Update integration docs
- [ ] Create user guide
- [ ] Deploy and monitor

---

## 🔗 Related Files

- `BLOG_WRITER_API_INTEGRATIONS_PLAN.md` - Original integration plan
- `supabase_schema.sql` - Environment-suffixed schema
- `supabase/migrations/20250110000000_create_integrations_abstraction.sql` - Unified schema
- `src/lib/integrations/` - Integration abstraction layer
- `src/lib/blog-writer-api.ts` - Blog Writer API client

---

## 📚 Next Steps

1. **Immediate**: Start Phase 1 (Database Layer)
2. **Short-term**: Complete Phases 1-3 (Database + API Integration)
3. **Medium-term**: Complete Phases 4-5 (API Routes + Testing)
4. **Long-term**: Phase 6 (Documentation + Deployment)

