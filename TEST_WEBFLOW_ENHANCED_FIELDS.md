# Test: Webflow Publishing with Enhanced Fields

## Objective
Test that enhanced fields (SEO title, meta description, slug, featured image alt text) are correctly generated via OpenAI and published to Webflow.

## Prerequisites
1. You must be logged into the application
2. Webflow integration must be configured
3. You need a blog post ID (or we'll create one)

## Quick Test via Browser Console

### Step 1: Get Your Auth Token
1. Open the application in your browser
2. Open DevTools (F12)
3. Go to **Application** tab > **Cookies**
4. Find cookie: `sb-<project-id>-auth-token`
5. Copy the value

### Step 2: Create a Test Blog Post (if needed)

Open browser console and run:

```javascript
// Create test blog post
const createPost = async () => {
  const response = await fetch('/api/drafts/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Test Blog: Enhanced Fields Publishing',
      content: '<h1>Test Blog Post</h1><p>This tests enhanced fields publishing to Webflow.</p>',
      excerpt: 'Test blog post to verify enhanced fields publishing workflow.',
      status: 'published',
      slug: 'test-enhanced-fields-publishing',
      seo_data: {
        meta_title: 'Test SEO Title (will be enhanced)',
        meta_description: 'Test meta description (will be enhanced)',
        keywords: ['test', 'blog', 'webflow'],
      },
      metadata: {
        slug: 'test-enhanced-fields-publishing',
        featured_image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200',
        featured_image_alt: 'Test featured image (will be enhanced)',
        locale: 'en',
      },
      featured_image: {
        image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200',
        alt_text: 'Test featured image (will be enhanced)',
      },
      word_count: 150,
    }),
  });
  
  const data = await response.json();
  console.log('✅ Blog post created:', data);
  return data.data?.post_id;
};

const postId = await createPost();
console.log('Post ID:', postId);
```

### Step 3: Create Publishing Record

```javascript
// Create publishing record
const createPublishing = async (postId) => {
  const response = await fetch('/api/blog-publishing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      post_id: postId,
      platform: 'webflow',
      is_draft: false, // Publish immediately
    }),
  });
  
  const data = await response.json();
  console.log('✅ Publishing record created:', data);
  return data.publishing_id;
};

const publishingId = await createPublishing(postId);
console.log('Publishing ID:', publishingId);
```

### Step 4: Publish to Webflow (This Will Enhance Fields)

```javascript
// Publish to Webflow (will call enhanceBlogFields internally)
const publishToWebflow = async (publishingId) => {
  const response = await fetch(`/api/blog-publishing/${publishingId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      is_draft: false,
    }),
  });
  
  const data = await response.json();
  console.log('✅ Published to Webflow:', data);
  return data;
};

const result = await publishToWebflow(publishingId);
console.log('Result:', result);
```

## What to Verify

After publishing, check:

1. **Server Logs** - Look for:
   - "Enhancing mandatory fields before Webflow publishing"
   - "Successfully enhanced fields" with provider: "openai"
   - Enhanced SEO title, meta description, slug, and image alt text

2. **Webflow CMS** - Verify:
   - SEO Title field has optimized value (50-60 chars)
   - Meta Description field has optimized value (150-160 chars)
   - Slug field has SEO-friendly value
   - Featured Image Alt Text field has descriptive value

3. **Response Data** - Check the API response includes:
   - `itemId` - Webflow item ID
   - `url` - Published URL
   - `published: true`

## Expected Flow

1. ✅ Blog post created with initial fields
2. ✅ Publishing record created
3. ✅ **Field Enhancement** (OpenAI):
   - SEO Title optimized
   - Meta Description optimized
   - Slug generated
   - Featured Image Alt Text generated
4. ✅ Fields mapped to Webflow collection
5. ✅ Item created in Webflow CMS
6. ✅ Webflow site published

## Troubleshooting

### If field enhancement fails:
- Check OpenAI API key is configured in backend
- Check server logs for enhancement errors
- Original fields will be used as fallback

### If publishing fails:
- Check Webflow integration is configured
- Verify collection ID is correct
- Check field mappings are set up

## Using the Test Script

Alternatively, use the Node.js test script:

```bash
# Set environment variables
export AUTH_TOKEN="your-auth-token"
export WEBFLOW_COLLECTION_ID="6928d5ea7146ca3510367bcc"
export NEXT_PUBLIC_APP_URL="https://blogwriter.develop.tinconnect.com"

# Run the test
node test-webflow-publish-enhanced-fields.js
```

