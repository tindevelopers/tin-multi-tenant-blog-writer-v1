# Frontend Integration Guide: Field Enhancement Endpoint

**Date:** 2025-01-15  
**Endpoint:** `POST /api/v1/content/enhance-fields`  
**Purpose:** Enhance mandatory CMS fields (SEO title, meta description, slug, featured image alt text) using OpenAI after image generation

---

## 🎯 Overview

After generating images for a blog post, use this endpoint to enhance the mandatory fields required for Webflow CMS items. This endpoint uses OpenAI to optimize SEO title, meta description, slug, and featured image alt text.

**Key Benefits:**
- ✅ Lightweight and fast (single OpenAI API call)
- ✅ Focused on field enhancement only
- ✅ No impact on existing blog generation endpoint
- ✅ Clear error handling

---

## 📍 Endpoint Details

**Base URL:**
- **Development:** `https://blog-writer-api-dev-613248238610.europe-west9.run.app`
- **Staging:** `https://blog-writer-api-staging-613248238610.europe-west9.run.app`
- **Production:** `https://blog-writer-api-prod-613248238610.us-east1.run.app`

**Endpoint:** `POST /api/v1/content/enhance-fields`

---

## 📥 Request Format

### Request Body

```typescript
interface FieldEnhancementRequest {
  // Required
  title: string;                    // Current title (1-200 characters)
  
  // Optional - Content Context
  content?: string;                 // Content excerpt for context (max 5000 chars)
  featured_image_url?: string;      // URL of featured image
  
  // Optional - Fields to Enhance (all default to true)
  enhance_seo_title?: boolean;      // Default: true - Generate SEO title (50-60 chars)
  enhance_meta_description?: boolean; // Default: true - Generate meta description (150-160 chars)
  enhance_slug?: boolean;           // Default: true - Generate SEO-friendly slug
  enhance_image_alt?: boolean;      // Default: true - Generate alt text (requires featured_image_url)
  
  // Optional - Context for Better Results
  keywords?: string[];              // SEO keywords (max 10)
  target_audience?: string;         // Target audience description (max 200 chars)
}
```

### Example Request

```json
{
  "title": "Explore Content Marketing Jobs: Your Guide to Success",
  "content": "Content marketing is a rapidly growing field with many opportunities...",
  "featured_image_url": "https://example.com/images/content-marketing-career.jpg",
  "enhance_seo_title": true,
  "enhance_meta_description": true,
  "enhance_slug": true,
  "enhance_image_alt": true,
  "keywords": ["content marketing", "jobs", "career", "marketing"],
  "target_audience": "Marketing professionals and career changers"
}
```

---

## 📤 Response Format

### Success Response (200)

```typescript
interface FieldEnhancementResponse {
  enhanced_fields: {
    seo_title?: string;             // SEO-optimized title (50-60 chars)
    meta_description?: string;       // Meta description (150-160 chars)
    slug?: string;                  // SEO-friendly URL slug
    featured_image_alt?: string;    // Alt text for featured image
  };
  original_fields: {
    title: string;
    content?: string;
    featured_image_url?: string;
  };
  enhanced_at: string;              // ISO timestamp
  provider: string;                  // Always "openai"
  model?: string;                    // Model used (e.g., "gpt-4o-mini")
}
```

### Example Response

```json
{
  "enhanced_fields": {
    "seo_title": "Content Marketing Jobs: Complete Career Guide 2024",
    "meta_description": "Discover top content marketing jobs and career opportunities. Learn skills, salaries, and how to land your dream role in content marketing.",
    "slug": "content-marketing-jobs-career-guide-2024",
    "featured_image_alt": "Content marketing professional working on strategy and campaign planning"
  },
  "original_fields": {
    "title": "Explore Content Marketing Jobs: Your Guide to Success",
    "content": "Content marketing is a rapidly growing field with many opportunities...",
    "featured_image_url": "https://example.com/images/content-marketing-career.jpg"
  },
  "enhanced_at": "2025-01-15T10:30:00.000Z",
  "provider": "openai",
  "model": "gpt-4o-mini"
}
```

---

## ❌ Error Responses

### 503 - OpenAI Not Configured

```json
{
  "detail": "OpenAI API key is not configured. Please configure OPENAI_API_KEY in Google Cloud Run secrets."
}
```

**Action:** Contact backend team to configure OpenAI credentials.

### 400 - Invalid Request

```json
{
  "detail": "At least one field must be requested for enhancement"
}
```

