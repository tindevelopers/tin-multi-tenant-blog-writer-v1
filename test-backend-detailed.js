#!/usr/bin/env node

/**
 * Detailed Backend API Test - Multiple test cases with detailed analysis
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
  console.log('Detailed Backend API Tests');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Endpoint: ${ENDPOINT}`);
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
      }
    },
    {
      name: 'Test 2: Tutorial WITHOUT DataForSEO',
      request: {
        topic: 'Introduction to Python Programming',
        keywords: ['python', 'programming'],
        blog_type: 'tutorial',
        tone: 'professional',
        length: 'short',
        word_count_target: 300,
        optimize_for_traffic: true,
        use_dataforseo_content_generation: false,  // Disable DataForSEO
      }
    },
    {
      name: 'Test 3: Minimal Request',
      request: {
        topic: 'Python Basics',
        keywords: ['python'],
      }
    },
    {
      name: 'Test 4: FAQ Type',
      request: {
        topic: 'Frequently Asked Questions About SEO',
        keywords: ['seo', 'search engine optimization'],
        blog_type: 'faq',
        tone: 'professional',
        length: 'medium',
        use_dataforseo_content_generation: true,
      }
    },
    {
      name: 'Test 5: Tips Type',
      request: {
        topic: '10 Tips for Better Blog Writing',
        keywords: ['blog writing', 'content creation'],
        blog_type: 'tips',
        tone: 'friendly',
        length: 'short',
        word_count_target: 500,
        use_dataforseo_content_generation: true,
      }
    },
  ];

  let passed = 0;
  let failed = 0;
  const results = [];

  for (const test of tests) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(test.name);
    console.log('='.repeat(50));
    console.log(`Request: ${JSON.stringify(test.request, null, 2)}`);
    
    const startTime = Date.now();
    
    try {
      const response = await makeRequest(test.request);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      const hasContent = response.body.content && response.body.content.length > 0;
      const wordCount = response.body.content ? response.body.content.split(/\s+/).length : 0;
      
      console.log(`\n📥 Response (${duration}s):`);
      console.log(`  Status: ${response.status}`);
      console.log(`  Title: ${response.body.title || 'N/A'}`);
      console.log(`  Content Length: ${response.body.content?.length || 0} chars`);
      console.log(`  Word Count: ${wordCount} words`);
      console.log(`  Total Tokens: ${response.body.total_tokens || 0}`);
      console.log(`  Generation Time: ${response.body.generation_time?.toFixed(2) || 0}s`);
      console.log(`  Success: ${response.body.success}`);
      console.log(`  SEO Score: ${response.body.seo_score || 'N/A'}`);
      
      if (response.body.warnings && response.body.warnings.length > 0) {
        console.log(`  Warnings: ${JSON.stringify(response.body.warnings)}`);
      }
      
      if (response.body.error || response.body.error_message) {
        console.log(`  ❌ Error: ${response.body.error || response.body.error_message}`);
      }
      
      // Check stage_results for clues
      if (response.body.stage_results && response.body.stage_results.length > 0) {
        console.log(`  Stage Results:`);
        response.body.stage_results.forEach((stage, idx) => {
          console.log(`    ${idx + 1}. ${stage.stage || 'unknown'} (${stage.provider || 'unknown'}): ${stage.tokens || 0} tokens`);
        });
      } else {
        console.log(`  ⚠️  No stage_results - content generation may not have run`);
      }
      
      // Check progress_updates
      if (response.body.progress_updates && response.body.progress_updates.length > 0) {
        console.log(`  Progress Updates: ${response.body.progress_updates.length}`);
        response.body.progress_updates.forEach((update, idx) => {
          console.log(`    ${idx + 1}. ${update.stage || 'unknown'}: ${update.status || 'N/A'}`);
        });
      }
      
      const result = {
        test: test.name,
        status: response.status,
        hasContent,
        wordCount,
        totalTokens: response.body.total_tokens || 0,
        generationTime: response.body.generation_time || 0,
        success: response.body.success,
        warnings: response.body.warnings || [],
        stageResults: response.body.stage_results || [],
        error: response.body.error || response.body.error_message || null,
      };
      
      results.push(result);
      
      if (hasContent && wordCount > 0) {
        console.log(`\n✅ PASSED - Content generated successfully`);
        console.log(`   Content Preview: ${response.body.content.substring(0, 150)}...`);
        passed++;
      } else {
        console.log(`\n❌ FAILED - Content is empty`);
        failed++;
      }
      
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
  console.log(`\n${'='.repeat(50)}`);
  console.log('Test Summary');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  // Analysis
  console.log(`\n${'='.repeat(50)}`);
  console.log('Analysis');
  console.log('='.repeat(50));
  
  const withDataForSEO = results.filter(r => r.test.includes('DataForSEO'));
  const withoutDataForSEO = results.filter(r => r.test.includes('WITHOUT'));
  
  console.log(`\nTests with DataForSEO enabled:`);
  withDataForSEO.forEach(r => {
    console.log(`  ${r.test}: ${r.hasContent ? '✅ Has content' : '❌ Empty'} (${r.totalTokens} tokens)`);
  });
  
  console.log(`\nTests with DataForSEO disabled:`);
  withoutDataForSEO.forEach(r => {
    console.log(`  ${r.test}: ${r.hasContent ? '✅ Has content' : '❌ Empty'} (${r.totalTokens} tokens)`);
  });
  
  // Check for patterns
  const allEmpty = results.every(r => !r.hasContent);
  const allHaveTokens = results.every(r => r.totalTokens > 0);
  const allFast = results.every(r => r.generationTime < 1);
  
  console.log(`\nPatterns:`);
  console.log(`  All tests return empty content: ${allEmpty ? '❌ YES' : '✅ NO'}`);
  console.log(`  All tests have tokens: ${allHaveTokens ? '✅ YES' : '❌ NO'}`);
  console.log(`  All tests complete quickly (<1s): ${allFast ? '⚠️  YES (suspicious)' : '✅ NO'}`);
  
  if (allEmpty && allFast) {
    console.log(`\n🔍 Conclusion: Content generation is being skipped entirely`);
    console.log(`   Possible causes:`);
    console.log(`   1. DataForSEO API not configured`);
    console.log(`   2. Content generation logic disabled`);
    console.log(`   3. Error handling swallowing exceptions`);
    console.log(`   4. Backend code issue - check logs`);
  }
  
  return { passed, failed, results };
}

runTests().catch(console.error);

