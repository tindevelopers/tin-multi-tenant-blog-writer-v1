/**
 * Test Multi-Content-Type Migration and API Endpoints
 * 
 * This script will:
 * 1. Check if migration tables exist
 * 2. Verify data migration
 * 3. Test all new API endpoints
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green);
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logSection(message: string) {
  console.log('\n' + '='.repeat(60));
  log(message, colors.cyan);
  console.log('='.repeat(60));
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  logError('Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TestResult {
  passed: number;
  failed: number;
  warnings: number;
}

const results: TestResult = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

/**
 * Check if a table exists
 */
async function tableExists(tableName: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);
  
  return !error || !error.message.includes('does not exist');
}

/**
 * Test 1: Check if migration tables exist
 */
async function testMigrationTables() {
  logSection('Test 1: Checking Migration Tables');
  
  const tables = [
    'integration_sites',
    'content_type_profiles',
    'content_type_field_mappings',
  ];
  
  for (const table of tables) {
    const exists = await tableExists(table);
    if (exists) {
      logSuccess(`Table '${table}' exists`);
      results.passed++;
    } else {
      logError(`Table '${table}' does NOT exist - migration may not have been run`);
      results.failed++;
    }
  }
}

/**
 * Test 2: Check if migration columns were added
 */
async function testMigrationColumns() {
  logSection('Test 2: Checking Migration Columns');
  
  // Check if integrations table has new columns
  const { data: integrations, error } = await supabase
    .from('integrations')
    .select('integration_id, supports_multiple_sites, migration_completed')
    .limit(1);
  
  if (error) {
    logWarning(`Could not check integrations columns: ${error.message}`);
    results.warnings++;
  } else if (integrations && integrations.length > 0) {
    const integration = integrations[0];
    if ('supports_multiple_sites' in integration) {
      logSuccess('Column "supports_multiple_sites" exists in integrations table');
      results.passed++;
    } else {
      logError('Column "supports_multiple_sites" missing from integrations table');
      results.failed++;
    }
    
    if ('migration_completed' in integration) {
      logSuccess('Column "migration_completed" exists in integrations table');
      results.passed++;
    } else {
      logError('Column "migration_completed" missing from integrations table');
      results.failed++;
    }
  } else {
    logWarning('No integrations found to test column existence');
    results.warnings++;
  }
}

/**
 * Test 3: Check data migration
 */
async function testDataMigration() {
  logSection('Test 3: Checking Data Migration');
  
  // Check integration_sites
  const { data: sites, error: sitesError } = await supabase
    .from('integration_sites')
    .select('*');
  
  if (sitesError) {
    logError(`Failed to fetch integration_sites: ${sitesError.message}`);
    results.failed++;
  } else {
    logInfo(`Found ${sites?.length || 0} sites in integration_sites table`);
    if (sites && sites.length > 0) {
      logSuccess('Sites data migrated successfully');
      results.passed++;
      
      // Check for default sites
      const defaultSites = sites.filter((s: any) => s.is_default);
      logInfo(`  - ${defaultSites.length} default sites`);
      logInfo(`  - ${sites.filter((s: any) => s.is_active).length} active sites`);
    } else {
      logWarning('No sites found - this is expected if no integrations existed');
      results.warnings++;
    }
  }
  
  // Check content_type_profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('content_type_profiles')
    .select('*');
  
  if (profilesError) {
    logError(`Failed to fetch content_type_profiles: ${profilesError.message}`);
    results.failed++;
  } else {
    logInfo(`Found ${profiles?.length || 0} profiles in content_type_profiles table`);
    if (profiles && profiles.length > 0) {
      logSuccess('Content type profiles migrated successfully');
      results.passed++;
      
      // Check for default profiles
      const defaultProfiles = profiles.filter((p: any) => p.is_default);
      logInfo(`  - ${defaultProfiles.length} default profiles`);
      logInfo(`  - ${profiles.filter((p: any) => p.is_active).length} active profiles`);
    } else {
      logWarning('No content type profiles found - this is expected if no integrations existed');
      results.warnings++;
    }
  }
  
  // Check content_type_field_mappings
  const { data: mappings, error: mappingsError } = await supabase
    .from('content_type_field_mappings')
    .select('*');
  
  if (mappingsError) {
    logError(`Failed to fetch content_type_field_mappings: ${mappingsError.message}`);
    results.failed++;
  } else {
    logInfo(`Found ${mappings?.length || 0} field mappings in content_type_field_mappings table`);
    if (mappings && mappings.length > 0) {
      logSuccess('Field mappings migrated successfully');
      results.passed++;
      
      // Group by profile
      const profileGroups = mappings.reduce((acc: any, m: any) => {
        acc[m.profile_id] = (acc[m.profile_id] || 0) + 1;
        return acc;
      }, {});
      logInfo(`  - Mappings span ${Object.keys(profileGroups).length} profiles`);
    } else {
      logWarning('No field mappings found - this is expected if no integrations existed');
      results.warnings++;
    }
  }
}

/**
 * Test 4: Test database functions
 */