or

```json
{
  "detail": "Featured image URL is required when enhancing image alt text"
}
```

**Action:** Fix the request payload according to the error message.

### 500 - Generation Failed

```json
{
  "detail": "Failed to enhance fields: [error message]"
}
```

**Action:** Retry the request or check backend logs.

---

## 💻 Code Examples

### TypeScript/JavaScript

```typescript
interface FieldEnhancementRequest {
  title: string;
  content?: string;
  featured_image_url?: string;
  enhance_seo_title?: boolean;
  enhance_meta_description?: boolean;
  enhance_slug?: boolean;
  enhance_image_alt?: boolean;
  keywords?: string[];
  target_audience?: string;
}

interface FieldEnhancementResponse {
  enhanced_fields: {
    seo_title?: string;
    meta_description?: string;
    slug?: string;
    featured_image_alt?: string;
  };
  original_fields: {
    title: string;
    content?: string;
    featured_image_url?: string;
  };
  enhanced_at: string;
  provider: string;
  model?: string;
}

async function enhanceFields(
  baseUrl: string,
  request: FieldEnhancementRequest
): Promise<FieldEnhancementResponse> {
  const response = await fetch(`${baseUrl}/api/v1/content/enhance-fields`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

// Usage Example
try {
  const result = await enhanceFields(
    'https://blog-writer-api-dev-613248238610.europe-west9.run.app',
    {
      title: "Explore Content Marketing Jobs: Your Guide to Success",
      content: "Content marketing is a rapidly growing field...",
      featured_image_url: "https://example.com/image.jpg",
      enhance_seo_title: true,
      enhance_meta_description: true,
      enhance_slug: true,
      enhance_image_alt: true,
      keywords: ["content marketing", "jobs"],
      target_audience: "Marketing professionals"
    }
  );

  console.log('Enhanced SEO Title:', result.enhanced_fields.seo_title);
  console.log('Enhanced Meta Description:', result.enhanced_fields.meta_description);
  console.log('Enhanced Slug:', result.enhanced_fields.slug);
  console.log('Enhanced Alt Text:', result.enhanced_fields.featured_image_alt);

  // Update Webflow CMS fields
  // await updateWebflowItem(itemId, {
  //   'seo-title': result.enhanced_fields.seo_title,
  //   'seo-description': result.enhanced_fields.meta_description,
  //   'slug': result.enhanced_fields.slug,
  //   'featured-image-alt': result.enhanced_fields.featured_image_alt
  // });

} catch (error) {
  console.error('Field enhancement failed:', error);
  // Handle error (show user message, retry, etc.)
}
```

### React Hook Example

```typescript
import { useState } from 'react';

interface UseFieldEnhancementOptions {
  baseUrl: string;
}

export function useFieldEnhancement({ baseUrl }: UseFieldEnhancementOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enhanceFields = async (request: FieldEnhancementRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/api/v1/content/enhance-fields`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { enhanceFields, loading, error };
}

