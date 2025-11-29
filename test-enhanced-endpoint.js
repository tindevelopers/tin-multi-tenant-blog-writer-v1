#!/usr/bin/env node

/**
 * Test /api/v1/blog/generate-enhanced endpoint
 * This is now the PRIMARY and ONLY endpoint for blog generation
 */

const https = require('https');

const BASE_URL = process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-kq42l26tuq-od.a.run.app';
const ENDPOINT = '/api/v1/blog/generate-enhanced';

let testsPassed = 0;
let testsFailed = 0;
let testsTotal = 0;

function makeRequest(data) {
  return new Promise((resolve, reject) => {
    const url = new URL(ENDPOINT, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
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

    req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTest(testName, request) {
  testsTotal++;
  console.log(`\n[${testsTotal}] ${testName}`);
  console.log(`  Blog Type: ${request.blog_type || 'default'}`);
  console.log(`  Topic: ${request.topic}`);

  const startTime = Date.now();
  
  try {
    const response = await makeRequest(request);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    const hasContent = response.body.content && response.body.content.length > 0;
    const hasTitle = !!response.body.title;
    const wordCount = response.body.content ? response.body.content.split(/\s+/).length : 0;
    
    if (response.status === 200 && hasContent && hasTitle) {
      console.log(`  ✓ PASSED (${duration}s)`);
      console.log(`    Title: ${response.body.title.substring(0, 60)}...`);
      console.log(`    Content: ${wordCount} words`);
      console.log(`    SEO Score: ${response.body.seo_score || 'N/A'}`);
      if (response.body.seo_metadata?.word_count_range) {
        const wc = response.body.seo_metadata.word_count_range;
        console.log(`    Word Count: ${wc.actual} (target: ${wc.min}-${wc.max})`);
      }
      testsPassed++;
      return { success: true };
    } else {
      console.log(`  ✗ FAILED (${duration}s)`);
      console.log(`    Status: ${response.status}`);
      console.log(`    Has Content: ${hasContent}, Content Length: ${response.body.content?.length || 0}`);
      console.log(`    Has Title: ${hasTitle}`);
      if (response.body.error) {
        console.log(`    Error: ${response.body.error}`);
      }
      if (response.body.detail) {
        console.log(`    Detail: ${JSON.stringify(response.body.detail).substring(0, 200)}`);
      }
      if (response.body.warnings) {
        console.log(`    Warnings: ${JSON.stringify(response.body.warnings)}`);
      }
      testsFailed++;
      return { success: false };
    }
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`  ✗ ERROR (${duration}s): ${error.message}`);
    testsFailed++;
    return { success: false };
  }
}

async function runTests() {
  console.log('========================================');
  console.log('API v1.3.6 Endpoint Test');
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log('========================================');

  // Test various blog types
  await runTest('Tutorial Type', {
    topic: 'Introduction to Python Programming',
    keywords: ['python', 'programming'],
    blog_type: 'tutorial',
    tone: 'professional',
    length: 'short',
    word_count_target: 300,
    optimize_for_traffic: true,
    use_dataforseo_content_generation: true,
  });

  await runTest('FAQ Type', {
    topic: 'Frequently Asked Questions About SEO',
    keywords: ['seo'],
    blog_type: 'faq',
    tone: 'professional',
    length: 'medium',
    optimize_for_traffic: true,
  });

  await runTest('Tips Type', {
    topic: '10 Tips for Better Blog Writing',
    keywords: ['blog writing'],
    blog_type: 'tips',
    tone: 'friendly',
    length: 'short',
    word_count_target: 500,
    optimize_for_traffic: true,
  });

  await runTest('Custom Type (No SEO)', {
    topic: 'Python Overview',
    keywords: ['python'],
    blog_type: 'custom',
    optimize_for_traffic: false,
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

runTests().catch(console.error);
