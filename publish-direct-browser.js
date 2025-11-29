/**
 * Browser Console Script: Direct Webflow Publishing Test
 * 
 * Run this in your browser console after logging in to:
 * https://blogwriter.develop.tinconnect.com
 * 
 * This will:
 * 1. Create a test blog post
 * 2. Create a publishing record
 * 3. Publish to Webflow with enhanced fields
 * 4. Show the results
 */

(async function publishTestBlog() {
  const BASE_URL = window.location.origin;
  const WEBFLOW_COLLECTION_ID = '6928d5ea7146ca3510367bcc';
  
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

  console.log('🧪 Starting Direct Webflow Publishing Test\n');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Collection ID: ${WEBFLOW_COLLECTION_ID}`);
  console.log('='.repeat(60));

  try {
    // Step 1: Create blog post
    console.log('\n📝 Step 1: Creating blog post...');
    const createResponse = await fetch(`${BASE_URL}/api/drafts/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create blog post: ${createResponse.status} - ${errorText}`);
    }

    const createData = await createResponse.json();
    const postId = createData.data?.post_id;
    console.log('✅ Blog post created:', {
      post_id: postId,
      title: createData.data?.title,
    });

    // Step 2: Create publishing record
    console.log('\n📤 Step 2: Creating publishing record...');
    const publishRecordResponse = await fetch(`${BASE_URL}/api/blog-publishing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_id: postId,
        platform: 'webflow',
        is_draft: false, // Publish immediately
      }),
    });

    if (!publishRecordResponse.ok) {
      const errorText = await publishRecordResponse.text();
      throw new Error(`Failed to create publishing record: ${publishRecordResponse.status} - ${errorText}`);
    }

    const publishRecordData = await publishRecordResponse.json();
    const publishingId = publishRecordData.publishing_id;
    console.log('✅ Publishing record created:', {
      publishing_id: publishingId,
      status: publishRecordData.status,
    });

    // Step 3: Publish to Webflow (with enhanced fields)
    console.log('\n🚀 Step 3: Publishing to Webflow (with OpenAI field enhancement)...');
    console.log('This will:');
    console.log('  1. Enhance SEO title, meta description, slug, and alt text via OpenAI');
    console.log('  2. Format ImageRef fields correctly');
    console.log('  3. Create item in Webflow CMS');
    console.log('  4. Publish the Webflow site\n');

    const publishResponse = await fetch(`${BASE_URL}/api/blog-publishing/${publishingId}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        is_draft: false,
      }),
    });

    if (!publishResponse.ok) {
      const errorText = await publishResponse.text();
      throw new Error(`Failed to publish to Webflow: ${publishResponse.status} - ${errorText}`);
    }

    const publishData = await publishResponse.json();
    console.log('✅ Publishing result:', JSON.stringify(publishData, null, 2));

    // Step 4: Verify item
    if (publishData.result?.itemId) {
      console.log('\n🔍 Step 4: Verifying Webflow item...');
      try {
        const verifyResponse = await fetch(
          `${BASE_URL}/api/test/webflow-check-item?item_id=${publishData.result.itemId}&collection_id=${WEBFLOW_COLLECTION_ID}`
        );

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          console.log('✅ Item verification:', JSON.stringify(verifyData, null, 2));
        } else {
          console.log('⚠️ Could not verify item (endpoint may not be deployed yet)');
        }
      } catch (verifyError) {
        console.log('⚠️ Verification endpoint error:', verifyError.message);
      }
    }

    console.log('\n✅ Test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`  Blog Post ID: ${postId}`);
    console.log(`  Publishing ID: ${publishingId}`);
    if (publishData.result?.itemId) {
      console.log(`  Webflow Item ID: ${publishData.result.itemId}`);
    }
    if (publishData.result?.url) {
      console.log(`  Webflow URL: ${publishData.result.url}`);
    }
    console.log(`  Published: ${publishData.result?.published ? '✅ Yes' : '❌ No'}`);

    return {
      success: true,
      postId,
      publishingId,
      result: publishData.result,
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
})();

