# Frontend Deployment Guide

**Version**: 1.3.0  
**Last Updated**: 2025-11-14  
**API Base URL**: `https://blog-writer-api-dev-kq42l26tuq-ew.a.run.app`

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [API Endpoints](#api-endpoints)
3. [Request/Response Formats](#requestresponse-formats)
4. [TypeScript Integration](#typescript-integration)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)
7. [Examples](#examples)

---

## Quick Start

### Base Configuration

```typescript
const API_BASE_URL = 'https://blog-writer-api-dev-kq42l26tuq-ew.a.run.app';

const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 600000, // 10 minutes for blog generation
  headers: {
    'Content-Type': 'application/json',
  },
};
```

### Health Check

```typescript
async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    return data.status === 'healthy';
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}
```

---

## API Endpoints

### Core Endpoints

| Endpoint | Method | Description | Timeout |
|----------|--------|-------------|---------|
| `/health` | GET | Health check | 5s |
| `/api/v1/blog/generate-enhanced` | POST | **Recommended**: Enhanced blog generation | 600s |
| `/api/v1/blog/generate` | POST | Standard blog generation | 300s |
| `/api/v1/keywords/enhanced` | POST | Enhanced keyword analysis | 30s |
| `/api/v1/keywords/analyze` | POST | Basic keyword analysis | 10s |

### Additional Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/analyze` | POST | Analyze existing content |
| `/api/v1/optimize` | POST | Optimize content for SEO |
| `/api/v1/keywords/suggest` | POST | Get keyword suggestions |
| `/api/v1/topics/recommend` | POST | Recommend blog topics |

---

## Request/Response Formats

### 1. Enhanced Blog Generation

**Endpoint**: `POST /api/v1/blog/generate-enhanced`

**Request**:

```typescript
interface EnhancedBlogRequest {
  // Required
  topic: string;                    // 3-200 characters
  keywords: string[];               // Min 1 keyword
  
  // Optional - Content Settings
  tone?: 'professional' | 'casual' | 'academic' | 'conversational' | 'instructional';
  length?: 'short' | 'medium' | 'long' | 'extended';
  template_type?: string;          // 'expert_authority' | 'how_to_guide' | 'comparison' | etc.
  
  // Optional - Enhanced Features
  use_google_search?: boolean;     // Default: true
  use_fact_checking?: boolean;     // Default: true
  use_citations?: boolean;         // Default: true
  use_serp_optimization?: boolean; // Default: true
  
  // Optional - Phase 3 Features
  use_consensus_generation?: boolean; // Default: false (higher cost, better quality)
  use_knowledge_graph?: boolean;     // Default: true
  use_semantic_keywords?: boolean;    // Default: true
  use_quality_scoring?: boolean;      // Default: true
  
  // Optional - Additional Context
  target_audience?: string;        // Target audience description
  custom_instructions?: string;     // Max 2000 characters
  
  // Optional - Product Research (for product reviews/comparisons)
  include_product_research?: boolean;
  include_brands?: boolean;
  include_models?: boolean;
  include_prices?: boolean;
  include_features?: boolean;
  include_reviews?: boolean;
  include_pros_cons?: boolean;
  include_product_table?: boolean;
  include_comparison_section?: boolean;
  include_buying_guide?: boolean;
  include_faq_section?: boolean;
  research_depth?: 'basic' | 'standard' | 'comprehensive';
}
```

**Response**:

```typescript
interface EnhancedBlogResponse {
  // Content
  title: string;
  content: string;                 // Markdown format
  meta_title: string;
  meta_description: string;
  
  // Quality Metrics
  readability_score: number;       // 0-100
  seo_score: number;              // 0-100
  quality_score?: number;          // 0-100 (Phase 3)
  quality_dimensions?: {
    readability?: number;
    seo?: number;
    structure?: number;
    factual?: number;
    uniqueness?: number;
    engagement?: number;
  };
  
  // SEO Metadata
  seo_metadata: {
    og_title?: string;
    og_description?: string;
    og_image?: string;
    twitter_card?: string;
    canonical_url?: string;
    // ... more OG/Twitter tags
  };
  
  // Structured Data (Schema.org)
  structured_data?: {
    '@context': string;
    '@type': string;
    // ... schema.org properties
  };
  
  // Content Metadata (for frontend processing)
  content_metadata: {
    headings: Array<{ level: number; text: string; id: string }>;
    images: Array<{ url: string; alt: string; type: 'featured' | 'section' }>;
    links: Array<{ url: string; text: string; type: 'internal' | 'external' }>;
    code_blocks: Array<{ language: string; code: string }>;
    word_count: number;
    reading_time_minutes: number;
  };
  
  // Links
  internal_links: Array<{ url: string; anchor: string }>;
  semantic_keywords: string[];
  
  // Citations
  citations: Array<{ source: string; url: string; title: string }>;
  
  // Performance
  total_tokens: number;
  total_cost: number;              // USD
  generation_time: number;         // seconds
  
  // Progress Tracking
  progress_updates: Array<{
    stage: string;
    progress: number;              // 0-100
    message: string;
    timestamp: string;
  }>;
  
  // Generated Images
  generated_images?: Array<{
    type: 'featured' | 'section';
    image_url: string;
    alt_text: string;
  }>;
  
  // Status
  success: boolean;
  warnings: string[];
}
```

### 2. Enhanced Keyword Analysis

**Endpoint**: `POST /api/v1/keywords/enhanced`

**Request**:

```typescript
interface KeywordAnalysisRequest {
  keywords: string[];                    // Required: 1-200 keywords
  max_suggestions_per_keyword?: number;  // Default: 20, Min: 5
  language?: string;                     // Default: 'en'
  location?: string;                      // Auto-detected from IP if not provided
}
```

**Response**:

```typescript
interface KeywordAnalysisResponse {
  enhanced_analysis: {
    [keyword: string]: {
      // Basic Metrics
      search_volume: number;                    // Local monthly search volume
      global_search_volume?: number;            // Global monthly search volume
      search_volume_by_country?: {              // Search volume breakdown by country
        [countryCode: string]: number;
      };
      monthly_searches?: Array<{                // Historical monthly search data
        month: string;
        search_volume: number;
      }>;
      difficulty: 'easy' | 'medium' | 'hard' | 'very_easy' | 'very_hard';
      competition: number;                      // 0.0-1.0
      cpc: number;                             // Cost per click (organic CPC, not Google Ads)
      cpc_currency?: string;                    // Currency code (e.g., "USD")
      cps?: number;                            // Cost per sale
      clicks?: number;                          // Estimated monthly clicks
      trend_score: number;                     // -1.0 to 1.0
      
      // Enhanced Metrics (v1.3.0)
      parent_topic?: string;                    // Parent topic for clustering
      category_type?: string;                   // Keyword category type
      cluster_score?: number;                   // 0.0-1.0 (clustering confidence)
      
      // AI Optimization (v1.3.0)
      ai_search_volume?: number;               // AI-optimized search volume
      ai_trend?: number;                        // AI trend score (-1.0 to 1.0)
      ai_monthly_searches?: Array<{             // Historical AI search volume
        month: string;
        volume: number;
      }>;
      
      // Traffic & Performance
      traffic_potential?: number;                // Estimated traffic potential
      
      // SERP Features
      serp_features?: string[];                 // SERP features present (PAA, Featured Snippet, etc.)
      serp_feature_counts?: {                   // Counts of SERP features
        [feature: string]: number;
      };
      
      // Related Keywords
      related_keywords: string[];              // Related keyword suggestions
      long_tail_keywords: string[];            // Long-tail variations
      
      // Additional Data (v1.3.0)
      also_rank_for?: string[];                // Keywords that pages ranking for this also rank for
      also_talk_about?: string[];              // Related topics/entities
      top_competitors?: string[];               // Top competing domains
      primary_intent?: string;                  // Primary search intent
      intent_probabilities?: {                  // Intent probability breakdown
        [intent: string]: number;
      };
      first_seen?: string;                      // Date keyword first seen
      last_updated?: string;                    // Date data was last updated
      
      // Recommendations
      recommended: boolean;
      reason: string;
    };
  };
  
  clusters?: Array<{
    parent_topic: string;
    keywords: string[];
    cluster_score: number;
    category_type: string;
    keyword_count: number;
  }>;
  
  cluster_summary?: {
    total_keywords: number;
    cluster_count: number;
    unclustered_count: number;
  };
  
  location?: {
    used: string;
    detected_from_ip: boolean;
    specified: boolean;
  };
  
  discovery?: {
    // Additional discovery data from DataForSEO
    [key: string]: any;
  };
  
  serp_analysis?: {
    // SERP analysis summary
    [key: string]: any;
  };
  
  serp_ai_summary?: {
    // AI-generated SERP summary
    [key: string]: any;
  };
  
  total_keywords: number;
  original_keywords: string[];
  suggested_keywords: string[];
}
```

---

## TypeScript Integration

### Complete TypeScript Client

```typescript
// api-client.ts

const API_BASE_URL = 'https://blog-writer-api-dev-kq42l26tuq-ew.a.run.app';

class BlogWriterAPI {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL: string = API_BASE_URL, timeout: number = 600000) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  async generateBlog(request: EnhancedBlogRequest): Promise<EnhancedBlogResponse> {
    return this.request<EnhancedBlogResponse>('/api/v1/blog/generate-enhanced', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async analyzeKeywords(request: KeywordAnalysisRequest): Promise<KeywordAnalysisResponse> {
    return this.request<KeywordAnalysisResponse>('/api/v1/keywords/enhanced', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async checkHealth(): Promise<{ status: string; version: string }> {
    return this.request<{ status: string; version: string }>('/health');
  }
}

export const blogWriterAPI = new BlogWriterAPI();
```

### React Hook Example

```typescript
// useBlogGeneration.ts

import { useState, useCallback } from 'react';
import { blogWriterAPI, EnhancedBlogRequest, EnhancedBlogResponse } from './api-client';

export function useBlogGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<EnhancedBlogResponse | null>(null);
  const [progress, setProgress] = useState(0);

  const generateBlog = useCallback(async (request: EnhancedBlogRequest) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(0);

    try {
      // Simulate progress updates (in real implementation, use Server-Sent Events or polling)
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 95));
      }, 2000);

      const response = await blogWriterAPI.generateBlog(request);
      
      clearInterval(progressInterval);
      setProgress(100);
      setResult(response);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    generateBlog,
    loading,
    error,
    result,
    progress,
  };
}
```

---

## Error Handling

### Error Response Format

```typescript
interface APIError {
  detail: string | Array<{
    type: string;
    loc: string[];
    msg: string;
    input?: any;
  }>;
}
```

### Error Handling Example

```typescript
async function handleBlogGeneration(request: EnhancedBlogRequest) {
  try {
    const response = await blogWriterAPI.generateBlog(request);
    return { success: true, data: response };
  } catch (error) {
    if (error instanceof Error) {
      // Network/Timeout errors
      if (error.message.includes('timeout') || error.message.includes('fetch')) {
        return {
          success: false,
          error: 'Connection timeout. Please try again.',
          retryable: true,
        };
      }

      // API errors
      if (error.message.includes('HTTP')) {
        return {
          success: false,
          error: error.message,
          retryable: error.message.includes('5'),
        };
      }
    }

    return {
      success: false,
      error: 'An unexpected error occurred',
      retryable: false,
    };
  }
}
```

### Common Error Codes

| Status Code | Meaning | Action |
|-------------|---------|--------|
| 400 | Bad Request | Check request format |
| 401 | Unauthorized | Check API credentials |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Check endpoint URL |
| 429 | Too Many Requests | Implement rate limiting/retry |
| 500 | Internal Server Error | Retry with exponential backoff |
| 503 | Service Unavailable | Service is down, retry later |

---

## Best Practices

### 1. Timeout Configuration

```typescript
// Blog generation: 10 minutes
const BLOG_GENERATION_TIMEOUT = 600000;

// Keyword analysis: 30 seconds
const KEYWORD_ANALYSIS_TIMEOUT = 30000;
```

### 2. Retry Logic

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 3. Progress Tracking

```typescript
// Poll for progress (if endpoint supports it)
async function trackProgress(jobId: string) {
  const interval = setInterval(async () => {
    const status = await fetch(`/api/v1/jobs/${jobId}/status`);
    const data = await status.json();
    
    if (data.status === 'completed') {
      clearInterval(interval);
      return data.result;
    }
    
    updateProgressUI(data.progress);
  }, 2000);
}
```

### 4. Caching

```typescript
// Cache keyword analysis results
const keywordCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour

async function getCachedKeywordAnalysis(keywords: string[]) {
  const key = keywords.sort().join(',');
  const cached = keywordCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await blogWriterAPI.analyzeKeywords({ keywords });
  keywordCache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

### 5. Request Validation

```typescript
function validateBlogRequest(request: EnhancedBlogRequest): string[] {
  const errors: string[] = [];
  
  if (!request.topic || request.topic.length < 3) {
    errors.push('Topic must be at least 3 characters');
  }
  
  if (!request.keywords || request.keywords.length === 0) {
    errors.push('At least one keyword is required');
  }
  
  if (request.custom_instructions && request.custom_instructions.length > 2000) {
    errors.push('Custom instructions must be 2000 characters or less');
  }
  
  return errors;
}
```

---

## Examples

### Example 1: Generate Blog Post

```typescript
const blogRequest: EnhancedBlogRequest = {
  topic: 'How to Start a Notary Business in California',
  keywords: ['notaries in california', 'notary business', 'california notary'],
  tone: 'professional',
  length: 'long',
  use_google_search: true,
  use_citations: true,
  use_serp_optimization: true,
  use_semantic_keywords: true,
  use_quality_scoring: true,
  target_audience: 'Entrepreneurs looking to start a notary business',
  custom_instructions: 'Focus on licensing requirements and startup costs',
};

const result = await blogWriterAPI.generateBlog(blogRequest);

console.log('Title:', result.title);
console.log('Content:', result.content);
console.log('Quality Score:', result.quality_score);
console.log('Images:', result.generated_images);
```

### Example 2: Analyze Keywords

```typescript
const keywordRequest: KeywordAnalysisRequest = {
  keywords: ['notaries in california', 'california notary services'],
  max_suggestions_per_keyword: 20,
  language: 'en',
};

const analysis = await blogWriterAPI.analyzeKeywords(keywordRequest);

// Access results
Object.entries(analysis.enhanced_analysis).forEach(([keyword, data]) => {
  console.log(`${keyword}:`);
  console.log(`  Search Volume: ${data.search_volume}`);
  console.log(`  Difficulty: ${data.difficulty}`);
  console.log(`  Recommended: ${data.recommended}`);
  console.log(`  Related Keywords: ${data.related_keywords.slice(0, 5).join(', ')}`);
});
```

### Example 3: React Component

```typescript
// BlogGenerator.tsx

import React, { useState } from 'react';
import { useBlogGeneration } from './useBlogGeneration';

export function BlogGenerator() {
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const { generateBlog, loading, error, result, progress } = useBlogGeneration();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await generateBlog({
      topic,
      keywords,
      tone: 'professional',
      length: 'medium',
      use_google_search: true,
      use_semantic_keywords: true,
    });
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Blog topic"
        />
        <button type="submit" disabled={loading}>
          Generate Blog
        </button>
      </form>

      {loading && (
        <div>
          <progress value={progress} max={100} />
          <p>Generating blog... {progress}%</p>
        </div>
      )}

      {error && <div className="error">{error.message}</div>}

      {result && (
        <div>
          <h1>{result.title}</h1>
          <div dangerouslySetInnerHTML={{ __html: result.content }} />
        </div>
      )}
    </div>
  );
}
```

---

## Content Processing

### Markdown to HTML

The API returns content in Markdown format. Use a library like `remark` and `rehype` to process it:

```typescript
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

async function processMarkdown(markdown: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown);
  
  return String(file);
}
```

### Using Content Metadata

```typescript
// Extract table of contents from content_metadata
function generateTOC(contentMetadata: ContentMetadata): TOCItem[] {
  return contentMetadata.headings.map((heading) => ({
    level: heading.level,
    text: heading.text,
    id: heading.id,
  }));
}

// Display images
function renderImages(images: ImageMetadata[]) {
  return images.map((img) => (
    <img
      key={img.url}
      src={img.url}
      alt={img.alt}
      className={img.type === 'featured' ? 'featured-image' : 'section-image'}
    />
  ));
}
```

---

## Support & Resources

- **API Documentation**: `/docs` (Swagger UI)
- **Health Check**: `/health`
- **Version**: Check response headers or `/health` endpoint

---

## Changelog

### Version 1.3.0 (2025-11-14)

#### Keyword Analysis Enhancements
- ✅ **Granular Metrics**: Added `global_search_volume`, `search_volume_by_country`, `monthly_searches`
- ✅ **Traffic Metrics**: Added `clicks`, `cps`, `traffic_potential` for better traffic estimation
- ✅ **Clustering**: Added `parent_topic`, `category_type`, `cluster_score` for keyword organization
- ✅ **AI Optimization**: Added `ai_search_volume`, `ai_trend`, `ai_monthly_searches` for AI-optimized content
- ✅ **CPC Fix**: Now returns organic CPC (~$2.00) instead of Google Ads CPC (~$10.05)
- ✅ **Related Data**: Added `also_rank_for`, `also_talk_about`, `top_competitors`
- ✅ **Intent Analysis**: Added `primary_intent`, `intent_probabilities`
- ✅ **SERP Features**: Enhanced `serp_features` and `serp_feature_counts`

#### Blog Generation
- ✅ Improved content metadata structure
- ✅ Enhanced structured data (Schema.org)
- ✅ Better image placement and metadata

#### Documentation
- ✅ Complete TypeScript/React integration guide
- ✅ Error handling patterns
- ✅ Best practices and examples

### Version 1.2.0
- ✅ Multi-stage blog generation pipeline
- ✅ Quality scoring system
- ✅ Semantic keyword integration
- ✅ Content metadata extraction

---

**Last Updated**: 2025-11-14  
**API Version**: 1.3.0

