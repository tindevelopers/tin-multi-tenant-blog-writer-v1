/**
 * Test Script: Check Cloud Run Endpoints Availability
 * 
 * Tests if the enhanced search and AI search endpoints are active on Google Cloud Run
 */

import { BLOG_WRITER_API_URL } from './src/lib/blog-writer-api-url';

const API_BASE_URL = BLOG_WRITER_API_URL;
const API_KEY = process.env.BLOG_WRITER_API_KEY;

interface EndpointTest {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST';
  body?: Record<string, unknown>;
  expectedStatus?: number;
}

const endpointsToTest: EndpointTest[] = [
  {
    name: 'Health Check',
    endpoint: '/health',
    method: 'GET',
    expectedStatus: 200,
  },
  {
    name: 'Enhanced Keyword Analysis',
    endpoint: '/api/v1/keywords/enhanced',
    method: 'POST',
    body: {
      keywords: ['test keyword'],
      location: 'United States',
      language: 'en',
      search_type: 'enhanced_keyword_analysis',
      include_search_volume: true,
    },
    expectedStatus: 200,
  },
  {
    name: 'Regular Keyword Analysis',
    endpoint: '/api/v1/keywords/analyze',
    method: 'POST',
    body: {
      keywords: ['test keyword'],
      location: 'United States',
      language: 'en',
      include_search_volume: true,
    },
    expectedStatus: 200,
  },
  {
    name: 'AI Topic Suggestions',
    endpoint: '/api/v1/keywords/ai-topic-suggestions',
    method: 'POST',
    body: {
      keywords: ['test keyword'],
      location: 'United States',
      language: 'en',
      include_ai_search_volume: true,
    },
    expectedStatus: 200,
  },
  {
    name: 'AI Topic Suggestions (Stream)',
    endpoint: '/api/v1/keywords/ai-topic-suggestions/stream',
    method: 'POST',
    body: {
      keywords: ['test keyword'],
      location: 'United States',
      language: 'en',
    },
    expectedStatus: 200,
  },
  {
    name: 'LLM Research',
    endpoint: '/api/v1/keywords/llm-research',
    method: 'POST',
    body: {
      keywords: ['test keyword'],
      location: 'United States',
      language: 'en',
    },
    expectedStatus: 200,
  },
];

async function testEndpoint(test: EndpointTest): Promise<{
  success: boolean;
  status: number;
  error?: string;
  responseTime?: number;
}> {
  const startTime = Date.now();
  const url = `${API_BASE_URL}${test.endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
    headers['X-API-Key'] = API_KEY;
  }

  try {
    const response = await fetch(url, {
      method: test.method,
      headers,
      body: test.body ? JSON.stringify(test.body) : undefined,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const responseTime = Date.now() - startTime;
    const status = response.status;

    // For streaming endpoints, check if we get the right content type
    if (test.endpoint.includes('/stream')) {
      const contentType = response.headers.get('content-type');
      return {
        success: response.ok && contentType?.includes('text/event-stream'),
        status,
        responseTime,
        error: response.ok ? undefined : `Expected streaming response, got ${contentType}`,
      };
    }

    // Try to parse JSON for non-streaming endpoints
    let error: string | undefined;
    if (!response.ok) {
      try {
        const errorText = await response.text();
        error = errorText.substring(0, 200);
      } catch {
        error = `HTTP ${status}`;
      }
    } else {
      // Try to parse response to ensure it's valid JSON
      try {
        await response.clone().json();
      } catch {
        error = 'Response is not valid JSON';
      }
    }

    return {
      success: response.ok && !error,
      status,
      responseTime,
      error,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      status: 0,
      responseTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runTests() {
  console.log('🔍 Testing Cloud Run Endpoints\n');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`API Key: ${API_KEY ? '✅ Set' : '❌ Not set'}\n`);
  console.log('─'.repeat(80));

  const results = [];

  for (const test of endpointsToTest) {
    console.log(`\n📡 Testing: ${test.name}`);
    console.log(`   Endpoint: ${test.endpoint}`);
    console.log(`   Method: ${test.method}`);

    const result = await testEndpoint(test);

    if (result.success) {
      console.log(`   ✅ Status: ${result.status} | Response Time: ${result.responseTime}ms`);
    } else {
      console.log(`   ❌ Failed: ${result.error || 'Unknown error'}`);
      console.log(`   Status: ${result.status || 'N/A'} | Response Time: ${result.responseTime || 'N/A'}ms`);
    }

    results.push({
      ...test,
      ...result,
    });

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n' + '─'.repeat(80));
  console.log('\n📊 Summary\n');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    const statusText = result.success 
      ? `OK (${result.status})` 
      : `FAILED (${result.status || 'N/A'})`;
    console.log(`${icon} ${result.name.padEnd(35)} ${statusText.padEnd(15)} ${result.responseTime || 'N/A'}ms`);
  });

  console.log(`\nTotal: ${results.length} | ✅ ${successful} | ❌ ${failed}`);

  if (failed > 0) {
    console.log('\n⚠️  Some endpoints are not available or returning errors.');
    console.log('   This may indicate:');
    console.log('   - Cloud Run service is down or cold');
    console.log('   - Endpoint path has changed');
    console.log('   - Authentication issues');
    console.log('   - Endpoint not implemented on backend');
  } else {
    console.log('\n✅ All endpoints are active and responding correctly!');
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});

