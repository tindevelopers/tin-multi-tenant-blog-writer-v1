/**
 * Check Keyword Storage - Detailed Analysis
 * 
 * Run with: npx tsx check-keyword-storage.ts
 * 
 * Checks if keyword research is actually being stored in the database
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

async function checkKeywordStorage() {
  console.log('🔍 Checking Keyword Storage in Database...\n');
  console.log('='.repeat(70));

  // 1. Check keyword_research_results (main storage)
  console.log('\n📊 1. KEYWORD RESEARCH RESULTS TABLE');
  console.log('-'.repeat(70));
  
  const { data: researchResults, count: researchCount, error: researchError } = await supabase
    .from('keyword_research_results')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (researchError) {
    console.log(`❌ Error: ${researchError.message}`);
    if (researchError.code) console.log(`   Code: ${researchError.code}`);
  } else {
    console.log(`✅ Total Research Results: ${researchCount || 0}`);
    
    if (researchResults && researchResults.length > 0) {
      console.log(`\n📋 Recent Research Results (showing all ${researchResults.length}):`);
      
      researchResults.forEach((result, idx) => {
        console.log(`\n   Result #${idx + 1}:`);
        console.log(`   ┌─ ID: ${result.id}`);
        console.log(`   ├─ Keyword: "${result.keyword}"`);
        console.log(`   ├─ User ID: ${result.user_id}`);
        console.log(`   ├─ Location: ${result.location}`);
        console.log(`   ├─ Language: ${result.language}`);
        console.log(`   ├─ Search Type: ${result.search_type}`);
        console.log(`   ├─ Created: ${new Date(result.created_at).toLocaleString()}`);
        console.log(`   ├─ Updated: ${new Date(result.updated_at).toLocaleString()}`);
        console.log(`   ├─ Access Count: ${result.access_count || 0}`);
        console.log(`   ├─ Has Traditional Data: ${result.traditional_keyword_data ? '✅ Yes' : '❌ No'}`);
        console.log(`   ├─ Has AI Data: ${result.ai_keyword_data ? '✅ Yes' : '❌ No'}`);
        console.log(`   ├─ Has Related Terms: ${result.related_terms && Array.isArray(result.related_terms) ? `✅ Yes (${result.related_terms.length})` : '❌ No'}`);
        console.log(`   └─ Has Matching Terms: ${result.matching_terms && Array.isArray(result.matching_terms) ? `✅ Yes (${result.matching_terms.length})` : '❌ No'}`);
      });
    } else {
      console.log('⚠️  No research results found in database');
      console.log('   💡 This means no keyword research has been stored yet');
      console.log('   💡 Try running a keyword search in the UI to store data');
    }
  }

  // 2. Check keyword_terms (individual keywords)
  console.log('\n\n📊 2. KEYWORD TERMS TABLE');
  console.log('-'.repeat(70));
  
  const { data: keywordTerms, count: termsCount, error: termsError } = await supabase
    .from('keyword_terms')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (termsError) {
    console.log(`❌ Error: ${termsError.message}`);
    if (termsError.code) console.log(`   Code: ${termsError.code}`);
  } else {
    console.log(`✅ Total Keyword Terms: ${termsCount || 0}`);
    
    if (keywordTerms && keywordTerms.length > 0) {
      console.log(`\n📋 Sample Keyword Terms (showing first 20):`);
      
      // Group by research_result_id
      const termsByResult = keywordTerms.reduce((acc, term) => {
        const resultId = term.research_result_id || 'orphaned';
        if (!acc[resultId]) {
          acc[resultId] = [];
        }
        acc[resultId].push(term);
        return acc;
      }, {} as Record<string, Array<typeof keywordTerms[0]>>);

      Object.entries(termsByResult).forEach(([resultId, terms]) => {
        const researchResult = researchResults?.find(r => r.id === resultId);
        const termsArray: Array<typeof keywordTerms[0]> = Array.isArray(terms) ? terms : [];
        console.log(`\n   📁 Research Result: "${researchResult?.keyword || resultId}" (${termsArray.length} terms)`);
        
        termsArray.slice(0, 10).forEach((term, idx) => {
          console.log(`      ${idx + 1}. "${term.keyword}"`);
          console.log(`         └─ SV: ${term.search_volume || 0}, Difficulty: ${term.keyword_difficulty || 'N/A'}, AI SV: ${term.ai_search_volume || 0}`);
        });
        
        if (termsArray.length > 10) {
          console.log(`      ... and ${termsArray.length - 10} more terms`);
        }
      });
    } else {
      console.log('⚠️  No keyword terms found in database');
      console.log('   💡 Terms are created when keyword research is stored');
    }
  }

  // 3. Check keyword_cache
  console.log('\n\n📊 3. KEYWORD CACHE TABLE');
  console.log('-'.repeat(70));
  
  const { data: cacheEntries, count: cacheCount, error: cacheError } = await supabase
    .from('keyword_cache')
    .select('*', { count: 'exact' })
    .order('cached_at', { ascending: false });

  if (cacheError) {
    console.log(`❌ Error: ${cacheError.message}`);
  } else {
    console.log(`✅ Total Cache Entries: ${cacheCount || 0}`);
    
    if (cacheEntries && cacheEntries.length > 0) {
      console.log(`\n📋 Cache Entries (showing first 10):`);
      
      cacheEntries.slice(0, 10).forEach((entry, idx) => {
        console.log(`\n   Entry #${idx + 1}:`);
        console.log(`   ┌─ Keyword: "${entry.keyword}"`);
        console.log(`   ├─ Location: ${entry.location}`);
        console.log(`   ├─ Language: ${entry.language}`);
        console.log(`   ├─ Search Type: ${entry.search_type}`);
        console.log(`   ├─ User ID: ${entry.user_id || 'Global'}`);
        console.log(`   ├─ Cached: ${new Date(entry.cached_at).toLocaleString()}`);
        console.log(`   ├─ Expires: ${new Date(entry.expires_at).toLocaleString()}`);
        console.log(`   ├─ Hit Count: ${entry.hit_count || 0}`);
        console.log(`   ├─ Has Traditional Data: ${entry.traditional_data ? '✅ Yes' : '❌ No'}`);
        console.log(`   └─ Has AI Data: ${entry.ai_data ? '✅ Yes' : '❌ No'}`);
      });
    } else {
      console.log('⚠️  No cache entries found');
    }
  }

  // 4. Summary and Analysis
  console.log('\n\n📊 4. STORAGE ANALYSIS');
  console.log('='.repeat(70));
  
  const hasResearchResults = (researchCount || 0) > 0;
  const hasKeywordTerms = (termsCount || 0) > 0;
  const hasCacheEntries = (cacheCount || 0) > 0;

  console.log(`\n✅ Research Results Stored: ${hasResearchResults ? 'YES' : 'NO'} (${researchCount || 0})`);
  console.log(`✅ Keyword Terms Stored: ${hasKeywordTerms ? 'YES' : 'NO'} (${termsCount || 0})`);
  console.log(`✅ Cache Entries: ${hasCacheEntries ? 'YES' : 'NO'} (${cacheCount || 0})`);

  if (!hasResearchResults && !hasKeywordTerms) {
    console.log('\n⚠️  NO KEYWORD RESEARCH DATA FOUND');
    console.log('\n💡 Possible reasons:');
    console.log('   1. No keyword research has been run yet');
    console.log('   2. Research is running but not completing');
    console.log('   3. Storage is failing silently');
    console.log('   4. RLS policies are blocking storage');
    console.log('\n💡 Next steps:');
    console.log('   1. Try running a keyword search in the UI');
    console.log('   2. Check browser console for errors');
    console.log('   3. Check API logs for storage errors');
  } else {
    console.log('\n✅ KEYWORD RESEARCH DATA IS BEING STORED!');
    console.log('\n📈 Storage Statistics:');
    if (hasResearchResults) {
      const avgTermsPerResult = hasKeywordTerms ? Math.round((termsCount || 0) / (researchCount || 1)) : 0;
      console.log(`   • Average terms per research: ${avgTermsPerResult}`);
    }
    if (hasCacheEntries) {
      console.log(`   • Cache hit rate: ${cacheEntries?.reduce((sum, e) => sum + (e.hit_count || 0), 0) || 0} total hits`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Storage Check Complete!');
  console.log('='.repeat(70));
}

checkKeywordStorage().catch(console.error);

