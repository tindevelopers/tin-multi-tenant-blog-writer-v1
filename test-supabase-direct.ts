/**
 * Test Script: Check Supabase Database Directly
 * 
 * Run with: npx tsx test-supabase-direct.ts
 * 
 * This script directly queries Supabase to check if keywords are being stored
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  console.error('SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Missing');
  console.error('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSupabase() {
  console.log('🔍 Testing Supabase database directly...\n');

  // First, try to authenticate (this will fail but shows the setup)
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  console.log('Auth check:', { hasSession: !!session, error: authError?.message });

  // Test 1: Check keyword_research_results table
  console.log('\n1. Checking keyword_research_results table...');
  const { data: researchResults, error: researchError, count } = await supabase
    .from('keyword_research_results')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(5);

  if (researchError) {
    console.error('❌ Error querying keyword_research_results:', {
      code: researchError.code,
      message: researchError.message,
      details: researchError.details,
      hint: researchError.hint,
    });
  } else {
    console.log(`✅ Found ${count || 0} research results`);
    if (researchResults && researchResults.length > 0) {
      console.log('\nSample research results:');
      researchResults.forEach((result, idx) => {
        console.log(`  ${idx + 1}. Keyword: "${result.keyword}"`);
        console.log(`     ID: ${result.id}`);
        console.log(`     User ID: ${result.user_id}`);
        console.log(`     Search Type: ${result.search_type}`);
        console.log(`     Location: ${result.location}`);
        console.log(`     Created: ${result.created_at}`);
        console.log('');
      });
    }
  }

  // Test 2: Check keyword_terms table
  console.log('\n2. Checking keyword_terms table...');
  if (researchResults && researchResults.length > 0) {
    const resultIds = researchResults.map(r => r.id);
    const { data: keywordTerms, error: termsError, count: termsCount } = await supabase
      .from('keyword_terms')
      .select('*', { count: 'exact' })
      .in('research_result_id', resultIds)
      .limit(10);

    if (termsError) {
      console.error('❌ Error querying keyword_terms:', {
        code: termsError.code,
        message: termsError.message,
        details: termsError.details,
        hint: termsError.hint,
      });
    } else {
      console.log(`✅ Found ${termsCount || 0} keyword terms`);
      if (keywordTerms && keywordTerms.length > 0) {
        console.log('\nSample keyword terms:');
        keywordTerms.slice(0, 5).forEach((term, idx) => {
          console.log(`  ${idx + 1}. Keyword: "${term.keyword}"`);
          console.log(`     Research Result ID: ${term.research_result_id}`);
          console.log(`     Search Volume: ${term.search_volume}`);
          console.log(`     Difficulty: ${term.keyword_difficulty}`);
          console.log(`     Is Related Term: ${term.is_related_term}`);
          console.log('');
        });
      } else {
        console.log('⚠️  No keyword terms found for these research results');
      }
    }
  } else {
    console.log('⚠️  No research results found, cannot check keyword_terms');
  }

  // Test 3: Test get_cached_keyword RPC function
  console.log('\n3. Testing get_cached_keyword RPC function...');
  if (researchResults && researchResults.length > 0) {
    const testKeyword = researchResults[0].keyword;
    const testLocation = researchResults[0].location;
    const testLanguage = researchResults[0].language;
    const testSearchType = researchResults[0].search_type;
    const testUserId = researchResults[0].user_id;

    console.log(`Testing with: keyword="${testKeyword}", location="${testLocation}", language="${testLanguage}", search_type="${testSearchType}", user_id="${testUserId}"`);

    const { data: cachedData, error: rpcError } = await supabase
      .rpc('get_cached_keyword', {
        p_keyword: testKeyword.toLowerCase().trim(),
        p_location: testLocation,
        p_language: testLanguage,
        p_search_type: testSearchType,
        p_user_id: testUserId,
      });

    if (rpcError) {
      console.error('❌ Error calling get_cached_keyword RPC:', {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
      });
    } else {
      console.log(`✅ RPC call successful, returned ${cachedData?.length || 0} results`);
      if (cachedData && cachedData.length > 0) {
        console.log('Sample cached data:', cachedData[0]);
      }
    }
  } else {
    console.log('⚠️  No research results found, cannot test RPC function');
  }

  // Test 4: Check keyword_cache table
  console.log('\n4. Checking keyword_cache table...');
  const { data: cacheEntries, error: cacheError, count: cacheCount } = await supabase
    .from('keyword_cache')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(5);

  if (cacheError) {
    console.error('❌ Error querying keyword_cache:', {
      code: cacheError.code,
      message: cacheError.message,
      details: cacheError.details,
      hint: cacheError.hint,
    });
  } else {
    console.log(`✅ Found ${cacheCount || 0} cache entries`);
    if (cacheEntries && cacheEntries.length > 0) {
      cacheEntries.forEach((entry, idx) => {
        console.log(`  ${idx + 1}. Keyword: "${entry.keyword}"`);
        console.log(`     Expires: ${entry.expires_at}`);
        console.log(`     User ID: ${entry.user_id || 'Global'}`);
        console.log('');
      });
    }
  }

  console.log('\n✅ Database check complete!');
}

testSupabase().catch(console.error);

