# Webflow Publishing Integration - Implementation Plan

## 📋 Overview

This plan outlines the complete implementation of Webflow publishing functionality for the Blog Writer System, allowing users to publish blog posts directly to Webflow CMS collections.

## 🎯 Goals

1. **Integration Management**: Connect and configure Webflow accounts
2. **Content Publishing**: Publish blog posts to Webflow CMS collections
3. **Field Mapping**: Map blog post fields to Webflow collection fields
4. **Status Tracking**: Track publishing status and sync state
5. **Error Handling**: Robust error handling and retry mechanisms

---

## 📊 Phase 1: Database Schema & Backend Foundation

### 1.1 Create Integrations Table

**File**: `supabase/migrations/[timestamp]_create_integrations_table.sql`

```sql
-- Integrations Table
CREATE TABLE IF NOT EXISTS integrations (
  integration_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'webflow', 'wordpress', 'shopify', etc.
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive', -- 'active', 'inactive', 'error'
  config JSONB NOT NULL DEFAULT '{}', -- Encrypted API keys, site IDs, etc.
  field_mappings JSONB DEFAULT '{}', -- Field mapping configuration
  health_status TEXT DEFAULT 'unknown', -- 'healthy', 'warning', 'error'
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(user_id)
);

-- Integration Publishing Logs
CREATE TABLE IF NOT EXISTS integration_publish_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES blog_posts(post_id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES integrations(integration_id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'success', 'failed', 'synced'
  external_id TEXT, -- Webflow item ID
  external_url TEXT, -- Published URL
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_integrations_org_id ON integrations(org_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);
CREATE INDEX IF NOT EXISTS idx_publish_logs_post_id ON integration_publish_logs(post_id);
CREATE INDEX IF NOT EXISTS idx_publish_logs_integration_id ON integration_publish_logs(integration_id);

-- RLS Policies
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_publish_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org integrations"
  ON integrations FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage integrations"
  ON integrations FOR ALL
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view org publish logs"
  ON integration_publish_logs FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid()));
```

### 1.2 Update Blog Posts Table

**File**: `supabase/migrations/[timestamp]_add_webflow_fields_to_blog_posts.sql`

```sql
-- Add Webflow-specific fields to metadata JSONB
-- This will be stored in the existing metadata column as:
-- {
--   "webflow": {
--     "item_id": "webflow_item_id",
--     "collection_id": "collection_id",
--     "site_id": "site_id",
--     "published_at": "timestamp",
--     "published_url": "url"
--   }
-- }
-- No schema changes needed - using existing metadata JSONB field
```

### 1.3 Update TypeScript Types

**File**: `src/types/database.ts`

Add integration types to the Database interface.

---

## 🔧 Phase 2: Webflow Service Layer

### 2.1 Create Webflow Service

**File**: `src/lib/webflow-service.ts`

```typescript
interface WebflowConfig {
  api_token: string;
  site_id: string;
  collection_id: string;
}

interface WebflowCollectionItem {
  fieldData: Record<string, unknown>;
  isDraft?: boolean;
}

interface WebflowPublishResult {
  item_id: string;
  published_url: string;
  success: boolean;
  error?: string;
}

class WebflowService {
  private baseUrl = 'https://api.webflow.com/v2';
  
  async getSites(apiToken: string): Promise<WebflowSite[]>;
  async getCollections(apiToken: string, siteId: string): Promise<WebflowCollection[]>;
  async getCollectionFields(apiToken: string, collectionId: string): Promise<WebflowField[]>;
  async createItem(apiToken: string, collectionId: string, item: WebflowCollectionItem): Promise<WebflowItem>;
  async updateItem(apiToken: string, collectionId: string, itemId: string, item: WebflowCollectionItem): Promise<WebflowItem>;
  async publishItem(apiToken: string, collectionId: string, itemId: string, live: boolean): Promise<boolean>;
  async deleteItem(apiToken: string, collectionId: string, itemId: string): Promise<boolean>;
}
```

### 2.2 Create Integration Service

**File**: `src/lib/integrations-service.ts`

Generic service for managing all integrations (Webflow, WordPress, etc.)

---

## 🌐 Phase 3: API Routes

### 3.1 Webflow Connection API

**File**: `src/app/api/integrations/webflow/connect/route.ts`

- **POST**: Connect Webflow account
  - Validate API token
  - Fetch sites
  - Store encrypted credentials
  - Return available sites

### 3.2 Webflow Sites API

**File**: `src/app/api/integrations/webflow/sites/route.ts`

- **GET**: List available Webflow sites
  - Requires integration_id
  - Returns sites user has access to

### 3.3 Webflow Collections API

**File**: `src/app/api/integrations/webflow/collections/route.ts`

