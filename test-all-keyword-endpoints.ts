/**
 * Test all keyword API endpoints directly
 * This script tests each endpoint to verify they're calling the correct backend URLs
 */

import { BLOG_WRITER_API_URL } from './src/lib/blog-writer-api-url';

const BASE_URL = BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-613248238610.europe-west9.run.app';

interface EndpointTest {
  name: string;
  frontendPath: string;
  backendPath: string;
  method: 'GET' | 'POST';
  body?: Record<string, unknown>;
  description: string;
}

const endpoints: EndpointTest[] = [
  {
    name: 'Keyword Analyze (Enhanced)',
    frontendPath: '/api/keywords/analyze',
    backendPath: '/api/v1/keywords/enhanced',
    method: 'POST',
    body: {
      keywords: ['pet grooming'],
      location: 'United States',
      language: 'en',
      max_suggestions_per_keyword: 10,
      include_serp: false,
    },
    description: 'Analyzes keywords using enhanced endpoint',
  },
  {
    name: 'Keyword Analyze (Regular)',
    frontendPath: '/api/keywords/analyze',
    backendPath: '/api/v1/keywords/analyze',
    method: 'POST',
    body: {
      keywords: ['pet grooming'],
      location: 'United States',
      language: 'en',
    },
    description: 'Analyzes keywords using regular endpoint (fallback)',
  },
  {
    name: 'Keyword Suggest',
    frontendPath: '/api/keywords/suggest',
    backendPath: '/api/v1/keywords/suggest',
    method: 'POST',
    body: {
      keyword: 'pet grooming',
      limit: 10,
    },
    description: 'Gets keyword suggestions',
  },
  {
    name: 'AI Topic Suggestions',
    frontendPath: '/api/keywords/ai-topic-suggestions',
    backendPath: '/api/v1/keywords/ai-topic-suggestions',
    method: 'POST',
    body: {
      keywords: ['pet grooming'],
      location: 'United States',
      language: 'en',
    },
    description: 'Gets AI-powered topic suggestions',
  },
  {
    name: 'AI Optimization',
    frontendPath: '/api/keywords/ai-optimization',
    backendPath: '/api/v1/keywords/ai-optimization',
    method: 'POST',
    body: {
      keywords: ['pet grooming'],
      location: 'United States',
      language: 'en',
    },
    description: 'Gets AI optimization scores',
  },
  {
    name: 'LLM Research',
    frontendPath: '/api/keywords/llm-research',
    backendPath: '/api/v1/keywords/llm-research',
    method: 'POST',
    body: {
      keywords: ['pet grooming'],
      location: 'United States',
      language: 'en',
    },
    description: 'Gets LLM research results',
  },
];

async function testEndpoint(test: EndpointTest, useFrontend: boolean = false): Promise<void> {
  const url = useFrontend
    ? `http://localhost:3000${test.frontendPath}`
    : `${BASE_URL}${test.backendPath}`;
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${test.name}`);
  console.log(`Type: ${useFrontend ? 'Frontend Proxy' : 'Backend Direct'}`);
  console.log(`URL: ${url}`);
  console.log(`Method: ${test.method}`);
  console.log(`Description: ${test.description}`);
  console.log(`${'='.repeat(80)}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const startTime = Date.now();
    const response = await fetch(url, {
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: test.body ? JSON.stringify(test.body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const duration = Date.now() - startTime;
    const contentType = response.headers.get('content-type') || '';
    const isHTML = contentType.includes('text/html');

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Content-Type: ${contentType}`);

    if (isHTML) {
      const text = await response.text();
      console.log(`⚠️  WARNING: Received HTML response (likely 404 page)`);
      console.log(`Response preview: ${text.substring(0, 200)}...`);
    } else if (response.ok) {
      const data = await response.json().catch(() => ({ error: 'Failed to parse JSON' }));
      console.log(`✅ Success! Response keys: ${Object.keys(data).join(', ')}`);
      if (data.error) {
        console.log(`⚠️  Response contains error: ${data.error}`);
      }
    } else {
      const text = await response.text();
      console.log(`❌ Error Response:`);
      console.log(text.substring(0, 500));
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log(`❌ Timeout after 30 seconds`);
    } else {
      console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

async function runAllTests() {
  console.log(`\n${'#'.repeat(80)}`);
  console.log(`# Testing All Keyword API Endpoints`);
  console.log(`# Base URL: ${BASE_URL}`);
  console.log(`# Frontend URL: http://localhost:3000`);
  console.log(`#${'#'.repeat(79)}\n`);

  // First, test backend endpoints directly
  console.log(`\n${'='.repeat(80)}`);
  console.log(`PHASE 1: Testing Backend Endpoints Directly`);
  console.log(`${'='.repeat(80)}`);

  for (const endpoint of endpoints) {
    await testEndpoint(endpoint, false);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between tests
  }

  // Then, test frontend proxy endpoints (if dev server is running)
  console.log(`\n${'='.repeat(80)}`);
  console.log(`PHASE 2: Testing Frontend Proxy Endpoints`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Note: Make sure dev server is running on localhost:3000\n`);

  try {
    const healthCheck = await fetch('http://localhost:3000/api/health', {
      signal: AbortSignal.timeout(2000),
    });
    if (healthCheck.ok) {
      console.log(`✅ Dev server is running\n`);
      for (const endpoint of endpoints) {
        await testEndpoint(endpoint, true);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between tests
      }
    } else {
      console.log(`⚠️  Dev server health check failed, skipping frontend tests\n`);
    }
  } catch {
    console.log(`⚠️  Dev server not running, skipping frontend tests\n`);
  }

  console.log(`\n${'#'.repeat(80)}`);
  console.log(`# Testing Complete`);
  console.log(`#${'#'.repeat(79)}\n`);
}

// Run tests
runAllTests().catch(console.error);

