/**
 * Diagnostic Script: Check Keyword Storage in Database
 * 
 * Run with: npx tsx check-database-storage.ts
 * 
 * This script checks if keyword data is being stored correctly in Supabase
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkDatabase() {
  console.log('🔍 Checking keyword storage in database...\n');

  // Check keyword_research_results table
  console.log('1. Checking keyword_research_results table...');
  const { data: researchResults, error: researchError } = await supabase
    .from('keyword_research_results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (researchError) {
    console.error('❌ Error querying keyword_research_results:', researchError);
  } else {
    console.log(`✅ Found ${researchResults?.length || 0} research results`);
    if (researchResults && researchResults.length > 0) {
      console.log('\nRecent research results:');
      researchResults.forEach((result, index) => {
        console.log(`  ${index + 1}. Keyword: "${result.keyword}"`);
        console.log(`     ID: ${result.id}`);
        console.log(`     User ID: ${result.user_id}`);
        console.log(`     Search Type: ${result.search_type}`);
        console.log(`     Location: ${result.location}`);
        console.log(`     Created: ${result.created_at}`);
        console.log(`     Has Traditional Data: ${!!result.traditional_keyword_data}`);
        console.log(`     Has AI Data: ${!!result.ai_keyword_data}`);
        console.log('');
      });
    }
  }

  // Check keyword_terms table
  console.log('\n2. Checking keyword_terms table...');
  if (researchResults && researchResults.length > 0) {
    const resultIds = researchResults.map(r => r.id);
    const { data: keywordTerms, error: termsError } = await supabase
      .from('keyword_terms')
      .select('*')
      .in('research_result_id', resultIds)
      .order('search_volume', { ascending: false })
      .limit(20);

    if (termsError) {
      console.error('❌ Error querying keyword_terms:', termsError);
    } else {
      console.log(`✅ Found ${keywordTerms?.length || 0} keyword terms`);
      
      if (keywordTerms && keywordTerms.length > 0) {
        console.log('\nKeyword terms by research result:');
        const termsByResult = keywordTerms.reduce((acc, term) => {
          const resultId = term.research_result_id;
          if (!acc[resultId]) {
            acc[resultId] = [];
          }
          acc[resultId].push(term);
          return acc;
        }, {} as Record<string, typeof keywordTerms>);

        Object.entries(termsByResult).forEach(([resultId, terms]) => {
          const researchResult = researchResults.find(r => r.id === resultId);
          const termsArray = Array.isArray(terms) ? terms : [];
          console.log(`\n  Research Result: "${researchResult?.keyword || resultId}"`);
          console.log(`  Total Terms: ${termsArray.length}`);
          console.log(`  Sample terms:`);
          termsArray.slice(0, 5).forEach((term: any, idx) => {
            console.log(`    ${idx + 1}. "${term.keyword}" (SV: ${term.search_volume}, Difficulty: ${term.keyword_difficulty})`);
          });
        });
      } else {
        console.log('⚠️  No keyword terms found for these research results');
        console.log('   This indicates terms are not being stored properly.');
      }
    }
  } else {
    console.log('⚠️  No research results found, cannot check keyword_terms');
  }

  // Check for orphaned terms (terms without research_result_id)
  console.log('\n3. Checking for orphaned keyword_terms...');
  const { data: orphanedTerms, error: orphanError } = await supabase
    .from('keyword_terms')
    .select('*')
    .is('research_result_id', null)
    .limit(10);

  if (orphanError) {
    console.error('❌ Error querying orphaned terms:', orphanError);
  } else {
    console.log(`✅ Found ${orphanedTerms?.length || 0} orphaned keyword terms`);
    if (orphanedTerms && orphanedTerms.length > 0) {
      console.log('⚠️  Warning: Terms exist without research_result_id');
      orphanedTerms.forEach((term, idx) => {
        console.log(`  ${idx + 1}. "${term.keyword}" (User: ${term.user_id})`);
      });
    }
  }

  // Check keyword_cache table
  console.log('\n4. Checking keyword_cache table...');
  const { data: cacheEntries, error: cacheError } = await supabase
    .from('keyword_cache')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (cacheError) {
    console.error('❌ Error querying keyword_cache:', cacheError);
  } else {
    console.log(`✅ Found ${cacheEntries?.length || 0} cache entries`);
    if (cacheEntries && cacheEntries.length > 0) {
      cacheEntries.forEach((entry, idx) => {
        console.log(`  ${idx + 1}. Keyword: "${entry.keyword}"`);
        console.log(`     Search Type: ${entry.search_type}`);
        console.log(`     Expires: ${entry.expires_at}`);
        console.log(`     User ID: ${entry.user_id || 'Global'}`);
      });
    }
  }

  console.log('\n✅ Database check complete!');
}

checkDatabase().catch(console.error);

