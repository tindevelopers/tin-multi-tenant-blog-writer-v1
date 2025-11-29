#!/usr/bin/env node

/**
 * Direct Test Script for Enhanced Blog Writer Endpoint
 * Tests the backend API directly: /api/v1/blog/generate-enhanced
 * 
 * Usage:
 *   node test-enhanced-blog-writer-direct.js [dev|staging|prod]
 * 
 * Examples:
 *   node test-enhanced-blog-writer-direct.js dev
 */

const API_URLS = {
  dev: 'https://blog-writer-api-dev-613248238610.europe-west9.run.app',
  staging: 'https://blog-writer-api-staging-613248238610.europe-west9.run.app',
  prod: 'https://blog-writer-api-prod-613248238610.us-east1.run.app'
};

const ENVIRONMENT = process.argv[2] || 'dev';
const BASE_URL = API_URLS[ENVIRONMENT] || API_URLS.dev;
const ENDPOINT = `${BASE_URL}/api/v1/blog/generate-enhanced`;

// Test data
const TEST_PAYLOAD = {
  topic: "Best Pet Grooming Services in California",
  keywords: [
    "pet grooming",
    "dog grooming",
    "cat grooming"
  ],
  target_audience: "Pet Parents",
  tone: "professional",
  word_count: 800, // Reduced for faster testing
  quality_level: "premium",
  template_type: "how_to_guide",
  length: "medium",
  custom_instructions: "Focus on practical tips and local recommendations.",
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
  console.log('\n' + '='.repeat(70));
  log(title, 'bright');
  console.log('='.repeat(70));
}

