# DataForSEO Content Generation API Integration

**⚠️ ARCHITECTURE UPDATE:** DataForSEO Content Generation is now handled by the **backend API service**, not the Next.js API routes. This document describes the intended integration architecture.

**Status:** Next.js route has been cleaned up to proxy requests to the backend API. Backend API implementation is pending.

## Overview

DataForSEO Content Generation API provides AI-powered content generation capabilities including:
- **Generate Text**: Generate new content from prompts ($0.00005 per new token)
- **Generate Subtopics**: Generate subtopics from text ($0.0001 per task)
- **Paraphrase**: Rewrite existing content ($0.00015 per token)
- **Check Grammar**: Check and correct grammar ($0.00001 per token)
- **Generate Meta Tags**: Generate SEO meta titles and descriptions ($0.001 per task)

## Setup

### 1. Get DataForSEO Credentials

1. Sign up for a DataForSEO account at https://dataforseo.com
2. Navigate to your account dashboard
3. Get your API credentials:
   - **Username**: Your DataForSEO account username
   - **Password**: Your DataForSEO API password

### 2. Configure Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# DataForSEO Content Generation API Credentials
DATAFORSEO_USERNAME=your_username
DATAFORSEO_PASSWORD=your_password

# Optional: Enable DataForSEO Content Generation by default
USE_DATAFORSEO_CONTENT_GENERATION=false
```

For production (Vercel), add these as environment variables in your Vercel project settings.

## Architecture

**Current Implementation:**
- ✅ Next.js API route proxies requests to backend API
- ✅ `use_dataforseo_content_generation` flag is passed to backend API
- ⏳ Backend API needs to implement DataForSEO integration

**Intended Flow:**
1. **Frontend** calls `blogWriterAPI.generateBlog()` with `use_dataforseo_content_generation: true`
2. **Next.js API Route** (`/api/blog-writer/generate`) proxies request to backend API with flag
3. **Backend API** checks flag and calls DataForSEO if enabled
4. **DataForSEO API** is called with authenticated requests (from backend)
5. **Response** flows back through the chain to the frontend

See [DATAFORSEO_ARCHITECTURE_RECOMMENDATION.md](./DATAFORSEO_ARCHITECTURE_RECOMMENDATION.md) for architecture details.

## Usage Options

### Option 1: Enable Per Request (Recommended)

Pass `use_dataforseo_content_generation: true` in each request:

```typescript
const result = await blogWriterAPI.generateBlog({
  topic: 'How to optimize your website for SEO',
  keywords: ['SEO', 'website optimization', 'search engine'],
  use_dataforseo_content_generation: true, // ← Enable DataForSEO for this request
  tone: 'professional',
  word_count: 1500,
});
```

**What happens:**
- Frontend calls `/api/blog-writer/generate` with the flag
- API route checks the flag and calls DataForSEO service
- DataForSEO service makes authenticated requests to DataForSEO API
- Response is formatted and returned to frontend

### Option 2: Enable Globally via Environment Variable

Set `USE_DATAFORSEO_CONTENT_GENERATION=true` in your environment variables:

```env
USE_DATAFORSEO_CONTENT_GENERATION=true
```

**What happens:**
- All blog generation requests automatically use DataForSEO
- You don't need to pass `use_dataforseo_content_generation: true` in each request
- Can still override per-request if needed

### Option 3: Use Direct API Routes

You can also call DataForSEO endpoints directly (for advanced use cases):

#### Generate Blog Content

```typescript
import { dataForSEOContentGenerationClient } from '@/lib/dataforseo-content-generation-client';

const result = await dataForSEOContentGenerationClient.generateBlogContent({
  topic: 'How to optimize your website for SEO',
  keywords: ['SEO', 'website optimization'],
  target_audience: 'small business owners',
  tone: 'professional',
  word_count: 1500,
  language: 'en',
});

console.log(result.content); // Generated blog content
console.log(result.subtopics); // Generated subtopics
console.log(result.meta_title); // SEO meta title
console.log(result.meta_description); // SEO meta description
console.log(result.cost); // API cost in USD
```

#### Generate Subtopics

```typescript
const subtopics = await dataForSEOContentGenerationClient.generateSubtopics(
  'How to optimize your website for SEO',
  10, // max subtopics
  'en' // language
);
```

#### Generate Meta Tags

```typescript
const metaTags = await dataForSEOContentGenerationClient.generateMetaTags(
  'Your blog content here...',
  'en'
);

console.log(metaTags.meta_title);
console.log(metaTags.meta_description);
```

## API Routes

The following API routes are available:

- `POST /api/dataforseo/content/generate` - Generate text content
- `POST /api/dataforseo/content/generate-blog` - Generate complete blog (text + subtopics + meta tags)
- `POST /api/dataforseo/content/generate-subtopics` - Generate subtopics
- `POST /api/dataforseo/content/generate-meta-tags` - Generate meta tags

All routes require authentication (user must be logged in).

## Pricing

DataForSEO Content Generation API pricing:

| Endpoint | Price | Cost for 1M |
|----------|-------|-------------|
| Generate Text | $0.00005 per new token | $50 |
| Generate Subtopics | $0.0001 per task | $100 |
| Paraphrase | $0.00015 per token | $150 |
| Check Grammar | $0.00001 per token | $10 |
| Generate Meta Tags | $0.001 per task | $1,000 |

**Example Cost Calculation:**
- Blog post: ~1,500 words ≈ 2,000 tokens
- Generate Text: 2,000 tokens × $0.00005 = $0.10
- Generate Subtopics: 1 task × $0.0001 = $0.0001
- Generate Meta Tags: 1 task × $0.001 = $0.001
- **Total: ~$0.10 per blog post**

## Integration with Keyword Research

DataForSEO Content Generation automatically uses optimized keywords from your keyword research:

1. Research keywords using the SEO tools page (`/admin/seo`)
2. Select keywords for content generation
3. When generating content, the selected keywords are automatically passed to DataForSEO
4. DataForSEO uses these keywords to generate SEO-optimized content

## Fallback Behavior

If DataForSEO Content Generation fails or credentials are not configured, the system automatically falls back to the regular backend API (`BLOG_WRITER_API_URL`).

## Error Handling

All DataForSEO API calls include error handling:
- Invalid credentials: Returns 401 Unauthorized
- API errors: Logs error and falls back to backend API
- Network errors: Retries with exponential backoff

## Monitoring

Check logs for DataForSEO usage:
- Look for `🔷 Using DataForSEO Content Generation API` in logs
- Cost information is logged with each generation
- Errors are logged with full context

## Documentation

- [DataForSEO Content Generation API Docs](https://docs.dataforseo.com/v3/content_generation-overview/)
- [DataForSEO Pricing](https://dataforseo.com/pricing/content-generation-api/content-generation-api)

