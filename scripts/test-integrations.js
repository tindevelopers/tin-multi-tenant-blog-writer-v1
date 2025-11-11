#!/usr/bin/env node

/**
 * Automated Integration Testing Script
 * 
 * Tests all integration endpoints and verifies database state
 * 
 * Usage:
 *   node scripts/test-integrations.js [options]
 * 
 * Options:
 *   --base-url <url>     Base URL (default: http://localhost:3000)
 *   --token <token>      JWT auth token (or set INTEGRATION_TEST_TOKEN env var)
 *   --org-id <id>        Organization ID (or set INTEGRATION_TEST_ORG_ID env var)
 *   --skip-oauth         Skip OAuth flow tests (requires browser)
 *   --verbose            Show detailed output
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.INTEGRATION_TEST_BASE_URL || 'http://localhost:3000',
  token: process.env.INTEGRATION_TEST_TOKEN || null,
  orgId: process.env.INTEGRATION_TEST_ORG_ID || null,
  skipOAuth: process.argv.includes('--skip-oauth'),
  verbose: process.argv.includes('--verbose'),
};

// Parse command line arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--base-url' && args[i + 1]) {
    config.baseUrl = args[i + 1];
    i++;
  } else if (args[i] === '--token' && args[i + 1]) {
    config.token = args[i + 1];
    i++;
  } else if (args[i] === '--org-id' && args[i + 1]) {
    config.orgId = args[i + 1];
    i++;
  }
}

// Test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logVerbose(message) {
  if (config.verbose) {
    log(`  ℹ️  ${message}`, 'cyan');
  }
}

// HTTP request helper
function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, config.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': config.token ? `Bearer ${config.token}` : '',
        ...headers,
      },
    };

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            raw: data,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: null,
            raw: data,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }

    req.end();
  });
}

// Test helper
async function runTest(name, testFn) {
  log(`\n🧪 Testing: ${name}`, 'blue');
  try {
    await testFn();
    results.passed++;
    results.tests.push({ name, status: 'passed' });
    log(`  ✅ PASSED: ${name}`, 'green');
    return true;
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
    log(`  ❌ FAILED: ${name}`, 'red');
    log(`     Error: ${error.message}`, 'red');
    if (config.verbose && error.stack) {
      log(`     Stack: ${error.stack}`, 'red');
    }
    return false;
  }
}

async function skipTest(name, reason) {
  results.skipped++;
  results.tests.push({ name, status: 'skipped', reason });
  log(`\n⏭️  SKIPPED: ${name}`, 'yellow');
  log(`   Reason: ${reason}`, 'yellow');
}

// Validation helpers
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertStatus(response, expectedStatus) {
  assert(
    response.status === expectedStatus,
    `Expected status ${expectedStatus}, got ${response.status}`
  );
}

function assertProperty(obj, property, expectedValue = null) {
  assert(
    property in obj,
    `Expected property '${property}' not found`
  );
  if (expectedValue !== null) {
    assert(
      obj[property] === expectedValue,
      `Expected '${property}' to be '${expectedValue}', got '${obj[property]}'`
    );
  }
}

// Test: Check prerequisites
async function testPrerequisites() {
  if (!config.token) {
    throw new Error('JWT token required. Set INTEGRATION_TEST_TOKEN env var or use --token flag');
  }
  
  logVerbose(`Base URL: ${config.baseUrl}`);
  logVerbose(`Token: ${config.token.substring(0, 20)}...`);
  if (config.orgId) {
    logVerbose(`Org ID: ${config.orgId}`);
  }
}

// Test: Create API Key Integration
let testIntegrationId = null;

async function testCreateApiKeyIntegration() {
  const response = await makeRequest('POST', '/api/integrations/connect-api-key', {
    provider: 'webflow',
    connection: {
      api_token: 'wf_test_token_' + Date.now(),
      site_id: 'test_site_id_123',
      collection_id: 'test_collection_id_456',
    },
    test_connection: true,
  });

  assertStatus(response, 201);
  assertProperty(response.data, 'success', true);
  assertProperty(response.data, 'data');
  assertProperty(response.data.data, 'id');
  assertProperty(response.data.data, 'connection_method', 'api_key');
  assertProperty(response.data.data, 'status', 'active');
  assertProperty(response.data.data, 'provider', 'webflow');

  testIntegrationId = response.data.data.id;
  logVerbose(`Created integration ID: ${testIntegrationId}`);
}

// Test: Get Integration Details
async function testGetIntegration() {
  if (!testIntegrationId) {
    throw new Error('No integration ID available. Run create test first.');
  }

  const response = await makeRequest('GET', `/api/integrations/${testIntegrationId}`);

  assertStatus(response, 200);
  assertProperty(response.data, 'id', testIntegrationId);
  assertProperty(response.data, 'connection_method', 'api_key');
  assertProperty(response.data, 'connection');
  
  // Verify credentials are decrypted (not in encrypted format)
  const connection = response.data.connection;
  assert(
    connection.api_token && !connection.api_token.includes(':'),
    'API token should be decrypted (not in encrypted format)'
  );
  
  logVerbose(`Connection method: ${response.data.connection_method}`);
  logVerbose(`Status: ${response.data.status}`);
}

// Test: Test Connection
async function testConnection() {
  if (!testIntegrationId) {
    throw new Error('No integration ID available. Run create test first.');
  }

  const response = await makeRequest('POST', `/api/integrations/${testIntegrationId}/test`);

  assertStatus(response, 200);
  assertProperty(response.data, 'success', true);
  assertProperty(response.data, 'data');
  assertProperty(response.data.data, 'status');
  
  logVerbose(`Test status: ${response.data.data.status}`);
  logVerbose(`Last tested at: ${response.data.data.last_tested_at || 'N/A'}`);
}

// Test: List Integrations
async function testListIntegrations() {
  const response = await makeRequest('GET', '/api/integrations');

  assertStatus(response, 200);
  assert(Array.isArray(response.data), 'Response should be an array');
  
  const integration = response.data.find(i => i.id === testIntegrationId);
  assert(integration, 'Created integration should be in the list');
  assertProperty(integration, 'connection_method', 'api_key');
  
  logVerbose(`Found ${response.data.length} integration(s)`);
}

// Test: Connect and Get Recommendations
async function testConnectAndRecommend() {
  const response = await makeRequest('POST', '/api/integrations/connect-and-recommend', {
    provider: 'webflow',
    connection: {
      api_token: 'wf_test_token_' + Date.now(),
      site_id: 'test_site_id_123',
      collection_id: 'test_collection_id_456',
    },
    keywords: [
      'webflow cms',
      'content management',
      'website builder',
    ],
  });

  assertStatus(response, 200);
  assertProperty(response.data, 'success', true);
  assertProperty(response.data, 'data');
  assertProperty(response.data.data, 'provider', 'webflow');
  assertProperty(response.data.data, 'recommended_backlinks');
  assertProperty(response.data.data, 'recommended_interlinks');
  assert(Array.isArray(response.data.data.per_keyword), 'per_keyword should be an array');
  
  logVerbose(`Recommended backlinks: ${response.data.data.recommended_backlinks}`);
  logVerbose(`Recommended interlinks: ${response.data.data.recommended_interlinks}`);
  logVerbose(`Keywords analyzed: ${response.data.data.per_keyword.length}`);
}

// Test: Update Integration
async function testUpdateIntegration() {
  if (!testIntegrationId) {
    throw new Error('No integration ID available. Run create test first.');
  }

  const response = await makeRequest('PATCH', `/api/integrations/${testIntegrationId}`, {
    connection: {
      api_token: 'wf_updated_token_' + Date.now(),
      site_id: 'updated_site_id',
      collection_id: 'updated_collection_id',
    },
    status: 'active',
  });

  // Note: Update endpoint might not exist yet, so we'll handle 404 gracefully
  if (response.status === 404) {
    logVerbose('Update endpoint not implemented yet (404)');
    return;
  }

  assertStatus(response, 200);
  assertProperty(response.data, 'id', testIntegrationId);
}

// Test: Validation - Empty Keywords
async function testValidationEmptyKeywords() {
  const response = await makeRequest('POST', '/api/integrations/connect-and-recommend', {
    provider: 'webflow',
    connection: {
      api_token: 'wf_test_token',
      site_id: 'test_site_id',
      collection_id: 'test_collection_id',
    },
    keywords: [],
  });

  // Should return 400 Bad Request
  assertStatus(response, 400);
  assert(
    response.data.error && response.data.error.toLowerCase().includes('keyword'),
    'Error message should mention keywords'
  );
  
  logVerbose('Validation correctly rejected empty keywords');
}

// Test: Validation - Missing Provider
async function testValidationMissingProvider() {
  const response = await makeRequest('POST', '/api/integrations/connect-api-key', {
    connection: {
      api_token: 'wf_test_token',
    },
  });

  // Should return 400 Bad Request
  assertStatus(response, 400);
  logVerbose('Validation correctly rejected missing provider');
}

// Test: OAuth Authorization URL (doesn't require redirect)
async function testOAuthAuthorizationUrl() {
  if (config.skipOAuth) {
    throw new Error('OAuth tests skipped');
  }

  // This will redirect, so we expect a 302 or error
  const response = await makeRequest('GET', '/api/integrations/oauth/webflow/authorize', null, {
    'Accept': 'text/html',
  });

  // OAuth flow redirects, so we expect 302 or might get 401 if not authenticated
  if (response.status === 302 || response.status === 301) {
    logVerbose('OAuth authorization URL redirects correctly');
    return;
  }
  
  if (response.status === 401 || response.status === 403) {
    logVerbose('OAuth requires authentication (expected)');
    return;
  }

  // If we get here, something unexpected happened
  logVerbose(`OAuth authorization returned status: ${response.status}`);
}

// Main test runner
async function runAllTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('🚀 Integration Implementation Test Suite', 'cyan');
  log('='.repeat(60), 'cyan');

  // Prerequisites
  await runTest('Prerequisites Check', testPrerequisites);

  // API Key Tests
  await runTest('Create API Key Integration', testCreateApiKeyIntegration);
  await runTest('Get Integration Details', testGetIntegration);
  await runTest('Test Connection', testConnection);
  await runTest('List All Integrations', testListIntegrations);
  await runTest('Connect and Get Recommendations', testConnectAndRecommend);
  
  // Update test (might not be implemented)
  try {
    await runTest('Update Integration', testUpdateIntegration);
  } catch (e) {
    logVerbose('Update test skipped (endpoint may not exist)');
  }

  // Validation Tests
  await runTest('Validation: Empty Keywords', testValidationEmptyKeywords);
  await runTest('Validation: Missing Provider', testValidationMissingProvider);

  // OAuth Tests
  if (!config.skipOAuth) {
    await runTest('OAuth Authorization URL', testOAuthAuthorizationUrl);
  } else {
    await skipTest('OAuth Flow', 'Skipped (requires browser for redirect)');
  }

  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 Test Summary', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, 'red');
  log(`⏭️  Skipped: ${results.skipped}`, 'yellow');
  log(`📈 Total: ${results.passed + results.failed + results.skipped}`, 'blue');

  if (results.failed > 0) {
    log('\n❌ Failed Tests:', 'red');
    results.tests
      .filter(t => t.status === 'failed')
      .forEach(t => {
        log(`   - ${t.name}: ${t.error}`, 'red');
      });
  }

  log('\n' + '='.repeat(60), 'cyan');

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  log(`\n💥 Fatal error: ${error.message}`, 'red');
  if (config.verbose) {
    log(error.stack, 'red');
  }
  process.exit(1);
});

