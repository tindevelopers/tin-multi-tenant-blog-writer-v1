#!/usr/bin/env node

/**
 * API Endpoint Testing Script for v1.3.6
 * Tests all new features before UI changes
 * 
 * Usage: node test-v1.3.6-endpoints.js [baseUrl]
 */

const https = require('https');
const http = require('http');

// Colors for terminal output
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

// Helper function to make HTTP requests
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

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test runner
async function runTest(testName, endpoint, method = 'GET', data = null) {
  testsTotal++;
  console.log(`\n${colors.yellow}Test ${testsTotal}: ${testName}${colors.reset}`);
  console.log(`${colors.blue}${method} ${endpoint}${colors.reset}`);

  try {
    const response = await makeRequest(endpoint, method, data);
    
    if (response.status >= 200 && response.status < 300) {
      console.log(`${colors.green}✓ PASSED (HTTP ${response.status})${colors.reset}`);
      testsPassed++;
      
      // Pretty print JSON if possible
      if (typeof response.body === 'object') {
        console.log(JSON.stringify(response.body, null, 2));
      } else {
        console.log(response.body);
      }
      
      return { success: true, response };
    } else {
      console.log(`${colors.red}✗ FAILED (HTTP ${response.status})${colors.reset}`);
      testsFailed++;
      console.log(JSON.stringify(response.body, null, 2));
      return { success: false, response };
    }
  } catch (error) {
    console.log(`${colors.red}✗ ERROR: ${error.message}${colors.reset}`);
    testsFailed++;
    return { success: false, error };
  }
}