- **GET**: List collections for a site
  - Requires site_id
  - Returns collections with field schemas

### 3.4 Webflow Field Mapping API

**File**: `src/app/api/integrations/webflow/field-mapping/route.ts`

- **GET**: Get current field mappings
- **PUT**: Update field mappings
  - Maps blog post fields to Webflow collection fields

### 3.5 Webflow Publish API

**File**: `src/app/api/integrations/webflow/publish/route.ts`

- **POST**: Publish blog post to Webflow
  - Parameters: `post_id`, `integration_id`
  - Creates/updates Webflow item
  - Publishes to live site
  - Logs result

### 3.6 Webflow Sync API

**File**: `src/app/api/integrations/webflow/sync/route.ts`

- **POST**: Sync existing post
- **GET**: Get sync status

### 3.7 Integration Management API

**File**: `src/app/api/integrations/[id]/route.ts`

- **GET**: Get integration details
- **PUT**: Update integration
- **DELETE**: Disconnect integration

---

## 🎨 Phase 4: Frontend Components

### 4.1 Update Integrations Page

**File**: `src/app/admin/integrations/page.tsx`

- Replace mock data with real Supabase queries
- Add Webflow integration card (already exists in mock)
- Implement "Connect" button functionality
- Show real connection status

### 4.2 Webflow Connection Modal/Page

**File**: `src/app/admin/integrations/webflow/connect/page.tsx`

**Steps:**
1. Enter Webflow API Token
2. Validate token
3. Select Webflow Site
4. Select Collection (Blog Posts)
5. Configure field mappings
6. Save integration

**Field Mapping UI:**
```
Blog Writer Field → Webflow Collection Field
─────────────────────────────────────────
Title            → [Select: "Post Title"]
Content          → [Select: "Post Body"]
Excerpt          → [Select: "Post Summary"]
Author           → [Select: "Author Name"]
Published Date   → [Select: "Publish Date"]
Featured Image   → [Select: "Featured Image"]
Tags             → [Select: "Tags"]
```

### 4.3 Webflow Configuration Page

**File**: `src/app/admin/integrations/webflow/[id]/configure/page.tsx`

- View/edit connection settings
- Update field mappings
- Test connection
- View sync history
- Disconnect integration

### 4.4 Add Publish Button to Draft Editor

**File**: `src/app/admin/drafts/view/[id]/page.tsx`

Add "Publish to Webflow" button:
```tsx
<button onClick={handlePublishToWebflow}>
  <GlobeIcon className="w-4 h-4" />
  Publish to Webflow
</button>
```

**File**: `src/app/admin/drafts/edit/[id]/page.tsx`

Add publish dropdown:
```tsx
<select onChange={handlePublishDestination}>
  <option>Select destination...</option>
  <option value="webflow">Publish to Webflow</option>
  <option value="wordpress">Publish to WordPress</option>
</select>
```

### 4.5 Publishing Status Component

**File**: `src/components/integrations/PublishingStatus.tsx`

Shows:
- Published destinations
- Sync status
- Last sync time
- Error messages
- Retry button

### 4.6 Integration Card Component

**File**: `src/components/integrations/IntegrationCard.tsx`

Reusable card component for all integrations.

---

## 🔐 Phase 5: Security & Encryption

### 5.1 Encrypt API Tokens

**Option A**: Use Supabase Vault (Recommended)
- Store encrypted credentials in Supabase Vault
- Use `pgcrypto` extension

**Option B**: Environment Variables
- Store at organization level
- Use encryption service

**File**: `src/lib/encryption.ts`

```typescript
// Encrypt/decrypt sensitive data
export function encryptApiToken(token: string): string;
export function decryptApiToken(encrypted: string): string;
```

### 5.2 API Token Validation

- Validate Webflow API token on connection
- Test connection before saving
- Periodic health checks

---

## 📝 Phase 6: Content Transformation

### 6.1 Content Converter

**File**: `src/lib/webflow-content-converter.ts`

Convert blog post content to Webflow format:
- HTML to Webflow-compatible HTML
- Extract images and upload to Webflow Assets
- Handle markdown conversion
- Process metadata

### 6.2 Field Mapping Engine

**File**: `src/lib/field-mapper.ts`

Map blog post fields to Webflow collection fields:
- Dynamic field mapping based on collection schema
- Handle different field types (text, rich-text, image, date, etc.)
- Default mappings with customization

---

## 🔄 Phase 7: Publishing Workflow

### 7.1 Publishing Flow

1. User clicks "Publish to Webflow"
2. System checks for active Webflow integration
3. If no integration → redirect to connect page
4. Load field mappings
5. Transform content
6. Create/update Webflow item
7. Publish item to live site
8. Log result
9. Update blog post metadata
10. Show success/error message

### 7.2 Update Flow

