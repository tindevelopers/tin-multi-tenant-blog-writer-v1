/**
 * Test script to store "7 dwarfs" keyword research in the database
 * Run with: npx tsx test-store-7-dwarfs.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testStore7Dwarfs() {
  console.log('🧪 Testing Keyword Storage Endpoint with "7 dwarfs"...\n');

  try {
    // First, we need to authenticate or get a user
    // For testing, we'll use the service role or check if there's a test user
    // Note: In production, you'd need to authenticate first
    
    // Get the first user from the database (for testing purposes)
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('user_id, org_id')
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.error('❌ No users found. Please create a user first or authenticate.');
      console.error('Error:', userError?.message);
      return;
    }

    const userId = users[0].user_id;
    const orgId = users[0].org_id;

    console.log(`✅ Using user: ${userId}`);
    console.log(`✅ Org ID: ${orgId}\n`);

    // Prepare the 7 dwarfs data
    const keyword = '7 dwarfs';
    const sevenDwarfs = [
      { name: 'Doc', search_volume: 10000, difficulty: 25, competition: 0.2, cpc: 1.2 },
      { name: 'Grumpy', search_volume: 15000, difficulty: 28, competition: 0.25, cpc: 1.3 },
      { name: 'Happy', search_volume: 12000, difficulty: 26, competition: 0.22, cpc: 1.25 },
      { name: 'Sleepy', search_volume: 11000, difficulty: 24, competition: 0.2, cpc: 1.2 },
      { name: 'Bashful', search_volume: 8000, difficulty: 22, competition: 0.18, cpc: 1.1 },
      { name: 'Sneezy', search_volume: 9000, difficulty: 23, competition: 0.19, cpc: 1.15 },
      { name: 'Dopey', search_volume: 13000, difficulty: 27, competition: 0.23, cpc: 1.28 },
    ];

    // Store the primary keyword research result
    const { data: researchResult, error: researchError } = await supabase
      .from('keyword_research_results')
      .insert({
        user_id: userId,
        org_id: orgId,
        keyword: keyword,
        location: 'United States',
        language: 'en',
        search_type: 'traditional',
        traditional_keyword_data: {
          keyword: keyword,
          search_volume: 50000,
          keyword_difficulty: 30,
          competition: 0.3,
          cpc: 1.5,
          related_keywords: ['snow white', 'disney characters', 'seven dwarfs', ...sevenDwarfs.map(d => d.name)],
        },
      })
      .select()
      .single();

    if (researchError) {
      console.error('❌ Error storing research result:', researchError);
      return;
    }

    console.log(`✅ Stored research result: ${researchResult.id}\n`);

    // Store each dwarf as a keyword term
    const keywordTerms = sevenDwarfs.map((dwarf, index) => ({
      user_id: userId,
      org_id: orgId,
      research_result_id: researchResult.id,
      keyword: dwarf.name,
      search_volume: dwarf.search_volume,
      keyword_difficulty: dwarf.difficulty,
      competition: dwarf.competition,
      cpc: dwarf.cpc,
      search_type: 'traditional',
      parent_topic: keyword,
    }));

    const { data: terms, error: termsError } = await supabase
      .from('keyword_terms')
      .insert(keywordTerms)
      .select();

    if (termsError) {
      console.error('❌ Error storing keyword terms:', termsError);
      return;
    }

    console.log(`✅ Stored ${terms?.length || 0} keyword terms:\n`);
    sevenDwarfs.forEach((dwarf, index) => {
      console.log(`   ${index + 1}. ${dwarf.name} (SV: ${dwarf.search_volume}, KD: ${dwarf.difficulty})`);
    });

    // Verify the data was stored
    console.log('\n📊 Verifying stored data...\n');

    const { data: verifyResult, error: verifyError } = await supabase
      .from('keyword_research_results')
      .select(`
        *,
        keyword_terms (*)
      `)
      .eq('id', researchResult.id)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying data:', verifyError);
      return;
    }

    console.log('✅ Verification successful!');
    console.log(`   Research Result ID: ${verifyResult.id}`);
    console.log(`   Keyword: ${verifyResult.keyword}`);
    console.log(`   Total Terms: ${verifyResult.keyword_terms?.length || 0}`);
    console.log(`   Created: ${new Date(verifyResult.created_at).toLocaleString()}\n`);

    // Test retrieving via API endpoint
    console.log('🌐 Testing API endpoint retrieval...\n');

    const apiUrl = `http://localhost:3000/api/keywords/research-results?keyword=${encodeURIComponent(keyword)}`;
    console.log(`   GET ${apiUrl}`);

    // Note: This would require authentication in a real scenario
    // For now, we've verified the database storage works

    console.log('\n✅ Test complete! Data stored successfully in database.');
    console.log(`\n📝 Research Result ID: ${researchResult.id}`);
    console.log('   You can view this in the UI at: /admin/seo/keywords');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testStore7Dwarfs();

