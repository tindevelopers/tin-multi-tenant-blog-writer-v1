/**
 * Test Script for API Endpoints
 * 
 * This script tests all the new API endpoints with real data
 * Run with: npx tsx scripts/test-api-endpoints.ts
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Test content
const TEST_CONTENT = `# Introduction to Artificial Intelligence

Artificial intelligence (AI) has revolutionized many industries in recent years. From healthcare to finance, AI is transforming how we work and live.

## What is AI?

Artificial intelligence refers to the simulation of human intelligence in machines. These machines are programmed to think like humans and mimic their actions.

### Types of AI

1. **Reactive Machines**: Basic AI systems without memory
2. **Limited Memory**: AI systems that use past experiences
3. **Theory of Mind**: AI that understands emotions and intentions
4. **Self-aware AI**: Most advanced form with human-like consciousness

## Machine Learning

Machine learning is a subset of AI that enables systems to automatically learn and improve from experience.

For more information, visit [OpenAI](https://openai.com) or [Google AI](https://ai.google/).

![AI Image](https://placehold.co/800x400/6366f1/ffffff?text=AI+Future)
`;

const TEST_TOPIC = 'Artificial Intelligence';
const TEST_KEYWORDS = ['AI', 'Machine Learning', 'Deep Learning', 'Neural Networks'];
const TEST_TARGET_AUDIENCE = 'Tech Enthusiasts';

interface TestResult {
  endpoint: string;
  success: boolean;
  status: number;
  response?: any;
  error?: string;
  duration: number;
}

async function testEndpoint(
  endpoint: string,
  method: 'GET' | 'POST',
  body?: any
): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));
    const duration = Date.now() - startTime;

    return {
      endpoint,
      success: response.ok,
      status: response.status,
      response: data,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      endpoint,
      success: false,
      status: 0,
      error: error.message,
      duration,
    };
  }
}

async function runTests() {
  console.log('🧪 Testing API Endpoints...\n');
  console.log(`Base URL: ${API_BASE_URL}\n`);

  const results: TestResult[] = [];

  // Test 1: Content Analysis
  console.log('1️⃣ Testing Content Analysis...');
  const analysisResult = await testEndpoint('/api/blog-writer/analyze', 'POST', {
    content: TEST_CONTENT,
    topic: TEST_TOPIC,
    keywords: TEST_KEYWORDS,
    target_audience: TEST_TARGET_AUDIENCE,
  });
  results.push(analysisResult);
  console.log(`   ${analysisResult.success ? '✅' : '❌'} Status: ${analysisResult.status} (${analysisResult.duration}ms)`);
  if (analysisResult.response) {
    console.log(`   Response keys: ${Object.keys(analysisResult.response).join(', ')}`);
  }
  console.log('');

  // Test 2: Content Optimization
  console.log('2️⃣ Testing Content Optimization...');
  const optimizationResult = await testEndpoint('/api/blog-writer/optimize', 'POST', {
    content: TEST_CONTENT,
    topic: TEST_TOPIC,
    keywords: TEST_KEYWORDS,
    optimization_goals: ['seo', 'readability'],
  });
  results.push(optimizationResult);
  console.log(`   ${optimizationResult.success ? '✅' : '❌'} Status: ${optimizationResult.status} (${optimizationResult.duration}ms)`);
  if (optimizationResult.response) {
    console.log(`   Response keys: ${Object.keys(optimizationResult.response).join(', ')}`);
  }
  console.log('');

  // Test 3: Topic Recommendations
  console.log('3️⃣ Testing Topic Recommendations...');
  const topicsResult = await testEndpoint('/api/blog-writer/topics/recommend', 'POST', {
    keywords: TEST_KEYWORDS,
    industry: 'Technology',
    target_audience: TEST_TARGET_AUDIENCE,
    count: 5,
  });
  results.push(topicsResult);
  console.log(`   ${topicsResult.success ? '✅' : '❌'} Status: ${topicsResult.status} (${topicsResult.duration}ms)`);
  if (topicsResult.response?.topics) {
    console.log(`   Topics returned: ${topicsResult.response.topics.length}`);
  }
  console.log('');

  // Summary
  console.log('\n📊 Test Summary:');
  console.log('='.repeat(50));
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Average Duration: ${avgDuration.toFixed(0)}ms`);
  console.log('');

  if (failed > 0) {
    console.log('❌ Failed Tests:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   - ${r.endpoint}: ${r.status} ${r.error || ''}`);
      });
  }

  // Detailed results
  console.log('\n📋 Detailed Results:');
  console.log('='.repeat(50));
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.endpoint}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Success: ${result.success ? 'Yes' : 'No'}`);
    console.log(`   Duration: ${result.duration}ms`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.response) {
      console.log(`   Response: ${JSON.stringify(result.response, null, 2).substring(0, 200)}...`);
    }
  });
}

// Run tests
runTests().catch(console.error);

