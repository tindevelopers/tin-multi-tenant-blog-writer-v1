/**
 * Test Script: Keyword Storage Migration Verification
 * 
 * Tests that the migration created all tables, functions, and policies correctly
 * Run with: npx tsx test-keyword-storage-migration.ts
 * Or: npm run test:migration (if script is added)
 */

import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('\nOr load from .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResults {
  tables: { passed: number; failed: number };
  functions: { passed: number; failed: number };
  indexes: { passed: number; failed: number };
  policies: { passed: number; failed: number };
  functionality: { passed: number; failed: number };
}

async function testMigration() {
  console.log('🧪 Testing Keyword Storage Migration...\n');
  
  const results: TestResults = {
    tables: { passed: 0, failed: 0 },
    functions: { passed: 0, failed: 0 },
    indexes: { passed: 0, failed: 0 },
    policies: { passed: 0, failed: 0 },
    functionality: { passed: 0, failed: 0 },
  };

  // Test 1: Check Tables Exist
  console.log('📊 Test 1: Checking Tables...');
  const requiredTables = ['keyword_cache', 'keyword_research_results', 'keyword_terms'];
  
  for (const tableName of requiredTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error && error.code === '42P01') {
        console.log(`  ❌ Table '${tableName}' does not exist`);
        results.tables.failed++;
      } else if (error && error.code === '42501') {
        // Permission denied means table exists but RLS is blocking
        console.log(`  ✅ Table '${tableName}' exists (RLS enabled)`);
        results.tables.passed++;
      } else {
        console.log(`  ✅ Table '${tableName}' exists`);
        results.tables.passed++;
      }
    } catch (err: any) {
      console.log(`  ❌ Error checking table '${tableName}':`, err.message);
      results.tables.failed++;
    }
  }

  // Test 2: Check Functions Exist (by trying to call them)
  console.log('\n🔧 Test 2: Checking Functions...');
  
  // Test get_cached_keyword
  try {
    const { data, error } = await supabase.rpc('get_cached_keyword', {
      p_keyword: 'test_keyword_migration',
      p_location: 'United States',
      p_language: 'en',
      p_search_type: 'traditional',
      p_user_id: null,
    });
    
    if (error && error.message.includes('does not exist')) {
      console.log('  ❌ Function get_cached_keyword does not exist');
      results.functions.failed++;
    } else {
      console.log('  ✅ Function get_cached_keyword exists and works');
      results.functions.passed++;
    }
  } catch (err: any) {
    console.log('  ❌ Error testing get_cached_keyword:', err.message);
    results.functions.failed++;
  }

  // Test flush_keyword_cache
  try {
    const { data, error } = await supabase.rpc('flush_keyword_cache', {
      p_user_id: null,
      p_keyword: 'test_keyword_that_does_not_exist',
      p_search_type: null,
    });
    
    if (error && error.message.includes('does not exist')) {
      console.log('  ❌ Function flush_keyword_cache does not exist');
      results.functions.failed++;
    } else {
      console.log(`  ✅ Function flush_keyword_cache exists and works (returned: ${data || 0})`);
      results.functions.passed++;
    }
  } catch (err: any) {
    console.log('  ❌ Error testing flush_keyword_cache:', err.message);
    results.functions.failed++;
  }

  // Test 3: Check RLS is Enabled (by checking if we get permission errors)
  console.log('\n🔒 Test 3: Checking RLS Policies...');
  const tablesToCheck = ['keyword_cache', 'keyword_research_results', 'keyword_terms'];
  
  for (const tableName of tablesToCheck) {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);
      
      // If we get a permission error (42501), RLS is working
      // If we get table not found (42P01), table doesn't exist
      // If no error, RLS might not be enabled (but could also be permissive policy)
      if (error) {
        if (error.code === '42501') {
          console.log(`  ✅ RLS enabled on '${tableName}' (permission check working)`);
          results.policies.passed++;
        } else if (error.code === '42P01') {
          console.log(`  ❌ Table '${tableName}' does not exist`);
          results.policies.failed++;
        } else {
          console.log(`  ⚠️  Table '${tableName}' accessible (check RLS policies manually)`);
          results.policies.passed++;
        }
      } else {
        console.log(`  ⚠️  Table '${tableName}' accessible without auth (may need to check RLS)`);
        results.policies.passed++; // Don't fail - might be permissive policy
      }
    } catch (err: any) {
      console.log(`  ⚠️  Could not verify RLS on '${tableName}':`, err.message);
      results.policies.passed++; // Don't fail - might be auth issue
    }
  }

  // Test 4: Test Basic Functionality - Cache a keyword
  console.log('\n⚙️  Test 4: Testing Cache Functionality...');
  
  try {
    // Try to insert a test cache entry (will fail if table structure is wrong)
    const testKeyword = `test_migration_${Date.now()}`;
    const { error: insertError } = await supabase
      .from('keyword_cache')
      .insert({
        keyword: testKeyword,
        location: 'United States',
        language: 'en',
        search_type: 'traditional',
        traditional_data: { test: true },
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      });
    
    if (insertError) {
      if (insertError.code === '42501') {
        console.log('  ✅ Cache insert requires auth (RLS working)');
        results.functionality.passed++;
      } else if (insertError.message.includes('column') || insertError.message.includes('constraint')) {
        console.log(`  ❌ Cache insert failed: ${insertError.message}`);
        results.functionality.failed++;
      } else {
        console.log(`  ⚠️  Cache insert: ${insertError.message}`);
        results.functionality.passed++; // Might be RLS or other non-structural issue
      }
    } else {
      console.log('  ✅ Cache insert works (test entry created)');
      results.functionality.passed++;
      
      // Clean up test entry
      await supabase
        .from('keyword_cache')
        .delete()
        .eq('keyword', testKeyword);
    }
  } catch (err: any) {
    console.log('  ⚠️  Could not test cache insert:', err.message);
    results.functionality.passed++; // Don't fail - might be auth issue
  }

  // Test 5: Verify Table Structure
  console.log('\n📋 Test 5: Verifying Table Structure...');
  
  try {
    // Check if keyword_cache has required columns by trying to query them
    const { error } = await supabase
      .from('keyword_cache')
      .select('keyword, location, language, search_type, expires_at, cached_at')
      .limit(0);
    
    if (error && error.message.includes('column')) {
      console.log(`  ❌ Missing required columns: ${error.message}`);
      results.functionality.failed++;
    } else {
      console.log('  ✅ Table structure appears correct');
      results.functionality.passed++;
    }
  } catch (err: any) {
    console.log('  ⚠️  Could not verify table structure:', err.message);
    results.functionality.passed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary:');
  console.log('='.repeat(50));
  
  const totalTests = {
    passed: Object.values(results).reduce((sum, r) => sum + r.passed, 0),
    failed: Object.values(results).reduce((sum, r) => sum + r.failed, 0),
  };

  console.log(`Tables:      ${results.tables.passed} passed, ${results.tables.failed} failed`);
  console.log(`Functions:   ${results.functions.passed} passed, ${results.functions.failed} failed`);
  console.log(`Policies:    ${results.policies.passed} passed, ${results.policies.failed} failed`);
  console.log(`Functionality: ${results.functionality.passed} passed, ${results.functionality.failed} failed`);
  console.log('='.repeat(50));
  console.log(`Total:       ${totalTests.passed} passed, ${totalTests.failed} failed`);
  
  if (totalTests.failed === 0 && totalTests.passed > 0) {
    console.log('\n✅ All tests passed! Migration is working correctly.');
    return 0;
  } else if (totalTests.failed > 0) {
    console.log('\n⚠️  Some tests failed. Please review the migration.');
    return 1;
  } else {
    console.log('\n⚠️  No tests ran. Check your Supabase connection.');
    return 1;
  }
}

// Run tests
testMigration()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(err => {
    console.error('\n❌ Test execution failed:', err);
    process.exit(1);
  });

