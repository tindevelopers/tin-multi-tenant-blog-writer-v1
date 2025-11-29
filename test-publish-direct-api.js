/**
 * Test Direct Publishing API Endpoint
 * Calls the /api/test/publish-direct endpoint which uses server-side auth
 * 
 * Usage: node test-publish-direct-api.js
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://blogwriter.develop.tinconnect.com';

async function testDirectPublish() {
  console.log('🧪 Testing Direct Publishing API Endpoint\n');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log('='.repeat(60));

  try {
    console.log('\n🚀 Calling /api/test/publish-direct...\n');

    console.log('Making request to:', `${BASE_URL}/api/test/publish-direct`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
    
    const response = await fetch(`${BASE_URL}/api/test/publish-direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        title: 'Test Blog: Direct Publishing with Enhanced Fields',
        content: `
          <h1>Test Blog: Direct Publishing with Enhanced Fields</h1>
          <p>This is a test blog post published directly to Webflow to verify that enhanced fields (SEO title, meta description, slug, featured image alt text) are correctly generated via OpenAI and published.</p>
          <h2>What We're Testing</h2>
          <ul>
            <li>OpenAI field enhancement (SEO title, meta description, slug, alt text)</li>
            <li>Webflow ImageRef field formatting</li>
            <li>Site publishing after item creation</li>
            <li>Field mapping to Webflow collection</li>
          </ul>
          <p>This content is designed to test the complete publishing workflow.</p>
        `,
        excerpt: 'Test blog post to verify enhanced fields publishing workflow with OpenAI field enhancement.',
        featured_image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200',
        collection_id: '6928d5ea7146ca3510367bcc',
      }),
    });

    clearTimeout(timeoutId);
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    console.log('✅ Publishing Result:');
    console.log(JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ Test completed successfully!');
      console.log('\n📋 Summary:');
      console.log('  Enhanced Fields:');
      console.log(`    SEO Title: ${data.enhanced_fields?.seo_title}`);
      console.log(`    Meta Description: ${data.enhanced_fields?.meta_description?.substring(0, 60)}...`);
      console.log(`    Slug: ${data.enhanced_fields?.slug}`);
      console.log(`    Featured Image Alt: ${data.enhanced_fields?.featured_image_alt}`);
      console.log(`    Provider: ${data.enhanced_fields?.provider}`);
      console.log(`    Model: ${data.enhanced_fields?.model}`);
      console.log('\n  Webflow Result:');
      console.log(`    Item ID: ${data.webflow_result?.itemId}`);
      console.log(`    Published: ${data.webflow_result?.published ? '✅ Yes' : '❌ No'}`);
      console.log(`    URL: ${data.webflow_result?.url || 'N/A'}`);
    } else {
      console.log('\n❌ Publishing failed:', data.error);
      if (data.details) {
        console.log('\nDetails:', data.details);
      }
    }

    return data;
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testDirectPublish();

