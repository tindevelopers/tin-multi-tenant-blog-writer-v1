/**
 * Test script for Webflow Structure Scanning Endpoint
 * 
 * Usage:
 *   node test-webflow-scan-endpoint.js
 * 
 * This script tests the /api/integrations/webflow/scan-structure endpoint
 * by making direct HTTP requests to verify it's working correctly.
 */

const https = require('https');
const http = require('http');

// Configuration - Update these values
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_SITE_ID = process.env.WEBFLOW_SITE_ID || 'test-site-id';

// Colors for console output
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

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (body) {
      const bodyString = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    log(`\n${method} ${url.pathname}${url.search}`, 'cyan');
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function testEndpoint() {
  log('\n=== Testing Webflow Structure Scanning Endpoint ===', 'blue');
  log(`Base URL: ${BASE_URL}`, 'yellow');
  log(`Test Site ID: ${TEST_SITE_ID}\n`, 'yellow');

  try {
    // Test 1: GET endpoint (should return list of scans or require auth)
    log('Test 1: GET /api/integrations/webflow/scan-structure', 'cyan');
    try {
      const getResponse = await makeRequest('GET', '/api/integrations/webflow/scan-structure');
      log(`Status: ${getResponse.status}`, getResponse.status === 200 ? 'green' : 'yellow');
      log(`Response: ${JSON.stringify(getResponse.body, null, 2)}`, 'reset');
      
      if (getResponse.status === 401) {
        log('✓ Endpoint exists (requires authentication)', 'green');
      } else if (getResponse.status === 200) {
        log('✓ Endpoint is accessible', 'green');
      }
    } catch (error) {
      log(`✗ GET request failed: ${error.message}`, 'red');
    }

    // Test 2: POST endpoint (should require auth and site_id)
    log('\nTest 2: POST /api/integrations/webflow/scan-structure', 'cyan');
    try {
      const postResponse = await makeRequest('POST', '/api/integrations/webflow/scan-structure', {
        site_id: TEST_SITE_ID,
      });
      log(`Status: ${postResponse.status}`, postResponse.status < 400 ? 'green' : 'red');
      log(`Response: ${JSON.stringify(postResponse.body, null, 2)}`, 'reset');
      
      if (postResponse.status === 401) {
        log('✓ Endpoint exists (requires authentication)', 'green');
      } else if (postResponse.status === 400 && postResponse.body.error) {
        log(`✓ Endpoint exists: ${postResponse.body.error}`, 'yellow');
      } else if (postResponse.status === 200 || postResponse.status === 201) {
        log('✓ Scan started successfully', 'green');
      }
    } catch (error) {
      log(`✗ POST request failed: ${error.message}`, 'red');
    }

    // Test 3: POST with query parameter
    log('\nTest 3: POST /api/integrations/webflow/scan-structure?site_id=...', 'cyan');
    try {
      const postQueryResponse = await makeRequest(
        'POST',
        `/api/integrations/webflow/scan-structure?site_id=${TEST_SITE_ID}`
      );
      log(`Status: ${postQueryResponse.status}`, postQueryResponse.status < 400 ? 'green' : 'red');
      log(`Response: ${JSON.stringify(postQueryResponse.body, null, 2)}`, 'reset');
    } catch (error) {
      log(`✗ POST with query failed: ${error.message}`, 'red');
    }

    log('\n=== Test Summary ===', 'blue');
    log('Note: 401 Unauthorized responses indicate the endpoint exists but requires authentication.', 'yellow');
    log('Note: 400 Bad Request responses with error messages indicate the endpoint is working.', 'yellow');
    log('Note: To test with authentication, you need to provide a valid session cookie or token.', 'yellow');
    
  } catch (error) {
    log(`\n✗ Test suite failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testEndpoint().catch((error) => {
  log(`\n✗ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

