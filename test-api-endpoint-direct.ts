/**
 * Test API Endpoint Directly
 * 
 * Run with: npx tsx test-api-endpoint-direct.ts
 * 
 * Tests the /api/keywords/research-results endpoint by making HTTP requests
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testApiEndpoint() {
  console.log('🧪 Testing API Endpoint Directly...\n');
  console.log('='.repeat(70));
  console.log(`API Base URL: ${API_BASE_URL}\n`);

  // Test 1: Check if server is running
  console.log('1. Checking if Next.js server is running...');
  try {
    const healthCheck = await fetch(`${API_BASE_URL}/api/health`).catch(() => null);
    if (healthCheck && healthCheck.ok) {
      console.log('   ✅ Server is running');
    } else {
      console.log('   ⚠️  Health check endpoint not available (this is OK)');
    }
  } catch (error) {
    console.log('   ⚠️  Could not connect to server');
    console.log('   💡 Make sure Next.js dev server is running: npm run dev');
  }

  // Test 2: Test endpoint without auth (should return 401)
  console.log('\n2. Testing endpoint without authentication (should return 401)...');
  try {
    const response = await fetch(`${API_BASE_URL}/api/keywords/research-results`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      console.log('   ✅ Correctly returns 401 Unauthorized');
    } else {
      const text = await response.text();
      console.log(`   ⚠️  Unexpected status. Response: ${text.substring(0, 200)}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    console.log('   💡 Make sure Next.js dev server is running: npm run dev');
  }

  // Test 3: Test with query parameters
  console.log('\n3. Testing endpoint with query parameters...');
  try {
    const url = new URL(`${API_BASE_URL}/api/keywords/research-results`);
    url.searchParams.set('limit', '10');
    url.searchParams.set('offset', '0');
    url.searchParams.set('search_type', 'traditional');
    url.searchParams.set('location', 'United States');
    url.searchParams.set('language', 'en');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   URL: ${url.toString()}`);

    if (response.status === 401) {
      console.log('   ✅ Correctly requires authentication');
    } else if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Success! Found ${data.total || 0} results`);
      if (data.results && data.results.length > 0) {
        console.log('\n   Sample results:');
        data.results.slice(0, 3).forEach((result: any, idx: number) => {
          console.log(`\n   ${idx + 1}. Keyword: "${result.keyword}"`);
          console.log(`      ID: ${result.id}`);
          console.log(`      Search Type: ${result.search_type}`);
          console.log(`      Keyword Count: ${result.keyword_count || 0}`);
        });
      }
    } else {
      const text = await response.text();
      console.log(`   ⚠️  Response: ${text.substring(0, 200)}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 4: Instructions for authenticated testing
  console.log('\n4. Testing with Authentication...');
  console.log('   💡 To test with authentication, you need to:');
  console.log('      1. Open browser DevTools (F12)');
  console.log('      2. Go to Application/Storage > Cookies');
  console.log('      3. Find the Supabase auth cookie');
  console.log('      4. Copy the cookie value');
  console.log('      5. Use it in a curl command:');
  console.log('');
  console.log('   Example curl command:');
  console.log(`   curl -X GET "${API_BASE_URL}/api/keywords/research-results?limit=10" \\`);
  console.log('     -H "Cookie: sb-<project-ref>-auth-token=<your-token>" \\');
  console.log('     -H "Content-Type: application/json"');
  console.log('');
  console.log('   Or test directly in browser:');
  console.log(`   ${API_BASE_URL}/seo/saved-searches`);

  // Test 5: Check database directly
  console.log('\n5. Checking Database Directly...');
  const { createClient } = await import('@supabase/supabase-js');
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const { data: results, count, error } = await supabase
      .from('keyword_research_results')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.log(`   ❌ Database Error: ${error.message}`);
    } else {
      console.log(`   ✅ Database Query: Found ${count || 0} research results`);
      if (results && results.length > 0) {
        console.log('\n   Sample from database:');
        results.slice(0, 2).forEach((result: any, idx: number) => {
          console.log(`\n   ${idx + 1}. Keyword: "${result.keyword}"`);
          console.log(`      User ID: ${result.user_id}`);
          console.log(`      Created: ${new Date(result.created_at).toLocaleString()}`);
        });
      } else {
        console.log('   ⚠️  No data in database - keyword searches are not being stored');
      }
    }
  } else {
    console.log('   ⚠️  Supabase credentials not found');
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Endpoint Test Complete!');
  console.log('='.repeat(70));
}

testApiEndpoint().catch(console.error);

