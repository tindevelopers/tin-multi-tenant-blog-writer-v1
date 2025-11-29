#!/usr/bin/env node

/**
 * Backend Test After Credentials Added
 * Comprehensive test to verify content generation is working
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

async function runTests() {
  console.log('========================================');
  console.log('Backend Test - After Credentials Added');
  console.log('========================================');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`\nTesting with credentials from Google Secret Manager`);
  console.log('========================================\n');

  const tests = [
    {
      name: 'Test 1: Tutorial with DataForSEO',
      request: {
        topic: 'Introduction to Python Programming',
        keywords: ['python', 'programming'],
        blog_type: 'tutorial',
        tone: 'professional',
        length: 'short',
        word_count_target: 300,
        optimize_for_traffic: true,
        use_dataforseo_content_generation: true,
      },
    },
    {
      name: 'Test 2: FAQ Type',
      request: {
        topic: 'Frequently Asked Questions About SEO',
        keywords: ['seo', 'search engine optimization'],
        blog_type: 'faq',
        tone: 'professional',
        length: 'medium',
        use_dataforseo_content_generation: true,
      },
    },
    {
      name: 'Test 3: Tips Type',
      request: {
        topic: '10 Tips for Better Blog Writing',
        keywords: ['blog writing', 'content creation'],
        blog_type: 'tips',
        tone: 'friendly',
        length: 'short',
        word_count_target: 500,
        use_dataforseo_content_generation: true,
      },
    },
  ];

  let passed = 0;
  let failed = 0;
  const results = [];

  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(test.name);
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    
    try {
      const response = await makeRequest(test.request);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      const hasContent = response.body.content && response.body.content.length > 0;
      const contentLength = response.body.content?.length || 0;
      const wordCount = response.body.content ? response.body.content.split(/\s+/).length : 0;
      const totalTokens = response.body.total_tokens || 0;
      const generationTime = response.body.generation_time || 0;
      
      console.log(`\n📥 Response (${duration}s):`);
      console.log(`  Status: ${response.status}`);
      console.log(`  Title: ${response.body.title || 'N/A'}`);
      console.log(`  Content Length: ${contentLength} chars`);
      console.log(`  Word Count: ${wordCount} words`);
      console.log(`  Total Tokens: ${totalTokens}`);
      console.log(`  Generation Time: ${generationTime.toFixed(2)}s`);
      console.log(`  Success: ${response.body.success}`);
      console.log(`  SEO Score: ${response.body.seo_score || 'N/A'}`);
      
      // Check for errors
      if (response.body.error || response.body.detail || response.body.message) {
        const errorMsg = response.body.error || response.body.detail || response.body.message;
        console.log(`  ⚠️  Error: ${errorMsg}`);
      }
      
      // Check stage_results
      if (response.body.stage_results && response.body.stage_results.length > 0) {
        console.log(`  ✅ Stage Results: ${response.body.stage_results.length} stages`);
        response.body.stage_results.forEach((stage, idx) => {
          console.log(`     ${idx + 1}. ${stage.stage || 'unknown'} (${stage.provider || 'unknown'}): ${stage.tokens || 0} tokens`);
        });
      }
      
      // Validate results
      const checks = {
        status200: response.status === 200,
        hasContent: hasContent && contentLength >= 50,
        hasTokens: totalTokens > 0,
        reasonableTime: generationTime >= 0.5, // At least 0.5s for generation
        noError: !response.body.error && !response.body.detail && !response.body.message,
      };
      
      console.log(`\n🔍 Validation:`);
      console.log(`  HTTP 200: ${checks.status200 ? '✅' : '❌'}`);
      console.log(`  Content exists (≥50 chars): ${checks.hasContent ? '✅' : '❌'}`);
      console.log(`  Has tokens: ${checks.hasTokens ? '✅' : '❌'}`);
      console.log(`  Reasonable generation time: ${checks.reasonableTime ? '✅' : '❌'}`);
      console.log(`  No errors: ${checks.noError ? '✅' : '⚠️'}`);
      
      if (checks.status200 && checks.hasContent && checks.hasTokens) {
        console.log(`\n✅ PASSED - Content generated successfully!`);
        console.log(`   Content Preview: ${response.body.content.substring(0, 200)}...`);
        passed++;
      } else if (response.status === 500) {
        console.log(`\n❌ FAILED - Backend error`);
        failed++;
      } else {
        console.log(`\n⚠️  PARTIAL - Some checks failed`);
        failed++;
      }
      
      results.push({
        test: test.name,
        status: response.status,
        hasContent,
        contentLength,
        wordCount,
        totalTokens,
        generationTime,
        success: response.body.success,
        error: response.body.error || response.body.detail || response.body.message || null,
        checks,
      });
      
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n❌ ERROR (${duration}s):`);
      console.log(`  ${error.message}`);
      failed++;
      results.push({
        test: test.name,
        error: error.message,
        status: 'error',
      });
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  // Analysis
  console.log(`\n${'='.repeat(60)}`);
  console.log('Analysis');
  console.log('='.repeat(60));
  
  const withContent = results.filter(r => r.hasContent && r.contentLength >= 50);
  const withErrors = results.filter(r => r.error);
  const status200 = results.filter(r => r.status === 200);
  const status500 = results.filter(r => r.status === 500);
  
  console.log(`\n✅ Tests with content: ${withContent.length}/${results.length}`);
  withContent.forEach(r => {
    console.log(`   ${r.test}: ${r.contentLength} chars, ${r.wordCount} words, ${r.totalTokens} tokens`);
  });
  
  console.log(`\n📊 Status Codes:`);
  console.log(`   HTTP 200: ${status200.length}/${results.length}`);
  console.log(`   HTTP 500: ${status500.length}/${results.length}`);
  
  if (withErrors.length > 0) {
    console.log(`\n⚠️  Tests with errors: ${withErrors.length}/${results.length}`);
    withErrors.forEach(r => {
      console.log(`   ${r.test}: ${r.error}`);
    });
  }
  
  // Conclusion
  console.log(`\n${'='.repeat(60)}`);
  console.log('Conclusion');
  console.log('='.repeat(60));
  
  if (withContent.length === results.length && status200.length === results.length) {
    console.log(`\n🎉 SUCCESS: All tests passed! Content generation is working!`);
    console.log(`   ✅ Credentials are configured correctly`);
    console.log(`   ✅ DataForSEO API is working`);
    console.log(`   ✅ Content is being generated`);
  } else if (withContent.length > 0) {
    console.log(`\n✅ PARTIAL SUCCESS: Some tests generated content`);
    console.log(`   ${withContent.length} out of ${results.length} tests generated content`);
    if (status500.length > 0) {
      console.log(`   ⚠️  ${status500.length} tests returned HTTP 500 - check errors above`);
    }
  } else if (status500.length > 0) {
    console.log(`\n❌ ISSUE: All tests returned HTTP 500`);
    console.log(`   Possible causes:`);
    console.log(`   1. Credentials not loaded correctly`);
    console.log(`   2. Service needs to be redeployed`);
    console.log(`   3. Secret Manager secrets not accessible`);
    console.log(`   4. Check Cloud Run logs for specific errors`);
  } else {
    console.log(`\n⚠️  MIXED RESULTS: Check individual test results above`);
  }
  
  return { passed, failed, results };
}

runTests().catch(console.error);

