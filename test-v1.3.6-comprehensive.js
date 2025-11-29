#!/usr/bin/env node

/**
 * Comprehensive API Test for v1.3.6
 * Tests various configurations to identify working scenarios
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
  console.log(`Request: ${JSON.stringify(request, null, 2).substring(0, 200)}...`);

  try {
    const response = await makeRequest('/api/v1/blog/generate-enhanced', 'POST', request);
    
    const hasContent = response.body.content && response.body.content.length > 0;
    const hasTitle = !!response.body.title;
    const hasSEO = response.body.seo_score !== undefined;
    const hasMetadata = !!response.body.seo_metadata;
    
    if (response.status === 200 && hasContent && hasTitle) {
      console.log(`✓ PASSED - Content length: ${response.body.content.length}, SEO Score: ${response.body.seo_score}`);
      if (response.body.seo_metadata?.word_count_range) {
        const wc = response.body.seo_metadata.word_count_range;
        console.log(`  Word Count: ${wc.actual} (range: ${wc.min}-${wc.max})`);
      }
      testsPassed++;
      return { success: true, response };
    } else {
      console.log(`✗ FAILED - Status: ${response.status}, Has Content: ${hasContent}, Has Title: ${hasTitle}`);
      if (response.body.warnings) {
        console.log(`  Warnings: ${JSON.stringify(response.body.warnings)}`);
      }
      testsFailed++;
      return { success: false, response };
    }
  } catch (error) {
    console.log(`✗ ERROR: ${error.message}`);
    testsFailed++;
    return { success: false, error: error.message };
  }
}

async function runComprehensiveTests() {
  console.log('========================================');
  console.log('Comprehensive API v1.3.6 Test');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('========================================');

  // Test 1: Without DataForSEO
  await runTest('Without DataForSEO', {
    topic: 'Introduction to Python',
    keywords: ['python'],
    blog_type: 'tutorial',
    optimize_for_traffic: true,
    use_dataforseo_content_generation: false,
  });

  // Test 2: Minimal request
  await runTest('Minimal Request', {
    topic: 'Python Basics',
    keywords: ['python'],
  });

  // Test 3: Custom type without SEO
  await runTest('Custom Type, No SEO', {
    topic: 'Python Overview',
    keywords: ['python'],
    blog_type: 'custom',
    optimize_for_traffic: false,
  });

  // Test 4: FAQ without DataForSEO
  await runTest('FAQ Type, No DataForSEO', {
    topic: 'Python FAQ',
    keywords: ['python'],
    blog_type: 'faq',
    optimize_for_traffic: true,
    use_dataforseo_content_generation: false,
  });

  // Test 5: Tips without DataForSEO
  await runTest('Tips Type, No DataForSEO', {
    topic: 'Python Tips',
    keywords: ['python'],
    blog_type: 'tips',
    optimize_for_traffic: true,
    use_dataforseo_content_generation: false,
  });

  // Test 6: With DataForSEO but different blog type
  await runTest('How-To Type with DataForSEO', {
    topic: 'How to Learn Python',
    keywords: ['python', 'learning'],
    blog_type: 'how_to',
    optimize_for_traffic: true,
    use_dataforseo_content_generation: true,
  });

  // Test 7: Guide type
  await runTest('Guide Type', {
    topic: 'Python Programming Guide',
    keywords: ['python'],
    blog_type: 'guide',
    optimize_for_traffic: true,
    use_dataforseo_content_generation: false,
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

runComprehensiveTests().catch(console.error);