function logSubsection(title) {
  console.log('\n' + '-'.repeat(70));
  log(title, 'cyan');
  console.log('-'.repeat(70));
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

// Main test function
async function testEnhancedEndpoint() {
  logSection('🧪 Enhanced Blog Writer Endpoint Test (Direct Backend API)');
  
  log(`Environment: ${ENVIRONMENT}`, 'blue');
  log(`Base URL: ${BASE_URL}`, 'blue');
  log(`Endpoint: ${ENDPOINT}`, 'blue');
  log(`Topic: ${TEST_PAYLOAD.topic}`, 'blue');
  
  // Health check
  logSubsection('1. Health Check');
  
  try {
    const healthUrl = `${BASE_URL}/health`;
    log(`Checking: ${healthUrl}`, 'yellow');
    
    const healthResponse = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json().catch(() => ({}));
      recordTest('Health check endpoint accessible', true);
      log(`Health Status: ${JSON.stringify(healthData)}`, 'green');
    } else {
      recordWarning(`Health check returned ${healthResponse.status} (non-critical)`);
    }
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      recordWarning('Health check timed out (service may be cold-starting)');
    } else {
      recordWarning(`Health check failed: ${error.message} (non-critical)`);
    }
  }
  
  // Test blog generation
  logSubsection('2. Blog Generation Test');
  
  log('📤 Sending request to enhanced endpoint...', 'cyan');
  log(`Payload Preview:`, 'yellow');
  console.log(JSON.stringify({
    topic: TEST_PAYLOAD.topic,
    keywords: TEST_PAYLOAD.keywords,
    word_count: TEST_PAYLOAD.word_count,
    quality_level: TEST_PAYLOAD.quality_level
  }, null, 2));
  
  const startTime = Date.now();
  
  try {
    log(`\n⏳ Request started at ${new Date().toISOString()}`, 'blue');
    log(`⏳ This may take 30-60 seconds for blog generation...`, 'yellow');
    
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(TEST_PAYLOAD),
      signal: AbortSignal.timeout(120000), // 2 minute timeout for blog generation
    });
    
    const responseTime = Date.now() - startTime;
    
    log(`\n📥 Response Status: ${response.status} ${response.statusText}`, 'blue');
    log(`⏱️  Response Time: ${(responseTime / 1000).toFixed(2)}s`, 'blue');
    
    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
        const errorJson = JSON.parse(errorText);
        recordTest('Request successful', false, `HTTP ${response.status}`);
        log('\n❌ Error Response:', 'red');
        console.log(JSON.stringify(errorJson, null, 2));
      } catch {
        recordTest('Request successful', false, `HTTP ${response.status}: ${errorText.substring(0, 200)}`);
        log('\n❌ Error Response:', 'red');
        console.log(errorText.substring(0, 500));
      }
      return;
    }
    
    const result = await response.json();
    
    // Save full response
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, 'test-enhanced-blog-writer-direct-result.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    log(`\n💾 Full response saved to: ${outputPath}`, 'green');
    
    // Validate response structure
    logSubsection('3. Response Validation');
    
    const validations = [
      {
        name: 'Has title',
        test: () => typeof result.title === 'string' && result.title.length > 0,
        message: 'Response must include title'
      },
      {
        name: 'Has content',
        test: () => typeof result.content === 'string' && result.content.length > 100,
        message: 'Response must include content with at least 100 characters'
      },
      {
        name: 'Has word_count',
        test: () => typeof result.word_count === 'number' && result.word_count > 0,
        message: 'Response must include word_count'
      },
      {
        name: 'Has seo_score',
        test: () => typeof result.seo_score === 'number' && result.seo_score >= 0 && result.seo_score <= 100,
        message: 'Response must include seo_score (0-100)'
      },
      {
        name: 'Has readability_score',
        test: () => typeof result.readability_score === 'number' && result.readability_score >= 0 && result.readability_score <= 100,
        message: 'Response must include readability_score (0-100)'
      },
      {
        name: 'Has progress_updates',
        test: () => Array.isArray(result.progress_updates) && result.progress_updates.length > 0,
        message: 'Response must include progress_updates array'
      },
      {
        name: 'Has success flag',
        test: () => typeof result.success === 'boolean',
        message: 'Response must include success boolean'
      },
      {
        name: 'Has generation_time',
        test: () => typeof result.generation_time === 'number' && result.generation_time >= 0,
        message: 'Response must include generation_time'
      }
    ];
    
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
    log(`Total Cost: $${(result.total_cost || 0).toFixed(4)}`, 'green');
    log(`Total Tokens: ${result.total_tokens || 0}`, 'green');
    log(`Generation Time: ${result.generation_time || 0}s`, 'green');
    
    if (result.progress_updates && result.progress_updates.length > 0) {
      log(`\n📊 Progress Updates (${result.progress_updates.length} stages):`, 'cyan');
      result.progress_updates.forEach((update, idx) => {
        log(`  ${idx + 1}. ${update.stage} - ${update.progress_percentage || 0}%`, 'blue');
        if (update.details) {
          log(`     ${update.details}`, 'yellow');
        }
      });
    }
    
    if (result.citations && result.citations.length > 0) {
      log(`\n📚 Citations: ${result.citations.length} found`, 'cyan');
      result.citations.slice(0, 5).forEach((citation, idx) => {
        log(`  ${idx + 1}. ${citation.title || citation.url}`, 'blue');
        if (citation.url) {
          log(`     ${citation.url}`, 'yellow');
        }
      });
    }
    
    if (result.semantic_keywords && result.semantic_keywords.length > 0) {
      log(`\n🔑 Semantic Keywords: ${result.semantic_keywords.length} found`, 'cyan');
      log(`  ${result.semantic_keywords.slice(0, 15).join(', ')}`, 'blue');
    }
    
    if (result.internal_links && result.internal_links.length > 0) {
      log(`\n🔗 Internal Links: ${result.internal_links.length} found`, 'cyan');
      result.internal_links.slice(0, 5).forEach((link, idx) => {
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
      logSubsection('5. Content Preview (first 800 characters)');
      const preview = result.content.substring(0, 800);
      console.log(preview);
      log('...', 'blue');
      log(`\n(Total content length: ${result.content.length} characters)`, 'yellow');
    }
    
    // Check for enhanced features
    logSubsection('6. Enhanced Features Check');
    
    if (result.knowledge_graph) {
      recordTest('Knowledge graph included', true);
      log(`Knowledge Graph Keys: ${Object.keys(result.knowledge_graph).join(', ')}`, 'green');
    } else {
      recordWarning('Knowledge graph not included in response');
    }
    
    if (result.structured_data) {
      recordTest('Structured data included', true);
      log(`Structured Data Type: ${result.structured_data['@type'] || 'N/A'}`, 'green');
    } else {
      recordWarning('Structured data not included in response');
    }
    
    if (result.seo_metadata) {
      recordTest('SEO metadata included', true);
      log(`SEO Metadata Keys: ${Object.keys(result.seo_metadata).join(', ')}`, 'green');
    } else {
      recordWarning('SEO metadata not included in response');
    }
    
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      recordTest('Request completed', false, 'Request timed out after 2 minutes');
      log(`\n⏱️  Request timed out. The API may be processing a large request.`, 'yellow');
      log(`   Try using async_mode=true for long-running requests.`, 'yellow');
    } else {
      recordTest('Request successful', false, error.message);
      log(`\n❌ Test Error: ${error.message}`, 'red');
      if (error.stack) {
        log(`Stack: ${error.stack}`, 'red');
      }
    }
  }
  
  // Print summary
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

module.exports = { testEnhancedEndpoint };

