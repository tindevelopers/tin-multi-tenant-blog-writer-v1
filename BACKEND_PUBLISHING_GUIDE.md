# Backend Implementation Guide: Multi-CMS Publishing & Role-Scoped Cost Visibility

This guide provides comprehensive specifications for implementing multi-CMS publishing support, destination selection, and role-based cost visibility in the backend system.

## 🎯 Goals

- Support multiple CMS integrations per organization (e.g., multiple Webflow sites, Shopify stores, WordPress sites)
- Allow authors to select publishing destination (CMS provider + site + collection) when creating drafts
- Provide filtering and routing capabilities by CMS/site/collection
- Enforce organization scoping and role-based visibility (costs visible only to admins/owners)

---

## 📊 Data Model Changes

### 1. Integrations Table Schema

**Current State:** One integration per type per organization  
**Required State:** Multiple integrations per type per organization

```sql
-- Add new columns to integrations table
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS site_name TEXT;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS collection_ids JSONB DEFAULT '[]';
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Remove unique constraint on (org_id, type) if exists
-- Allow multiple integrations of same type per org
-- Add unique constraint on (org_id, type, site_id) instead
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_org_id_type_key;
CREATE UNIQUE INDEX IF NOT EXISTS integrations_org_type_site_unique 
  ON integrations(org_id, type, site_id) 
  WHERE site_id IS NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_integrations_org_type ON integrations(org_id, type);
CREATE INDEX IF NOT EXISTS idx_integrations_org_default ON integrations(org_id, is_default) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status) WHERE status = 'active';
```

**Example Data:**
```json
{
  "id": "int_123",
  "org_id": "org_abc",
  "type": "webflow",
  "site_id": "68fb5ca93834051fa8ee208b",
  "site_name": "Marketing Website",
  "api_key": "wf_api_key_123",
  "collection_ids": ["68fb5caa3834051fa8ee217d", "68fb5caa3834051fa8ee2194"],
  "is_default": true,
  "status": "active",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### 2. Blog Posts & Queue Metadata

**Add to `blog_posts` table metadata JSONB:**

```sql
-- Metadata fields to add:
-- cms_provider: "webflow" | "shopify" | "wordpress" | "custom"
-- site_id: string (references integrations.site_id)
-- collection_id: string (optional, for CMS with collections)
-- publishing_target: string (human-readable target description)
-- total_cost: number (in USD, stored for admin visibility)
-- cost_breakdown: object (optional, detailed cost breakdown)
```

**Add to `blog_generation_queue` table metadata JSONB:**

```sql
-- Same fields as blog_posts metadata
-- Plus: publishing_target_selected_at: timestamp
```

**Example Metadata:**
```json
{
  "cms_provider": "webflow",
  "site_id": "68fb5ca93834051fa8ee208b",
  "collection_id": "68fb5caa3834051fa8ee217d",
  "publishing_target": "Marketing Website > Blog Posts",
  "total_cost": 0.15,
  "cost_breakdown": {
    "content_generation": 0.10,
    "image_generation": 0.05
  },
  "publishing_target_selected_at": "2025-01-15T10:30:00Z"
}
```

### 3. User Organizations Table (if multi-org support needed)

```sql
CREATE TABLE IF NOT EXISTS user_organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, org_id)
);

