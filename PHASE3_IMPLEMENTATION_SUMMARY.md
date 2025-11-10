# Phase 3 Implementation Summary: Database Migration Scripts

## ✅ Completed

Phase 3 of the Blog Writer API Integrations implementation has been successfully completed. This phase creates database migration scripts for environment-suffixed tables and provides data migration utilities.

## 📁 Files Created

### 1. Database Migration SQL
**File**: `supabase/migrations/20250115000000_add_environment_integrations.sql`

**Features**:
- Creates environment-suffixed tables for dev, staging, and prod
- Creates `integrations_dev`, `integrations_staging`, `integrations_prod` tables
- Creates `recommendations_dev`, `recommendations_staging`, `recommendations_prod` tables
- Adds indexes for performance
- Includes optional RLS policies (commented out)
- Adds table and column comments for documentation

**Table Structure**:
```sql
-- Integrations tables
CREATE TABLE integrations_dev (
  id uuid PRIMARY KEY,
  tenant_id uuid,
  provider text NOT NULL,
  connection jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT NOW()
);

-- Recommendations tables
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

### 2. Data Migration Script - Integrations
**File**: `scripts/migrate-integrations-to-environment-tables.ts`

**Features**:
- Migrates data from unified `integrations` table to environment-specific tables
- Maps `org_id` → `tenant_id`
- Preserves all metadata in `connection` JSONB field
- Checks for existing records to avoid duplicates
- Provides migration summary and verification
- Supports dev, staging, and prod environments

**Usage**:
```bash
# Migrate to dev (default)
npx tsx scripts/migrate-integrations-to-environment-tables.ts dev

# Migrate to staging
npx tsx scripts/migrate-integrations-to-environment-tables.ts staging

# Migrate to prod
npx tsx scripts/migrate-integrations-to-environment-tables.ts prod
```

**Migration Process**:
1. Fetches all integrations from unified table
2. For each integration:
   - Checks if already exists in target table
   - Maps `org_id` to `tenant_id`
   - Combines config, field_mappings, health_status into `connection` JSONB
   - Inserts into environment-specific table
3. Verifies migration by comparing record counts

### 3. Data Migration Script - Recommendations
**File**: `scripts/migrate-recommendations-to-environment-tables.ts`

**Features**:
- Helper script for manual recommendation migration
- Typically not needed as recommendations are created via Blog Writer API
- Useful for bulk data migration if needed

### 4. Migration Documentation
**File**: `supabase/migrations/README.md`

**Contents**:
- Migration execution instructions
- Migration order
- Data migration steps
- Troubleshooting guide
- Schema comparison
- Rollback procedures

## 🔄 Migration Flow

### Step 1: Run Schema Migration
Execute the SQL migration in Supabase:
```sql
-- Run: supabase/migrations/20250115000000_add_environment_integrations.sql
```

### Step 2: Run Data Migration (if needed)
If you have existing data in the unified `integrations` table:
```bash
npx tsx scripts/migrate-integrations-to-environment-tables.ts dev
```

### Step 3: Verify Migration
The script automatically verifies migration by comparing record counts.

## 📊 Schema Mapping

### Unified → Environment Schema

| Unified Schema | Environment Schema | Notes |
|----------------|-------------------|-------|
| `integration_id` | `id` | Same UUID |
| `org_id` | `tenant_id` | Direct mapping |
| `type` | `provider` | Same value |
| `config` | `connection.*` | Merged into connection JSONB |
| `field_mappings` | `connection.field_mappings` | Stored in connection |
| `health_status` | `connection.health_status` | Stored in connection |
| `last_sync` | `connection.last_sync` | Stored in connection |
| `name` | `connection._original_name` | Preserved in connection |
| `status` | `connection._original_status` | Preserved in connection |
| `created_at` | `created_at` | Same timestamp |
| `updated_at` | - | Not in environment schema |
| `created_by` | `connection._created_by` | Preserved in connection |

### Connection JSONB Structure

After migration, the `connection` field contains:
```json
{
  // Original config fields
  "apiKey": "...",
  "siteId": "...",
  
  // Migrated metadata
  "field_mappings": {...},
  "health_status": "healthy",
  "last_sync": "2025-01-15T...",
  
  // Migration metadata
  "_migrated_from": "integrations",
  "_original_name": "My Webflow Integration",
  "_original_status": "active",
  "_created_by": "user-uuid"
}
```

## 🎯 Key Features

### Idempotent Migration
- Checks for existing records before inserting
- Can be run multiple times safely
- Skips duplicates automatically

### Data Preservation
- All original data is preserved
- Metadata stored in `connection` JSONB
- Original timestamps maintained

### Environment Support
- Separate tables for dev, staging, prod
- Environment detection via `getEnvironment()`
- Manual environment override supported

### Verification
- Automatic record count comparison
- Error reporting for failed migrations
- Detailed migration summary

## 🧪 Testing Status

- ✅ TypeScript compilation passes
- ✅ No linting errors
- ✅ Migration script structure verified
- ⏳ Manual testing (requires database connection)
- ⏳ Integration testing (Phase 5)

## 📝 Usage Examples

### Basic Migration
```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run migration
npx tsx scripts/migrate-integrations-to-environment-tables.ts dev
```

### Migration Output Example
```
🚀 Starting Integration Migration
============================================================
Target Environment: dev
Target Table: integrations_dev
============================================================

