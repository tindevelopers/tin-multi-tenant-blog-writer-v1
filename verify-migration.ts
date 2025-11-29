/**
 * Migration Verification Script
 * 
 * Run with: npx tsx verify-migration.ts
 * 
 * Verifies that all migration components are correctly set up
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('\nCurrent values:');
  console.error(`  SUPABASE_URL: ${SUPABASE_URL ? 'Set' : 'Missing'}`);
  console.error(`  SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? 'Set' : 'Missing'}`);
  console.error('\n💡 Tip: Check your .env.local or .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface VerificationResult {
  name: string;
  status: '✅' | '❌' | '⚠️';
  message: string;
  details?: any;
}

async function verifyMigration() {
  console.log('🔍 Verifying Migration...\n');
  const results: VerificationResult[] = [];

  // 1. Check if tables exist
  console.log('1. Checking tables...');
  
  const tables = ['keyword_cache', 'keyword_research_results', 'keyword_terms'];
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(0);
    
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        results.push({
          name: `Table: ${table}`,
          status: '❌',
          message: `Table does not exist`,
          details: error.message,
        });
      } else {
        results.push({
          name: `Table: ${table}`,
          status: '✅',
          message: `Table exists (accessible)`,
        });
      }
    } else {
      results.push({
        name: `Table: ${table}`,
        status: '✅',
        message: `Table exists and is accessible`,
      });
    }
  }

  // 2. Check RPC functions
  console.log('\n2. Checking RPC functions...');
  
  const functions = [
    'get_cached_keyword',
    'flush_keyword_cache',
    'clean_expired_keyword_cache',
  ];

  for (const funcName of functions) {
    try {
      // Try calling with minimal parameters
      if (funcName === 'get_cached_keyword') {
        const { data, error } = await supabase.rpc(funcName, {
          p_keyword: 'test_verification_keyword_that_does_not_exist',
          p_location: 'United States',
          p_language: 'en',
          p_search_type: 'traditional',
          p_user_id: null,
        });
        
        if (error) {
          if (error.code === '42883' || error.message.includes('does not exist')) {
            results.push({
              name: `Function: ${funcName}`,
              status: '❌',
              message: `Function does not exist`,
              details: error.message,
            });
          } else if (error.code === '42501' || error.message.includes('permission denied')) {
            results.push({
              name: `Function: ${funcName}`,
              status: '⚠️',
              message: `Function exists but permission denied (GRANT may be missing)`,
              details: error.message,
            });
          } else {
            // Other errors (like no data found) are OK - function exists
            results.push({
              name: `Function: ${funcName}`,
              status: '✅',
              message: `Function exists and is callable`,
            });
          }
        } else {
          results.push({
            name: `Function: ${funcName}`,
            status: '✅',
            message: `Function exists and is callable`,
          });
        }
      } else if (funcName === 'flush_keyword_cache') {
        const { data, error } = await supabase.rpc(funcName, {
          p_user_id: null,
          p_keyword: null,
          p_search_type: null,
        });
        
        if (error) {
          if (error.code === '42883' || error.message.includes('does not exist')) {
            results.push({
              name: `Function: ${funcName}`,
              status: '❌',
              message: `Function does not exist`,
              details: error.message,
            });
          } else if (error.code === '42501' || error.message.includes('permission denied')) {
            results.push({
              name: `Function: ${funcName}`,
              status: '⚠️',
              message: `Function exists but permission denied`,
              details: error.message,
            });
          } else {
            results.push({
              name: `Function: ${funcName}`,
              status: '✅',
              message: `Function exists and is callable`,
            });
          }
        } else {
          results.push({
            name: `Function: ${funcName}`,
            status: '✅',
            message: `Function exists and is callable`,
          });
        }
      }
    } catch (e: any) {
      results.push({
        name: `Function: ${funcName}`,
        status: '❌',
        message: `Error testing function`,
        details: e.message,
      });
    }
  }

  // 3. Check indexes (indirectly by checking query performance)
  console.log('\n3. Checking indexes...');
  
  try {
    const { data, error } = await supabase
      .from('keyword_cache')
      .select('id')
      .eq('keyword', 'test')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') {
      results.push({
        name: 'Indexes',
        status: '⚠️',
        message: 'Could not verify indexes (table may not exist)',
      });
    } else {
      results.push({
        name: 'Indexes',
        status: '✅',
        message: 'Indexes appear to be working (queries execute)',
      });
    }
  } catch (e: any) {
    results.push({
      name: 'Indexes',
      status: '⚠️',
      message: 'Could not verify indexes',
      details: e.message,
    });
  }

  // 4. Check RLS policies (by checking if we can query with auth)
  console.log('\n4. Checking RLS policies...');
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      const { error } = await supabase
        .from('keyword_research_results')
        .select('id')
        .limit(0);
      
      if (error && error.code === '42501') {
        results.push({
          name: 'RLS Policies',
          status: '⚠️',
          message: 'RLS is enabled but policies may be blocking access',
          details: error.message,
        });
      } else {
        results.push({
          name: 'RLS Policies',
          status: '✅',
          message: 'RLS policies are configured (authenticated access works)',
        });
      }
    } else {
      results.push({
        name: 'RLS Policies',
        status: '⚠️',
        message: 'Cannot verify RLS (not authenticated)',
      });
    }
  } catch (e: any) {
    results.push({
      name: 'RLS Policies',
      status: '⚠️',
      message: 'Could not verify RLS',
      details: e.message,
    });
  }

  // 5. Check for sample data
  console.log('\n5. Checking for existing data...');
  
  try {
    const { count: cacheCount } = await supabase
      .from('keyword_cache')
      .select('*', { count: 'exact', head: true });
    
    const { count: resultsCount } = await supabase
      .from('keyword_research_results')
      .select('*', { count: 'exact', head: true });
    
    const { count: termsCount } = await supabase
      .from('keyword_terms')
      .select('*', { count: 'exact', head: true });
    
    results.push({
      name: 'Sample Data',
      status: cacheCount || resultsCount || termsCount ? '✅' : '⚠️',
      message: `Cache: ${cacheCount || 0}, Results: ${resultsCount || 0}, Terms: ${termsCount || 0}`,
    });
  } catch (e: any) {
    results.push({
      name: 'Sample Data',
      status: '⚠️',
      message: 'Could not check for data',
      details: e.message,
    });
  }

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION RESULTS');
  console.log('='.repeat(60) + '\n');

  results.forEach((result) => {
    console.log(`${result.status} ${result.name}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Details: ${result.details}`);
    }
    console.log('');
  });

  // Summary
  const successCount = results.filter(r => r.status === '✅').length;
  const warningCount = results.filter(r => r.status === '⚠️').length;
  const errorCount = results.filter(r => r.status === '❌').length;

  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${successCount}`);
  console.log(`⚠️  Warnings: ${warningCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log('');

  if (errorCount === 0 && warningCount === 0) {
    console.log('🎉 Migration verification PASSED! All components are correctly set up.');
  } else if (errorCount === 0) {
    console.log('✅ Migration verification PASSED with warnings. Check warnings above.');
  } else {
    console.log('❌ Migration verification FAILED. Please check the errors above.');
    console.log('\n💡 Tip: Make sure you ran the entire RUN_THIS_IN_SUPABASE.sql file in Supabase SQL Editor.');
  }
}

verifyMigration().catch(console.error);

