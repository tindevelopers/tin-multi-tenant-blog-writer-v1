/**
 * Test script to test the /api/keywords/store endpoint with "7 dwarfs"
 * This tests the actual API endpoint handler
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Test data for the 7 dwarfs
const sevenDwarfsData = {
  keyword: '7 dwarfs',
  location: 'United States',
  language: 'en',
  search_type: 'traditional' as const,
  traditional_data: {
    keyword: '7 dwarfs',
    search_volume: 50000,
    keyword_difficulty: 30,
    competition: 0.3,
    cpc: 1.5,
    related_keywords: ['snow white', 'disney characters', 'seven dwarfs', 'Doc', 'Grumpy', 'Happy', 'Sleepy', 'Bashful', 'Sneezy', 'Dopey'],
  },
  related_terms: [
    { keyword: 'Doc', search_volume: 10000, keyword_difficulty: 25, competition: 0.2, cpc: 1.2, parent_topic: '7 dwarfs' },
    { keyword: 'Grumpy', search_volume: 15000, keyword_difficulty: 28, competition: 0.25, cpc: 1.3, parent_topic: '7 dwarfs' },
    { keyword: 'Happy', search_volume: 12000, keyword_difficulty: 26, competition: 0.22, cpc: 1.25, parent_topic: '7 dwarfs' },
    { keyword: 'Sleepy', search_volume: 11000, keyword_difficulty: 24, competition: 0.2, cpc: 1.2, parent_topic: '7 dwarfs' },
    { keyword: 'Bashful', search_volume: 8000, keyword_difficulty: 22, competition: 0.18, cpc: 1.1, parent_topic: '7 dwarfs' },
    { keyword: 'Sneezy', search_volume: 9000, keyword_difficulty: 23, competition: 0.19, cpc: 1.15, parent_topic: '7 dwarfs' },
    { keyword: 'Dopey', search_volume: 13000, keyword_difficulty: 27, competition: 0.23, cpc: 1.28, parent_topic: '7 dwarfs' },
  ],
};

async function testStoreEndpoint() {
  console.log('🧪 Testing POST /api/keywords/store with "7 dwarfs" data...\n');
  console.log('📝 Data to store:');
  console.log(`   Keyword: ${sevenDwarfsData.keyword}`);
  console.log(`   Location: ${sevenDwarfsData.location}`);
  console.log(`   Language: ${sevenDwarfsData.language}`);
  console.log(`   Related Terms: ${sevenDwarfsData.related_terms.length} dwarfs\n`);

  try {
    const response = await fetch('http://localhost:3000/api/keywords/store', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sevenDwarfsData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ API Error:', response.status, data);
      console.error('\n💡 Note: This endpoint requires authentication.');
      console.error('   To test properly:');
      console.error('   1. Open your browser and log in');
      console.error('   2. Open DevTools → Application → Cookies');
      console.error('   3. Copy the auth cookie value');
      console.error('   4. Use it in the curl command:\n');
      console.error('   curl -X POST http://localhost:3000/api/keywords/store \\');
      console.error('     -H "Content-Type: application/json" \\');
      console.error('     -H "Cookie: sb-*-auth-token=YOUR_COOKIE_VALUE" \\');
      console.error('     -d \'...\'\n');
      return;
    }

    console.log('✅ Success! Data stored in database');
    console.log(`   Research Result ID: ${data.id}`);
    console.log(`   Message: ${data.message}\n`);

    // Verify by retrieving
    console.log('🔍 Verifying stored data...\n');
    const verifyResponse = await fetch(`http://localhost:3000/api/keywords/research-results?keyword=${encodeURIComponent(sevenDwarfsData.keyword)}`);
    const verifyData = await verifyResponse.json();

    if (verifyData.success && verifyData.results) {
      const result = verifyData.results.find((r: any) => r.keyword === sevenDwarfsData.keyword);
      if (result) {
        console.log('✅ Verification successful!');
        console.log(`   Found research result: ${result.id}`);
        console.log(`   Keyword: ${result.keyword}`);
        console.log(`   Created: ${new Date(result.created_at).toLocaleString()}\n`);
      }
    }

    console.log('📊 Summary:');
    console.log(`   ✅ Stored keyword: "${sevenDwarfsData.keyword}"`);
    console.log(`   ✅ Stored ${sevenDwarfsData.related_terms.length} related terms (7 dwarfs)`);
    console.log(`   ✅ Research Result ID: ${data.id}`);
    console.log('\n   View in UI: http://localhost:3000/admin/seo/keywords');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testStoreEndpoint();