🔌 Testing database connection...
✅ Database connection successful

📦 Migrating integrations to integrations_dev...
📊 Found 5 integrations to migrate
✅ Migrated integration abc-123 (webflow)
✅ Migrated integration def-456 (wordpress)
✅ Migrated integration ghi-789 (shopify)
...

============================================================
📊 Migration Summary
============================================================
✅ Migrated: 5 integrations
❌ Errors: 0 integrations
============================================================

📊 Migration Verification:
   Unified table (integrations): 5 records
   Environment table (integrations_dev): 5 records
✅ Migration verified: Record counts match

✅ Migration completed successfully!
```

## 🔧 Configuration

### Environment Variables Required
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Migration Options
- **Environment**: `dev`, `staging`, `prod` (defaults to detected environment)
- **Dry Run**: Not implemented (can be added if needed)
- **Batch Size**: Processes one record at a time (can be optimized)

## 🚀 Next Steps

**Phase 4**: API Routes & Frontend Integration
- Create `/api/integrations/connect-and-recommend` route
- Create `/api/integrations/recommend` route
- Frontend components for integration management

**Phase 5**: Testing
- Unit tests for migration scripts
- Integration tests
- Manual testing in each environment

## 📚 Related Documentation

- `PHASED_IMPLEMENTATION_PLAN.md` - Full implementation plan
- `PHASE1_IMPLEMENTATION_SUMMARY.md` - Database layer summary
- `PHASE2_IMPLEMENTATION_SUMMARY.md` - API client summary
- `supabase/migrations/README.md` - Migration documentation

## ✅ Checklist

- [x] Create migration SQL script
- [x] Create data migration script for integrations
- [x] Create data migration script for recommendations
- [x] Add migration documentation
- [x] TypeScript compilation
- [x] Linting
- [ ] Manual testing (requires database)
- [ ] Integration testing (Phase 5)

## 🔍 Migration Verification Checklist

After running migrations, verify:

1. **Schema Created**:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_name LIKE 'integrations_%' OR table_name LIKE 'recommendations_%';
   ```

2. **Data Migrated**:
   ```sql
   SELECT COUNT(*) FROM integrations;
   SELECT COUNT(*) FROM integrations_dev;
   -- Counts should match (if migrating all data)
   ```

3. **Indexes Created**:
   ```sql
   SELECT indexname FROM pg_indexes 
   WHERE tablename LIKE 'integrations_%';
   ```

4. **Data Integrity**:
   ```sql
   SELECT id, tenant_id, provider, connection->>'apiKey' as api_key
   FROM integrations_dev LIMIT 5;
   ```

---

**Status**: ✅ Phase 3 Complete
**Date**: 2025-01-15
**Next Phase**: Phase 4 - API Routes & Frontend Integration

