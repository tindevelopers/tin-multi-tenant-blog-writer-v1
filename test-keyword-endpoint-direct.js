/**
 * Test Keyword Analysis Endpoint Directly
 * Tests both the Next.js API route and the backend Cloud Run endpoint
 */

const NEXTJS_API_URL = process.env.NEXTJS_API_URL || 'https://tin-multi-tenant-blog-writer-v1-nigx9nw67-tindeveloper.vercel.app';
const BACKEND_API_URL = 'https://blog-writer-api-dev-613248238610.europe-west9.run.app';

async function testEndpoints() {
  console.log('🧪 Testing Keyword Analysis Endpoints\n');
  console.log('Next.js API:', NEXTJS_API_URL);
  console.log('Backend API:', BACKEND_API_URL);
  console.log('─'.repeat(80));

  const testRequest = {
    keywords: ['dog grooming'],
    location: 'United States',
    language: 'en',
    search_type: 'enhanced_keyword_analysis',
    include_serp: true,
    max_suggestions_per_keyword: 75,
    serp_depth: 20,
    serp_analysis_type: 'both',
    related_keywords_depth: 1,
    related_keywords_limit: 20,
    keyword_ideas_limit: 50,
    keyword_ideas_type: 'all',
    include_ai_volume: true,
  };

  // Test 1: Backend Cloud Run Endpoint Directly
  console.log('\n📡 Test 1: Backend Cloud Run Endpoint (Direct)');
  console.log('─'.repeat(80));
  try {
    const backendUrl = `${BACKEND_API_URL}/api/v1/keywords/enhanced`;
    console.log('Endpoint:', backendUrl);
    console.log('Request:', JSON.stringify(testRequest, null, 2));
    
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest),
    });

    console.log('Status:', backendResponse.status, backendResponse.statusText);
    
    if (backendResponse.ok) {
      const backendData = await backendResponse.json();
      console.log('\n✅ Backend Response Structure:');
      console.log('Keys:', Object.keys(backendData));
      console.log('Has enhanced_analysis:', !!backendData.enhanced_analysis);
      console.log('Has keyword_analysis:', !!backendData.keyword_analysis);
      
      if (backendData.enhanced_analysis) {
        const enhancedKeys = Object.keys(backendData.enhanced_analysis);
        console.log('Enhanced analysis keywords count:', enhancedKeys.length);
        console.log('First 10 keywords:', enhancedKeys.slice(0, 10));
        
        if (enhancedKeys.length > 0) {
          const firstKey = enhancedKeys[0];
          console.log(`\nSample keyword "${firstKey}":`, JSON.stringify(backendData.enhanced_analysis[firstKey], null, 2));
        }
      }
      
      if (backendData.keyword_analysis) {
        const keywordKeys = Object.keys(backendData.keyword_analysis);
        console.log('Keyword analysis keywords count:', keywordKeys.length);
        console.log('First 10 keywords:', keywordKeys.slice(0, 10));
      }
      
      console.log('\nFull response (first 2000 chars):', JSON.stringify(backendData, null, 2).substring(0, 2000));
    } else {
      const errorText = await backendResponse.text();
      console.error('❌ Backend Error:', errorText);
    }
  } catch (error) {
    console.error('❌ Backend Request Failed:', error.message);
  }

  // Test 2: Next.js API Route (Proxy)
  console.log('\n\n📡 Test 2: Next.js API Route (Proxy)');
  console.log('─'.repeat(80));
  try {
    const nextjsUrl = `${NEXTJS_API_URL}/api/keywords/analyze`;
    console.log('Endpoint:', nextjsUrl);
    console.log('Request:', JSON.stringify(testRequest, null, 2));
    
    const nextjsResponse = await fetch(nextjsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest),
    });

    console.log('Status:', nextjsResponse.status, nextjsResponse.statusText);
    
    if (nextjsResponse.ok) {
      const nextjsData = await nextjsResponse.json();
      console.log('\n✅ Next.js Response Structure:');
      console.log('Keys:', Object.keys(nextjsData));
      console.log('Has enhanced_analysis:', !!nextjsData.enhanced_analysis);
      console.log('Has keyword_analysis:', !!nextjsData.keyword_analysis);
      
      if (nextjsData.enhanced_analysis) {
        const enhancedKeys = Object.keys(nextjsData.enhanced_analysis);
        console.log('Enhanced analysis keywords count:', enhancedKeys.length);
        console.log('First 10 keywords:', enhancedKeys.slice(0, 10));
      }
      
      if (nextjsData.keyword_analysis) {
        const keywordKeys = Object.keys(nextjsData.keyword_analysis);
        console.log('Keyword analysis keywords count:', keywordKeys.length);
        console.log('First 10 keywords:', keywordKeys.slice(0, 10));
      }
      
      console.log('\nFull response (first 2000 chars):', JSON.stringify(nextjsData, null, 2).substring(0, 2000));
    } else {
      const errorText = await nextjsResponse.text();
      console.error('❌ Next.js Error:', errorText);
    }
  } catch (error) {
    console.error('❌ Next.js Request Failed:', error.message);
  }

  // Test 3: Compare Results
  console.log('\n\n📊 Test 3: Comparison');
  console.log('─'.repeat(80));
  console.log('Check the outputs above to verify:');
  console.log('1. Both endpoints are accessible');
  console.log('2. Response structures match');
  console.log('3. Keyword counts are consistent');
  console.log('4. The Next.js proxy correctly forwards to the backend');
}

testEndpoints().catch(console.error);

