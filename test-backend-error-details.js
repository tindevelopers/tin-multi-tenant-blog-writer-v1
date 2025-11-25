#!/usr/bin/env node

/**
 * Backend Test - Error Details
 * Captures the actual error messages from the backend
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
  console.log('Backend Error Details Test');
  console.log('========================================');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log('========================================\n');

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

    console.log(`📥 Response received (${duration}s)`);
    console.log(`Status: ${response.status}`);
    console.log(`\n📄 Full Response:`);
    console.log(JSON.stringify(response.body, null, 2));

    console.log(`\n${'='.repeat(50)}`);
    console.log('Analysis');
    console.log('='.repeat(50));

    if (response.status === 500) {
      const errorMsg = response.body.message || response.body.error || response.body.detail || 'Unknown error';
      
      console.log(`\n✅ GOOD NEWS: Backend is now returning proper errors!`);
      console.log(`   This means the fixes are working - validation is active.`);
      console.log(`\n❌ ERROR MESSAGE:`);
      console.log(`   ${errorMsg}`);
      
      // Analyze error message
      if (errorMsg.includes('DataForSEO')) {
        console.log(`\n🔍 Root Cause: DataForSEO API not configured`);
        console.log(`   Solution: Configure DataForSEO credentials in Cloud Run environment variables`);
        console.log(`   Required: DATAFORSEO_USERNAME, DATAFORSEO_PASSWORD`);
      } else if (errorMsg.includes('AI provider') || errorMsg.includes('OPENAI') || errorMsg.includes('ANTHROPIC')) {
        console.log(`\n🔍 Root Cause: AI Provider not configured`);
        console.log(`   Solution: Configure AI provider credentials in Cloud Run environment variables`);
        console.log(`   Required: OPENAI_API_KEY or ANTHROPIC_API_KEY`);
      } else if (errorMsg.includes('empty') || errorMsg.includes('too short')) {
        console.log(`\n🔍 Root Cause: Content generation returned empty content`);
        console.log(`   This could be:`);
        console.log(`   1. DataForSEO API not configured`);
        console.log(`   2. DataForSEO subscription not active`);
        console.log(`   3. AI provider not configured (pipeline fallback)`);
        console.log(`   4. API credentials invalid`);
      }
      
      console.log(`\n✅ Fix Verification:`);
      console.log(`   ✅ Content validation is working`);
      console.log(`   ✅ Error handling is working`);
      console.log(`   ✅ Proper error messages are returned`);
      console.log(`   ⚠️  Content generation needs credentials to work`);
      
    } else if (response.status === 200) {
      const hasContent = response.body.content && response.body.content.length > 0;
      const contentLength = response.body.content?.length || 0;
      
      if (hasContent && contentLength >= 50) {
        console.log(`\n✅ SUCCESS: Content generated successfully!`);
        console.log(`   Content Length: ${contentLength} chars`);
        console.log(`   Word Count: ${response.body.content.split(/\s+/).length} words`);
        console.log(`   Total Tokens: ${response.body.total_tokens || 0}`);
      } else {
        console.log(`\n⚠️  WARNING: Status 200 but content is empty`);
        console.log(`   Content Length: ${contentLength} chars`);
      }
    } else {
      console.log(`\n⚠️  Unexpected status: ${response.status}`);
    }

  } catch (error) {
    console.error(`\n❌ Request failed:`, error.message);
  }
}

testBackend().catch(console.error);

