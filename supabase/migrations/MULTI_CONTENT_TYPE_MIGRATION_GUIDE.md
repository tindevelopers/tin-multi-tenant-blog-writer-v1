# Multi-Content-Type Support Migration Guide

## Overview

This migration enables support for:
1. **Multiple sites per integration** (e.g., multiple Webflow sites under one organization)
2. **Content type profiles** (e.g., Article, Product Review, Case Study)
3. **Field mappings per content type** (different mappings for different content types)

## Migration File

**File:** `20251201111200_multi_content_type_support.sql`

## What This Migration Does

### Phase 1: Creates New Tables

1. **`integration_sites`**
   - Stores multiple sites per integration
   - Example: Multiple Webflow sites, WordPress sites, or Shopify shops
   - Fields: `site_id`, `site_name`, `site_url`, `is_default`, `is_active`

2. **`content_type_profiles`**
   - Defines reusable content type templates
   - Example: "Article", "Product Review", "Case Study"
   - Fields: `profile_name`, `content_type`, `target_collection_id`, `is_default`

3. **`content_type_field_mappings`**
   - Stores field mappings per content type profile
   - Maps blog fields to CMS-specific fields
   - Fields: `blog_field`, `target_field`, `is_required`, `transform_config`

### Phase 2: Migrates Existing Data

- **Site Migration**: Extracts `site_id` from `integrations.config` → creates `integration_sites` entries
- **Profile Migration**: Creates default "Blog Post" profiles for integrations with field mappings
- **Field Mapping Migration**: Migrates `integrations.field_mappings` → `content_type_field_mappings`

### Phase 3: Adds Indexes

- Performance indexes on foreign keys
- Indexes for common queries (default sites, active profiles, etc.)

### Phase 4: Adds RLS Policies

- Row Level Security policies for all new tables
- Ensures users can only access their organization's data
- Admins can manage, regular users can view

### Phase 5: Adds Helper Functions

- Auto-update `updated_at` timestamps
- Ensure only one default site per integration
- Ensure only one default profile per integration/site

### Phase 6: Backward Compatibility

- Adds `content_type_profile_id` to `blog_posts` (if table exists)
- Adds `target_site_id` to `blog_posts` (if table exists)
- Adds `supports_multiple_sites` flag to `integrations`
- Adds `migration_completed` flag to `integrations`

## Data Migration Details

### Site Migration Logic

```sql
-- Migrates site_id from integrations.config to integration_sites
-- Checks for: site_id, siteId, site_url in config JSONB
-- Creates default site entry with is_default = true
```

### Profile Migration Logic

```sql
-- Creates "Blog Post" profile for integrations with:
-- - Existing field_mappings
-- - collection_id in config
-- - collectionId in config
-- Sets is_default = true for migrated profiles
```

### Field Mapping Migration Logic

```sql
-- Migrates JSONB field_mappings to individual rows
-- Example: {"title": "post-title", "content": "post-body"}
-- Becomes: Two rows in content_type_field_mappings
-- Sets is_required = true for title, content, slug
```

## Backward Compatibility

### Old Schema Still Works

- Existing integrations continue to function
- `integrations.field_mappings` column remains (not deleted)
- `integrations.config` remains unchanged
- Old API endpoints can still read from old columns

### Migration Flags

- `supports_multiple_sites`: Indicates if integration supports multiple sites
- `migration_completed`: Indicates if data has been migrated to new tables

## Testing the Migration

### Pre-Migration Checklist

1. ✅ Backup database
2. ✅ Verify all integrations have valid `org_id`
3. ✅ Check for any NULL `field_mappings` that should have data
4. ✅ Verify `integrations.config` structure

### Post-Migration Verification

