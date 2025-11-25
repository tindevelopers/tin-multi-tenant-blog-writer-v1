#!/usr/bin/env node

/**
 * Final API Test for v1.3.6 - Testing /api/v1/blog/generate-enhanced
 * This is now the PRIMARY and ONLY endpoint for blog generation
 */

const https = require('https');

const https = require('https');

const BASE_URL = process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-kq42l26tuq-od.a.run.app';
const ENDPOINT = '/api/v1/blog/generate-enhanced';

let testsPassed = 0;
let testsFailed = 0;
let testsTotal = 0;
const results = [];

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
      timeout: 300000, // 5 minutes
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
    
    const testResult = {
      test: testName,
      status: response.status,
      duration: `${duration}s`,
      hasContent,
      hasTitle,
      wordCount,
      success: response.status === 200 && hasContent && hasTitle,
    };

    if (testResult.success) {
      console.log(`  ✓ PASSED (${duration}s)`);
      console.log(`    Title: ${response.body.title.substring(0, 60)}...`);
      console.log(`    Content: ${wordCount} words`);
      console.log(`    SEO Score: ${response.body.seo_score || 'N/A'}`);
      if (response.body.seo_metadata?.word_count_range) {
        const wc = response.body.seo_metadata.word_count_range;
        console.log(`    Word Count Range: ${wc.actual} (target: ${wc.min}-${wc.max})`);
      }
      testsPassed++;
    } else {
      console.log(`  ✗ FAILED (${duration}s)`);
      console.log(`    Status: ${response.status}`);
      console.log(`    Has Content: ${hasContent}`);
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
    }

    results.push({ ...testResult, response: response.body });
    return testResult;
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`  ✗ ERROR (${duration}s): ${error.message}`);
    testsFailed++;
    results.push({
      test: testName,
      success: false,
      error: error.message,
      duration: `${duration}s`,
    });
    return { success: false, error: error.message };
  }
}

async function runFinalTests() {
  console.log('========================================');
  console.log('API v1.3.6 Final Test Suite');
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log('========================================');

  // Test 1: Tutorial type (one of the 28 blog types)
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

  // Test 2: FAQ type
  await runTest('FAQ Type', {
    topic: 'Frequently Asked Questions About SEO',
    keywords: ['seo', 'search engine optimization'],
    blog_type: 'faq',
    tone: 'professional',
    length: 'medium',
    optimize_for_traffic: true,
  });

  // Test 3: Tips type
  await runTest('Tips Type', {
    topic: '10 Tips for Better Blog Writing',
    keywords: ['blog writing', 'content creation'],
    blog_type: 'tips',
    tone: 'friendly',
    length: 'short',
    word_count_target: 500,
    optimize_for_traffic: true,
  });

  // Test 4: How-to type
  await runTest('How-To Type', {
    topic: 'How to Build a REST API with Python',
    keywords: ['python', 'rest api', 'flask'],
    blog_type: 'how_to',
    tone: 'professional',
    length: 'medium',
    word_count_target: 1500,
    optimize_for_traffic: true,
  });

  // Test 5: Listicle type
  await runTest('Listicle Type', {
    topic: 'Top 10 Python Libraries for Data Science',
    keywords: ['python', 'data science', 'libraries'],
    blog_type: 'listicle',
    tone: 'professional',
    length: 'medium',
    optimize_for_traffic: true,
  });

  // Test 6: Case study type
  await runTest('Case Study Type', {
    topic: 'How Company X Increased Revenue by 300%',
    keywords: ['case study', 'revenue growth'],
    blog_type: 'case_study',
    tone: 'professional',
    length: 'long',
    optimize_for_traffic: true,
  });

  // Test 7: Word count tolerance
  await runTest('Word Count Tolerance Test', {
    topic: 'Understanding Python Basics',
    keywords: ['python', 'programming'],
    blog_type: 'tutorial',
    word_count_target: 300,
    optimize_for_traffic: true,
  });

  // Test 8: Custom type
  await runTest('Custom Type', {
    topic: 'Python Overview',
    keywords: ['python'],
    blog_type: 'custom',
    optimize_for_traffic: false,
  });

  // Test 9: Definition type
  await runTest('Definition Type', {
    topic: 'What is Python?',
    keywords: ['python', 'programming language'],
    blog_type: 'definition',
    tone: 'professional',
    optimize_for_traffic: true,
  });

  // Test 10: Checklist type
  await runTest('Checklist Type', {
    topic: 'Python Development Checklist',
    keywords: ['python', 'checklist'],
    blog_type: 'checklist',
    optimize_for_traffic: true,
  });

  // Summary
  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================');
  console.log(`Total Tests: ${testsTotal}`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Success Rate: ${((testsPassed / testsTotal) * 100).toFixed(1)}%`);

  // Detailed results
  console.log('\nDetailed Results:');
  results.forEach((result, idx) => {
    const icon = result.success ? '✓' : '✗';
    const contentInfo = result.hasContent ? `${result.wordCount} words` : 'NO CONTENT';
    console.log(`${icon} [${idx + 1}] ${result.test} - ${result.status || 'ERROR'} (${result.duration || 'N/A'}) - ${contentInfo}`);
  });

  if (testsFailed === 0) {
    console.log('\n✓ All tests passed! Endpoint is working correctly.');
    process.exit(0);
  } else {
    console.log(`\n✗ ${testsFailed} test(s) failed - review results above`);
    process.exit(1);
  }
}

runFinalTests().catch((error) => {
  console.error(`Test suite error: ${error.message}`);
  process.exit(1);
});

