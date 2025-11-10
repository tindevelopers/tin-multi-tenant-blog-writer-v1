/**
 * Data Migration Script: Unified to Environment Tables
 * 
 * This script migrates data from the unified 'integrations' table to
 * environment-specific tables (integrations_dev, integrations_staging, integrations_prod).
 * 
 * Usage:
 *   npx tsx scripts/migrate-integrations-to-environment-tables.ts [environment]
 * 
 * Environment options: dev, staging, prod (defaults to dev)
 * 
 * Example:
 *   npx tsx scripts/migrate-integrations-to-environment-tables.ts dev
 */

import { createServiceClient } from '../src/lib/supabase/service';
import { getEnvironment, getTableName, type Environment } from '../src/lib/environment';

interface UnifiedIntegration {
  integration_id: string;
  org_id: string;
  type: string;
  name: string;
  status: string;
  config: Record<string, unknown>;
  field_mappings?: Record<string, unknown>;
  health_status?: string;
  last_sync?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface EnvironmentIntegration {
  id: string;
  tenant_id: string;
  provider: string;
  connection: Record<string, unknown>;
  created_at: string;
}

/**
 * Migrate integrations from unified table to environment-specific table
 */
async function migrateIntegrations(
  supabase: ReturnType<typeof createServiceClient>,
  targetEnv: Environment
): Promise<{ migrated: number; errors: number }> {
  const targetTable = getTableName('integrations', targetEnv);
  console.log(`\n📦 Migrating integrations to ${targetTable}...`);

  // Fetch all integrations from unified table
  const { data: integrations, error: fetchError } = await supabase
    .from('integrations')
    .select('*')
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('❌ Error fetching integrations:', fetchError);
    throw new Error(`Failed to fetch integrations: ${fetchError.message}`);
  }

  if (!integrations || integrations.length === 0) {
    console.log('ℹ️  No integrations found to migrate');
    return { migrated: 0, errors: 0 };
  }

  console.log(`📊 Found ${integrations.length} integrations to migrate`);

  let migrated = 0;
  let errors = 0;

  for (const integration of integrations as UnifiedIntegration[]) {
    try {
      // Check if integration already exists in target table
      const { data: existing } = await supabase
        .from(targetTable)
        .select('id')
        .eq('id', integration.integration_id)
        .single();

      if (existing) {
        console.log(`⏭️  Skipping ${integration.integration_id} (already exists in ${targetTable})`);
        continue;
      }

      // Prepare connection JSONB with all metadata
      const connection: Record<string, unknown> = {
        ...integration.config,
        // Include additional metadata in connection
        field_mappings: integration.field_mappings || {},
        health_status: integration.health_status || 'unknown',
        last_sync: integration.last_sync || null,
        // Store original metadata for reference
        _migrated_from: 'integrations',
        _original_name: integration.name,
        _original_status: integration.status,
        _created_by: integration.created_by || null,
      };

      // Insert into environment-specific table
      const { error: insertError } = await supabase
        .from(targetTable)
        .insert({
          id: integration.integration_id,
          tenant_id: integration.org_id, // Map org_id to tenant_id
          provider: integration.type,
          connection,
          created_at: integration.created_at,
        });

      if (insertError) {
        console.error(`❌ Error migrating integration ${integration.integration_id}:`, insertError.message);
        errors++;
      } else {
        console.log(`✅ Migrated integration ${integration.integration_id} (${integration.type})`);
        migrated++;
      }
    } catch (error: any) {
      console.error(`❌ Error processing integration ${integration.integration_id}:`, error.message);
      errors++;
    }
  }

  return { migrated, errors };
}

/**
 * Verify migration results
 */
async function verifyMigration(
  supabase: ReturnType<typeof createServiceClient>,
  targetEnv: Environment
): Promise<void> {
  const targetTable = getTableName('integrations', targetEnv);
  
  // Count records in both tables
  const { count: unifiedCount } = await supabase
    .from('integrations')
    .select('*', { count: 'exact', head: true });

  const { count: envCount } = await supabase
    .from(targetTable)
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Migration Verification:`);
  console.log(`   Unified table (integrations): ${unifiedCount || 0} records`);
  console.log(`   Environment table (${targetTable}): ${envCount || 0} records`);

  if ((unifiedCount || 0) === (envCount || 0)) {
    console.log('✅ Migration verified: Record counts match');
  } else {
    console.warn('⚠️  Migration verification: Record counts do not match');
  }
}

/**
 * Main migration function
 */
async function main() {
  const args = process.argv.slice(2);
  const envArg = args[0] as Environment | undefined;
  const targetEnv: Environment = envArg && ['dev', 'staging', 'prod'].includes(envArg)
    ? envArg
    : getEnvironment();

  console.log('🚀 Starting Integration Migration');
  console.log('='.repeat(60));
  console.log(`Target Environment: ${targetEnv}`);
  console.log(`Target Table: ${getTableName('integrations', targetEnv)}`);
  console.log('='.repeat(60));

  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL environment variable is not set');
    process.exit(1);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
    process.exit(1);
  }

  try {
    const supabase = createServiceClient();

    // Test connection
    console.log('\n🔌 Testing database connection...');
    const { error: testError } = await supabase.from('integrations').select('integration_id').limit(1);
    if (testError && testError.code !== 'PGRST116') {
      throw new Error(`Database connection failed: ${testError.message}`);
    }
    console.log('✅ Database connection successful');

    // Perform migration
    const result = await migrateIntegrations(supabase, targetEnv);

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));
    console.log(`✅ Migrated: ${result.migrated} integrations`);
    console.log(`❌ Errors: ${result.errors} integrations`);
    console.log('='.repeat(60));

    // Verify migration
    await verifyMigration(supabase, targetEnv);

    if (result.errors === 0) {
      console.log('\n✅ Migration completed successfully!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Migration completed with errors. Please review the output above.');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration if executed directly
if (require.main === module) {
  main();
}

export { migrateIntegrations, verifyMigration };

