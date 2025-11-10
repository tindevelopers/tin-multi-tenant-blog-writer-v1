# Environment-Aware Database Layer (Phase 1)

This module provides environment-aware database services for integrations, supporting both environment-suffixed tables (`integrations_dev`, `integrations_staging`, `integrations_prod`) and unified tables (`integrations`) for backward compatibility.

## Components

### 1. Environment Detection (`@/lib/environment`)

Utility functions for detecting the current environment and generating table names.

```typescript
import { getEnvironment, getTableName } from '@/lib/environment';

// Get current environment
const env = getEnvironment(); // 'dev' | 'staging' | 'prod'

// Get table name with environment suffix
const tableName = getTableName('integrations'); // 'integrations_dev' (in dev)
```

### 2. EnvironmentIntegrationsDB

Direct access to environment-suffixed tables.

```typescript
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database';

// Create instance (auto-detects environment)
const db = new EnvironmentIntegrationsDB();

// Or specify environment explicitly
const prodDB = new EnvironmentIntegrationsDB('prod');

// Get integrations for a tenant
const integrations = await db.getIntegrations('tenant-uuid');

// Create integration
const integration = await db.createIntegration(
  'tenant-uuid',
  'webflow',
  { apiKey: 'xxx', siteId: 'yyy' }
);

// Save recommendation
const recommendation = await db.saveRecommendation(
  'tenant-uuid',
  'webflow',
  {
    tenant_id: 'tenant-uuid',
    provider: 'webflow',
    keywords: ['keyword1', 'keyword2'],
    recommended_backlinks: 10,
    recommended_interlinks: 5,
    per_keyword: [
      {
        keyword: 'keyword1',
        suggested_backlinks: 5,
        suggested_interlinks: 2,
      },
    ],
    notes: 'Some notes',
  }
);
```

### 3. IntegrationsDBAdapter

Unified adapter that supports both schemas.

```typescript
import { IntegrationsDBAdapter } from '@/lib/integrations/database';

// Create adapter (auto-detects which schema to use)
const adapter = new IntegrationsDBAdapter();

// Or force environment tables
const envAdapter = new IntegrationsDBAdapter(true);

// Use adapter methods
const integrations = await adapter.getIntegrations('tenant-uuid');
const recommendations = await adapter.getRecommendations('tenant-uuid', 'webflow');

// Check which schema is being used
if (adapter.isUsingEnvironmentTables()) {
  console.log('Using environment-suffixed tables');
}
```

## Environment Detection

The environment is detected based on:
1. `VERCEL_ENV` environment variable (takes precedence)
   - `production` → `prod`
   - `preview` → `staging`
2. `NODE_ENV` environment variable
   - `production` → `prod`
   - `staging` → `staging`
   - `development` or default → `dev`

## Configuration

Control which schema to use via environment variable:

```bash
# Use environment-suffixed tables (default)
USE_ENVIRONMENT_TABLES=true

# Use unified table
USE_ENVIRONMENT_TABLES=false
```

## Migration Path

1. **Phase 1** (Current): Both schemas supported via adapter
2. **Phase 2**: Migrate data from unified to environment tables
3. **Phase 3**: Switch default to environment tables
4. **Phase 4**: Deprecate unified table support

## Table Structure

### Environment-Suffixed Tables

```sql
-- integrations_dev, integrations_staging, integrations_prod
CREATE TABLE integrations_dev (
  id uuid PRIMARY KEY,
  tenant_id uuid,
  provider text NOT NULL,
  connection jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT NOW()
);

-- recommendations_dev, recommendations_staging, recommendations_prod
CREATE TABLE recommendations_dev (
  id uuid PRIMARY KEY,
  tenant_id uuid,
  provider text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  recommended_backlinks int NOT NULL,
  recommended_interlinks int NOT NULL,
  per_keyword jsonb NOT NULL DEFAULT '[]',
  notes text,
  created_at timestamptz DEFAULT NOW()
);
```

### Unified Table (Legacy)

```sql
CREATE TABLE integrations (
  integration_id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  type text NOT NULL,
  name text NOT NULL,
  status text NOT NULL,
  config jsonb NOT NULL,
  field_mappings jsonb,
  health_status text,
  last_sync timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);
```

## Usage Examples

### Server-Side API Route

```typescript
// app/api/integrations/route.ts
import { IntegrationsDBAdapter } from '@/lib/integrations/database';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get user's org_id (tenant_id)
  const { data: userProfile } = await supabase
    .from('users')
    .select('org_id')
    .eq('user_id', user.id)
    .single();

  const adapter = new IntegrationsDBAdapter();
  const integrations = await adapter.getIntegrations(userProfile.org_id);
  
  return Response.json({ integrations });
}
```

### Client Component

```typescript
// components/integrations/IntegrationsList.tsx
'use client';

import { useEffect, useState } from 'react';
import { IntegrationsDBAdapter } from '@/lib/integrations/database';

export function IntegrationsList({ tenantId }: { tenantId: string }) {
  const [integrations, setIntegrations] = useState([]);

  useEffect(() => {
    async function fetchIntegrations() {
      const adapter = new IntegrationsDBAdapter();
      const data = await adapter.getIntegrations(tenantId);
      setIntegrations(data);
    }
    fetchIntegrations();
  }, [tenantId]);

  return (
    <div>
      {integrations.map((integration) => (
        <div key={integration.integration_id}>
          {integration.name} - {integration.type}
        </div>
      ))}
    </div>
  );
}
```

## Error Handling

All methods throw errors that should be caught:

```typescript
try {
  const integration = await db.createIntegration(tenantId, 'webflow', config);
} catch (error) {
  console.error('Failed to create integration:', error.message);
  // Handle error appropriately
}
```

## Notes

- The adapter automatically maps `tenant_id` ↔ `org_id` for compatibility
- Environment detection happens at initialization time
- Use `createServiceClient()` for server-side operations (bypasses RLS)
- Use `createClient()` for client-side operations (respects RLS)

