# DataForSEO Content Generation - Usage Flow

This document explains how DataForSEO Content Generation API is integrated and used in the application.

## Architecture Flow

```
Frontend (React Component)
    ↓
blogWriterAPI.generateBlog() 
    ↓ (HTTP POST)
Next.js API Route: /api/blog-writer/generate
    ↓ (checks use_dataforseo_content_generation flag)
DataForSEO Service: dataForSEOContentGeneration.generateBlogContent()
    ↓ (HTTP POST with Basic Auth)
DataForSEO API: https://api.dataforseo.com/v3/content_generation/*
    ↓ (returns generated content)
Response flows back through the chain
```

## Step-by-Step Flow

### Step 1: Frontend Calls the API

In your React component or hook, call `blogWriterAPI.generateBlog()`:

```typescript
import { blogWriterAPI } from '@/lib/blog-writer-api';

// Example: Generate blog with DataForSEO
const result = await blogWriterAPI.generateBlog({
  topic: 'How to optimize your website for SEO',
  keywords: ['SEO', 'website optimization', 'search engine'],
  use_dataforseo_content_generation: true, // ← Enable DataForSEO
  tone: 'professional',
  word_count: 1500,
  target_audience: 'small business owners',
});
```

**What happens:**
- `blogWriterAPI.generateBlog()` makes a `POST` request to `/api/blog-writer/generate`
- The `use_dataforseo_content_generation: true` parameter is included in the request body

### Step 2: Next.js API Route Receives Request

The API route at `src/app/api/blog-writer/generate/route.ts` receives the request:

```typescript
// Inside /api/blog-writer/generate route
const { 
  topic,
  keywords,
  use_dataforseo_content_generation = false, // ← Read from request
  // ... other params
} = body;

// Check if DataForSEO should be used
const USE_DATAFORSEO = use_dataforseo_content_generation || 
                      process.env.USE_DATAFORSEO_CONTENT_GENERATION === 'true';

if (USE_DATAFORSEO) {
  // Use DataForSEO Content Generation
  const result = await dataForSEOContentGeneration.generateBlogContent({
    topic,
    keywords: keywordsArray,
    // ... other params
  });
  // Return formatted response
}
```

**What happens:**
- The route checks if `use_dataforseo_content_generation` is `true` OR if the environment variable `USE_DATAFORSEO_CONTENT_GENERATION` is set to `'true'`
- If enabled, it calls the DataForSEO service instead of the regular backend API

### Step 3: DataForSEO Service Calls DataForSEO API

The service at `src/lib/dataforseo-content-generation.ts` makes authenticated requests:

```typescript
// Inside DataForSEOContentGeneration.generateBlogContent()
async generateBlogContent(params) {
  // Step 1: Generate subtopics
  const subtopicsResponse = await this.generateSubtopics({
    text: prompt,
    max_subtopics: 10,
    language: 'en',
  });
  
  // Step 2: Generate main content
  const contentResponse = await this.generateText({
    text: contentPrompt,
    creativity_index: 0.7,
    text_length: estimatedTokens,
    tone: params.tone,
    language: 'en',
  });
  
  // Step 3: Generate meta tags
  const metaResponse = await this.generateMetaTags({
    text: generatedText,
    language: 'en',
  });
  
  return {
    content: generatedText,
    subtopics: subtopics,
    meta_title: metaResult.meta_title,
    meta_description: metaResult.meta_description,
    cost: totalCost,
  };
}
```

**What happens:**
- The service makes **3 separate API calls** to DataForSEO:
  1. `/v3/content_generation/generate_subtopics/live` - Generate subtopics
  2. `/v3/content_generation/generate/live` - Generate main content
  3. `/v3/content_generation/generate_meta_tags/live` - Generate meta tags
- Each request uses **Basic Authentication** with `DATAFORSEO_USERNAME` and `DATAFORSEO_PASSWORD`
- The service combines all results into a single response

### Step 4: Response Flows Back

The response flows back through the chain:

```
DataForSEO API Response
    ↓
DataForSEO Service (formats response)
    ↓
Next.js API Route (transforms to EnhancedBlogResponse format)
    ↓
Frontend receives blog content
```

## Usage Options

### Option 1: Enable Per Request (Recommended)

Pass `use_dataforseo_content_generation: true` in each request:

```typescript
// In your React component
const handleGenerateBlog = async () => {
  const result = await blogWriterAPI.generateBlog({
    topic: 'Your topic here',
    keywords: ['keyword1', 'keyword2', 'keyword3'],
    use_dataforseo_content_generation: true, // ← Enable DataForSEO for this request
    tone: 'professional',
    word_count: 1500,
  });
  
  if (result) {
    console.log('Generated content:', result.content);
    console.log('Meta title:', result.title);
    console.log('Meta description:', result.meta_description);
  }
};
```

**When to use:**
- You want control over which requests use DataForSEO
- You want to compare results between DataForSEO and regular backend API
- You want to use DataForSEO only for specific content types