// Main test suite
async function runTests() {
  console.log(`${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.blue}API v1.3.6 Endpoint Testing${colors.reset}`);
  console.log(`${colors.blue}Base URL: ${BASE_URL}${colors.reset}`);
  console.log(`${colors.blue}========================================${colors.reset}`);

  // Test 1: Root endpoint
  await runTest('Root Endpoint - API Info', '/');

  // Test 2: API Config endpoint
  await runTest('API Config - Feature Flags', '/api/v1/config');

  // Test 3: Health check
  await runTest('Health Check', '/health');

  // Test 4: Basic blog generation (tutorial type)
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
    }
  );

  // Test 5: FAQ blog type
  await runTest(
    'Blog Generation - FAQ Type',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'Frequently Asked Questions About SEO',
      keywords: ['seo', 'search engine optimization'],
      blog_type: 'faq',
      tone: 'professional',
      length: 'medium',
      optimize_for_traffic: true,
    }
  );

  // Test 6: Tips blog type
  await runTest(
    'Blog Generation - Tips Type',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: '10 Tips for Better Blog Writing',
      keywords: ['blog writing', 'content creation'],
      blog_type: 'tips',
      tone: 'friendly',
      length: 'short',
      word_count_target: 500,
      optimize_for_traffic: true,
    }
  );

  // Test 7: Case study blog type
  await runTest(
    'Blog Generation - Case Study Type',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'How Company X Increased Revenue by 300%',
      keywords: ['case study', 'revenue growth'],
      blog_type: 'case_study',
      tone: 'professional',
      length: 'medium',
      optimize_for_traffic: true,
    }
  );

  // Test 8: Listicle blog type
  await runTest(
    'Blog Generation - Listicle Type',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'Top 10 Python Libraries for Data Science',
      keywords: ['python', 'data science', 'libraries'],
      blog_type: 'listicle',
      tone: 'professional',
      length: 'medium',
      optimize_for_traffic: true,
    }
  );

  // Test 9: How-to blog type
  await runTest(
    'Blog Generation - How-To Type',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'How to Build a REST API with Python',
      keywords: ['python', 'rest api', 'flask'],
      blog_type: 'how_to',
      tone: 'professional',
      length: 'medium',
      word_count_target: 1500,
      optimize_for_traffic: true,
    }
  );

  // Test 10: Word count tolerance test
  await runTest(
    'Word Count Tolerance - Target 300',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'Understanding Python Basics',
      keywords: ['python', 'programming'],
      blog_type: 'tutorial',
      word_count_target: 300,
      optimize_for_traffic: true,
    }
  );

  // Test 11: SEO optimization disabled
  await runTest(
    'SEO Optimization Disabled',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'Python Programming Overview',
      keywords: ['python'],
      blog_type: 'custom',
      optimize_for_traffic: false,
    }
  );

  // Test 12: Custom instructions
  await runTest(
    'Custom Instructions',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'Python for Beginners',
      keywords: ['python', 'beginner'],
      blog_type: 'getting_started',
      custom_instructions: 'Focus on practical examples and include code snippets',
      optimize_for_traffic: true,
    }
  );

  // Test 13: Target audience
  await runTest(
    'Target Audience',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'Advanced Python Techniques',
      keywords: ['python', 'advanced'],
      blog_type: 'advanced',
      target_audience: 'experienced developers',
      optimize_for_traffic: true,
    }
  );

  // Test 14: Different tones
  await runTest(
    'Casual Tone',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'Fun Python Projects',
      keywords: ['python', 'projects'],
      blog_type: 'tutorial',
      tone: 'casual',
      length: 'short',
      optimize_for_traffic: true,
    }
  );

  // Test 15: Different lengths
  await runTest(
    'Long Length Content',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'Complete Guide to Python Programming',
      keywords: ['python', 'programming', 'guide'],
      blog_type: 'guide',
      tone: 'professional',
      length: 'long',
      optimize_for_traffic: true,
    }
  );

  // Test 16: Brand type with brand_name
  await runTest(
    'Brand Type with Brand Name',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'Company Overview',
      keywords: ['company', 'overview'],
      blog_type: 'brand',
      brand_name: 'TechCorp',
      optimize_for_traffic: true,
    }
  );

  // Test 17: Product review type
  await runTest(
    'Product Review Type',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'Product Review',
      keywords: ['review', 'product'],
      blog_type: 'product_review',
      product_name: 'Python IDE Pro',
      optimize_for_traffic: true,
    }
  );

  // Test 18: Comparison type
  await runTest(
    'Comparison Type',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'Python vs JavaScript',
      keywords: ['python', 'javascript', 'comparison'],
      blog_type: 'comparison',
      comparison_items: ['Python', 'JavaScript'],
      optimize_for_traffic: true,
    }
  );

  // Test 19: Top 10 type with category
  await runTest(
    'Top 10 Type with Category',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'Top 10 Python Libraries',
      keywords: ['python', 'libraries'],
      blog_type: 'top_10',
      category: 'Data Science',
      optimize_for_traffic: true,
    }
  );

  // Test 20: Definition type
  await runTest(
    'Definition Type',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'What is Python?',
      keywords: ['python', 'programming language'],
      blog_type: 'definition',
      tone: 'professional',
      optimize_for_traffic: true,
    }
  );

  // Test 21: Checklist type
  await runTest(
    'Checklist Type',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'Python Development Checklist',
      keywords: ['python', 'checklist'],
      blog_type: 'checklist',
      optimize_for_traffic: true,
    }
  );

  // Test 22: Troubleshooting type
  await runTest(
    'Troubleshooting Type',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'Common Python Errors and Solutions',
      keywords: ['python', 'errors', 'troubleshooting'],
      blog_type: 'troubleshooting',
      optimize_for_traffic: true,
    }
  );

  // Test 23: Best practices type
  await runTest(
    'Best Practices Type',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'Python Best Practices',
      keywords: ['python', 'best practices'],
      blog_type: 'best_practices',
      optimize_for_traffic: true,
    }
  );

  // Test 24: Statistics type
  await runTest(
    'Statistics Type',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'Python Usage Statistics',
      keywords: ['python', 'statistics'],
      blog_type: 'statistics',
      optimize_for_traffic: true,
    }
  );

  // Test 25: Trend analysis type
  await runTest(
    'Trend Analysis Type',
    '/api/v1/blog/generate-enhanced',
    'POST',
    {
      topic: 'Python Programming Trends 2025',
      keywords: ['python', 'trends'],
      blog_type: 'trend_analysis',
      optimize_for_traffic: true,
    }
  );

  // Summary
  console.log(`\n${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.blue}Test Summary${colors.reset}`);
  console.log(`${colors.blue}========================================${colors.reset}`);
  console.log(`Total Tests: ${testsTotal}`);
  console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);

  if (testsFailed === 0) {
    console.log(`\n${colors.green}✓ All tests passed!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}✗ Some tests failed${colors.reset}`);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error(`${colors.red}Test suite error: ${error.message}${colors.reset}`);
  process.exit(1);
});

