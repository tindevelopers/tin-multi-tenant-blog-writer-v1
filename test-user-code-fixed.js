#!/usr/bin/env node

/**
 * Test with typo fixed - blog_type should not be set to params.keywords
 */

const API_BASE_URL = 'https://blog-writer-api-dev-kq42l26tuq-od.a.run.app';

async function generateBlogEnhanced(params) {
  const response = await fetch(`${API_BASE_URL}/api/v1/blog/generate-enhanced`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: params.topic,
      keywords: params.keywords,
      // FIXED: Removed duplicate blog_type: params.keywords
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
  console.log('Testing with Typo Fixed');
  console.log(`Base URL: ${API_BASE_URL}`);
  console.log('========================================\n');

  const test = {
    name: 'Tutorial Type Test',
    params: {
      topic: 'Introduction to Python Programming',
      keywords: ['python', 'programming'],
      blog_type: 'tutorial',
      tone: 'professional',
      length: 'short',
      word_count_target: 300,
    }
  };

  console.log(`${test.name}`);
  console.log(`Request: ${JSON.stringify(test.params, null, 2)}`);
  
  const startTime = Date.now();
  
  try {
    const result = await generateBlogEnhanced(test.params);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✓ Response received (${duration}s)`);
    console.log(`\nFull Response:`);
    console.log(JSON.stringify(result, null, 2));
    
    const hasContent = result.content && result.content.length > 0;
    const wordCount = result.content ? result.content.split(/\s+/).length : 0;
    
    console.log(`\n---`);
    console.log(`Summary:`);
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
      console.log(`\n  ✓ Content Generated Successfully!`);
      console.log(`  Content Preview (first 300 chars):`);
      console.log(`  ${result.content.substring(0, 300)}...`);
    } else {
      console.log(`\n  ⚠️  Content is empty - backend may need investigation`);
    }
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✗ FAILED (${duration}s)`);
    console.log(`  Error: ${error.message}`);
    console.log(`  Stack: ${error.stack}`);
  }
}

runTests().catch(console.error);

