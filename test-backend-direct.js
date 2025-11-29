#!/usr/bin/env node

/**
 * Direct Backend API Test - Calls backend directly to check logs/errors
 * This bypasses the Next.js frontend route to test backend directly
 */

const https = require('https');

const BACKEND_URL = 'https://blog-writer-api-dev-kq42l26tuq-od.a.run.app';
const ENDPOINT = '/api/v1/blog/generate-enhanced';

function makeRequest(data) {
  return new Promise((resolve, reject) => {
    const url = new URL(ENDPOINT, BACKEND_URL);
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

    console.log(`\n🌐 Making request to: ${BACKEND_URL}${ENDPOINT}`);
    console.log(`📤 Request payload:`);
    console.log(JSON.stringify(data, null, 2));

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

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(JSON.stringify(data));
    req.end();
  });
}

async function testBackend() {
  console.log('========================================');
  console.log('Direct Backend API Test');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log('========================================');

  const testRequest = {
    topic: 'Introduction to Python Programming',
    keywords: ['python', 'programming'],
    blog_type: 'tutorial',
    tone: 'professional',
    length: 'short',
    word_count_target: 300,
    optimize_for_traffic: true,
    use_dataforseo_content_generation: true,
  };

  try {
    const startTime = Date.now();
    const response = await makeRequest(testRequest);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n📥 Response received (${duration}s)`);
    console.log(`Status: ${response.status}`);
    console.log(`\n📄 Full Response:`);
    console.log(JSON.stringify(response.body, null, 2));

    // Analyze response
    console.log(`\n🔍 Response Analysis:`);
    console.log(`  Status: ${response.status}`);
    console.log(`  Has Content: ${!!response.body.content}`);
    console.log(`  Content Length: ${response.body.content?.length || 0}`);
    console.log(`  Content Preview: ${response.body.content?.substring(0, 100) || '(empty)'}`);
    console.log(`  Total Tokens: ${response.body.total_tokens || 0}`);
    console.log(`  Generation Time: ${response.body.generation_time || 0}s`);
    console.log(`  Success: ${response.body.success}`);
    console.log(`  Warnings: ${JSON.stringify(response.body.warnings || [])}`);

    if (response.body.content && response.body.content.length > 0) {
      console.log(`\n✅ Content generated successfully!`);
      console.log(`   Word Count: ${response.body.content.split(/\s+/).length}`);
    } else {
      console.log(`\n❌ Content is empty - Backend issue detected`);
      console.log(`\n🔍 Possible Causes:`);
      console.log(`  1. DataForSEO API not configured`);
      console.log(`  2. Content generation logic skipped`);
      console.log(`  3. Error in backend processing`);
      console.log(`  4. Check backend logs for errors`);
    }

    // Check for error indicators
    if (response.body.error || response.body.error_message) {
      console.log(`\n⚠️  Error detected:`);
      console.log(`  ${response.body.error || response.body.error_message}`);
    }

    // Check response headers for clues
    console.log(`\n📋 Response Headers:`);
    Object.entries(response.headers).forEach(([key, value]) => {
      if (key.toLowerCase().includes('error') || key.toLowerCase().includes('warning')) {
        console.log(`  ${key}: ${value}`);
      }
    });

  } catch (error) {
    console.error(`\n❌ Request failed:`, error.message);
    console.error(`Stack:`, error.stack);
  }
}

testBackend().catch(console.error);

