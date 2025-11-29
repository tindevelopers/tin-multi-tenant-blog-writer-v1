#!/usr/bin/env node

/**
 * Test the exact code structure provided by user
 */

const API_BASE_URL = 'https://blog-writer-api-dev-kq42l26tuq-od.a.run.app';

async function generateBlogEnhanced(params) {
  const response = await fetch(`${API_BASE_URL}/api/v1/blog/generate-enhanced`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: params.topic,
      keywords: params.keywords,
      blog_type: params.keywords,  // NOTE: This looks like a typo - should be params.blog_type
      blog_type: params.blog_type || 'custom',
      tone: params.tone || 'professional',
      length: params.length || 'medium',
      word_count_target: params.word_count_target,
      use_dataforseo_content_generation: true,  // Always use DataForSEO
      optimize_for_traffic: true,  // Enable SEO optimization
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return await response.json();
}

async function runTests() {
  console.log('========================================');
  console.log('Testing User-Provided Code');
  console.log(`Base URL: ${API_BASE_URL}`);
  console.log('========================================\n');

  const tests = [
    {
      name: 'Test 1: Tutorial Type',
      params: {
        topic: 'Introduction to Python Programming',
        keywords: ['python', 'programming'],
        blog_type: 'tutorial',
        tone: 'professional',
        length: 'short',
        word_count_target: 300,
      }
    },
    {
      name: 'Test 2: FAQ Type',
      params: {
        topic: 'Frequently Asked Questions About SEO',
        keywords: ['seo', 'search engine optimization'],
        blog_type: 'faq',
        tone: 'professional',
        length: 'medium',
      }
    },
    {
      name: 'Test 3: Tips Type',
      params: {
        topic: '10 Tips for Better Blog Writing',
        keywords: ['blog writing', 'content creation'],
        blog_type: 'tips',
        tone: 'friendly',
        length: 'short',
        word_count_target: 500,
      }
    },
    {
      name: 'Test 4: Minimal Request',
      params: {
        topic: 'Python Basics',
        keywords: ['python'],
      }
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n${test.name}`);
    console.log(`Request: ${JSON.stringify(test.params, null, 2)}`);
    
    const startTime = Date.now();
    
    try {
      const result = await generateBlogEnhanced(test.params);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      const hasContent = result.content && result.content.length > 0;
      const wordCount = result.content ? result.content.split(/\s+/).length : 0;
      
      console.log(`✓ SUCCESS (${duration}s)`);
      console.log(`  Title: ${result.title}`);
      console.log(`  Content Length: ${result.content?.length || 0} chars`);
      console.log(`  Word Count: ${wordCount} words`);
      console.log(`  SEO Score: ${result.seo_score || 'N/A'}`);
      console.log(`  Success: ${result.success}`);
      
      if (result.warnings && result.warnings.length > 0) {
        console.log(`  Warnings: ${JSON.stringify(result.warnings)}`);
      }
      
      if (result.seo_metadata?.word_count_range) {
        const wc = result.seo_metadata.word_count_range;
        console.log(`  Word Count Range: ${wc.actual} (target: ${wc.min}-${wc.max})`);
      }
      
      if (hasContent && wordCount > 0) {
        console.log(`  Content Preview: ${result.content.substring(0, 150)}...`);
        passed++;
      } else {
        console.log(`  ⚠️  WARNING: Content is empty!`);
        failed++;
      }
      
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✗ FAILED (${duration}s)`);
      console.log(`  Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================');
  console.log(`Total Tests: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed');
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);

