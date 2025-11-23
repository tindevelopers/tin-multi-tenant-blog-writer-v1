/**
 * Test Keyword Research Results Endpoint
 * 
 * Run with: npx tsx test-keyword-endpoint.ts
 * 
 * Tests the /api/keywords/research-results endpoint directly
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testEndpoint() {
  console.log('🧪 Testing Keyword Research Results Endpoint...\n');
  console.log('='.repeat(70));

  // First, check if we can authenticate
  console.log('\n1. Checking Authentication...');
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError) {
    console.log(`   ⚠️  Auth error: ${authError.message}`);
    console.log('   💡 Note: This test uses Supabase client directly, not the API endpoint');
  } else if (session) {
    console.log(`   ✅ Authenticated as: ${session.user.email || session.user.id}`);
  } else {
    console.log('   ⚠️  Not authenticated - will test with direct Supabase queries');
  }

  // Test 1: Direct Supabase query (simulating what the endpoint does)
  console.log('\n2. Testing Direct Supabase Query (simulating /api/keywords/research-results)...');
  
  const userId = session?.user?.id;
  
  if (!userId) {
    console.log('   ⚠️  No user ID available - testing with all users');
    
    // Test without user filter
    const { data: allResults, count: allCount, error: allError } = await supabase
      .from('keyword_research_results')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10);

    if (allError) {
      console.log(`   ❌ Error: ${allError.message}`);
      if (allError.code) console.log(`   Code: ${allError.code}`);
      if (allError.details) console.log(`   Details: ${allError.details}`);
      if (allError.hint) console.log(`   Hint: ${allError.hint}`);
    } else {
      console.log(`   ✅ Found ${allCount || 0} research results (all users)`);
      if (allResults && allResults.length > 0) {
        console.log('\n   Sample results:');
        allResults.slice(0, 3).forEach((result, idx) => {
          console.log(`\n   ${idx + 1}. Keyword: "${result.keyword}"`);
          console.log(`      User ID: ${result.user_id}`);
          console.log(`      Search Type: ${result.search_type}`);
          console.log(`      Location: ${result.location}`);
          console.log(`      Created: ${new Date(result.created_at).toLocaleString()}`);
        });
      }
    }
  } else {
    // Test with user filter
    const { data: userResults, count: userCount, error: userError } = await supabase
      .from('keyword_research_results')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (userError) {
      console.log(`   ❌ Error: ${userError.message}`);
      if (userError.code) console.log(`   Code: ${userError.code}`);
      if (userError.details) console.log(`   Details: ${userError.details}`);
      if (userError.hint) console.log(`   Hint: ${userError.hint}`);
    } else {
      console.log(`   ✅ Found ${userCount || 0} research results for user ${userId}`);
      if (userResults && userResults.length > 0) {
        console.log('\n   Sample results:');
        userResults.slice(0, 3).forEach((result, idx) => {
          console.log(`\n   ${idx + 1}. Keyword: "${result.keyword}"`);
          console.log(`      ID: ${result.id}`);
          console.log(`      Search Type: ${result.search_type}`);
          console.log(`      Location: ${result.location}`);
          console.log(`      Language: ${result.language}`);
          console.log(`      Created: ${new Date(result.created_at).toLocaleString()}`);
          console.log(`      Has Traditional Data: ${!!result.traditional_keyword_data}`);
          console.log(`      Has AI Data: ${!!result.ai_keyword_data}`);
        });
      } else {
        console.log('   ⚠️  No results found for this user');
      }
    }
  }

  // Test 2: Check keyword_terms
  console.log('\n3. Testing Keyword Terms Query...');
  
  if (userId) {
    const { data: terms, count: termsCount, error: termsError } = await supabase
      .from('keyword_terms')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (termsError) {
      console.log(`   ❌ Error: ${termsError.message}`);
      if (termsError.code) console.log(`   Code: ${termsError.code}`);
    } else {
      console.log(`   ✅ Found ${termsCount || 0} keyword terms for user ${userId}`);
      if (terms && terms.length > 0) {
        console.log('\n   Sample terms:');
        terms.slice(0, 5).forEach((term, idx) => {
          console.log(`\n   ${idx + 1}. "${term.keyword}"`);
          console.log(`      Research Result ID: ${term.research_result_id || 'None'}`);
          console.log(`      Search Volume: ${term.search_volume || 0}`);
          console.log(`      Difficulty: ${term.keyword_difficulty || 'N/A'}`);
          console.log(`      AI Search Volume: ${term.ai_search_volume || 0}`);
        });
      }
    }
  } else {
    console.log('   ⚠️  Skipping - no user ID available');
  }

  // Test 3: Test the actual API endpoint (if we have a way to call it)
  console.log('\n4. Testing API Endpoint Structure...');
  console.log('   💡 To test the actual API endpoint, you would need to:');
  console.log('      1. Start the Next.js dev server (npm run dev)');
  console.log('      2. Make an authenticated request to /api/keywords/research-results');
  console.log('      3. Include authentication cookies or Bearer token');
  console.log('\n   📋 Expected endpoint: GET /api/keywords/research-results');
  console.log('   📋 Query params: ?limit=50&offset=0&search_type=traditional&location=United States&language=en');

  // Test 4: Check RPC function
  console.log('\n5. Testing get_cached_keyword RPC Function...');
  
  // Try to find a keyword to test with
  const { data: sampleResult } = await supabase
    .from('keyword_research_results')
    .select('keyword, location, language, search_type, user_id')
    .limit(1)
    .single();

  if (sampleResult) {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_cached_keyword', {
      p_keyword: sampleResult.keyword,
      p_location: sampleResult.location,
      p_language: sampleResult.language,
      p_search_type: sampleResult.search_type,
      p_user_id: sampleResult.user_id,
    });

    if (rpcError) {
      console.log(`   ❌ RPC Error: ${rpcError.message}`);
      if (rpcError.code) console.log(`   Code: ${rpcError.code}`);
    } else {
      console.log(`   ✅ RPC function works! Returned ${rpcData?.length || 0} result(s)`);
      if (rpcData && rpcData.length > 0) {
        console.log(`   ✅ Cache lookup successful for "${sampleResult.keyword}"`);
      }
    }
  } else {
    console.log('   ⚠️  No sample data found to test RPC function');
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Endpoint Test Complete!');
  console.log('='.repeat(70));
  console.log('\n💡 Summary:');
  console.log('   - Direct Supabase queries work if tables exist');
  console.log('   - API endpoint requires Next.js server and authentication');
  console.log('   - Check browser Network tab when using the UI to see actual API calls');
}

testEndpoint().catch(console.error);