CREATE INDEX idx_user_orgs_user ON user_organizations(user_id);
CREATE INDEX idx_user_orgs_org ON user_organizations(org_id);
CREATE INDEX idx_user_orgs_active ON user_organizations(user_id, is_active) WHERE is_active = TRUE;
```

---

## 🔌 API Endpoints Specification

### 1. GET /api/integrations

**Purpose:** List all integrations for the current user's organization

**Query Parameters:**
- `type` (optional): Filter by integration type (`webflow`, `shopify`, `wordpress`, etc.)
- `status` (optional): Filter by status (`active`, `inactive`, `disabled`)

**Response:**
```json
{
  "integrations": [
    {
      "id": "int_123",
      "org_id": "org_abc",
      "type": "webflow",
      "site_id": "68fb5ca93834051fa8ee208b",
      "site_name": "Marketing Website",
      "collection_ids": ["68fb5caa3834051fa8ee217d"],
      "is_default": true,
      "status": "active",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    },
    {
      "id": "int_456",
      "org_id": "org_abc",
      "type": "webflow",
      "site_id": "68fb5ca93834051fa8ee209c",
      "site_name": "Product Website",
      "collection_ids": ["68fb5caa3834051fa8ee217d"],
      "is_default": false,
      "status": "active",
      "created_at": "2025-01-02T00:00:00Z",
      "updated_at": "2025-01-02T00:00:00Z"
    }
  ],
  "total": 2
}
```

**Authorization:** Any authenticated user (scoped to their org)

---

### 2. POST /api/integrations

**Purpose:** Create a new integration

**Request Body:**
```json
{
  "type": "webflow",
  "site_id": "68fb5ca93834051fa8ee208b",
  "site_name": "Marketing Website",
  "api_key": "wf_api_key_123",
  "collection_ids": ["68fb5caa3834051fa8ee217d"],
  "is_default": false
}
```

**Response:**
```json
{
  "id": "int_789",
  "org_id": "org_abc",
  "type": "webflow",
  "site_id": "68fb5ca93834051fa8ee208b",
  "site_name": "Marketing Website",
  "collection_ids": ["68fb5caa3834051fa8ee217d"],
  "is_default": false,
  "status": "active",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

**Authorization:** Admin or Owner role only

**Validation:**
- `type` must be valid CMS type
- `site_id` must be unique per org+type combination
- `api_key` must be valid (test connection if possible)
- If `is_default: true`, unset other defaults for same type

**Error Responses:**
- `400`: Invalid request body
- `403`: User not authorized (not admin/owner)
- `409`: Integration already exists for this site_id
- `422`: API key validation failed

---

### 3. PATCH /api/integrations/:id

**Purpose:** Update an existing integration

**Request Body (all fields optional):**
```json
{
  "site_name": "Updated Site Name",
  "api_key": "new_api_key",
  "collection_ids": ["68fb5caa3834051fa8ee217d", "68fb5caa3834051fa8ee2194"],
  "is_default": true,
  "status": "active"
}
```

**Response:** Updated integration object

**Authorization:** Admin or Owner role only

**Validation:**
- If setting `is_default: true`, unset other defaults for same type
- If updating `api_key`, validate new key
- Cannot change `type` or `site_id` (create new integration instead)

---

### 4. DELETE /api/integrations/:id

**Purpose:** Delete or disable an integration

**Query Parameters:**
- `hard` (optional, default: false): If true, permanently delete; if false, set status to 'disabled'

**Response:**
```json
{
  "success": true,
  "message": "Integration deleted successfully"
}
```

**Authorization:** Admin or Owner role only

**Validation:**
- Check if any drafts/queue items reference this integration
- If referenced, return error with list of affected items
- Optionally allow force delete with warning

---

### 5. GET /api/publishing-targets

**Purpose:** Get available publishing targets for the current organization

**Response:**
```json
{
  "providers": ["webflow", "shopify", "wordpress"],
  "sites": [
    {
      "id": "68fb5ca93834051fa8ee208b",
      "name": "Marketing Website",
      "provider": "webflow",
      "collections": [
        {
          "id": "68fb5caa3834051fa8ee217d",
          "name": "Blog Posts",
          "slug": "blog-posts"
        },
        {
          "id": "68fb5caa3834051fa8ee2194",
          "name": "News Articles",
          "slug": "news-articles"
        }
      ]
    },
    {
      "id": "68fb5ca93834051fa8ee209c",
      "name": "Product Website",
      "provider": "webflow",
      "collections": [
        {
          "id": "68fb5caa3834051fa8ee217d",
          "name": "Blog Posts",
          "slug": "blog-posts"
        }
      ]
    }
  ],
  "default": {
    "provider": "webflow",
    "site_id": "68fb5ca93834051fa8ee208b",
    "collection_id": "68fb5caa3834051fa8ee217d"
  }
}
```

**Authorization:** Any authenticated user (scoped to their org)

**Logic:**
- Group integrations by provider type
- Fetch collection details from CMS API if needed
- Determine default from `is_default: true` flag
- Cache response for 5 minutes

---

### 6. PATCH /api/drafts/:id

**Purpose:** Update draft with publishing target selection

**Request Body:**
```json
{
  "cms_provider": "webflow",
  "site_id": "68fb5ca93834051fa8ee208b",
  "collection_id": "68fb5caa3834051fa8ee217d",
  "publishing_target": "Marketing Website > Blog Posts"
}
```

**Response:** Updated draft object

**Authorization:** Any authenticated user (can update their own drafts)

**Validation:**
- Verify `site_id` exists and belongs to user's org
- Verify `collection_id` is valid for selected site
- Verify integration is active

---

### 7. PATCH /api/blog-queue/:id

**Purpose:** Update queue item with publishing target selection

**Request Body:** Same as drafts endpoint

**Response:** Updated queue item object

**Authorization:** Any authenticated user

**Validation:** Same as drafts endpoint

---

### 8. POST /api/publish/:id

**Purpose:** Publish draft/queue item to selected CMS

**Request Body (optional override):**
```json
{
  "cms_provider": "webflow",
  "site_id": "68fb5ca93834051fa8ee208b",
  "collection_id": "68fb5caa3834051fa8ee217d"
}
```

**Response:**
```json
{
  "success": true,
  "published_url": "https://marketing-site.webflow.io/blog-post-slug",
  "cms_item_id": "cms_item_123",
  "published_at": "2025-01-15T10:30:00Z"
}
```

**Authorization:** Any authenticated user (can publish their own content)

**Publishing Flow:**
1. Check if draft/queue has `cms_provider`, `site_id`, `collection_id`
2. If missing, check for default integration
3. If no default, return error: "No publishing target selected and no default configured"
4. Fetch integration credentials
5. Validate integration is active
6. Route to appropriate CMS client (Webflow/Shopify/WordPress)
7. Publish content
8. Store published URL and CMS item ID in metadata
9. Update status to 'published'

**Error Responses:**
- `400`: No publishing target selected and no default configured
- `404`: Selected site/collection not found for this org
- `422`: Integration disabled or missing credentials
- `500`: CMS API error (include error details)

---

## 🚚 Publishing Flow Logic

### Default Selection Algorithm

```python
def get_publishing_target(draft_metadata, org_id):
    # 1. Check if draft has explicit target
    if draft_metadata.get('cms_provider') and draft_metadata.get('site_id'):
        integration = get_integration(
            org_id=org_id,
            type=draft_metadata['cms_provider'],
            site_id=draft_metadata['site_id']
        )
        if integration and integration.status == 'active':
            return {
                'provider': draft_metadata['cms_provider'],
                'site_id': draft_metadata['site_id'],
                'collection_id': draft_metadata.get('collection_id'),
                'integration': integration
            }
    
    # 2. Fallback to default integration
    default_integration = get_default_integration(org_id, type=None)
    if default_integration and default_integration.status == 'active':
        return {
            'provider': default_integration.type,
            'site_id': default_integration.site_id,
            'collection_id': default_integration.collection_ids[0] if default_integration.collection_ids else None,
            'integration': default_integration
        }
    
    # 3. No target found
    raise ValueError("No publishing target selected and no default configured")
```

### CMS Client Routing

```python
def publish_to_cms(content, target):
    provider = target['provider']
    integration = target['integration']
    
    if provider == 'webflow':
        return publish_to_webflow(
            content=content,
            site_id=target['site_id'],
            collection_id=target['collection_id'],
            api_key=integration.api_key
        )
    elif provider == 'shopify':
        return publish_to_shopify(
            content=content,
            store_id=target['site_id'],
            api_key=integration.api_key,
            api_secret=integration.api_secret
        )
    elif provider == 'wordpress':
        return publish_to_wordpress(
            content=content,
            site_url=target['site_id'],
            username=integration.username,
            password=integration.password
        )
    else:
        raise ValueError(f"Unsupported CMS provider: {provider}")
```

---

## ✅ Validation & Scoping Rules

### Organization Scoping

**All queries must be filtered by organization:**

```python
# ✅ Correct
integrations = db.query(Integration).filter(
    Integration.org_id == user.org_id,
    Integration.status == 'active'
).all()

# ❌ Wrong - missing org filter
integrations = db.query(Integration).filter(
    Integration.status == 'active'
).all()
```

### Site/Collection Validation

**Before publishing, validate:**

```python
def validate_publishing_target(org_id, cms_provider, site_id, collection_id=None):
    # 1. Verify integration exists and belongs to org
    integration = db.query(Integration).filter(
        Integration.org_id == org_id,
        Integration.type == cms_provider,
        Integration.site_id == site_id,
        Integration.status == 'active'
    ).first()
    
    if not integration:
        raise ValueError("Selected site not found for this organization")
    
    # 2. Verify collection_id is valid (if provided)
    if collection_id:
        if collection_id not in integration.collection_ids:
            raise ValueError("Selected collection not found for this site")
    
    # 3. Verify credentials are present
    if not integration.api_key:
        raise ValueError("Integration missing credentials")
    
    return integration
```

### Multi-Organization User Support

**If user belongs to multiple orgs:**

```python
def get_active_org_id(user_id, session):
    # Check session for active_org_id
    active_org_id = session.get('active_org_id')
    
    if active_org_id:
        # Verify user has access to this org
        user_org = db.query(UserOrganization).filter(
            UserOrganization.user_id == user_id,
            UserOrganization.org_id == active_org_id,
            UserOrganization.is_active == True
        ).first()
        
        if user_org:
            return active_org_id
    
    # Fallback to user's primary org
    user = db.query(User).filter(User.user_id == user_id).first()
    return user.org_id
```

---

## 🔒 Role-Based Cost Visibility

### Cost Storage

**Store costs in metadata:**

```python
# When blog generation completes
queue_item.metadata = {
    **queue_item.metadata,
    'total_cost': 0.15,
    'cost_breakdown': {
        'content_generation': 0.10,
        'image_generation': 0.05
    }
}
```

### Cost Filtering in API Responses

```python
def get_queue_item(queue_id, user):
    item = db.query(QueueItem).filter(QueueItem.queue_id == queue_id).first()
    
    # Check user role
    user_role = user.role
    
    # Admin roles that can see costs
    admin_roles = ['admin', 'owner', 'system_admin', 'super_admin']
    
    if user_role not in admin_roles:
        # Remove cost information for non-admins
        if 'total_cost' in item.metadata:
            item.metadata = {k: v for k, v in item.metadata.items() if k != 'total_cost' and k != 'cost_breakdown'}
    
    return item
```

### API Response Examples

**Admin Response:**
```json
{
  "queue_id": "queue_123",
  "status": "generated",
  "metadata": {
    "total_cost": 0.15,
    "cost_breakdown": {
      "content_generation": 0.10,
      "image_generation": 0.05
    },
    "cms_provider": "webflow",
    "site_id": "68fb5ca93834051fa8ee208b"
  }
}
```

**Non-Admin Response:**
```json
{
  "queue_id": "queue_123",
  "status": "generated",
  "metadata": {
    "cms_provider": "webflow",
    "site_id": "68fb5ca93834051fa8ee208b"
  }
}
```

---

## 📜 Logging & Auditing

### Integration Changes Audit Log

```python
def log_integration_change(action, integration_id, user_id, changes=None):
    audit_log = {
        "event_type": f"integration_{action}",
        "integration_id": integration_id,
        "user_id": user_id,
        "timestamp": datetime.utcnow().isoformat(),
        "changes": changes  # For update actions
    }
    
    # Store in audit_logs table or logging service
    db.insert("audit_logs", audit_log)
```

### Publish Attempt Audit Log

```python
def log_publish_attempt(draft_id, user_id, target, status, error=None):
    audit_log = {
        "event_type": "publish_attempt",
        "draft_id": draft_id,
        "user_id": user_id,
        "org_id": user.org_id,
        "cms_provider": target['provider'],
        "site_id": target['site_id'],
        "collection_id": target.get('collection_id'),
        "status": status,  # "success" | "failed"
        "error": error,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    db.insert("audit_logs", audit_log)
```

### Usage Logging

```python
def log_usage(org_id, site_id, total_cost, operation_type):
    usage_log = {
        "org_id": org_id,
        "site_id": site_id,
        "operation_type": operation_type,  # "blog_generation" | "image_generation"
        "total_cost": total_cost,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    db.insert("api_usage_logs", usage_log)
```

---

## ⚡ Caching Strategy

### Integration List Caching

```python
from functools import lru_cache
from datetime import datetime, timedelta

@lru_cache(maxsize=100)
def get_cached_integrations(org_id, cache_key):
    # Cache key includes timestamp rounded to 5 minutes
    # This ensures cache refreshes every 5 minutes
    return db.query(Integration).filter(
        Integration.org_id == org_id,
        Integration.status == 'active'
    ).all()

def get_integrations_cached(org_id):
    # Generate cache key with 5-minute TTL
    cache_key = f"{org_id}_{datetime.now().replace(second=0, microsecond=0).strftime('%Y%m%d%H%M')}"
    
    # Round down to nearest 5 minutes
    minutes = datetime.now().minute
    rounded_minutes = (minutes // 5) * 5
    cache_key = f"{org_id}_{datetime.now().replace(minute=rounded_minutes, second=0, microsecond=0).isoformat()}"
    
    return get_cached_integrations(org_id, cache_key)
```

**Alternative: Redis Cache**

```python
import redis
import json

redis_client = redis.Redis(host='localhost', port=6379, db=0)

def get_integrations_cached(org_id):
    cache_key = f"integrations:{org_id}"
    
    # Try cache first
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Fetch from database
    integrations = db.query(Integration).filter(
        Integration.org_id == org_id,
        Integration.status == 'active'
    ).all()
    
    # Cache for 5 minutes
    redis_client.setex(
        cache_key,
        300,  # 5 minutes
        json.dumps([i.to_dict() for i in integrations])
    )
    
    return integrations
```

---

## 🗄 Database Migrations

### Migration 1: Update Integrations Table

```sql
-- migration_001_add_multi_cms_support.sql

BEGIN;

-- Add new columns
ALTER TABLE integrations 
  ADD COLUMN IF NOT EXISTS site_id TEXT,
  ADD COLUMN IF NOT EXISTS site_name TEXT,
  ADD COLUMN IF NOT EXISTS collection_ids JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Remove old unique constraint if exists
ALTER TABLE integrations 
  DROP CONSTRAINT IF EXISTS integrations_org_id_type_key;

-- Add new unique constraint for (org_id, type, site_id)
CREATE UNIQUE INDEX IF NOT EXISTS integrations_org_type_site_unique 
  ON integrations(org_id, type, site_id) 
  WHERE site_id IS NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_integrations_org_type 
  ON integrations(org_id, type);
  
CREATE INDEX IF NOT EXISTS idx_integrations_org_default 
  ON integrations(org_id, is_default) 
  WHERE is_default = TRUE;
  
CREATE INDEX IF NOT EXISTS idx_integrations_status 
  ON integrations(status) 
  WHERE status = 'active';

-- Migrate existing integrations
-- Set site_id to a default value for existing integrations
UPDATE integrations 
SET site_id = CONCAT('site_', id::text)
WHERE site_id IS NULL;

-- Set site_name to type if null
UPDATE integrations 
SET site_name = CONCAT(UPPER(LEFT(type, 1)), SUBSTRING(type, 2), ' Integration')
WHERE site_name IS NULL;

-- Set first integration of each type as default
UPDATE integrations i1
SET is_default = TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM integrations i2
  WHERE i2.org_id = i1.org_id
    AND i2.type = i1.type
    AND i2.is_default = TRUE
);

COMMIT;
```

### Migration 2: Add Publishing Target Metadata

```sql
-- migration_002_add_publishing_metadata.sql

BEGIN;

-- No schema changes needed - using JSONB metadata
-- But add indexes on metadata fields for querying

-- For blog_posts table
CREATE INDEX IF NOT EXISTS idx_blog_posts_metadata_cms_provider 
  ON blog_posts USING GIN ((metadata->'cms_provider'));

CREATE INDEX IF NOT EXISTS idx_blog_posts_metadata_site_id 
  ON blog_posts USING GIN ((metadata->'site_id'));

CREATE INDEX IF NOT EXISTS idx_blog_posts_metadata_collection_id 
  ON blog_posts USING GIN ((metadata->'collection_id'));

-- For blog_generation_queue table
CREATE INDEX IF NOT EXISTS idx_queue_metadata_cms_provider 
  ON blog_generation_queue USING GIN ((generation_metadata->'cms_provider'));

CREATE INDEX IF NOT EXISTS idx_queue_metadata_site_id 
  ON blog_generation_queue USING GIN ((generation_metadata->'site_id'));

CREATE INDEX IF NOT EXISTS idx_queue_metadata_collection_id 
  ON blog_generation_queue USING GIN ((generation_metadata->'collection_id'));

COMMIT;
```

### Migration 3: Create User Organizations Table (if needed)

```sql
-- migration_003_create_user_organizations.sql

BEGIN;

CREATE TABLE IF NOT EXISTS user_organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_user_orgs_user 
  ON user_organizations(user_id);
  
CREATE INDEX IF NOT EXISTS idx_user_orgs_org 
  ON user_organizations(org_id);
  
CREATE INDEX IF NOT EXISTS idx_user_orgs_active 
  ON user_organizations(user_id, is_active) 
  WHERE is_active = TRUE;

-- Migrate existing user-org relationships
INSERT INTO user_organizations (user_id, org_id, role, is_active)
SELECT user_id, org_id, COALESCE(role, 'member'), TRUE
FROM users
WHERE org_id IS NOT NULL
ON CONFLICT (user_id, org_id) DO NOTHING;

COMMIT;
```

---

## 🚨 Error Handling

### Error Response Format

```json
{
  "error": "Error code",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional context",
    "code": "ERROR_CODE"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `NO_PUBLISHING_TARGET` | 400 | No publishing target selected and no default configured |
| `SITE_NOT_FOUND` | 404 | Selected site not found for this organization |
| `COLLECTION_NOT_FOUND` | 404 | Selected collection not found for this site |
| `INTEGRATION_DISABLED` | 422 | Integration is disabled or inactive |
| `MISSING_CREDENTIALS` | 422 | Integration missing required credentials |
| `CMS_API_ERROR` | 500 | Error from CMS API (include details) |
| `UNAUTHORIZED` | 403 | User not authorized for this action |
| `DUPLICATE_INTEGRATION` | 409 | Integration already exists for this site |

### Error Handling Examples

```python
def handle_publish_error(error, target):
    if isinstance(error, IntegrationNotFoundError):
        return {
            "error": "SITE_NOT_FOUND",
            "message": f"Selected site '{target['site_id']}' not found for this organization",
            "details": {
                "site_id": target['site_id'],
                "cms_provider": target['provider']
            }
        }, 404
    
    elif isinstance(error, MissingCredentialsError):
        return {
            "error": "MISSING_CREDENTIALS",
            "message": "Integration missing required credentials",
            "details": {
                "integration_id": target['integration'].id
            }
        }, 422
    
    elif isinstance(error, CMSAPIError):
        return {
            "error": "CMS_API_ERROR",
            "message": f"Error publishing to {target['provider']}: {error.message}",
            "details": {
                "cms_provider": target['provider'],
                "cms_error": error.details
            }
        }, 500
    
    else:
        return {
            "error": "INTERNAL_ERROR",
            "message": "An unexpected error occurred",
            "details": {}
        }, 500
```

---

## 🧪 Testing Checklist

### Integration Management Tests

- [ ] **Create Integration:** Admin can create new Webflow integration
- [ ] **Create Duplicate:** Cannot create duplicate site_id for same org+type
- [ ] **Set Default:** Setting is_default=true unsets other defaults
- [ ] **List Integrations:** Returns all integrations for user's org
- [ ] **Filter by Type:** Query parameter filters by integration type
- [ ] **Update Integration:** Admin can update integration details
- [ ] **Delete Integration:** Admin can delete integration
- [ ] **Delete Referenced:** Cannot delete integration referenced by drafts
- [ ] **Role Check:** Non-admin cannot create/update/delete integrations

### Publishing Target Tests

- [ ] **Get Targets:** Returns available CMS providers and sites
- [ ] **Default Target:** Returns default integration if set
- [ ] **No Default:** Returns null default if none configured
- [ ] **Collections:** Returns collections for Webflow sites
- [ ] **Cache:** Integration list is cached appropriately

### Draft/Queue Publishing Tests

- [ ] **Set Target:** Can set publishing target on draft
- [ ] **Set Target Queue:** Can set publishing target on queue item
- [ ] **Validate Site:** Cannot set invalid site_id
- [ ] **Validate Collection:** Cannot set invalid collection_id
- [ ] **Publish with Target:** Publishes to selected target
- [ ] **Publish without Target:** Uses default if available
- [ ] **Publish No Default:** Returns error if no target and no default
- [ ] **Publish Disabled Integration:** Returns error if integration disabled

### Cost Visibility Tests

- [ ] **Admin Sees Cost:** Admin role sees total_cost in response
- [ ] **Owner Sees Cost:** Owner role sees total_cost in response
- [ ] **Manager No Cost:** Manager role does not see total_cost
- [ ] **User No Cost:** Regular user does not see total_cost
- [ ] **Cost Logging:** Costs are logged for analytics

### Multi-Organization Tests

- [ ] **User Multi-Org:** User with multiple orgs sees correct integrations
- [ ] **Org Switching:** Active org determines which integrations are visible
- [ ] **Org Isolation:** Cannot access other org's integrations
- [ ] **Org Isolation Drafts:** Cannot see other org's drafts

### Performance Tests

- [ ] **Integration Cache:** Integration list is cached (5 min TTL)
- [ ] **Query Performance:** Indexes improve query performance
- [ ] **Bulk Operations:** Can handle multiple integrations efficiently

---

## 📚 Additional Implementation Notes

### Webflow Collection Discovery

When adding a Webflow integration, fetch available collections:

```python
def discover_webflow_collections(site_id, api_key):
    """Fetch available collections from Webflow API"""
    import requests
    
    headers = {
        'Authorization': f'Bearer {api_key}',
        'accept-version': '1.0.0'
    }
    
    response = requests.get(
        f'https://api.webflow.com/v2/sites/{site_id}/collections',
        headers=headers
    )
    
    if response.status_code == 200:
        collections = response.json().get('collections', [])
        return [
            {
                'id': c['id'],
                'name': c['displayName'],
                'slug': c['slug']
            }
            for c in collections
        ]
    
    return []
```

### Shopify Store Discovery

```python
def discover_shopify_resources(store_id, api_key, api_secret):
    """Discover available Shopify resources"""
    import requests
    
    # Shopify uses different endpoints
    # Implement based on Shopify API version
    pass
```

### WordPress Site Discovery

```python
def discover_wordpress_resources(site_url, username, password):
    """Discover WordPress site capabilities"""
    import requests
    from requests.auth import HTTPBasicAuth
    
    # WordPress REST API discovery
    response = requests.get(
        f'{site_url}/wp-json/wp/v2',
        auth=HTTPBasicAuth(username, password)
    )
    
    if response.status_code == 200:
        return response.json()
    
    return None
```

---

## 🔄 Migration Rollback Plan

If issues arise, rollback migrations:

```sql
-- Rollback Migration 3
DROP TABLE IF EXISTS user_organizations;

-- Rollback Migration 2
DROP INDEX IF EXISTS idx_blog_posts_metadata_cms_provider;
DROP INDEX IF EXISTS idx_blog_posts_metadata_site_id;
DROP INDEX IF EXISTS idx_blog_posts_metadata_collection_id;
DROP INDEX IF EXISTS idx_queue_metadata_cms_provider;
DROP INDEX IF EXISTS idx_queue_metadata_site_id;
DROP INDEX IF EXISTS idx_queue_metadata_collection_id;

-- Rollback Migration 1
ALTER TABLE integrations 
  DROP COLUMN IF EXISTS site_id,
  DROP COLUMN IF EXISTS site_name,
  DROP COLUMN IF EXISTS collection_ids,
  DROP COLUMN IF EXISTS is_default,
  DROP COLUMN IF EXISTS status;

DROP INDEX IF EXISTS integrations_org_type_site_unique;
DROP INDEX IF EXISTS idx_integrations_org_type;
DROP INDEX IF EXISTS idx_integrations_org_default;
DROP INDEX IF EXISTS idx_integrations_status;
```

---

## ✅ Success Criteria

Backend implementation is complete when:

1. ✅ Multiple integrations of same type can exist per org
2. ✅ Publishing targets can be selected per draft/queue item
3. ✅ Default integration fallback works correctly
4. ✅ Cost visibility is role-based (admin/owner only)
5. ✅ All queries are properly scoped to organization
6. ✅ Integration changes are audited
7. ✅ Publishing attempts are logged
8. ✅ Error handling is comprehensive
9. ✅ Performance is acceptable (caching, indexes)
10. ✅ All tests pass

---

## 📞 Support & Questions

For questions or clarifications, refer to:
- Frontend Integration Guide: `FRONTEND_PUBLISHING_GUIDE.md` (to be created)
- API Documentation: `/docs` endpoint
- Database Schema: `supabase/schema.sql`

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-15  
**Status:** Ready for Implementation