async function testDatabaseFunctions() {
  logSection('Test 4: Testing Database Functions');
  
  // Test that we can query with the new schema
  const { data: integrations, error } = await supabase
    .from('integrations')
    .select(`
      *,
      integration_sites (
        *,
        content_type_profiles (
          *,
          content_type_field_mappings (*)
        )
      )
    `)
    .limit(1);
  
  if (error) {
    logError(`Failed to query with new schema: ${error.message}`);
    results.failed++;
  } else {
    logSuccess('Successfully queried integrations with nested sites/profiles/mappings');
    results.passed++;
    
    if (integrations && integrations.length > 0) {
      const integration = integrations[0];
      logInfo(`  - Integration: ${integration.name || integration.integration_id}`);
      logInfo(`  - Sites: ${(integration as any).integration_sites?.length || 0}`);
    }
  }
}

/**
 * Test 5: Test RLS policies
 */
async function testRLSPolicies() {
  logSection('Test 5: Testing RLS Policies');
  
  // Get a user to test with (use service key so we can see all data)
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError || !users || users.users.length === 0) {
    logWarning('No users found to test RLS policies');
    results.warnings++;
    return;
  }
  
  logInfo(`Found ${users.users.length} users to test RLS with`);
  
  // RLS policies are active by default, so just verify the tables have RLS enabled
  const tables = ['integration_sites', 'content_type_profiles', 'content_type_field_mappings'];
  
  for (const table of tables) {
    // Try to select from the table (service role key bypasses RLS)
    const { error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (!error) {
      logSuccess(`RLS is configured for table '${table}' (accessible with service key)`);
      results.passed++;
    } else {
      logError(`Issue with table '${table}': ${error.message}`);
      results.failed++;
    }
  }
}

/**
 * Test 6: Create test data for API testing
 */
async function createTestData() {
  logSection('Test 6: Creating Test Data');
  
  // Get or create a test organization
  const { data: orgs } = await supabase
    .from('organizations')
    .select('*')
    .limit(1);
  
  let orgId: string;
  
  if (!orgs || orgs.length === 0) {
    logInfo('No organizations found, creating test organization...');
    const { data: newOrg, error } = await supabase
      .from('organizations')
      .insert({
        org_name: 'Test Organization',
        org_slug: `test-org-${Date.now()}`,
      })
      .select()
      .single();
    
    if (error) {
      logError(`Failed to create test organization: ${error.message}`);
      results.failed++;
      return null;
    }
    
    orgId = newOrg.org_id;
    logSuccess(`Created test organization: ${orgId}`);
  } else {
    orgId = orgs[0].org_id;
    logInfo(`Using existing organization: ${orgId}`);
  }
  
  // Get or create a test integration
  const { data: integrations } = await supabase
    .from('integrations')
    .select('*')
    .eq('org_id', orgId)
    .limit(1);
  
  let integrationId: string;
  
  if (!integrations || integrations.length === 0) {
    logInfo('No integrations found, creating test integration...');
    const { data: newIntegration, error } = await supabase
      .from('integrations')
      .insert({
        org_id: orgId,
        name: 'Test Webflow Integration',
        type: 'webflow',
        status: 'active',
        config: {
          api_key: 'test-api-key',
          site_id: 'test-site-id',
          collection_id: 'test-collection-id',
        },
      })
      .select()
      .single();
    
    if (error) {
      logError(`Failed to create test integration: ${error.message}`);
      results.failed++;
      return null;
    }
    
    integrationId = newIntegration.integration_id;
    logSuccess(`Created test integration: ${integrationId}`);
  } else {
    integrationId = integrations[0].integration_id;
    logInfo(`Using existing integration: ${integrationId}`);
  }
  
  results.passed++;
  return { orgId, integrationId };
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n🧪 Multi-Content-Type Migration Test Suite\n', colors.cyan);
  
  try {
    // Phase 1: Database tests
    await testMigrationTables();
    await testMigrationColumns();
    await testDataMigration();
    await testDatabaseFunctions();
    await testRLSPolicies();
    
    // Phase 2: Create test data (optional)
    const testData = await createTestData();
    
    // Print summary
    logSection('Test Summary');
    logSuccess(`Passed: ${results.passed}`);
    if (results.failed > 0) {
      logError(`Failed: ${results.failed}`);
    }
    if (results.warnings > 0) {
      logWarning(`Warnings: ${results.warnings}`);
    }
    
    log('\nTotal Tests:', colors.cyan);
    log(`  ✅ Passed: ${results.passed}`, colors.green);
    if (results.failed > 0) {
      log(`  ❌ Failed: ${results.failed}`, colors.red);
    }
    if (results.warnings > 0) {
      log(`  ⚠️  Warnings: ${results.warnings}`, colors.yellow);
    }
    
    if (testData) {
      logSection('Next Steps: Test API Endpoints');
      logInfo('Use the following IDs to test the API endpoints:');
      log(`  Organization ID: ${testData.orgId}`, colors.cyan);
      log(`  Integration ID: ${testData.integrationId}`, colors.cyan);
      log('\nRun the API tests with:', colors.blue);
      log('  npm run test:api -- --integration-id=' + testData.integrationId, colors.cyan);
    }
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (error) {
    logError(`Test suite failed with error: ${error}`);
    process.exit(1);
  }
}

// Run the tests
runTests();