// Usage in Component
function BlogPostEditor() {
  const { enhanceFields, loading, error } = useFieldEnhancement({
    baseUrl: 'https://blog-writer-api-dev-613248238610.europe-west9.run.app'
  });

  const handleEnhanceFields = async () => {
    try {
      const result = await enhanceFields({
        title: formData.title,
        content: formData.content,
        featured_image_url: formData.featuredImageUrl,
        keywords: formData.keywords,
        target_audience: formData.targetAudience
      });

      // Update form with enhanced fields
      setFormData({
        ...formData,
        seoTitle: result.enhanced_fields.seo_title,
        metaDescription: result.enhanced_fields.meta_description,
        slug: result.enhanced_fields.slug,
        featuredImageAlt: result.enhanced_fields.featured_image_alt
      });
    } catch (err) {
      // Error is already set in hook
      console.error('Failed to enhance fields:', err);
    }
  };

  return (
    <div>
      <button onClick={handleEnhanceFields} disabled={loading}>
        {loading ? 'Enhancing...' : 'Enhance Fields'}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

### cURL Example

```bash
curl -X POST https://blog-writer-api-dev-613248238610.europe-west9.run.app/api/v1/content/enhance-fields \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Explore Content Marketing Jobs: Your Guide to Success",
    "content": "Content marketing is a rapidly growing field with many opportunities for professionals...",
    "featured_image_url": "https://example.com/images/content-marketing-career.jpg",
    "enhance_seo_title": true,
    "enhance_meta_description": true,
    "enhance_slug": true,
    "enhance_image_alt": true,
    "keywords": ["content marketing", "jobs", "career"],
    "target_audience": "Marketing professionals"
  }'
```

---

## 🔄 Integration Workflow

### Typical Use Case: After Image Generation

```typescript
// 1. Generate images for blog post
const imageResult = await generateImage({
  prompt: "Content marketing professional working",
  // ... other image params
});

// 2. Enhance mandatory fields using the new endpoint
const enhancedFields = await enhanceFields(baseUrl, {
  title: blogPost.title,
  content: blogPost.excerpt, // Use excerpt or first paragraph
  featured_image_url: imageResult.image.url,
  enhance_seo_title: true,
  enhance_meta_description: true,
  enhance_slug: true,
  enhance_image_alt: true,
  keywords: blogPost.keywords,
  target_audience: blogPost.targetAudience
});

// 3. Update Webflow CMS item with enhanced fields
await updateWebflowCMSItem(itemId, {
  'seo-title': enhancedFields.enhanced_fields.seo_title,
  'seo-description': enhancedFields.enhanced_fields.meta_description,
  'slug': enhancedFields.enhanced_fields.slug,
  'featured-image-alt': enhancedFields.enhanced_fields.featured_image_alt,
  'main-image': imageResult.image.url
});
```

---

## 📋 Field Specifications

### SEO Title
- **Length:** 50-60 characters
- **Format:** Includes primary keywords, compelling and descriptive
- **Example:** `"Content Marketing Jobs: Complete Career Guide 2024"`

### Meta Description
- **Length:** 150-160 characters
- **Format:** Includes primary keyword, call-to-action, compelling summary
- **Example:** `"Discover top content marketing jobs and career opportunities. Learn skills, salaries, and how to land your dream role in content marketing."`

### Slug
- **Format:** Lowercase, hyphens for spaces, no special characters
- **Example:** `"content-marketing-jobs-career-guide-2024"`

### Featured Image Alt Text
- **Format:** Descriptive, keyword-rich, accessible
- **Example:** `"Content marketing professional working on strategy and campaign planning"`

---

## ⚠️ Important Notes

1. **OpenAI Required:** This endpoint requires OpenAI API key to be configured in Google Cloud Run. If you receive a 503 error, contact the backend team.

2. **Image Alt Text:** The `enhance_image_alt` option requires `featured_image_url` to be provided. If not provided, you'll get a 400 error.

3. **At Least One Field:** You must request enhancement for at least one field. All fields default to `true` if not specified.

4. **Content Context:** Providing `content` (even an excerpt) helps generate better SEO title and meta description.

5. **Keywords Help:** Providing `keywords` improves the quality of enhanced fields by ensuring keyword integration.

6. **Rate Limiting:** This endpoint uses OpenAI API, which has rate limits. Implement retry logic with exponential backoff if needed.

---

## 🧪 Testing

### Test Request

```bash
curl -X POST https://blog-writer-api-dev-613248238610.europe-west9.run.app/api/v1/content/enhance-fields \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Blog Post Title",
    "enhance_seo_title": true,
    "enhance_meta_description": true,
    "enhance_slug": true
  }'
```

### Expected Response

```json
{
  "enhanced_fields": {
    "seo_title": "Test Blog Post Title: Complete Guide",
    "meta_description": "Discover everything you need to know about test blog post title. Learn key insights and best practices.",
    "slug": "test-blog-post-title-complete-guide"
  },
  "original_fields": {
    "title": "Test Blog Post Title"
  },
  "enhanced_at": "2025-01-15T10:30:00.000Z",
  "provider": "openai",
  "model": "gpt-4o-mini"
}
```

---

## 🔗 Related Endpoints

- **Blog Generation:** `POST /api/v1/blog/generate-enhanced` - Generate full blog content
- **Image Generation:** `POST /api/v1/images/generate` - Generate images for blog posts
- **Webflow Publishing:** `POST /api/v1/publish/webflow` - Publish content to Webflow CMS

---

## 📞 Support

If you encounter issues:
1. Check error response for specific error message
2. Verify OpenAI is configured (check for 503 error)
3. Review request format matches the interface above
4. Check backend logs if error persists
5. Contact backend team for OpenAI configuration issues

---

## 📝 Changelog

**2025-01-15** - Initial release
- Added `/api/v1/content/enhance-fields` endpoint
- Supports SEO title, meta description, slug, and featured image alt text enhancement
- Uses OpenAI for field optimization