- Check if post already published (check metadata)
- If published → update existing item
- If not published → create new item

### 7.3 Error Handling

- Retry mechanism for failed publishes
- Error logging
- User-friendly error messages
- Rollback on failure

---

## 📊 Phase 8: Status Tracking & Logging

### 8.1 Publishing Status Display

Show in draft view:
- Published destinations
- Publish date
- External URL
- Sync status
- Last sync time

### 8.2 Publishing History

**File**: `src/app/admin/integrations/webflow/[id]/history/page.tsx`

- List all published posts
- Show sync status
- Filter by status
- Retry failed publishes

---

## 🧪 Phase 9: Testing

### 9.1 Unit Tests

- Webflow service methods
- Field mapping logic
- Content transformation
- Error handling

### 9.2 Integration Tests

- End-to-end publishing flow
- Connection flow
- Update flow
- Error scenarios

### 9.3 Manual Testing Checklist

- [ ] Connect Webflow account
- [ ] Select site and collection
- [ ] Configure field mappings
- [ ] Publish draft post
- [ ] Verify post appears in Webflow
- [ ] Update published post
- [ ] Verify update syncs
- [ ] Test error scenarios
- [ ] Test with different field types
- [ ] Test image uploads

---

## 📦 Phase 10: Deployment

### 10.1 Environment Variables

Add to `.env.local`:
```env
# Webflow API (if using global token)
WEBFLOW_API_TOKEN=optional_global_token

# Encryption key for API tokens
ENCRYPTION_KEY=your_encryption_key
```

### 10.2 Database Migration

Run migrations in order:
1. Create integrations table
2. Create publish logs table
3. Add RLS policies

### 10.3 Documentation

- User guide for connecting Webflow
- Field mapping guide
- Troubleshooting guide

---

## 🎯 Implementation Priority

### High Priority (MVP)
1. ✅ Database schema
2. ✅ Webflow service (basic CRUD)
3. ✅ Connection API
4. ✅ Publish API
5. ✅ Connection UI
6. ✅ Publish button in draft editor

### Medium Priority
7. Field mapping UI
8. Publishing status display
9. Error handling & retry
10. Content transformation

### Low Priority (Future Enhancements)
11. Bulk publishing
12. Scheduled publishing
13. Publishing templates
14. Multi-site support
15. Webhook support for sync

---

## 📚 Webflow API Reference

### Key Endpoints

1. **List Sites**: `GET /v2/sites`
2. **List Collections**: `GET /v2/sites/{site_id}/collections`
3. **Get Collection**: `GET /v2/collections/{collection_id}`
4. **Create Item**: `POST /v2/collections/{collection_id}/items`
5. **Update Item**: `PATCH /v2/collections/{collection_id}/items/{item_id}`
6. **Publish Item**: `POST /v2/collections/{collection_id}/items/{item_id}/publish`
7. **Delete Item**: `DELETE /v2/collections/{collection_id}/items/{item_id}`

### Authentication

- Header: `Authorization: Bearer {api_token}`
- API Token: Generated in Webflow Account Settings > Apps & Integrations > API Access

### Rate Limits

- 60 requests per minute per site
- Implement rate limiting and retry logic

---

## 🔍 Key Considerations

1. **Multi-Tenancy**: All integrations scoped to `org_id`
2. **Security**: Encrypt API tokens, use RLS policies
3. **Error Handling**: Comprehensive error handling and user feedback
4. **Rate Limiting**: Respect Webflow API rate limits
5. **Field Types**: Handle different Webflow field types (text, rich-text, image, date, etc.)
6. **Content Format**: Convert HTML/markdown to Webflow-compatible format
7. **Image Handling**: Upload images to Webflow Assets API
8. **Sync Status**: Track publishing status and enable re-sync

---

## 📝 Next Steps

1. Review and approve this plan
2. Create database migrations
3. Implement Webflow service layer
4. Build API routes
5. Create frontend components
6. Test end-to-end flow
7. Deploy to staging
8. User acceptance testing
9. Deploy to production

---

## 🚀 Estimated Timeline

- **Phase 1-2** (Backend): 2-3 days
- **Phase 3** (API Routes): 2-3 days
- **Phase 4** (Frontend): 3-4 days
- **Phase 5-6** (Security & Transformation): 2 days
- **Phase 7-8** (Workflow & Tracking): 2 days
- **Phase 9** (Testing): 2 days
- **Phase 10** (Deployment): 1 day

**Total**: ~14-17 days for complete implementation

---

## 📖 Resources

- [Webflow CMS API Documentation](https://developers.webflow.com/data/v2.0.0/docs)
- [Webflow API Authentication](https://developers.webflow.com/authentication)
- [Webflow Rate Limits](https://developers.webflow.com/rate-limits)

