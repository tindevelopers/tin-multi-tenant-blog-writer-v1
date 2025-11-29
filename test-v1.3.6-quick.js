#!/usr/bin/env node

/**
 * Quick API Endpoint Test for v1.3.6 Critical Features
 * Tests key features before full test suite
 */

const https = require('https');
const http = require('http');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const BASE_URL = process.argv[2] || process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-kq42l26tuq-od.a.run.app';

let testsPassed = 0;
let testsFailed = 0;
let testsTotal = 0;
const results = [];

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
      timeout: 300000, // 5 minutes for blog generation
    };

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
            rawBody: body,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
            rawBody: body,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

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

async function runTest(testName, endpoint, method = 'GET', data = null, validateFn = null) {
  testsTotal++;
  console.log(`\n${colors.yellow}[${testsTotal}] ${testName}${colors.reset}`);
  console.log(`${colors.cyan}${method} ${endpoint}${colors.reset}`);

  const startTime = Date.now();
  
  try {
    const response = await makeRequest(endpoint, method, data);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    const testResult = {
      test: testName,
      endpoint,
      method,
      status: response.status,
      duration: `${duration}s`,
      success: response.status >= 200 && response.status < 300,
      response: response.body,
    };

    // Run custom validation if provided
    if (validateFn) {
      try {
        const validation = validateFn(response.body);
        testResult.validation = validation;
        if (!validation.valid) {
          testResult.success = false;
        }
      } catch (e) {
        testResult.validation = { valid: false, error: e.message };
        testResult.success = false;
      }
    }

    if (testResult.success) {
      console.log(`${colors.green}✓ PASSED${colors.reset} (HTTP ${response.status}, ${duration}s)`);
      testsPassed++;
      
      // Show key response fields
      if (response.body && typeof response.body === 'object') {
        if (response.body.title) {
          console.log(`  Title: ${response.body.title.substring(0, 60)}...`);
        }
        if (response.body.seo_score !== undefined) {
          console.log(`  SEO Score: ${response.body.seo_score}`);
        }
        if (response.body.seo_metadata?.word_count_range) {
          const wc = response.body.seo_metadata.word_count_range;
          console.log(`  Word Count: ${wc.actual} (target: ${wc.min}-${wc.max})`);
        }
        if (response.body.blog_type) {
          console.log(`  Blog Type: ${response.body.blog_type}`);
        }
      }
    } else {
      console.log(`${colors.red}✗ FAILED${colors.reset} (HTTP ${response.status}, ${duration}s)`);
      testsFailed++;
      console.log(`  Error: ${JSON.stringify(response.body).substring(0, 200)}...`);
    }

    results.push(testResult);
    return testResult;
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`${colors.red}✗ ERROR${colors.reset} (${duration}s): ${error.message}`);
    testsFailed++;
    results.push({
      test: testName,
      endpoint,
      method,
      success: false,
      error: error.message,
      duration: `${duration}s`,
    });
    return { success: false, error: error.message };
  }
}

// Validation functions
function validateBlogResponse(body) {
  const checks = {
    hasTitle: !!body.title,
    hasContent: !!body.content && body.content.length > 0,
    hasSEO: !!body.seo_score,
    hasMetadata: !!body.seo_metadata,
    hasWordCountRange: !!body.seo_metadata?.word_count_range,
    wordCountInRange: false,
  };

  if (checks.hasWordCountRange) {
    const wc = body.seo_metadata.word_count_range;
    checks.wordCountInRange = wc.actual >= wc.min && wc.actual <= wc.max;
  }

  return {
    valid: Object.values(checks).every(v => v === true),
    checks,
  };
}

async function runQuickTests() {
  console.log(`${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.blue}Quick API v1.3.6 Feature Test${colors.reset}`);
  console.log(`${colors.blue}Base URL: ${BASE_URL}${colors.reset}`);
  console.log(`${colors.blue}========================================${colors.reset}`);

  // Test 1: Root endpoint
  await runTest('Root Endpoint', '/');

  // Test 2: API Config
  await runTest('API Config', '/api/v1/config');

  // Test 3: Basic blog generation with tutorial type
  await runTest(
    'Blog Generation - Tutorial Type',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'Introduction to Python Programming',
      keywords: ['python', 'programming'],
      blog_type: 'tutorial',
      tone: 'professional',
      length: 'short',
      word_count_target: 300,
      optimize_for_traffic: true,
      use_dataforseo_content_generation: true,
    },
    validateBlogResponse
  );

  // Test 4: FAQ type
  await runTest(
    'Blog Generation - FAQ Type',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'Frequently Asked Questions About SEO',
      keywords: ['seo'],
      blog_type: 'faq',
      length: 'short',
      optimize_for_traffic: true,
    },
    validateBlogResponse
  );

  // Test 5: Tips type
  await runTest(
    'Blog Generation - Tips Type',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: '5 Tips for Better Blog Writing',
      keywords: ['blog writing'],
      blog_type: 'tips',
      length: 'short',
      word_count_target: 300,
      optimize_for_traffic: true,
    },
    validateBlogResponse
  );

  // Test 6: Word count tolerance
  await runTest(
    'Word Count Tolerance Test',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'Understanding Python Basics',
      keywords: ['python'],
      blog_type: 'tutorial',
      word_count_target: 300,
      optimize_for_traffic: true,
    },
    (body) => {
      const validation = validateBlogResponse(body);
      if (validation.valid && body.seo_metadata?.word_count_range) {
        const wc = body.seo_metadata.word_count_range;
        // Should be within ±25% of 300 (225-375)
        const toleranceCheck = wc.min === 225 && wc.max === 375;
        return {
          valid: validation.valid && toleranceCheck,
          checks: { ...validation.checks, toleranceCheck },
        };
      }
      return validation;
    }
  );

  // Test 7: SEO optimization disabled
  await runTest(
    'SEO Optimization Disabled',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'Python Overview',
      keywords: ['python'],
      blog_type: 'custom',
      optimize_for_traffic: false,
    }
  );

  // Summary
  console.log(`\n${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.blue}Test Summary${colors.reset}`);
  console.log(`${colors.blue}========================================${colors.reset}`);
  console.log(`Total Tests: ${testsTotal}`);
  console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);

  // Detailed results
  console.log(`\n${colors.blue}Detailed Results:${colors.reset}`);
  results.forEach((result, idx) => {
    const icon = result.success ? colors.green + '✓' : colors.red + '✗';
    console.log(`${icon}${colors.reset} [${idx + 1}] ${result.test} - ${result.status || 'ERROR'} (${result.duration || 'N/A'})`);
    if (result.validation && !result.validation.valid) {
      console.log(`   Validation failed:`, result.validation.checks);
    }
  });

  if (testsFailed === 0) {
    console.log(`\n${colors.green}✓ All critical tests passed!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}✗ Some tests failed - review results above${colors.reset}`);
    process.exit(1);
  }
}

runQuickTests().catch((error) => {
  console.error(`${colors.red}Test suite error: ${error.message}${colors.reset}`);
  process.exit(1);
});

