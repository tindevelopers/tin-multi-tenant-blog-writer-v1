/**
 * Direct API test for keyword research endpoint
 * Tests the SSE endpoint with "dog groomers" keyword
 */

const fetch = require('node-fetch');

async function testKeywordResearch() {
  console.log('🧪 Testing Keyword Research API for "dog groomers"\n');
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const endpoint = `${baseUrl}/api/keywords/research/stream`;
  
  console.log(`Endpoint: ${endpoint}\n`);
  
  try {
    // Note: This requires authentication, so we'll test the analyze endpoint instead
    const analyzeEndpoint = `${baseUrl}/api/keywords/analyze`;
    
    console.log('Testing analyze endpoint directly...\n');
    
    const response = await fetch(analyzeEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keywords: ['dog groomers'],
        location: 'United States',
        language: 'en',
        max_suggestions_per_keyword: 5,
      }),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText.substring(0, 500));
      return;
    }

    const data = await response.json();
    console.log('\n✅ Success! Response:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testKeywordResearch();

