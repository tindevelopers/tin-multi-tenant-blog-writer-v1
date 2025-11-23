/**
 * Check Migration Data
 * 
 * Run with: npx tsx check-migration-data.ts
 * 
 * Shows what data is actually stored in the database
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

async function checkData() {
  console.log('📊 Checking Migration Data...\n');

  // 1. Check keyword_cache
  console.log('1. Keyword Cache Table:');
  const { data: cacheData, count: cacheCount, error: cacheError } = await supabase
    .from('keyword_cache')
    .select('*', { count: 'exact' })
    .order('cached_at', { ascending: false })
    .limit(5);

  if (cacheError) {
    console.log(`   ❌ Error: ${cacheError.message}`);
  } else {
    console.log(`   ✅ Found ${cacheCount || 0} cache entries`);
    if (cacheData && cacheData.length > 0) {
      cacheData.forEach((entry, idx) => {
        console.log(`\n   Entry ${idx + 1}:`);
        console.log(`     Keyword: "${entry.keyword}"`);
        console.log(`     Location: ${entry.location}`);
        console.log(`     Language: ${entry.language}`);
        console.log(`     Search Type: ${entry.search_type}`);
        console.log(`     User ID: ${entry.user_id || 'Global'}`);
        console.log(`     Cached: ${new Date(entry.cached_at).toLocaleString()}`);
        console.log(`     Expires: ${new Date(entry.expires_at).toLocaleString()}`);
        console.log(`     Hit Count: ${entry.hit_count || 0}`);
        console.log(`     Has Traditional Data: ${!!entry.traditional_data}`);
        console.log(`     Has AI Data: ${!!entry.ai_data}`);
      });
    }
  }

  // 2. Check keyword_research_results
  console.log('\n2. Keyword Research Results Table:');
  const { data: resultsData, count: resultsCount, error: resultsError } = await supabase
    .from('keyword_research_results')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(5);

  if (resultsError) {
    console.log(`   ❌ Error: ${resultsError.message}`);
    if (resultsError.code) {
      console.log(`   Error Code: ${resultsError.code}`);
    }
  } else {
    console.log(`   ✅ Found ${resultsCount || 0} research results`);
    if (resultsData && resultsData.length > 0) {
      resultsData.forEach((result, idx) => {
        console.log(`\n   Result ${idx + 1}:`);
        console.log(`     ID: ${result.id}`);
        console.log(`     Keyword: "${result.keyword}"`);
        console.log(`     User ID: ${result.user_id}`);
        console.log(`     Location: ${result.location}`);
        console.log(`     Language: ${result.language}`);
        console.log(`     Search Type: ${result.search_type}`);
        console.log(`     Created: ${new Date(result.created_at).toLocaleString()}`);
        console.log(`     Access Count: ${result.access_count || 0}`);
        console.log(`     Has Traditional Data: ${!!result.traditional_keyword_data}`);
        console.log(`     Has AI Data: ${!!result.ai_keyword_data}`);
      });
    } else {
      console.log('   ⚠️  No research results found yet');
      console.log('   💡 This is normal if you haven\'t run any keyword research yet');
    }
  }

  // 3. Check keyword_terms
  console.log('\n3. Keyword Terms Table:');
  const { data: termsData, count: termsCount, error: termsError } = await supabase
    .from('keyword_terms')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(10);

  if (termsError) {
    console.log(`   ❌ Error: ${termsError.message}`);
    if (termsError.code) {
      console.log(`   Error Code: ${termsError.code}`);
    }
  } else {
    console.log(`   ✅ Found ${termsCount || 0} keyword terms`);
    if (termsData && termsData.length > 0) {
      console.log('\n   Sample terms:');
      termsData.slice(0, 5).forEach((term, idx) => {
        console.log(`\n   Term ${idx + 1}:`);
        console.log(`     Keyword: "${term.keyword}"`);
        console.log(`     Research Result ID: ${term.research_result_id || 'None'}`);
        console.log(`     Search Volume: ${term.search_volume || 0}`);
        console.log(`     Keyword Difficulty: ${term.keyword_difficulty || 'N/A'}`);
        console.log(`     Competition: ${term.competition || 'N/A'}`);
        console.log(`     AI Search Volume: ${term.ai_search_volume || 0}`);
        console.log(`     Is Related Term: ${term.is_related_term ? 'Yes' : 'No'}`);
        console.log(`     Is Matching Term: ${term.is_matching_term ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('   ⚠️  No keyword terms found yet');
      console.log('   💡 Terms are created when you run keyword research');
    }
  }

  // 4. Test RPC function
  console.log('\n4. Testing get_cached_keyword RPC Function:');
  if (cacheData && cacheData.length > 0) {
    const testEntry = cacheData[0];
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_cached_keyword', {
      p_keyword: testEntry.keyword,
      p_location: testEntry.location,
      p_language: testEntry.language,
      p_search_type: testEntry.search_type,
      p_user_id: testEntry.user_id,
    });

    if (rpcError) {
      console.log(`   ❌ Error calling RPC: ${rpcError.message}`);
      if (rpcError.code) {
        console.log(`   Error Code: ${rpcError.code}`);
      }
      if (rpcError.details) {
        console.log(`   Details: ${rpcError.details}`);
      }
      if (rpcError.hint) {
        console.log(`   Hint: ${rpcError.hint}`);
      }
    } else {
      if (rpcData && rpcData.length > 0) {
        console.log(`   ✅ RPC function works! Returned ${rpcData.length} result(s)`);
        console.log(`   ✅ Cache lookup successful for "${testEntry.keyword}"`);
      } else {
        console.log(`   ⚠️  RPC function works but returned no data (cache may be expired)`);
      }
    }
  } else {
    console.log('   ⚠️  Cannot test RPC - no cache entries found');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Migration Data Check Complete!');
  console.log('='.repeat(60));
}

checkData().catch(console.error);

