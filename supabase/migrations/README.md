# Database Migrations

This directory contains SQL migration scripts for the Supabase database schema.

## Migration Files

### 20250110000000_create_integrations_abstraction.sql
Creates the unified `integrations` and `integration_publish_logs` tables with RLS policies.

### 20250115000000_add_environment_integrations.sql
Creates environment-suffixed tables (`integrations_dev`, `integrations_staging`, `integrations_prod`) and recommendations tables for each environment.

## Running Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New query**
4. Copy and paste the migration SQL
5. Click **Run** to execute

### Option 2: Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Option 3: Manual Execution

Copy the SQL from the migration file and execute it directly in your database.

## Migration Order

Migrations should be run in chronological order:

1. `20250110000000_create_integrations_abstraction.sql` - Creates unified schema
2. `20250115000000_add_environment_integrations.sql` - Adds environment tables

## Data Migration

After running the schema migrations, use the data migration scripts to migrate existing data:

```bash
# Migrate integrations from unified to environment tables
npx tsx scripts/migrate-integrations-to-environment-tables.ts dev

# For staging
npx tsx scripts/migrate-integrations-to-environment-tables.ts staging

# For production
npx tsx scripts/migrate-integrations-to-environment-tables.ts prod
```

## Environment Variables Required

Make sure these environment variables are set:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Rollback

To rollback a migration, you can drop the tables:

```sql
-- Drop environment tables (use with caution!)
DROP TABLE IF EXISTS integrations_dev CASCADE;
DROP TABLE IF EXISTS recommendations_dev CASCADE;
DROP TABLE IF EXISTS integrations_staging CASCADE;
DROP TABLE IF EXISTS recommendations_staging CASCADE;
DROP TABLE IF EXISTS integrations_prod CASCADE;
DROP TABLE IF EXISTS recommendations_prod CASCADE;
```

**Note**: This will delete all data in these tables. Make sure to backup data before rolling back.

## Troubleshooting

### Migration Fails with "relation already exists"
The migration uses `CREATE TABLE IF NOT EXISTS`, so this shouldn't happen. If it does, the tables may have been created manually. You can safely skip the migration or drop and recreate.

### RLS Policies Not Working
Make sure you've uncommented and executed the RLS policy sections in the migration file if you want Row Level Security enabled.

### Data Migration Script Fails
- Check that environment variables are set correctly
- Verify that the unified `integrations` table exists
- Ensure you have service role key permissions
- Check that target environment tables exist

## Schema Comparison

### Unified Schema (Legacy)
- Single `integrations` table for all environments
- Uses `org_id` for multi-tenancy
- Includes `field_mappings`, `health_status`, `last_sync`

### Environment Schema (New)
- Separate tables per environment: `integrations_dev`, `integrations_staging`, `integrations_prod`
- Uses `tenant_id` (maps to `org_id`)
- Simpler structure: `id`, `tenant_id`, `provider`, `connection` (JSONB)
- Separate `recommendations_*` tables for Blog Writer API recommendations

## Next Steps

After running migrations:
1. Verify tables were created: Check Supabase dashboard
2. Run data migration script if you have existing data
3. Update application to use environment-aware database layer
4. Test integration operations in each environment

