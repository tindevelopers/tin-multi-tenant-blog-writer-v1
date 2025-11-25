#!/usr/bin/env node

/**
 * Test the Unified Blog Generation Endpoint
 * This is the PRIMARY endpoint according to documentation
 */

const https = require('https');

const BASE_URL = process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-kq42l26tuq-od.a.run.app';

let testsPassed = 0;
let testsFailed = 0;
let testsTotal = 0;

function makeRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 300000,
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            body: parsed,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: body,
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function runTest(testName, request) {
  testsTotal++;
  console.log(`\n[${testsTotal}] ${testName}`);
  console.log(`Request config: blog_type=${request.blog_type || 'default'}, use_dataforseo=${request.use_dataforseo_content_generation || false}`);

  try {
    const response = await makeRequest('/api/v1/blog/generate-unified', 'POST', request);
    
    const hasContent = response.body.content && response.body.content.length > 0;
    const hasTitle = !!response.body.title;
    const hasSEO = response.body.seo_score !== undefined;
    
    if (response.status === 200 && hasContent && hasTitle) {
      console.log(`✓ PASSED`);
      console.log(`  Title: ${response.body.title.substring(0, 60)}...`);
      console.log(`  Content length: ${response.body.content.length} chars`);
      console.log(`  SEO Score: ${response.body.seo_score || 'N/A'}`);
      if (response.body.seo_metadata?.word_count_range) {
        const wc = response.body.seo_metadata.word_count_range;
        console.log(`  Word Count: ${wc.actual} (target: ${wc.min}-${wc.max})`);
      }
      testsPassed++;
      return { success: true, response };
    } else {
      console.log(`✗ FAILED - Status: ${response.status}`);
      console.log(`  Has Content: ${hasContent}, Has Title: ${hasTitle}`);
      if (response.body.error) {
        console.log(`  Error: ${response.body.error}`);
      }
      if (response.body.detail) {
        console.log(`  Detail: ${response.body.detail}`);
      }
      if (response.body.warnings) {
        console.log(`  Warnings: ${JSON.stringify(response.body.warnings)}`);
      }
      // Show full response for debugging
      console.log(`  Full response keys: ${Object.keys(response.body).join(', ')}`);
      testsFailed++;
      return { success: false, response };
    }
  } catch (error) {
    console.log(`✗ ERROR: ${error.message}`);
    testsFailed++;
    return { success: false, error: error.message };
  }
}

async function runUnifiedTests() {
  console.log('========================================');
  console.log('Unified Blog Generation Endpoint Test');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('========================================');

  // Test 1: Basic unified request
  await runTest('Basic Unified Request', {
    blog_type: 'enhanced',
    topic: 'Introduction to Python Programming',
    keywords: ['python', 'programming'],
    tone: 'professional',
    word_count: 500,
  });

  // Test 2: With DataForSEO
  await runTest('Unified with DataForSEO', {
    blog_type: 'enhanced',
    topic: 'Python Basics',
    keywords: ['python'],
    use_dataforseo_content_generation: true,
    tone: 'professional',
    word_count: 300,
  });

  // Test 3: Tutorial type
  await runTest('Tutorial Type', {
    blog_type: 'tutorial',
    topic: 'How to Learn Python',
    keywords: ['python', 'learning'],
    tone: 'professional',
    word_count: 500,
  });

  // Test 4: FAQ type
  await runTest('FAQ Type', {
    blog_type: 'faq',
    topic: 'Python FAQ',
    keywords: ['python'],
    tone: 'professional',
    word_count: 400,
  });

  // Test 5: Tips type
  await runTest('Tips Type', {
    blog_type: 'tips',
    topic: 'Python Tips',
    keywords: ['python'],
    tone: 'friendly',
    word_count: 300,
  });

  // Test 6: With SEO features
  await runTest('With SEO Features', {
    blog_type: 'enhanced',
    topic: 'Python Guide',
    keywords: ['python'],
    use_serp_optimization: true,
    use_semantic_keywords: true,
    tone: 'professional',
    word_count: 500,
  });

  // Summary
  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================');
  console.log(`Total Tests: ${testsTotal}`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed');
    process.exit(1);
  }
}

runUnifiedTests().catch(console.error);

