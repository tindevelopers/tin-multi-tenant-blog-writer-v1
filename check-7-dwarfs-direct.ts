/**
 * Direct Database Check for "7 dwarfs" Storage - Using Research Result ID
 * 
 * Run with: npx tsx check-7-dwarfs-direct.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Use service role key to bypass RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function check7Dwarfs() {
  console.log('🔍 Checking "7 dwarfs" storage directly in database...\n');

  const researchResultId = 'be98d034-4f76-4717-8b2b-e1c93f4abe17'; // From the API response

  // 1. Get research result by ID
  console.log(`1. Fetching research result by ID: ${researchResultId}...`);
  const { data: researchResult, error: researchError } = await supabase
    .from('keyword_research_results')
    .select('*')
    .eq('id', researchResultId)
    .single();

  if (researchError) {
    console.error('❌ Error querying research result:', researchError);
    return;
  }

  if (!researchResult) {
    console.log('❌ Research result not found');
    return;
  }

  console.log('✅ Research result found:');
  console.log(`   ID: ${researchResult.id}`);
  console.log(`   User ID: ${researchResult.user_id}`);
  console.log(`   Keyword: "${researchResult.keyword}"`);
  console.log(`   Search Type: ${researchResult.search_type}`);
  console.log(`   Location: ${researchResult.location}`);
  console.log(`   Language: ${researchResult.language}`);
  console.log(`   Created: ${researchResult.created_at}`);
  console.log(`   Has Traditional Data: ${!!researchResult.traditional_keyword_data}`);
  console.log(`   Related Terms JSONB: ${JSON.stringify(researchResult.related_terms, null, 2)}`);
  console.log('');

  // 2. Check keyword_terms table
  console.log(`2. Checking keyword_terms for research_result_id: ${researchResult.id}...`);
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

  console.log(`✅ Found ${keywordTerms?.length || 0} keyword terms`);
  
  if (!keywordTerms || keywordTerms.length === 0) {
    console.log('⚠️  No keyword terms found in keyword_terms table!');
    console.log('   This means the related terms were NOT stored as individual rows.');
    console.log('');
    console.log('   However, they might be stored in the JSONB column:');
    if (researchResult.related_terms && Array.isArray(researchResult.related_terms)) {
      console.log(`   ✅ Found ${researchResult.related_terms.length} related terms in JSONB column:`);
      researchResult.related_terms.forEach((term: any, idx: number) => {
        console.log(`   ${idx + 1}. "${term.keyword}" - SV: ${term.search_volume}, Difficulty: ${term.keyword_difficulty}`);
      });
    } else {
      console.log('   ❌ No related_terms in JSONB column either!');
    }
  } else {
    console.log('\n   Keyword Terms (individual rows):');
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

  console.log('\n✅ Database check complete!');
}

check7Dwarfs().catch(console.error);