```sql
-- Check migrated sites
SELECT COUNT(*) FROM integration_sites;
SELECT * FROM integration_sites WHERE is_default = true;

-- Check migrated profiles
SELECT COUNT(*) FROM content_type_profiles;
SELECT * FROM content_type_profiles WHERE is_default = true;

-- Check migrated field mappings
SELECT COUNT(*) FROM content_type_field_mappings;
SELECT profile_id, blog_field, target_field 
FROM content_type_field_mappings 
ORDER BY profile_id, display_order;

-- Verify migration flags
SELECT integration_id, supports_multiple_sites, migration_completed 
FROM integrations 
WHERE migration_completed = true;
```

## Rollback Plan

If migration needs to be rolled back:

1. **Drop new tables** (in reverse order):
   ```sql
   DROP TABLE IF EXISTS content_type_field_mappings CASCADE;
   DROP TABLE IF EXISTS content_type_profiles CASCADE;
   DROP TABLE IF EXISTS integration_sites CASCADE;
   ```

2. **Remove added columns**:
   ```sql
   ALTER TABLE blog_posts DROP COLUMN IF EXISTS content_type_profile_id;
   ALTER TABLE blog_posts DROP COLUMN IF EXISTS target_site_id;
   ALTER TABLE integrations DROP COLUMN IF EXISTS supports_multiple_sites;
   ALTER TABLE integrations DROP COLUMN IF EXISTS migration_completed;
   ```

3. **Drop functions and triggers**:
   ```sql
   DROP FUNCTION IF EXISTS ensure_single_default_site() CASCADE;
   DROP FUNCTION IF EXISTS ensure_single_default_profile() CASCADE;
   DROP FUNCTION IF EXISTS update_integration_sites_updated_at() CASCADE;
   DROP FUNCTION IF EXISTS update_content_type_profiles_updated_at() CASCADE;
   DROP FUNCTION IF EXISTS update_field_mappings_updated_at() CASCADE;
   ```

## Next Steps After Migration

1. **Update API Endpoints**
   - `/api/integrations/[id]/sites` - Manage sites
   - `/api/integrations/[id]/content-types` - Manage content type profiles
   - `/api/integrations/[id]/content-types/[profile_id]/fields` - Manage field mappings

2. **Update Frontend Components**
   - Add site selector in integration settings
   - Add content type profile selector in blog editor
   - Update field mapping UI to be profile-specific

3. **Update Publishing Workflow**
   - Accept `content_type_profile_id` in publish requests
   - Accept `target_site_id` in publish requests
   - Resolve field mappings from profile

4. **Deprecate Old Columns** (Future Migration)
   - After all code is updated, create migration to:
     - Remove `field_mappings` column from `integrations`
     - Remove `collection_id` from `integrations.config`
     - Remove `site_id` from `integrations.config`

## Example Use Cases

### Use Case 1: Multiple Webflow Sites

```
Integration: "Webflow Main Account"
├── Site 1: "Marketing Site" (site_id: abc123)
│   ├── Profile: "Article" (collection_id: coll_article)
│   └── Profile: "Case Study" (collection_id: coll_case)
└── Site 2: "Product Site" (site_id: def456)
    ├── Profile: "Product Review" (collection_id: coll_review)
    └── Profile: "Tutorial" (collection_id: coll_tutorial)
```

### Use Case 2: Multiple Content Types, One Site

```
Integration: "Webflow Blog"
└── Site: "Main Blog" (site_id: xyz789)
    ├── Profile: "Article" (collection_id: coll_article)
    ├── Profile: "Product Review" (collection_id: coll_review)
    └── Profile: "Case Study" (collection_id: coll_case)
```

### Use Case 3: WordPress Multi-Site

```
Integration: "WordPress Network"
├── Site 1: "Blog Site" (site_url: blog.example.com)
│   ├── Profile: "Posts" (post_type: post)
│   └── Profile: "Pages" (post_type: page)
└── Site 2: "News Site" (site_url: news.example.com)
    ├── Profile: "News Articles" (post_type: news)
    └── Profile: "Press Releases" (post_type: press_release)
```

## Support

For questions or issues with this migration, please refer to:
- Migration file: `supabase/migrations/20251201111200_multi_content_type_support.sql`
- Integration API documentation
- Database schema documentation

