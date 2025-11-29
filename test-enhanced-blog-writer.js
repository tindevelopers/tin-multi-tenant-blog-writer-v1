#!/usr/bin/env node

/**
 * Comprehensive Test Script for Enhanced Blog Writer Endpoint
 * Tests: /api/blog-writer/generate (proxies to /api/v1/blog/generate-enhanced)
 * 
 * Usage:
 *   node test-enhanced-blog-writer.js [local|production] [sync|async]
 * 
 * Examples:
 *   node test-enhanced-blog-writer.js local sync
 *   node test-enhanced-blog-writer.js production async
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ENVIRONMENT = process.argv[2] || 'local';
const MODE = process.argv[3] || 'sync'; // sync or async

const BASE_URL = ENVIRONMENT === 'production' 
  ? process.env.VERCEL_URL || 'https://your-production-url.vercel.app'
  : 'http://localhost:3000';

const ENDPOINT = `${BASE_URL}/api/blog-writer/generate`;

// Test data
const TEST_PAYLOAD = {
  topic: "Best Pet Grooming Services in California",
  keywords: [
    "pet grooming",
    "dog grooming",
    "cat grooming",
    "mobile pet grooming",
    "professional pet grooming"
  ],
  target_audience: "Pet Parents",
  tone: "professional",
  word_count: 1000, // Reduced for faster testing
  quality_level: "premium",
  template_type: "how_to_guide",
  length: "medium",
  custom_instructions: "Focus on practical tips and local recommendations. Include safety considerations and cost information.",
  use_google_search: true,
  use_fact_checking: true,
  use_citations: true,
  use_serp_optimization: true,
  use_consensus_generation: true,
  use_knowledge_graph: true,
  use_semantic_keywords: true,
  use_quality_scoring: true
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

function logSubsection(title) {
  console.log('\n' + '-'.repeat(60));
  log(title, 'cyan');
  console.log('-'.repeat(60));
}

// Test results tracker
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function recordTest(name, passed, message = '') {
  testResults.tests.push({ name, passed, message });
  if (passed) {
    testResults.passed++;
    log(`✅ ${name}`, 'green');
  } else {
    testResults.failed++;
    log(`❌ ${name}: ${message}`, 'red');
  }
}

function recordWarning(message) {
  testResults.warnings++;
  log(`⚠️  ${message}`, 'yellow');
}

// Validate response structure
function validateResponse(response, isAsync = false) {
  const validations = [];
  
  if (isAsync) {
    // Async mode returns job_id and status
    validations.push({
      name: 'Has job_id',
      test: () => typeof response.job_id === 'string' && response.job_id.length > 0,
      message: 'Async response must include job_id'
    });
    validations.push({
      name: 'Has status',
      test: () => ['pending', 'processing', 'completed', 'failed'].includes(response.status),
      message: 'Async response must include valid status'
    });
  } else {
    // Sync mode returns blog content
    validations.push({
      name: 'Has title',
      test: () => typeof response.title === 'string' && response.title.length > 0,
      message: 'Response must include title'
    });
    validations.push({
      name: 'Has content',
      test: () => typeof response.content === 'string' && response.content.length > 100,
      message: 'Response must include content with at least 100 characters'
    });
    validations.push({
      name: 'Has word_count',
      test: () => typeof response.word_count === 'number' && response.word_count > 0,
      message: 'Response must include word_count'
    });
    validations.push({
      name: 'Has seo_score',
      test: () => typeof response.seo_score === 'number' && response.seo_score >= 0 && response.seo_score <= 100,
      message: 'Response must include seo_score (0-100)'
    });
    validations.push({
      name: 'Has readability_score',
      test: () => typeof response.readability_score === 'number' && response.readability_score >= 0 && response.readability_score <= 100,
      message: 'Response must include readability_score (0-100)'
    });
    validations.push({
      name: 'Has progress_updates',
      test: () => Array.isArray(response.progress_updates) && response.progress_updates.length > 0,
      message: 'Response must include progress_updates array'
    });
  }
  
  // Common validations
  validations.push({
    name: 'Has success flag',
    test: () => typeof response.success === 'boolean',
    message: 'Response must include success boolean'
  });
  
  validations.push({
    name: 'Has generation_time',
    test: () => typeof response.generation_time === 'number' && response.generation_time >= 0,
    message: 'Response must include generation_time'
  });
  
  if (response.citations) {
    validations.push({
      name: 'Citations are array',
      test: () => Array.isArray(response.citations),
      message: 'Citations must be an array'
    });
  }
  
  if (response.semantic_keywords) {
    validations.push({
      name: 'Semantic keywords are array',
      test: () => Array.isArray(response.semantic_keywords),
      message: 'Semantic keywords must be an array'
    });
  }
  
  if (response.internal_links) {
    validations.push({
      name: 'Internal links are array',
      test: () => Array.isArray(response.internal_links),
      message: 'Internal links must be an array'
    });
  }
  
  return validations;
}

// Main test function
async function testEnhancedEndpoint() {
  logSection('🧪 Enhanced Blog Writer Endpoint Test');
  
  log(`Environment: ${ENVIRONMENT}`, 'blue');
  log(`Mode: ${MODE}`, 'blue');
  log(`Endpoint: ${ENDPOINT}`, 'blue');
  log(`Topic: ${TEST_PAYLOAD.topic}`, 'blue');
  
  // Check if endpoint is accessible
  logSubsection('1. Endpoint Accessibility Check');
  
  try {
    const healthCheck = await fetch(`${BASE_URL}/api/health`).catch(() => null);
    if (healthCheck && healthCheck.ok) {
      recordTest('Health check endpoint accessible', true);
    } else {
      recordWarning('Health check endpoint not available (non-critical)');
    }
  } catch (error) {
    recordWarning('Could not check health endpoint (non-critical)');
  }
  
  // Test synchronous mode
  if (MODE === 'sync' || MODE === 'both') {
    await testSyncMode();
  }
  
  // Test async mode
  if (MODE === 'async' || MODE === 'both') {
    await testAsyncMode();
  }
  
  // Print summary
  printSummary();
}

async function testSyncMode() {
  logSubsection('2. Synchronous Mode Test');
  
  log('📤 Sending synchronous request...', 'cyan');
  log(`Payload: ${JSON.stringify(TEST_PAYLOAD, null, 2)}`, 'yellow');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_PAYLOAD),
    });
    
    const responseTime = Date.now() - startTime;
    
    log(`\n📥 Response Status: ${response.status} ${response.statusText}`, 'blue');
    log(`⏱️  Response Time: ${(responseTime / 1000).toFixed(2)}s`, 'blue');
    
    if (!response.ok) {
      const errorText = await response.text();
      recordTest('Synchronous request successful', false, `HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      
      // Try to parse error as JSON
      try {
        const errorJson = JSON.parse(errorText);
        log('\n❌ Error Details:', 'red');
        console.log(JSON.stringify(errorJson, null, 2));
      } catch {
        log('\n❌ Error Response:', 'red');
        console.log(errorText.substring(0, 500));
      }
      return;
    }
    
    const result = await response.json();
    
    // Save full response
    const outputPath = path.join(__dirname, 'test-enhanced-blog-writer-result.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    log(`\n💾 Full response saved to: ${outputPath}`, 'green');
    
    // Validate response structure
    logSubsection('3. Response Validation');
    const validations = validateResponse(result, false);
    
    validations.forEach(validation => {
      const passed = validation.test();
      recordTest(validation.name, passed, passed ? '' : validation.message);
    });
    
    // Display key metrics
    logSubsection('4. Response Metrics');
    log(`Title: ${result.title || 'N/A'}`, 'green');
    log(`Word Count: ${result.word_count || 'N/A'}`, 'green');
    log(`SEO Score: ${result.seo_score || 'N/A'}/100`, 'green');
    log(`Readability Score: ${result.readability_score || 'N/A'}/100`, 'green');
    log(`Quality Score: ${result.quality_score || 'N/A'}`, 'green');
    log(`Total Cost: $${result.total_cost || 0}`, 'green');
    log(`Total Tokens: ${result.total_tokens || 0}`, 'green');
    log(`Generation Time: ${result.generation_time || 0}s`, 'green');
    
    if (result.progress_updates && result.progress_updates.length > 0) {
      log(`\n📊 Progress Updates (${result.progress_updates.length} stages):`, 'cyan');
      result.progress_updates.forEach((update, idx) => {
        log(`  ${idx + 1}. ${update.stage} - ${update.progress_percentage}%`, 'blue');
        if (update.details) {
          log(`     ${update.details}`, 'yellow');
        }
      });
    }
    
    if (result.citations && result.citations.length > 0) {
      log(`\n📚 Citations: ${result.citations.length} found`, 'cyan');
      result.citations.slice(0, 3).forEach((citation, idx) => {
        log(`  ${idx + 1}. ${citation.title || citation.url}`, 'blue');
      });
    }
    
    if (result.semantic_keywords && result.semantic_keywords.length > 0) {
      log(`\n🔑 Semantic Keywords: ${result.semantic_keywords.length} found`, 'cyan');
      log(`  ${result.semantic_keywords.slice(0, 10).join(', ')}`, 'blue');
    }
    
    if (result.internal_links && result.internal_links.length > 0) {
      log(`\n🔗 Internal Links: ${result.internal_links.length} found`, 'cyan');
      result.internal_links.slice(0, 3).forEach((link, idx) => {
        log(`  ${idx + 1}. ${link.anchor_text} → ${link.url}`, 'blue');
      });
    }
    
    if (result.warnings && result.warnings.length > 0) {
      log(`\n⚠️  Warnings (${result.warnings.length}):`, 'yellow');
      result.warnings.forEach((warning, idx) => {
        log(`  ${idx + 1}. ${warning}`, 'yellow');
      });
    }
    
    // Content preview
    if (result.content) {
      logSubsection('5. Content Preview');
      const preview = result.content.substring(0, 500);
      log(preview, 'blue');
      log('...', 'blue');
    }
    
  } catch (error) {
    recordTest('Synchronous request', false, error.message);
    log(`\n❌ Test Error: ${error.message}`, 'red');
    if (error.stack) {
      log(`Stack: ${error.stack}`, 'red');
    }
  }
}

async function testAsyncMode() {
  logSubsection('2. Asynchronous Mode Test');
  
  log('📤 Sending asynchronous request...', 'cyan');
  
  const asyncPayload = {
    ...TEST_PAYLOAD,
    async_mode: true
  };
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${ENDPOINT}?async_mode=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_PAYLOAD),
    });
    
    const responseTime = Date.now() - startTime;
    
    log(`\n📥 Response Status: ${response.status} ${response.statusText}`, 'blue');
    log(`⏱️  Response Time: ${(responseTime / 1000).toFixed(2)}s`, 'blue');
    
    if (!response.ok) {
      const errorText = await response.text();
      recordTest('Asynchronous request successful', false, `HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      return;
    }
    
    const result = await response.json();
    
    // Validate async response
    logSubsection('3. Async Response Validation');
    const validations = validateResponse(result, true);
    
    validations.forEach(validation => {
      const passed = validation.test();
      recordTest(validation.name, passed, passed ? '' : validation.message);
    });
    
    log(`\n📋 Job ID: ${result.job_id}`, 'green');
    log(`📊 Status: ${result.status}`, 'green');
    
    if (result.status === 'pending' || result.status === 'processing') {
      log('\n⏳ Job is processing. Use polling endpoint to check status.', 'yellow');
      log(`   GET ${BASE_URL}/api/blog-writer/status/${result.job_id}`, 'cyan');
    }
    
  } catch (error) {
    recordTest('Asynchronous request', false, error.message);
    log(`\n❌ Test Error: ${error.message}`, 'red');
  }
}

function printSummary() {
  logSection('📊 Test Summary');
  
  log(`Total Tests: ${testResults.tests.length}`, 'blue');
  log(`✅ Passed: ${testResults.passed}`, 'green');
  log(`❌ Failed: ${testResults.failed}`, 'red');
  log(`⚠️  Warnings: ${testResults.warnings}`, 'yellow');
  
  const successRate = testResults.tests.length > 0 
    ? ((testResults.passed / testResults.tests.length) * 100).toFixed(1)
    : 0;
  
  log(`\nSuccess Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'red');
  
  if (testResults.failed > 0) {
    log('\n❌ Failed Tests:', 'red');
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => {
        log(`  - ${t.name}: ${t.message}`, 'red');
      });
  }
  
  console.log('\n');
}

// Run tests
if (require.main === module) {
  testEnhancedEndpoint().catch(error => {
    log(`\n❌ Fatal Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { testEnhancedEndpoint, validateResponse };

