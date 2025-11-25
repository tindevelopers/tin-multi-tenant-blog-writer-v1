#!/usr/bin/env node

/**
 * Test 300 Word Blog Generation
 * Tests the dev endpoint with a specific 300-word blog request
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
      timeout: 300000, // 5 minutes
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

async function test300WordBlog() {
  console.log('========================================');
  console.log('300 Word Blog Generation Test');
  console.log('========================================');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Target Word Count: 300 words`);
  console.log('========================================\n');

  const request = {
    topic: 'Introduction to Python Programming',
    keywords: ['python', 'programming', 'coding'],
    blog_type: 'tutorial',
    tone: 'professional',
    length: 'short',
    word_count_target: 300,
    optimize_for_traffic: true,
    use_dataforseo_content_generation: true,
  };

  console.log('📤 Request:');
  console.log(JSON.stringify(request, null, 2));
  console.log('\n⏳ Sending request...\n');

  const startTime = Date.now();

  try {
    const response = await makeRequest(request);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('========================================');
    console.log('Response');
    console.log('========================================');
    console.log(`Status: ${response.status}`);
    console.log(`Response Time: ${duration}s`);
    console.log(`\n📄 Full Response:`);
    console.log(JSON.stringify(response.body, null, 2));

    console.log('\n========================================');
    console.log('Analysis');
    console.log('========================================');

    const hasContent = response.body.content && response.body.content.length > 0;
    const contentLength = response.body.content?.length || 0;
    const wordCount = response.body.content ? response.body.content.split(/\s+/).length : 0;
    const totalTokens = response.body.total_tokens || 0;
    const generationTime = response.body.generation_time || 0;

    console.log(`\n📊 Content Metrics:`);
    console.log(`  Title: ${response.body.title || 'N/A'}`);
    console.log(`  Content Length: ${contentLength} characters`);
    console.log(`  Word Count: ${wordCount} words`);
    console.log(`  Target Word Count: 300 words`);
    console.log(`  Difference: ${wordCount - 300} words`);
    console.log(`  Within Tolerance (±25%): ${wordCount >= 225 && wordCount <= 375 ? '✅ Yes' : '❌ No'}`);

    console.log(`\n🔧 Generation Metrics:`);
    console.log(`  Total Tokens: ${totalTokens}`);
    console.log(`  Generation Time: ${generationTime.toFixed(2)}s`);
    console.log(`  Total Cost: $${response.body.total_cost || 0}`);
    console.log(`  Success: ${response.body.success || false}`);

    console.log(`\n📈 SEO Metrics:`);
    console.log(`  SEO Score: ${response.body.seo_score || 'N/A'}`);
    console.log(`  Readability Score: ${response.body.readability_score || 'N/A'}`);
    console.log(`  Quality Score: ${response.body.quality_score || 'N/A'}`);

    if (response.body.seo_metadata) {
      console.log(`\n🔍 SEO Metadata:`);
      if (response.body.seo_metadata.word_count_range) {
        const wc = response.body.seo_metadata.word_count_range;
        console.log(`  Word Count Range: ${wc.actual} (target: ${wc.min}-${wc.max})`);
      }
      if (response.body.seo_metadata.keyword_density) {
        console.log(`  Keyword Density:`);
        Object.entries(response.body.seo_metadata.keyword_density).forEach(([keyword, data]) => {
          console.log(`    ${keyword}: ${data.count} occurrences (${data.density.toFixed(2)}%)`);
        });
      }
      if (response.body.seo_metadata.headings_count) {
        console.log(`  Headings Count: ${response.body.seo_metadata.headings_count}`);
      }
    }

    if (response.body.stage_results && response.body.stage_results.length > 0) {
      console.log(`\n🔄 Generation Stages:`);
      response.body.stage_results.forEach((stage, idx) => {
        console.log(`  ${idx + 1}. ${stage.stage || 'unknown'}`);
        console.log(`     Provider: ${stage.provider || 'unknown'}`);
        console.log(`     Tokens: ${stage.tokens || 0}`);
        console.log(`     Cost: $${stage.cost || 0}`);
      });
    }

    if (response.body.warnings && response.body.warnings.length > 0) {
      console.log(`\n⚠️  Warnings:`);
      response.body.warnings.forEach((warning, idx) => {
        console.log(`  ${idx + 1}. ${warning}`);
      });
    }

    if (response.body.error || response.body.detail || response.body.message) {
      const errorMsg = response.body.error || response.body.detail || response.body.message;
      console.log(`\n❌ Error:`);
      console.log(`  ${errorMsg}`);
    }

    console.log('\n========================================');
    console.log('Validation');
    console.log('========================================');

    const checks = {
      status200: response.status === 200,
      hasContent: hasContent && contentLength >= 50,
      wordCountValid: wordCount >= 225 && wordCount <= 375, // ±25% tolerance
      hasTokens: totalTokens > 0,
      reasonableTime: generationTime >= 0.5,
      noError: !response.body.error && !response.body.detail && !response.body.message,
    };

    console.log(`  HTTP 200: ${checks.status200 ? '✅' : '❌'}`);
    console.log(`  Content exists (≥50 chars): ${checks.hasContent ? '✅' : '❌'}`);
    console.log(`  Word count in range (225-375): ${checks.wordCountValid ? '✅' : '❌'}`);
    console.log(`  Has tokens: ${checks.hasTokens ? '✅' : '❌'}`);
    console.log(`  Reasonable generation time: ${checks.reasonableTime ? '✅' : '❌'}`);
    console.log(`  No errors: ${checks.noError ? '✅' : '⚠️'}`);

    const allPassed = Object.values(checks).every(v => v);

    console.log('\n========================================');
    console.log('Result');
    console.log('========================================');

    if (allPassed) {
      console.log('\n🎉 SUCCESS: 300-word blog generated successfully!');
      console.log(`\n📝 Content Preview (first 500 chars):`);
      console.log(response.body.content.substring(0, 500) + '...');
    } else if (checks.status200 && checks.hasContent) {
      console.log('\n✅ PARTIAL SUCCESS: Content generated but some checks failed');
      console.log(`\n📝 Content Preview (first 500 chars):`);
      console.log(response.body.content.substring(0, 500) + '...');
    } else if (response.status === 500) {
      console.log('\n❌ FAILED: Backend error');
      console.log('   Service may need redeployment to load credentials');
    } else {
      console.log('\n⚠️  ISSUE: Check validation results above');
    }

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`\n❌ Request failed (${duration}s):`);
    console.error(`  ${error.message}`);
    if (error.stack) {
      console.error(`\nStack trace:`);
      console.error(error.stack);
    }
  }
}

test300WordBlog().catch(console.error);

