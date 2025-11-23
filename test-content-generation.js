/**
 * Test content generation from DataForSEO keywords
 * Tests the /api/blog-writer/generate endpoint with keywords
 */

const fetch = require('node-fetch');

async function testContentGeneration() {
  console.log('🧪 Testing Content Generation from Keywords\n');
  
  // Test with sample keywords from DataForSEO research
  const testKeywords = [
    'dog groomers',
    'pet grooming services',
    'dog grooming near me',
    'professional dog grooming',
    'mobile dog grooming'
  ];
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const endpoint = `${baseUrl}/api/blog-writer/generate`;
  
  console.log(`Endpoint: ${endpoint}\n`);
  console.log(`Keywords: ${testKeywords.join(', ')}\n`);
  
  const requestBody = {
    topic: 'Professional Dog Grooming Services: A Complete Guide',
    keywords: testKeywords,
    target_audience: 'pet owners',
    tone: 'professional',
    word_count: 1000,
    quality_level: 'standard',
    use_semantic_keywords: true,
  };
  
  console.log('Request Body:');
  console.log(JSON.stringify(requestBody, null, 2));
  console.log('\n---\n');
  
  try {
    console.log('Sending request...\n');
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('\n❌ Error response:');
      console.error(errorText.substring(0, 1000));
      return;
    }

    const data = await response.json();
    console.log('\n✅ Success! Response structure:');
    console.log('Keys:', Object.keys(data));
    console.log('\n---\n');
    
    // Check for content
    if (data.content || data.blog_post?.content) {
      const content = data.content || data.blog_post?.content;
      console.log('✅ Content generated!');
      console.log(`Content length: ${content.length} characters`);
      console.log(`Content preview (first 500 chars):\n${content.substring(0, 500)}...\n`);
    } else {
      console.log('⚠️ No content found in response');
    }
    
    // Check for title
    if (data.title || data.blog_post?.title) {
      console.log(`✅ Title: ${data.title || data.blog_post?.title}`);
    }
    
    // Check for meta description
    if (data.meta_description || data.blog_post?.meta_description) {
      console.log(`✅ Meta Description: ${data.meta_description || data.blog_post?.meta_description}`);
    }
    
    // Check for semantic keywords usage
    if (data.semantic_keywords) {
      console.log(`✅ Semantic Keywords Used: ${data.semantic_keywords.length} keywords`);
      console.log(`   ${data.semantic_keywords.slice(0, 10).join(', ')}...`);
    }
    
    // Check for SEO score
    if (data.seo_score !== undefined) {
      console.log(`✅ SEO Score: ${data.seo_score}`);
    }
    
    console.log('\n---\n');
    console.log('Full Response (truncated):');
    console.log(JSON.stringify(data, null, 2).substring(0, 2000));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testContentGeneration();
