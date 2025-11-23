/**
 * Direct Database Check for "7 dwarfs" Storage
 * 
 * Run with: npx tsx check-7-dwarfs-storage.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check7Dwarfs() {
  console.log('🔍 Checking "7 dwarfs" storage in database...\n');

  const keyword = '7 dwarfs';
  const normalizedKeyword = keyword.toLowerCase().trim();
  const userId = 'b8ac61c2-5556-46de-bbd8-91c1ae6c0a64'; // From the cookie
  const researchResultId = 'be98d034-4f76-4717-8b2b-e1c93f4abe17'; // From the API response

  // 1. Check research result - try multiple approaches
  console.log('1. Checking keyword_research_results...');
  
  // First, try to get the specific research result by ID
  console.log(`   Trying to fetch research result by ID: ${researchResultId}`);
  const { data: specificResult, error: specificError } = await supabase
    .from('keyword_research_results')
    .select('*')
    .eq('id', researchResultId)
    .single();

  if (specificError) {
    console.log(`   ⚠️  Could not fetch by ID (might be RLS): ${specificError.message}`);
  } else if (specificResult) {
    console.log(`   ✅ Found research result by ID!`);
    const researchResult = specificResult;
    // Continue with this result - skip to checking terms
  } else {
    console.log(`   ⚠️  No result found by ID`);
  }
  
  // Also try getting all recent results for this user
  const { data: allResults, error: allError } = await supabase
    .from('keyword_research_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (allError) {
    console.error('❌ Error querying research results:', allError);
    return;
  }

  console.log(`   Found ${allResults?.length || 0} total research results for this user`);
  
  // Find the "7 dwarfs" result
  let researchResult = allResults?.find(r => 
    r.keyword.toLowerCase().includes('dwarf') || 
    r.keyword.toLowerCase().includes('7') ||
    r.keyword === normalizedKeyword ||
    r.keyword === keyword
  );

  if (!researchResult && allResults && allResults.length > 0) {
    console.log('\n   Recent research results:');
    allResults.forEach((r, idx) => {
      console.log(`   ${idx + 1}. "${r.keyword}" (${r.search_type}) - Created: ${r.created_at}`);
    });
    // Use the most recent one
    researchResult = allResults[0];
    console.log(`\n   ⚠️  Using most recent result: "${researchResult.keyword}"`);
  }

  if (!researchResult) {
    console.log('❌ No research result found');
    return;
  }

  console.log('\n✅ Research result found:');
  console.log(`   ID: ${researchResult.id}`);
  console.log(`   Keyword: "${researchResult.keyword}"`);
  console.log(`   Search Type: ${researchResult.search_type}`);
  console.log(`   Location: ${researchResult.location}`);
  console.log(`   Language: ${researchResult.language}`);
  console.log(`   Created: ${researchResult.created_at}`);
  console.log(`   Has Traditional Data: ${!!researchResult.traditional_keyword_data}`);
  console.log(`   Related Terms Array: ${JSON.stringify(researchResult.related_terms)}`);
  console.log('');

  // 2. Check keyword_terms table
  console.log('2. Checking keyword_terms table...');
  const { data: keywordTerms, error: termsError } = await supabase
    .from('keyword_terms')
    .select('*')
    .eq('research_result_id', researchResult.id)
    .order('search_volume', { ascending: false });

  if (termsError) {
    console.error('❌ Error querying keyword_terms:', termsError);
    console.error('   Error details:', JSON.stringify(termsError, null, 2));
    return;
  }

  console.log(`✅ Found ${keywordTerms?.length || 0} keyword terms for research result ${researchResult.id}`);
  
  if (!keywordTerms || keywordTerms.length === 0) {
    console.log('⚠️  No keyword terms found!');
    console.log('   This means the related terms were not stored.');
    console.log('');
    console.log('   Checking if terms exist with different research_result_id...');
    
    // Check for any terms with the keyword "7 dwarfs" or related terms
    const { data: allTerms, error: allTermsError } = await supabase
      .from('keyword_terms')
      .select('*')
      .eq('user_id', userId)
      .or(`keyword.ilike.%${keyword}%,keyword.ilike.%Doc%,keyword.ilike.%Grumpy%`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (allTermsError) {
      console.error('   Error:', allTermsError);
    } else {
      console.log(`   Found ${allTerms?.length || 0} terms with similar keywords`);
      if (allTerms && allTerms.length > 0) {
        allTerms.forEach((term, idx) => {
          console.log(`   ${idx + 1}. "${term.keyword}" (Research ID: ${term.research_result_id})`);
        });
      }
    }
  } else {
    console.log('\n   Keyword Terms:');
    keywordTerms.forEach((term, idx) => {
      console.log(`   ${idx + 1}. "${term.keyword}"`);
      console.log(`      Search Volume: ${term.search_volume}`);
      console.log(`      Difficulty: ${term.keyword_difficulty}`);
      console.log(`      Competition: ${term.competition}`);
      console.log(`      CPC: ${term.cpc}`);
      console.log(`      Is Related Term: ${term.is_related_term}`);
      console.log(`      Parent Keyword: ${term.parent_keyword}`);
      console.log('');
    });
  }

  // 3. Check what was stored in related_terms JSONB column
  console.log('3. Checking related_terms JSONB column in research result...');
  if (researchResult.related_terms && Array.isArray(researchResult.related_terms)) {
    console.log(`   Found ${researchResult.related_terms.length} related terms in JSONB column:`);
    researchResult.related_terms.forEach((term: any, idx: number) => {
      console.log(`   ${idx + 1}. ${JSON.stringify(term)}`);
    });
  } else {
    console.log('   ⚠️  No related_terms in JSONB column (or not an array)');
    console.log(`   Value: ${JSON.stringify(researchResult.related_terms)}`);
  }

  console.log('\n✅ Database check complete!');
}

check7Dwarfs().catch(console.error);
