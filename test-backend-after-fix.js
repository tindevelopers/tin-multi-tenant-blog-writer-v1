#!/usr/bin/env node

/**
 * Backend Test After Fix v1.3.6
 * Tests the backend with the fixes applied:
 * - Content validation (minimum 50 characters)
 * - Enhanced error handling
 * - Pipeline fallback
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
  console.log('Backend Test After Fix v1.3.6');
  console.log('========================================');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`\nExpected Fixes:`);
  console.log(`  ✅ Content validation (min 50 chars)`);
  console.log(`  ✅ Enhanced error handling`);
  console.log(`  ✅ Pipeline fallback`);
  console.log(`  ✅ Comprehensive logging`);
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
      expected: {
        hasContent: true,
        minLength: 50,
        hasTokens: true,
        generationTime: 1.0, // Should be > 1s for actual generation
      }
    },
    {
      name: 'Test 2: Tutorial WITHOUT DataForSEO (Pipeline Fallback)',
      request: {
        topic: 'Introduction to Python Programming',
        keywords: ['python', 'programming'],
        blog_type: 'tutorial',
        tone: 'professional',
        length: 'short',
        word_count_target: 300,
        optimize_for_traffic: true,
        use_dataforseo_content_generation: false,
      },
      expected: {
        hasContent: true,
        minLength: 50,
        hasTokens: true,
        generationTime: 1.0,
      }
    },
    {
      name: 'Test 3: FAQ Type',
      request: {
        topic: 'Frequently Asked Questions About SEO',
        keywords: ['seo', 'search engine optimization'],
        blog_type: 'faq',
        tone: 'professional',
        length: 'medium',
        use_dataforseo_content_generation: true,
      },
      expected: {
        hasContent: true,
        minLength: 50,
        hasTokens: true,
      }
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
      
      // Check for errors (should now return proper error messages)
      if (response.body.error || response.body.detail) {
        const errorMsg = response.body.error || response.body.detail || '';
        console.log(`  ⚠️  Error: ${errorMsg}`);
        
        if (errorMsg.includes('empty') || errorMsg.includes('too short')) {
          console.log(`  ✅ Good: Backend is now validating content and returning errors`);
        }
      }
      
      // Check stage_results
      if (response.body.stage_results && response.body.stage_results.length > 0) {
        console.log(`  ✅ Stage Results: ${response.body.stage_results.length} stages`);
        response.body.stage_results.forEach((stage, idx) => {
          console.log(`     ${idx + 1}. ${stage.stage || 'unknown'} (${stage.provider || 'unknown'}): ${stage.tokens || 0} tokens`);
        });
      } else {
        console.log(`  ⚠️  No stage_results`);
      }
      
      // Validate against expected results
      const checks = {
        hasContent: hasContent && contentLength >= test.expected.minLength,
        hasTokens: totalTokens > 0,
        reasonableTime: generationTime >= test.expected.generationTime,
        noError: !response.body.error && !response.body.detail,
      };
      
      const allPassed = Object.values(checks).every(v => v);
      
      console.log(`\n🔍 Validation:`);
      console.log(`  Content exists (≥${test.expected.minLength} chars): ${checks.hasContent ? '✅' : '❌'}`);
      console.log(`  Has tokens: ${checks.hasTokens ? '✅' : '❌'}`);
      console.log(`  Reasonable generation time: ${checks.reasonableTime ? '✅' : '❌'}`);
      console.log(`  No errors: ${checks.noError ? '✅' : '⚠️'}`);
      
      if (hasContent && contentLength >= test.expected.minLength) {
        console.log(`\n✅ PASSED - Content generated successfully`);
        console.log(`   Content Preview: ${response.body.content.substring(0, 200)}...`);
        passed++;
      } else if (response.body.error || response.body.detail) {
        console.log(`\n⚠️  FAILED - But backend returned proper error (this is expected if credentials missing)`);
        console.log(`   Error: ${response.body.error || response.body.detail}`);
        failed++;
      } else {
        console.log(`\n❌ FAILED - Content still empty`);
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
        error: response.body.error || response.body.detail || null,
        checks,
        allPassed,
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
  const stillEmpty = results.filter(r => !r.hasContent && !r.error);
  
  console.log(`\n✅ Tests with content: ${withContent.length}/${results.length}`);
  withContent.forEach(r => {
    console.log(`   ${r.test}: ${r.contentLength} chars, ${r.totalTokens} tokens`);
  });
  
  if (withErrors.length > 0) {
    console.log(`\n⚠️  Tests with errors (expected if credentials missing): ${withErrors.length}/${results.length}`);
    withErrors.forEach(r => {
      console.log(`   ${r.test}: ${r.error}`);
    });
  }
  
  if (stillEmpty.length > 0) {
    console.log(`\n❌ Tests still returning empty content: ${stillEmpty.length}/${results.length}`);
    stillEmpty.forEach(r => {
      console.log(`   ${r.test}: Empty content, no error`);
    });
  }
  
  // Conclusion
  console.log(`\n${'='.repeat(60)}`);
  console.log('Conclusion');
  console.log('='.repeat(60));
  
  if (withContent.length > 0) {
    console.log(`✅ SUCCESS: Backend is generating content!`);
    console.log(`   ${withContent.length} out of ${results.length} tests generated content`);
  } else if (withErrors.length > 0) {
    console.log(`⚠️  PARTIAL: Backend is validating and returning errors (credentials may be missing)`);
    console.log(`   This is expected behavior with the fixes - backend should return errors instead of empty content`);
  } else {
    console.log(`❌ ISSUE: Backend still returning empty content without errors`);
    console.log(`   Fixes may not be deployed yet, or there's still an issue`);
  }
  
  return { passed, failed, results };
}

runTests().catch(console.error);

