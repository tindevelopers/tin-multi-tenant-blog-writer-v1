/**
 * Test Cloud Run Endpoints
 * 
 * Verifies that enhanced search and AI search endpoints are active on Google Cloud Run
 */

import { BLOG_WRITER_API_URL } from '../src/lib/blog-writer-api-url';

interface EndpointTest {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST';
  body?: Record<string, unknown>;
  expectedStatus?: number;
}

const API_KEY = process.env.BLOG_WRITER_API_KEY;

async function testEndpoint(test: EndpointTest): Promise<{
  success: boolean;
  status: number;
  response?: any;
  error?: string;
}> {
  const url = `${BLOG_WRITER_API_URL}${test.endpoint}`;
  
  console.log(`\n🔍 Testing: ${test.name}`);
  console.log(`   URL: ${url}`);
  console.log(`   Method: ${test.method}`);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
      headers['X-API-Key'] = API_KEY;
    }

    const options: RequestInit = {
      method: test.method,
      headers,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    };

    if (test.body && test.method === 'POST') {
      options.body = JSON.stringify(test.body);
    }

    const response = await fetch(url, options);
    const status = response.status;
    
    let responseData: any;
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else {
      const text = await response.text();
      responseData = { raw: text.substring(0, 500) };
    }

    const success = test.expectedStatus 
      ? status === test.expectedStatus 
      : response.ok;

    if (success) {
      console.log(`   ✅ Status: ${status} - SUCCESS`);
      if (responseData && typeof responseData === 'object') {
        const keys = Object.keys(responseData);
        console.log(`   📦 Response keys: ${keys.join(', ')}`);
      }
    } else {
      console.log(`   ❌ Status: ${status} - FAILED`);
      if (responseData?.error) {
        console.log(`   Error: ${responseData.error}`);
      }
    }

    return {
      success,
      status,
      response: responseData,
      error: success ? undefined : `Status ${status}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`   ❌ ERROR: ${errorMessage}`);
    return {
      success: false,
      status: 0,
      error: errorMessage,
    };
  }
}

async function main() {
  console.log('🚀 Testing Cloud Run Endpoints');
  console.log(`📍 API URL: ${BLOG_WRITER_API_URL}`);
  console.log(`🔑 API Key: ${API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log('=' .repeat(60));

  const tests: EndpointTest[] = [
    // Health check
    {
      name: 'Health Check',
      endpoint: '/health',
      method: 'GET',
      expectedStatus: 200,
    },
    
    // Enhanced keyword analysis
    {
      name: 'Enhanced Keyword Analysis',
      endpoint: '/api/v1/keywords/enhanced',
      method: 'POST',
      body: {
        keywords: ['content marketing'],
        location: 'United States',
        language: 'en',
        search_type: 'enhanced_keyword_analysis',
        include_search_volume: true,
        max_suggestions_per_keyword: 5,
      },
      expectedStatus: 200,
    },
    
    // AI topic suggestions
    {
      name: 'AI Topic Suggestions',
      endpoint: '/api/v1/keywords/ai-topic-suggestions',
      method: 'POST',
      body: {
        keywords: ['content marketing'],
        location: 'United States',
        language: 'en',
        include_ai_search_volume: true,
        include_llm_mentions: true,
        limit: 10,
      },
      expectedStatus: 200,
    },
    
    // AI topic suggestions streaming
    {
      name: 'AI Topic Suggestions (Stream)',
      endpoint: '/api/v1/keywords/ai-topic-suggestions/stream',
      method: 'POST',
      body: {
        keywords: ['content marketing'],
        location: 'United States',
        language: 'en',
        include_ai_search_volume: true,
        limit: 10,
      },
      expectedStatus: 200,
    },
    
    // Enhanced streaming
    {
      name: 'Enhanced Analysis (Stream)',
      endpoint: '/api/v1/keywords/enhanced/stream',
      method: 'POST',
      body: {
        keywords: ['content marketing'],
        location: 'United States',
        language: 'en',
        max_suggestions_per_keyword: 5,
      },
      expectedStatus: 200,
    },
    
    // Traditional keyword analyze (fallback)
    {
      name: 'Traditional Keyword Analyze',
      endpoint: '/api/v1/keywords/analyze',
      method: 'POST',
      body: {
        keywords: ['content marketing'],
        location: 'United States',
        language: 'en',
      },
      expectedStatus: 200,
    },
  ];

  const results: Array<{
    test: string;
    success: boolean;
    status: number;
    error?: string;
  }> = [];

  for (const test of tests) {
    const result = await testEndpoint(test);
    results.push({
      test: test.name,
      success: result.success,
      status: result.status,
      error: result.error,
    });
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    const statusText = result.status > 0 ? `Status: ${result.status}` : 'No response';
    console.log(`${icon} ${result.test}: ${statusText}${result.error ? ` - ${result.error}` : ''}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${results.length} tests`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(60));

  // Exit with error code if any tests failed
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

