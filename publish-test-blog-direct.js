/**
 * Direct Webflow Publishing Test
 * Publishes a test blog post directly to Webflow with enhanced fields
 * 
 * Usage:
 *   node publish-test-blog-direct.js
 * 
 * Requires:
 *   - AUTH_TOKEN: Supabase auth token (get from browser cookies)
 *   - WEBFLOW_COLLECTION_ID: Your Webflow collection ID (default: 6928d5ea7146ca3510367bcc)
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://blogwriter.develop.tinconnect.com';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';
const WEBFLOW_COLLECTION_ID = process.env.WEBFLOW_COLLECTION_ID || '6928d5ea7146ca3510367bcc';

const TEST_BLOG = {
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
};

async function createBlogPost() {
  console.log('📝 Step 1: Creating blog post...\n');
  
  const response = await fetch(`${BASE_URL}/api/drafts/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
    body: JSON.stringify({
      title: TEST_BLOG.title,
      content: TEST_BLOG.content,
      excerpt: TEST_BLOG.excerpt,
      status: 'published',
      slug: 'test-direct-publishing-enhanced-fields',
      seo_data: {
        meta_title: 'Test SEO Title (will be enhanced)',
        meta_description: 'Test meta description (will be enhanced)',
        keywords: ['test', 'blog', 'webflow', 'publishing', 'enhanced fields'],
      },
      metadata: {
        slug: 'test-direct-publishing-enhanced-fields',
        featured_image: TEST_BLOG.featured_image,
        featured_image_alt: 'Test featured image (will be enhanced)',
        locale: 'en',
        is_featured: false,
      },
      featured_image: {
        image_url: TEST_BLOG.featured_image,
        alt_text: 'Test featured image (will be enhanced)',
      },
      word_count: 200,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create blog post: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('✅ Blog post created:', {
    post_id: data.data?.post_id,
    title: data.data?.title,
  });
  
  return data.data?.post_id;
}

async function createPublishingRecord(postId) {
  console.log('\n📤 Step 2: Creating publishing record...\n');
  
  const response = await fetch(`${BASE_URL}/api/blog-publishing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
    body: JSON.stringify({
      post_id: postId,
      platform: 'webflow',
      is_draft: false, // Publish immediately
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create publishing record: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('✅ Publishing record created:', {
    publishing_id: data.publishing_id,
    status: data.status,
  });
  
  return data.publishing_id;
}

async function publishToWebflow(publishingId) {
  console.log('\n🚀 Step 3: Publishing to Webflow (with OpenAI field enhancement)...\n');
  console.log('This will:');
  console.log('  1. Enhance SEO title, meta description, slug, and alt text via OpenAI');
  console.log('  2. Format ImageRef fields correctly');
  console.log('  3. Create item in Webflow CMS');
  console.log('  4. Publish the Webflow site\n');
  
  const response = await fetch(`${BASE_URL}/api/blog-publishing/${publishingId}/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
    body: JSON.stringify({
      is_draft: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to publish to Webflow: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('✅ Publishing result:', JSON.stringify(data, null, 2));
  
  return data;
}

async function verifyItem(itemId) {
  console.log('\n🔍 Step 4: Verifying Webflow item...\n');
  
  const response = await fetch(
    `${BASE_URL}/api/test/webflow-check-item?item_id=${itemId}&collection_id=${WEBFLOW_COLLECTION_ID}`,
    {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
    }
  );

  if (response.ok) {
    const data = await response.json();
    console.log('✅ Item verification:', JSON.stringify(data, null, 2));
    return data;
  } else {
    console.log('⚠️ Could not verify item (endpoint may not be deployed yet)');
    return null;
  }
}

async function run() {
  console.log('🧪 Direct Webflow Publishing Test\n');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Collection ID: ${WEBFLOW_COLLECTION_ID}`);
  console.log('='.repeat(60));
  
  if (!AUTH_TOKEN) {
    console.error('\n❌ AUTH_TOKEN is required!');
    console.log('\nTo get your auth token:');
    console.log('  1. Log in to: https://blogwriter.develop.tinconnect.com');
    console.log('  2. Open DevTools (F12) > Application > Cookies');
    console.log('  3. Find: sb-<project-id>-auth-token');
    console.log('  4. Copy the value');
    console.log('\nThen run: export AUTH_TOKEN="your-token-here"');
    console.log('Or: AUTH_TOKEN="your-token" node publish-test-blog-direct.js');
    process.exit(1);
  }

  try {
    const postId = await createBlogPost();
    const publishingId = await createPublishingRecord(postId);
    const result = await publishToWebflow(publishingId);

    if (result.result?.itemId) {
      await verifyItem(result.result.itemId);
    }

    console.log('\n✅ Test completed!');
    console.log('\n📋 Summary:');
    console.log(`  Blog Post ID: ${postId}`);
    console.log(`  Publishing ID: ${publishingId}`);
    if (result.result?.itemId) {
      console.log(`  Webflow Item ID: ${result.result.itemId}`);
    }
    if (result.result?.url) {
      console.log(`  Webflow URL: ${result.result.url}`);
    }
    console.log(`  Published: ${result.result?.published ? '✅ Yes' : '❌ No'}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

run();