### Option 2: Enable Globally via Environment Variable

Set `USE_DATAFORSEO_CONTENT_GENERATION=true` in your environment variables:

```env
# .env.local or Vercel environment variables
DATAFORSEO_USERNAME=your_username
DATAFORSEO_PASSWORD=your_password
USE_DATAFORSEO_CONTENT_GENERATION=true  # ← Enable globally
```

**What happens:**
- All blog generation requests will use DataForSEO by default
- You don't need to pass `use_dataforseo_content_generation: true` in each request
- You can still override by passing `use_dataforseo_content_generation: false` in a request

**When to use:**
- You want to use DataForSEO for all blog generation
- You want a consistent content generation provider
- You're migrating from the regular backend API to DataForSEO

## Complete Example

Here's a complete example showing the full flow:

```typescript
// Frontend Component: src/components/blog-writer/BlogGenerator.tsx
import { useState } from 'react';
import { blogWriterAPI } from '@/lib/blog-writer-api';

export function BlogGenerator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const generateBlog = async () => {
    setLoading(true);
    try {
      // Step 1: Frontend calls blogWriterAPI
      const blogResult = await blogWriterAPI.generateBlog({
        topic: 'How to optimize your website for SEO',
        keywords: [
          'SEO optimization',
          'website performance',
          'search engine ranking',
          'keyword research',
        ],
        use_dataforseo_content_generation: true, // ← Enable DataForSEO
        tone: 'professional',
        word_count: 1500,
        target_audience: 'small business owners',
      });

      if (blogResult) {
        setResult(blogResult);
        console.log('Blog generated successfully!');
        console.log('Title:', blogResult.title);
        console.log('Content length:', blogResult.content?.length);
        console.log('Word count:', blogResult.word_count);
      }
    } catch (error) {
      console.error('Error generating blog:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={generateBlog} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Blog with DataForSEO'}
      </button>
      
      {result && (
        <div>
          <h1>{result.title}</h1>
          <p>{result.meta_description}</p>
          <div dangerouslySetInnerHTML={{ __html: result.content }} />
        </div>
      )}
    </div>
  );
}
```

## Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend Component                                          │
│ blogWriterAPI.generateBlog({                               │
│   topic: '...',                                            │
│   keywords: [...],                                         │
│   use_dataforseo_content_generation: true  ←──────────────┼──┐
│ })                                                          │  │
└─────────────────────────────────────────────────────────────┘  │
                          │                                     │
                          │ HTTP POST                            │
                          │ /api/blog-writer/generate            │
                          ↓                                     │
┌─────────────────────────────────────────────────────────────┐ │
│ Next.js API Route                                           │ │
│ /api/blog-writer/generate/route.ts                          │ │
│                                                              │ │
│ if (USE_DATAFORSEO) {  ←────────────────────────────────────┘ │
│   await dataForSEOContentGeneration.generateBlogContent()     │
│ }                                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Service Method Call
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ DataForSEO Service                                           │
│ dataforseo-content-generation.ts                            │
│                                                              │
│ 1. generateSubtopics() → DataForSEO API                    │
│ 2. generateText() → DataForSEO API                         │
│ 3. generateMetaTags() → DataForSEO API                     │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP POST with Basic Auth
                          │ https://api.dataforseo.com/v3/...
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ DataForSEO API                                              │
│ https://api.dataforseo.com/v3/content_generation/*         │
│                                                              │
│ Returns: Generated content, subtopics, meta tags            │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Response flows back
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Frontend receives formatted blog content                    │
│ {                                                           │
│   title: '...',                                            │
│   content: '...',                                           │
│   meta_description: '...',                                 │
│   subtopics: [...],                                         │
│   cost: 0.10                                                │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
```

## Key Points

1. **Frontend → API Route**: Frontend calls `/api/blog-writer/generate` with `use_dataforseo_content_generation: true`
2. **API Route → DataForSEO Service**: API route checks the flag and calls `dataForSEOContentGeneration.generateBlogContent()`
3. **Service → DataForSEO API**: Service makes authenticated requests to DataForSEO API endpoints
4. **Response Chain**: Response flows back through the chain, formatted for the frontend

## Fallback Behavior

If DataForSEO fails or credentials are missing:
- The API route automatically falls back to the regular backend API (`BLOG_WRITER_API_URL`)
- No errors are thrown to the frontend
- The blog generation continues with the regular backend API

## Environment Variables Required

```env
# Required for DataForSEO to work
DATAFORSEO_USERNAME=your_username
DATAFORSEO_PASSWORD=your_password

# Optional: Enable globally
USE_DATAFORSEO_CONTENT_GENERATION=false
```

## Testing

To test the integration:

1. Set up environment variables with valid DataForSEO credentials
2. Call `blogWriterAPI.generateBlog()` with `use_dataforseo_content_generation: true`
3. Check logs for `🔷 Using DataForSEO Content Generation API`
4. Verify the response contains generated content, subtopics, and meta tags

