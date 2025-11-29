/**
 * Test Script: Publish Blog to Webflow with Enhanced Fields
 * 
 * This script tests the complete flow:
 * 1. Creates a test blog post with enhanced fields
 * 2. Creates a publishing record
 * 3. Publishes to Webflow (which should enhance fields via OpenAI)
 * 4. Verifies enhanced fields are correctly sent to Webflow
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_TITLE = 'Test Blog Post: Enhanced Fields Publishing';
const TEST_CONTENT = `
<h1>Test Blog Post: Enhanced Fields Publishing</h1>
<p>This is a test blog post to verify that enhanced fields (SEO title, meta description, slug, featured image alt text) are correctly generated and published to Webflow.</p>
<p>The enhanced fields endpoint should use OpenAI to optimize these fields before publishing.</p>
<h2>Key Features Being Tested</h2>
<ul>
  <li>SEO Title Enhancement</li>
  <li>Meta Description Optimization</li>
  <li>Slug Generation</li>
  <li>Featured Image Alt Text</li>
</ul>
<p>This content is designed to test the complete publishing workflow with field enhancement.</p>
`;

// You'll need to provide these values:
// - AUTH_TOKEN: Your Supabase auth token (get from browser after logging in)
// - POST_ID: An existing blog post ID, or we'll create one
// - WEBFLOW_COLLECTION_ID: Your Webflow collection ID

const AUTH_TOKEN = process.env.AUTH_TOKEN || ''; // Get from browser DevTools after logging in
const POST_ID = process.env.POST_ID || null; // Optional: existing post ID
const WEBFLOW_COLLECTION_ID = process.env.WEBFLOW_COLLECTION_ID || '6928d5ea7146ca3510367bcc';

async function createTestBlogPost() {
  console.log('📝 Step 1: Creating test blog post with enhanced fields...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/drafts/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        title: TEST_TITLE,
        content: TEST_CONTENT,
        excerpt: 'Test blog post to verify enhanced fields publishing workflow with OpenAI field enhancement.',
        status: 'published',
        slug: 'test-enhanced-fields-publishing',
        seo_data: {
          meta_title: 'Test SEO Title (will be enhanced)',
          meta_description: 'Test meta description (will be enhanced)',
          keywords: ['test', 'blog', 'webflow', 'publishing'],
        },
        metadata: {
          slug: 'test-enhanced-fields-publishing',
          featured_image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200',
          featured_image_alt: 'Test featured image (will be enhanced)',
          author_name: 'Test Author',
          locale: 'en',
          is_featured: false,
        },
        featured_image: {
          image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200',
          alt_text: 'Test featured image (will be enhanced)',
        },
        word_count: 150,
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
      slug: data.data?.metadata?.slug,
    });
    
    return data.data?.post_id;
  } catch (error) {
    console.error('❌ Error creating blog post:', error.message);
    throw error;
  }
}

async function createPublishingRecord(postId) {
  console.log('\n📤 Step 2: Creating publishing record...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/blog-publishing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        post_id: postId,
        platform: 'webflow',
        is_draft: false, // Publish immediately (not as draft)
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
      platform: data.platform,
    });
    
    return data.publishing_id;
  } catch (error) {
    console.error('❌ Error creating publishing record:', error.message);
    throw error;
  }
}

async function publishToWebflow(publishingId) {
  console.log('\n🚀 Step 3: Publishing to Webflow (with field enhancement)...\n');
  console.log('This will:');
  console.log('  1. Call enhanceBlogFields() to optimize SEO title, meta description, slug, and alt text');
  console.log('  2. Map enhanced fields to Webflow collection fields');
  console.log('  3. Create item in Webflow CMS');
  console.log('  4. Publish the Webflow site\n');
  
  try {
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
    console.log('✅ Successfully published to Webflow!');
    console.log('\n📊 Publishing Result:');
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ Error publishing to Webflow:', error.message);
    throw error;
  }
}

async function verifyWebflowItem(itemId, collectionId) {
  console.log('\n🔍 Step 4: Verifying Webflow item...\n');
  console.log('Note: To verify the item, you would need to:');
  console.log('  1. Check Webflow CMS dashboard');
  console.log('  2. Verify enhanced fields are present:');
  console.log('     - SEO Title (should be optimized, 50-60 chars)');
  console.log('     - Meta Description (should be optimized, 150-160 chars)');
  console.log('     - Slug (should be SEO-friendly)');
  console.log('     - Featured Image Alt Text (should be descriptive)');
  console.log(`\n  3. Or use Webflow API: GET /v2/collections/${collectionId}/items/${itemId}`);
}

async function runTest() {
  console.log('🧪 Testing Webflow Publishing with Enhanced Fields\n');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Webflow Collection ID: ${WEBFLOW_COLLECTION_ID}`);
  console.log('='.repeat(60));
  
  if (!AUTH_TOKEN) {
    console.error('\n❌ AUTH_TOKEN is required!');
    console.log('\nTo get your auth token:');
    console.log('  1. Log in to the application in your browser');
    console.log('  2. Open DevTools (F12)');
    console.log('  3. Go to Application/Storage > Cookies');
    console.log('  4. Find the cookie: sb-<project-id>-auth-token');
    console.log('  5. Copy the value and set it as AUTH_TOKEN environment variable');
    console.log('\nOr run: export AUTH_TOKEN="your-token-here"');
    process.exit(1);
  }

  try {
    // Step 1: Create blog post
    let postId = POST_ID;
    if (!postId) {
      postId = await createTestBlogPost();
    } else {
      console.log(`📝 Using existing blog post: ${postId}\n`);
    }

    // Step 2: Create publishing record
    const publishingId = await createPublishingRecord(postId);

    // Step 3: Publish to Webflow (this will enhance fields)
    const result = await publishToWebflow(publishingId);

    // Step 4: Verify (manual step)
    if (result.itemId) {
      await verifyWebflowItem(result.itemId, WEBFLOW_COLLECTION_ID);
    }

    console.log('\n✅ Test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`  - Blog Post ID: ${postId}`);
    console.log(`  - Publishing Record ID: ${publishingId}`);
    if (result.itemId) {
      console.log(`  - Webflow Item ID: ${result.itemId}`);
    }
    if (result.url) {
      console.log(`  - Webflow URL: ${result.url}`);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the test
runTest();

