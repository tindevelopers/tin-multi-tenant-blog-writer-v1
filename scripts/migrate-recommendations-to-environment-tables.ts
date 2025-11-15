/**
 * Data Migration Script: Recommendations to Environment Tables
 * 
 * This script migrates recommendations data to environment-specific tables.
 * Note: Recommendations are typically created via Blog Writer API, so this
 * script is mainly for manual data migration if needed.
 * 
 * Usage:
 *   npx tsx scripts/migrate-recommendations-to-environment-tables.ts [environment]
 * 
 * Environment options: dev, staging, prod (defaults to dev)
 */

import { createServiceClient } from '../src/lib/supabase/service';
import { getEnvironment, getTableName, type Environment } from '../src/lib/environment';

interface RecommendationData {
  tenant_id: string;
  provider: string;
  keywords: string[];
  recommended_backlinks: number;
  recommended_interlinks: number;
  per_keyword: Array<{
    keyword: string;
    difficulty?: number;
    suggested_backlinks: number;
    suggested_interlinks: number;
  }>;
  notes?: string | null;
}

/**
 * Migrate recommendations to environment-specific table
 * 
 * This is a helper function for manual data migration.
 * In normal operation, recommendations are created directly in environment tables.
 */
async function migrateRecommendations(
  supabase: ReturnType<typeof createServiceClient>,
  targetEnv: Environment,
  recommendations: RecommendationData[]
): Promise<{ migrated: number; errors: number }> {
  const targetTable = getTableName('recommendations', targetEnv);
  console.log(`\n📦 Migrating ${recommendations.length} recommendations to ${targetTable}...`);

  let migrated = 0;
  let errors = 0;

  for (const recommendation of recommendations) {
    try {
      const { error: insertError } = await supabase
        .from(targetTable)
        .insert({
          tenant_id: recommendation.tenant_id,
          provider: recommendation.provider,
          keywords: recommendation.keywords,
          recommended_backlinks: recommendation.recommended_backlinks,
          recommended_interlinks: recommendation.recommended_interlinks,
          per_keyword: recommendation.per_keyword,
          notes: recommendation.notes || null,
        });

      if (insertError) {
        console.error(`❌ Error migrating recommendation:`, insertError.message);
        errors++;
      } else {
        migrated++;
      }
    } catch (error: any) {
      console.error(`❌ Error processing recommendation:`, error.message);
      errors++;
    }
  }

  return { migrated, errors };
}

/**
 * Main function for manual recommendation migration
 */
async function main() {
  const args = process.argv.slice(2);
  const envArg = args[0] as Environment | undefined;
  const targetEnv: Environment = envArg && ['dev', 'staging', 'prod'].includes(envArg)
    ? envArg
    : getEnvironment();

  console.log('🚀 Starting Recommendations Migration');
  console.log('='.repeat(60));
  console.log(`Target Environment: ${targetEnv}`);
  console.log(`Target Table: ${getTableName('recommendations', targetEnv)}`);
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

    // Example: Migrate recommendations from a JSON file or API response
    // In practice, recommendations are created via Blog Writer API
    console.log('\nℹ️  Recommendations are typically created via Blog Writer API.');
    console.log('   This script is for manual migration if needed.');
    console.log('   To use, provide recommendations data as JSON.');

    // Example usage:
    // const recommendations: RecommendationData[] = [
    //   {
    //     tenant_id: 'org-uuid',
    //     provider: 'webflow',
    //     keywords: ['keyword1', 'keyword2'],
    //     recommended_backlinks: 10,
    //     recommended_interlinks: 5,
    //     per_keyword: [
    //       {
    //         keyword: 'keyword1',
    //         suggested_backlinks: 5,
    //         suggested_interlinks: 2,
    //       },
    //     ],
    //   },
    // ];
    // 
    // const result = await migrateRecommendations(supabase, targetEnv, recommendations);
    // console.log(`✅ Migrated: ${result.migrated}, Errors: ${result.errors}`);

    console.log('\n✅ Script ready for use. Provide recommendations data to migrate.');
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { migrateRecommendations };

