# Frontend Integration Guide v1.3.4

**Version:** 1.3.4  
**Date:** 2025-11-20  
**Last Updated:** 2025-11-20 (Added async image generation)  
**Status:** ✅ Production Ready  
**Base URL:** `https://blog-writer-api-dev-kq42l26tuq-od.a.run.app`

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Authentication](#authentication)
4. [Blog Generation Endpoints](#blog-generation-endpoints)
5. [Keyword Research Endpoints](#keyword-research-endpoints)
6. [AI Provider Management](#ai-provider-management)
7. [Image Generation](#image-generation)
8. [Platform Publishing](#platform-publishing)
9. [Error Handling](#error-handling)
10. [TypeScript Types](#typescript-types)
11. [Best Practices](#best-practices)
12. [Migration Guide](#migration-guide)

---

## Overview

The Blog Writer SDK API v1.3.4 provides comprehensive AI-powered blog generation with advanced SEO optimization, keyword research, and multi-platform publishing capabilities.

### Key Features

- ✅ **Unified Blog Generation** - Single endpoint for all blog types
- ✅ **Enhanced Keyword Analysis** - DataForSEO-powered keyword research
- ✅ **Local Business Blogs** - Google Places integration for business reviews
- ✅ **Multi-Provider AI** - OpenAI, Anthropic support with dynamic switching
- ✅ **Image Generation** - Stability AI integration with async Cloud Tasks support
- ✅ **Platform Publishing** - Webflow, Shopify, WordPress support
- ✅ **Batch Processing** - Async job processing for large-scale operations

---

## Quick Start

### Installation

```bash
npm install axios
# or
yarn add axios
```

### Basic Setup

```typescript
// lib/blogWriterApi.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  'https://blog-writer-api-dev-kq42l26tuq-od.a.run.app';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000, // 5 minutes for blog generation
});

export default apiClient;
```

### First Request

```typescript
// Generate a simple blog post
const response = await apiClient.post('/api/v1/blog/generate-unified', {
  blog_type: 'standard',
  topic: 'Introduction to TypeScript',
  keywords: ['typescript', 'programming'],
  tone: 'professional',
  length: 'medium',
});

console.log(response.data.title);
console.log(response.data.content);
```

---

## Authentication

Currently, the API uses environment-based authentication. Future versions will support JWT tokens.

### Environment Variables

```env
NEXT_PUBLIC_API_URL=https://blog-writer-api-dev-kq42l26tuq-od.a.run.app
```

### Future Authentication (Coming Soon)

```typescript
// Future implementation
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## Blog Generation Endpoints

### 1. Unified Blog Generation (Recommended)

**Endpoint:** `POST /api/v1/blog/generate-unified`

Single endpoint for all blog types with intelligent routing.

#### Request Types

##### Standard Blog

```typescript
interface StandardBlogRequest {
  blog_type: 'standard';
  topic: string;
  keywords?: string[];
  tone?: 'professional' | 'casual' | 'academic' | 'conversational' | 'instructional';
  length?: 'short' | 'medium' | 'long';
  format?: 'markdown' | 'html' | 'json';
  target_audience?: string;
  focus_keyword?: string;
  include_introduction?: boolean;
  include_conclusion?: boolean;
  include_faq?: boolean;
  include_toc?: boolean;
  word_count_target?: number;
  custom_instructions?: string;
}
```

**Example:**

```typescript
const response = await apiClient.post('/api/v1/blog/generate-unified', {
  blog_type: 'standard',
  topic: 'Complete Guide to React Hooks',
  keywords: ['react', 'hooks', 'javascript'],
  tone: 'professional',
  length: 'long',
  include_faq: true,
  include_toc: true,
});
```

##### Enhanced Blog

```typescript
interface EnhancedBlogRequest {
  blog_type: 'enhanced';
  topic: string;
  keywords?: string[];
  tone?: ContentTone;
  length?: ContentLength;
  use_google_search?: boolean;
  use_fact_checking?: boolean;
  use_citations?: boolean;
  use_serp_optimization?: boolean;
  use_consensus_generation?: boolean;
  use_knowledge_graph?: boolean;
  use_semantic_keywords?: boolean;
  use_quality_scoring?: boolean;
  target_audience?: string;
  custom_instructions?: string;
  template_type?: string;
  async_mode?: boolean; // Returns job_id if true
}
```

**Example:**

```typescript
const response = await apiClient.post('/api/v1/blog/generate-unified', {
  blog_type: 'enhanced',
  topic: 'Best SEO Practices for 2025',
  keywords: ['SEO', 'search engine optimization'],
  use_google_search: true,
  use_fact_checking: true,
  use_citations: true,
  use_serp_optimization: true,
  async_mode: false,
});
```

##### Local Business Blog

```typescript
interface LocalBusinessBlogRequest {
  blog_type: 'local_business';
  topic: string; // e.g., "best plumbers in Miami"
  location: string; // Required: "Miami, FL" or "33139"
  max_businesses?: number; // 1-20, default: 10
  max_reviews_per_business?: number; // 5-50, default: 20
  tone?: ContentTone;
  length?: ContentLength;
  format?: ContentFormat;
  include_business_details?: boolean;
  include_review_sentiment?: boolean;
  use_google?: boolean; // Use Google Places API
  custom_instructions?: string;
}
```

**Example:**

```typescript
const response = await apiClient.post('/api/v1/blog/generate-unified', {
  blog_type: 'local_business',
  topic: 'best plumbers in Miami',
  location: 'Miami, FL',
  max_businesses: 10,
  max_reviews_per_business: 20,
  tone: 'professional',
  length: 'long',
  include_business_details: true,
  include_review_sentiment: true,
});
```

##### Abstraction Blog

```typescript
interface AbstractionBlogRequest {
  blog_type: 'abstraction';
  topic: string;
  keywords?: string[];
  target_audience?: string;
  content_strategy?: 'SEO_OPTIMIZED' | 'ENGAGEMENT_FOCUSED' | 'CONVERSION_OPTIMIZED';
  tone?: ContentTone;
  length?: ContentLength;
  format?: ContentFormat;
  quality_target?: 'GOOD' | 'HIGH_QUALITY' | 'PUBLICATION_READY';
  preferred_provider?: string;
  additional_context?: Record<string, any>;
  seo_requirements?: Record<string, any>;
}
```

**Example:**

```typescript
const response = await apiClient.post('/api/v1/blog/generate-unified', {
  blog_type: 'abstraction',
  topic: 'Complete Guide to Content Marketing',
  keywords: ['content marketing', 'SEO'],
  content_strategy: 'SEO_OPTIMIZED',
  quality_target: 'PUBLICATION_READY',
  preferred_provider: 'openai',
});
```

#### Response Models

**Standard/Abstraction Response:**

```typescript
interface BlogGenerationResult {
  success: boolean;
  blog_post: {
    title: string;
    content: string;
    meta_description?: string;
  };
  seo_score?: number;
  word_count?: number;
  generation_time_seconds?: number;
  error_message?: string;
}
```

**Enhanced Response:**

```typescript
interface EnhancedBlogGenerationResponse {
  title: string;
  content: string;
  meta_description?: string;
  seo_score?: number;
  quality_scores?: {
    readability?: number;
    seo?: number;
    structure?: number;
    factual?: number;
    uniqueness?: number;
    engagement?: number;
  };
  citations?: Array<{
    text: string;
    source: string;
    url: string;
  }>;
  word_count?: number;
  generation_time_seconds?: number;
}
```

**Local Business Response:**

```typescript
interface LocalBusinessBlogResponse {
  title: string;
  content: string;
  businesses: Array<{
    name: string;
    google_place_id?: string;
    address?: string;
    phone?: string;
    website?: string;
    rating?: number;
    review_count?: number;
    categories?: string[];
  }>;
  total_reviews_aggregated: number;
  generation_time_seconds: number;
  metadata?: {
    sources_used?: string[];
    review_sources?: string[];
    seo_score?: number;
    word_count?: number;
  };
}
```

**Async Job Response (when async_mode=true):**

```typescript
interface CreateJobResponse {
  job_id: string;
  status: 'pending';
  message: string;
  estimated_completion_time?: number;
}
```

### 2. Legacy Endpoints (Still Supported)

#### Standard Blog Generation

**Endpoint:** `POST /api/v1/blog/generate`

```typescript
const response = await apiClient.post('/api/v1/blog/generate', {
  topic: 'Introduction to Next.js',
  keywords: ['nextjs', 'react'],
  tone: 'professional',
  length: 'medium',
});
```

#### Enhanced Blog Generation

**Endpoint:** `POST /api/v1/blog/generate-enhanced`

```typescript
const response = await apiClient.post('/api/v1/blog/generate-enhanced', {
  topic: 'Advanced React Patterns',
  keywords: ['react', 'patterns'],
  use_google_search: true,
  use_fact_checking: true,
});
```

#### Local Business Blog Generation

**Endpoint:** `POST /api/v1/blog/generate-local-business`

```typescript
const response = await apiClient.post('/api/v1/blog/generate-local-business', {
  topic: 'best restaurants in San Francisco',
  location: 'San Francisco, CA',
  max_businesses: 10,
});
```

---

## Keyword Research Endpoints

### 1. Enhanced Keyword Analysis

**Endpoint:** `POST /api/v1/keywords/enhanced`

Comprehensive keyword research with DataForSEO integration.

### 2. Streaming Keyword Analysis ⭐ NEW

**Endpoint:** `POST /api/keywords/analyze/stream` (Next.js proxy)  
**Backend Endpoint:** `POST /api/v1/keywords/enhanced/stream`

Streaming version that provides real-time progress updates through Server-Sent Events (SSE).

**Benefits:**
- ✅ Real-time progress updates (0-100%)
- ✅ Stage-by-stage feedback
- ✅ Better UX with live status
- ✅ Stage-specific data as it becomes available
- ✅ Progressive keyword data loading

**Important Notes:**
- Use `/api/keywords/analyze/stream` (Next.js proxy) for frontend integration
- The proxy forwards requests to the backend Cloud Run endpoint
- Response structure uses `enhanced_analysis` or `keyword_analysis` (check both)
- Related keywords are returned as strings without metrics - you must fetch metrics separately
- Long-tail keywords are also strings - batch fetch metrics for all related/long-tail keywords

**Example:**

```typescript
const response = await fetch('/api/keywords/analyze/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keywords: ['dog grooming'],
    location: 'United States',
    language: 'en',
    search_type: 'enhanced_keyword_analysis',
    include_serp: true,
    max_suggestions_per_keyword: 75,
    serp_depth: 20,
    serp_analysis_type: 'both',
    related_keywords_depth: 1,
    related_keywords_limit: 20,
    keyword_ideas_limit: 50,
    keyword_ideas_type: 'all',
    include_ai_volume: true,
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // Keep incomplete line in buffer
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const update = JSON.parse(line.slice(6));
        
        // Handle different update types
        if (update.type === 'progress') {
          console.log(`Stage: ${update.stage}, Progress: ${update.progress}%`);
          updateProgressBar(update.progress);
          updateStageLabel(update.stage);
          
          // Show stage-specific data if available
          if (update.data) {
            console.log('Stage data:', update.data);
          }
        } else if (update.type === 'result') {
          // Final result received
          handleFinalResult(update.data);
        } else if (update.type === 'error') {
          console.error('Streaming error:', update.error);
          handleError(update.error);
        }
      } catch (e) {
        console.error('Failed to parse SSE message:', e);
      }
    }
  }
}

// Handle final result
async function handleFinalResult(result: any) {
  // Extract keywords from response
  const keywordAnalysis = result.enhanced_analysis || result.keyword_analysis || {};
  
  // Step 1: Extract main keywords
  const mainKeywords = Object.keys(keywordAnalysis);
  
  // Step 2: Extract related_keywords and long_tail_keywords (they are strings without metrics)
  const relatedKeywordsNeedingMetrics: string[] = [];
  
  Object.entries(keywordAnalysis).forEach(([mainKeyword, kwData]: [string, any]) => {
    // Collect related_keywords (strings)
    if (kwData?.related_keywords && Array.isArray(kwData.related_keywords)) {
      relatedKeywordsNeedingMetrics.push(...kwData.related_keywords);
    }
    
    // Collect long_tail_keywords (strings)
    if (kwData?.long_tail_keywords && Array.isArray(kwData.long_tail_keywords)) {
      relatedKeywordsNeedingMetrics.push(...kwData.long_tail_keywords);
    }
  });
  
  // Step 3: Fetch metrics for related keywords in batch
  if (relatedKeywordsNeedingMetrics.length > 0) {
    const metricsResponse = await fetch('/api/keywords/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keywords: relatedKeywordsNeedingMetrics,
        location: 'United States',
        language: 'en',
        include_search_volume: true,
      }),
    });
    
    if (metricsResponse.ok) {
      const metricsData = await metricsResponse.json();
      const metricsAnalysis = metricsData.enhanced_analysis || metricsData.keyword_analysis || {};
      
      // Merge metrics into your keyword list
      // Now you have full metrics for all keywords
      displayKeywordsWithMetrics(keywordAnalysis, metricsAnalysis);
    }
  } else {
    // No related keywords, just display main keywords
    displayKeywordsWithMetrics(keywordAnalysis, {});
  }
}
```

**Stages:**
1. `initializing` (5%) - Starting search
2. `detecting_location` (10-15%) - Detecting user location
3. `analyzing_keywords` (20-30%) - Analyzing primary keywords
4. `getting_suggestions` (40-45%) - Fetching suggestions
5. `analyzing_suggestions` (50-55%) - Analyzing suggested keywords
6. `clustering_keywords` (60-65%) - Clustering by topic
7. `getting_ai_data` (70-75%) - Getting AI metrics
8. `getting_related_keywords` (80-82%) - Finding related keywords (returns as strings)
9. `getting_keyword_ideas` (85-88%) - Getting ideas (questions/topics)
10. `analyzing_serp` (92-95%) - Analyzing SERP (if requested)
11. `building_discovery` (98%) - Building final results
12. `completed` (100%) - Final results

**Response Structure:**

```typescript
interface StreamingProgressUpdate {
  type: 'progress' | 'result' | 'error';
  stage?: string;
  progress?: number;
  data?: any;
  error?: string;
}

interface StreamingResult {
  enhanced_analysis: Record<string, KeywordData>;
  keyword_analysis?: Record<string, KeywordData>; // Fallback if enhanced_analysis not available
  total_keywords: number;
  cluster_summary?: {
    total_keywords: number;
    cluster_count: number;
    unclustered_count: number;
  };
  suggested_keywords?: string[]; // Top-level suggestions
}

interface KeywordData {
  search_volume: number;
  global_search_volume: number;
  monthly_searches: Array<{ year: number; month: number; search_volume: number }>;
  difficulty: string; // "easy" | "medium" | "hard"
  difficulty_score: number;
  competition: number; // 0-1
  cpc: number;
  cpc_currency: string | null;
  trend_score: number;
  recommended: boolean;
  reason: string;
  related_keywords: string[]; // ⚠️ Array of strings - no metrics!
  related_keywords_enhanced: Array<{ // ⚠️ Usually empty - use related_keywords instead
    keyword: string;
    search_volume: number;
    cpc: number;
    competition: number;
    difficulty_score: number;
  }>;
  long_tail_keywords: string[]; // ⚠️ Array of strings - no metrics!
  questions: Array<{ // ⚠️ Usually empty
    keyword: string;
    search_volume: number;
    cpc: number;
    competition: number;
    difficulty_score: number;
  }>;
  topics: Array<{ // ⚠️ Usually empty
    keyword: string;
    search_volume: number;
    cpc: number;
    competition: number;
    difficulty_score: number;
  }>;
  keyword_ideas: any[];
  parent_topic?: string;
  category_type?: 'topic' | 'question' | 'action' | 'entity';
  cluster_score?: number;
}
```

**⚠️ Important: Extracting All Keywords**

The API returns:
- **Main keywords** in `enhanced_analysis` with full metrics
- **Related keywords** as strings in `related_keywords` array (no metrics)
- **Long-tail keywords** as strings in `long_tail_keywords` array (no metrics)

To display all keywords with proper metrics:

1. Extract main keywords from `enhanced_analysis`
2. Extract `related_keywords` and `long_tail_keywords` arrays (they're strings)
3. Make a batch API call to `/api/keywords/analyze` to get metrics for all related/long-tail keywords
4. Merge the results to display all keywords with proper search volume, CPC, competition, etc.

See `FRONTEND_KEYWORD_STREAMING_GUIDE.md` for complete streaming documentation.

#### Request

```typescript
interface EnhancedKeywordAnalysisRequest {
  keywords: string[]; // Up to 200 keywords
  location?: string; // Default: "United States"
  language?: string; // Default: "en"
  search_type?: 
    | 'competitor_analysis'
    | 'content_research'
    | 'quick_analysis'
    | 'comprehensive_analysis'
    | 'enhanced_keyword_analysis'; // Default
  include_serp?: boolean; // Include SERP analysis (slower)
  max_suggestions_per_keyword?: number; // 5-150, default: 75
  
  // SERP Customization (v1.3.3)
  serp_depth?: number; // 5-100, default: 20
  serp_prompt?: string; // Custom prompt for AI summary
  include_serp_features?: string[]; // ["featured_snippet", "people_also_ask", "videos", "images"]
  serp_analysis_type?: "basic" | "ai_summary" | "both"; // Default: "both"
  
  // Related Keywords Customization (v1.3.3)
  related_keywords_depth?: number; // 1-4, default: 1
  related_keywords_limit?: number; // 5-100, default: 20
  
  // Keyword Ideas Customization (v1.3.3)
  keyword_ideas_limit?: number; // 10-200, default: 50
  keyword_ideas_type?: "all" | "questions" | "topics"; // Default: "all"
  
  // AI Volume Customization (v1.3.3)
  include_ai_volume?: boolean; // Default: true
  ai_volume_timeframe?: number; // 1-24 months, default: 12
}
```

#### Example (Non-Streaming)

```typescript
const response = await apiClient.post('/api/keywords/analyze', {
  keywords: ['dog grooming'],
  location: 'United States',
  language: 'en',
  search_type: 'enhanced_keyword_analysis',
  max_suggestions_per_keyword: 75,
  include_serp: true,
  serp_depth: 20,
  serp_analysis_type: 'both',
  related_keywords_depth: 1,
  related_keywords_limit: 20,
  keyword_ideas_limit: 50,
  keyword_ideas_type: 'all',
  include_ai_volume: true,
});
```

#### Response Structure

**Important:** The response may contain `enhanced_analysis` OR `keyword_analysis` (or both). Always check both:

```typescript
interface EnhancedKeywordAnalysisResponse {
  // Primary response structure - check both locations
  enhanced_analysis?: Record<string, KeywordData>;
  keyword_analysis?: Record<string, KeywordData>; // Fallback if enhanced_analysis not available
  
  // Top-level arrays
  suggested_keywords?: string[]; // Array of keyword strings
  original_keywords?: string[]; // Original keywords searched
  
  // Clustering data
  clusters?: Array<{
    parent_topic: string;
    keywords: string[];
    cluster_score: number;
    category_type?: 'topic' | 'question' | 'action' | 'entity';
    keyword_count: number;
  }>;
  cluster_summary?: {
    total_keywords: number;
    cluster_count: number;
    unclustered_count: number;
  };
  
  // SERP Analysis (if include_serp: true)
  serp_analysis?: {
    organic_results: Array<{
      title: string;
      url: string;
      domain: string;
      snippet: string;
      position: number;
    }>;
    people_also_ask: Array<{
      question: string;
      snippet: string;
    }>;
    featured_snippet?: {
      title: string;
      snippet: string;
      url: string;
    };
  };
  
  // Discovery data
  discovery?: {
    matching_terms: any[];
    related_terms: any[];
  };
  
  total_keywords: number;
  location?: string;
  saved_search_id?: string; // If search was saved to database
}

interface KeywordData {
  // Core metrics
  search_volume: number;
  global_search_volume: number;
  monthly_searches: Array<{
    year: number;
    month: number;
    search_volume: number;
  }>;
  difficulty: string; // "easy" | "medium" | "hard"
  difficulty_score: number; // 0-100
  competition: number; // 0-1 decimal
  cpc: number; // Cost per click
  cpc_currency: string | null;
  
  // Trend data
  trend_score: number; // -1 to 1, negative = declining
  clicks?: number | null;
  cps?: number | null;
  
  // Recommendations
  recommended: boolean;
  reason: string;
  
  // Related keywords - ⚠️ IMPORTANT: These are STRINGS without metrics
  related_keywords: string[]; // Array of keyword strings
  related_keywords_enhanced: Array<{ // Usually empty - use related_keywords instead
    keyword: string;
    search_volume: number;
    cpc: number;
    competition: number;
    difficulty_score: number;
  }>;
  
  // Long-tail keywords - ⚠️ IMPORTANT: These are STRINGS without metrics
  long_tail_keywords: string[]; // Array of keyword strings
  
  // Questions and topics - Usually empty arrays
  questions: Array<{
    keyword: string;
    search_volume: number;
    cpc: number;
    competition: number;
    difficulty_score: number;
  }>;
  topics: Array<{
    keyword: string;
    search_volume: number;
    cpc: number;
    competition: number;
    difficulty_score: number;
  }>;
  
  // Keyword ideas
  keyword_ideas: any[];
  
  // Clustering data
  parent_topic?: string;
  category_type?: 'topic' | 'question' | 'action' | 'entity';
  cluster_score?: number;
  
  // AI metrics (if include_ai_volume: true)
  ai_search_volume?: number;
  ai_trend?: number;
  ai_monthly_searches?: Array<{ year: number; month: number; search_volume: number }>;
  
  // Additional fields
  traffic_potential?: number | null;
  serp_features?: string[];
  serp_feature_counts?: Record<string, number>;
  also_rank_for?: string[];
  also_talk_about?: string[];
  top_competitors?: string[];
  primary_intent?: string | null;
  intent_probabilities?: Record<string, number>;
  first_seen?: string | null;
  last_updated?: string | null;
}
```

**⚠️ Critical: Extracting All Keywords with Metrics**

The API response structure means you need to:

1. **Extract main keywords** from `enhanced_analysis` or `keyword_analysis`:
   ```typescript
   const keywordAnalysis = response.enhanced_analysis || response.keyword_analysis || {};
   const mainKeywords = Object.keys(keywordAnalysis); // These have full metrics
   ```

2. **Extract related/long-tail keywords** (they're strings without metrics):
   ```typescript
   const relatedKeywords: string[] = [];
   const longTailKeywords: string[] = [];
   
   Object.values(keywordAnalysis).forEach((kwData: KeywordData) => {
     relatedKeywords.push(...(kwData.related_keywords || []));
     longTailKeywords.push(...(kwData.long_tail_keywords || []));
   });
   ```

3. **Fetch metrics for related keywords** via batch API call:
   ```typescript
   const allKeywordsNeedingMetrics = [...relatedKeywords, ...longTailKeywords];
   
   if (allKeywordsNeedingMetrics.length > 0) {
     const metricsResponse = await fetch('/api/keywords/analyze', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         keywords: allKeywordsNeedingMetrics,
         location: 'United States',
         language: 'en',
         include_search_volume: true,
       }),
     });
     
     const metricsData = await metricsResponse.json();
     const metricsAnalysis = metricsData.enhanced_analysis || metricsData.keyword_analysis || {};
     
     // Now merge metricsAnalysis with your keyword list
   }
   ```

4. **Display all keywords** with proper metrics (search volume, CPC, competition, difficulty)

### 2. Standard Keyword Analysis

**Endpoint:** `POST /api/v1/keywords/analyze`

Basic keyword analysis without DataForSEO.

```typescript
const response = await apiClient.post('/api/v1/keywords/analyze', {
  keywords: ['react', 'vue', 'angular'],
  location: 'United States',
  language: 'en',
});
```

### 3. Keyword Suggestions

**Endpoint:** `POST /api/v1/keywords/suggest`

Get keyword suggestions based on a seed keyword.

```typescript
const response = await apiClient.post('/api/v1/keywords/suggest', {
  keyword: 'web development',
  limit: 20, // 5-150
});
```

### 4. Keyword Extraction

**Endpoint:** `POST /api/v1/keywords/extract`

Extract keywords from existing content.

```typescript
const response = await apiClient.post('/api/v1/keywords/extract', {
  content: 'Your blog post content here...',
  max_keywords: 20, // 5-200
  max_ngram: 3,
  dedup_lim: 0.7,
});
```

### 5. Keyword Difficulty

**Endpoint:** `POST /api/v1/keywords/difficulty`

Analyze keyword difficulty.

```typescript
const response = await apiClient.post('/api/v1/keywords/difficulty', {
  keyword: 'web development',
  search_volume: 10000,
  difficulty: 50.0,
  competition: 0.5,
  location: 'United States',
  language: 'en',
});
```

---

## AI Provider Management

### List Providers

**Endpoint:** `GET /api/v1/ai/providers/list`

```typescript
const response = await apiClient.get('/api/v1/ai/providers/list');
// Returns: { providers: [...], default_provider: 'openai' }
```

### Configure Provider

**Endpoint:** `POST /api/v1/ai/providers/configure`

```typescript
const response = await apiClient.post('/api/v1/ai/providers/configure', {
  provider_type: 'openai', // or 'anthropic'
  api_key: 'sk-...',
  model: 'gpt-4', // Optional
  enabled: true,
});
```

### Test Provider

**Endpoint:** `POST /api/v1/ai/providers/test`

```typescript
const response = await apiClient.post('/api/v1/ai/providers/test', {
  provider_type: 'openai',
  api_key: 'sk-...',
  test_prompt: 'Write a short blog introduction',
});
```

### Health Check

**Endpoint:** `GET /api/v1/ai/health`

```typescript
const response = await apiClient.get('/api/v1/ai/health');
// Returns provider status and usage statistics
```

---

## Image Generation

### Generate Image (Synchronous)

**Endpoint:** `POST /api/v1/images/generate`

```typescript
const response = await apiClient.post('/api/v1/images/generate', {
  prompt: 'A futuristic cityscape at sunset',
  provider: 'stability_ai',
  style?: 'photographic' | 'digital-art' | 'anime' | '3d-model',
  aspect_ratio?: '16:9' | '1:1' | '9:16',
  quality?: 'draft' | 'standard' | 'high' | 'ultra',
  num_images?: number, // 1-4
});
```

### Generate Image (Asynchronous) ⭐ NEW

**Endpoint:** `POST /api/v1/images/generate-async`

Create an async image generation job via Cloud Tasks. Returns immediately with `job_id` for polling.

```typescript
// Create async job
const jobResponse = await apiClient.post('/api/v1/images/generate-async', {
  prompt: 'A beautiful sunset over mountains',
  quality: 'draft', // Use 'draft' for fast previews (~3 seconds)
  provider: 'stability_ai',
  style: 'photographic',
  aspect_ratio: '16:9',
  blog_id: 'optional-blog-id', // Link to blog if generating for a blog
  blog_job_id: 'optional-blog-job-id'
});

// Response:
// {
//   job_id: "uuid",
//   status: "queued",
//   message: "Image generation job queued successfully",
//   estimated_completion_time: 5, // seconds
//   is_draft: true
// }

// Poll for completion
const pollJobStatus = async (jobId: string) => {
  const maxAttempts = 60; // 5 minutes max
  for (let i = 0; i < maxAttempts; i++) {
    const status = await apiClient.get(`/api/v1/images/jobs/${jobId}`);
    
    if (status.data.status === 'completed') {
      return status.data.result; // Contains images array
    }
    
    if (status.data.status === 'failed') {
      throw new Error(status.data.error_message);
    }
    
    // Wait before next poll (exponential backoff)
    await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(1.5, i), 10000)));
  }
  
  throw new Error('Job timeout');
};

// Get result
const result = await pollJobStatus(jobResponse.data.job_id);
const imageUrl = result.images[0].url;
```

### Batch Image Generation ⭐ NEW

**Endpoint:** `POST /api/v1/images/batch-generate`

Generate multiple images asynchronously. Perfect for generating all images needed for a blog post.

```typescript
const batchResponse = await apiClient.post('/api/v1/images/batch-generate', {
  images: [
    {
      prompt: 'Hero image for blog post',
      quality: 'draft',
      aspect_ratio: '16:9'
    },
    {
      prompt: 'Featured image',
      quality: 'draft',
      aspect_ratio: '1:1'
    },
    {
      prompt: 'Inline image 1',
      quality: 'draft',
      aspect_ratio: '4:3'
    }
  ],
  blog_id: 'blog-uuid',
  blog_job_id: 'blog-job-uuid',
  workflow: 'draft_then_final' // or 'final_only'
});

// Response:
// {
//   batch_id: "uuid",
//   job_ids: ["job-1", "job-2", "job-3"],
//   status: "queued",
//   total_images: 3,
//   estimated_completion_time: 15
// }

// Poll all jobs
const statuses = await Promise.all(
  batchResponse.data.job_ids.map(id => 
    apiClient.get(`/api/v1/images/jobs/${id}`)
  )
);

// Check if all completed
const allCompleted = statuses.every(s => s.data.status === 'completed');
```

### Get Job Status ⭐ NEW

**Endpoint:** `GET /api/v1/images/jobs/{job_id}`

Check the status of an async image generation job.

```typescript
const status = await apiClient.get(`/api/v1/images/jobs/${jobId}`);

// Response:
// {
//   job_id: "uuid",
//   status: "completed", // "pending" | "queued" | "processing" | "completed" | "failed"
//   progress_percentage: 100.0,
//   current_stage: "processing_result",
//   created_at: "2025-11-20T10:00:00Z",
//   started_at: "2025-11-20T10:00:01Z",
//   completed_at: "2025-11-20T10:00:06Z",
//   result: {
//     success: true,
//     images: [{ url: "https://...", width: 1024, height: 1024 }],
//     generation_time_seconds: 5.2,
//     provider: "stability_ai",
//     model: "stable-diffusion-xl-1024-v1-0",
//     cost: 0.002
//   },
//   is_draft: true,
//   estimated_time_remaining: null
// }
```

### Image Variations

**Endpoint:** `POST /api/v1/images/variations`

```typescript
const response = await apiClient.post('/api/v1/images/variations', {
  image_url: 'https://...',
  provider: 'stability_ai',
  strength?: number, // 0-1
  num_variations?: number,
});
```

### Upscale Image

**Endpoint:** `POST /api/v1/images/upscale`

```typescript
const response = await apiClient.post('/api/v1/images/upscale', {
  image_url: 'https://...',
  provider: 'stability_ai',
  scale?: number, // 2 or 4
});
```

---

## Platform Publishing

### Publish to Webflow

**Endpoint:** `POST /api/v1/publish/webflow`

```typescript
const response = await apiClient.post('/api/v1/publish/webflow', {
  blog_result: {
    title: 'Blog Title',
    content: 'Blog content...',
  },
  platform: 'webflow',
  publish: true,
  categories: ['Technology'],
  tags: ['react', 'javascript'],
});
```

### Publish to Shopify

**Endpoint:** `POST /api/v1/publish/shopify`

```typescript
const response = await apiClient.post('/api/v1/publish/shopify', {
  blog_result: { /* ... */ },
  platform: 'shopify',
  publish: true,
});
```

### Publish to WordPress

**Endpoint:** `POST /api/v1/publish/wordpress`

```typescript
const response = await apiClient.post('/api/v1/publish/wordpress', {
  blog_result: { /* ... */ },
  platform: 'wordpress',
  publish: true,
  categories: ['Technology'],
});
```

---

## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  detail: string;
  error?: string;
  status_code?: number;
}
```

### Example Error Handling

```typescript
try {
  const response = await apiClient.post('/api/v1/blog/generate-unified', {
    blog_type: 'standard',
    topic: 'Test',
  });
} catch (error) {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      // Server responded with error
      console.error('Error:', error.response.data.detail);
      console.error('Status:', error.response.status);
    } else if (error.request) {
      // Request made but no response
      console.error('No response received');
    } else {
      // Error setting up request
      console.error('Error:', error.message);
    }
  }
}
```

### Common Error Codes

- `400` - Bad Request (invalid parameters)
- `404` - Not Found (endpoint or resource not found)
- `500` - Internal Server Error
- `503` - Service Unavailable (provider not configured)

---

## TypeScript Types

### Complete Type Definitions

```typescript
// lib/types/blogWriter.ts

export type BlogType = 'standard' | 'enhanced' | 'local_business' | 'abstraction';
export type ContentTone = 'professional' | 'casual' | 'academic' | 'conversational' | 'instructional';
export type ContentLength = 'short' | 'medium' | 'long';
export type ContentFormat = 'markdown' | 'html' | 'json';
export type ContentStrategy = 'SEO_OPTIMIZED' | 'ENGAGEMENT_FOCUSED' | 'CONVERSION_OPTIMIZED';
export type ContentQuality = 'GOOD' | 'HIGH_QUALITY' | 'PUBLICATION_READY';

export interface UnifiedBlogRequest {
  blog_type: BlogType;
  topic: string;
  keywords?: string[];
  tone?: ContentTone;
  length?: ContentLength;
  format?: ContentFormat;
  
  // Standard/Enhanced fields
  target_audience?: string;
  focus_keyword?: string;
  include_introduction?: boolean;
  include_conclusion?: boolean;
  include_faq?: boolean;
  include_toc?: boolean;
  word_count_target?: number;
  custom_instructions?: string;
  
  // Enhanced fields
  use_google_search?: boolean;
  use_fact_checking?: boolean;
  use_citations?: boolean;
  use_serp_optimization?: boolean;
  use_consensus_generation?: boolean;
  use_knowledge_graph?: boolean;
  use_semantic_keywords?: boolean;
  use_quality_scoring?: boolean;
  template_type?: string;
  async_mode?: boolean;
  
  // Local Business fields
  location?: string;
  max_businesses?: number;
  max_reviews_per_business?: number;
  include_business_details?: boolean;
  include_review_sentiment?: boolean;
  use_google?: boolean;
  
  // Abstraction fields
  content_strategy?: ContentStrategy;
  quality_target?: ContentQuality;
  preferred_provider?: string;
  additional_context?: Record<string, any>;
  seo_requirements?: Record<string, any>;
}

export interface BlogGenerationResult {
  success: boolean;
  blog_post: {
    title: string;
    content: string;
    meta_description?: string;
  };
  seo_score?: number;
  word_count?: number;
  generation_time_seconds?: number;
  error_message?: string;
}

export interface EnhancedBlogGenerationResponse {
  title: string;
  content: string;
  meta_description?: string;
  seo_score?: number;
  quality_scores?: {
    readability?: number;
    seo?: number;
    structure?: number;
    factual?: number;
    uniqueness?: number;
    engagement?: number;
  };
  citations?: Array<{
    text: string;
    source: string;
    url: string;
  }>;
  word_count?: number;
  generation_time_seconds?: number;
}

export interface LocalBusinessBlogResponse {
  title: string;
  content: string;
  businesses: Array<{
    name: string;
    google_place_id?: string;
    address?: string;
    phone?: string;
    website?: string;
    rating?: number;
    review_count?: number;
    categories?: string[];
  }>;
  total_reviews_aggregated: number;
  generation_time_seconds: number;
  metadata?: Record<string, any>;
}

export interface CreateJobResponse {
  job_id: string;
  status: 'pending';
  message: string;
  estimated_completion_time?: number;
}

export type BlogGenerationResponse = 
  | BlogGenerationResult 
  | EnhancedBlogGenerationResponse 
  | LocalBusinessBlogResponse 
  | CreateJobResponse;
```

---

## Best Practices

### 1. Use Unified Endpoint

Always use `/api/v1/blog/generate-unified` for new integrations. It provides:
- Single consistent interface
- Type-safe routing
- Future-proof design

### 2. Handle Async Jobs

For long-running operations, use `async_mode: true`:

```typescript
// Start async job
const jobResponse = await apiClient.post('/api/v1/blog/generate-unified', {
  blog_type: 'enhanced',
  topic: '...',
  async_mode: true,
});

const jobId = jobResponse.data.job_id;

// Poll for completion
const checkStatus = async () => {
  const status = await apiClient.get(`/api/v1/blog/jobs/${jobId}`);
  if (status.data.status === 'completed') {
    return status.data.result;
  } else if (status.data.status === 'failed') {
    throw new Error(status.data.error);
  }
  // Poll again after delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  return checkStatus();
};
```

### 3. Error Handling

Always implement comprehensive error handling:

```typescript
const generateBlog = async (request: UnifiedBlogRequest) => {
  try {
    const response = await apiClient.post('/api/v1/blog/generate-unified', request);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 400) {
        // Handle validation errors
        throw new Error(`Invalid request: ${error.response.data.detail}`);
      } else if (error.response?.status === 500) {
        // Handle server errors
        throw new Error('Server error. Please try again later.');
      }
    }
    throw error;
  }
};
```

### 4. Request Timeouts

Set appropriate timeouts for different operations:

```typescript
// Short operations (keyword analysis)
const keywordClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 1 minute
});

// Long operations (blog generation)
const blogClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes
});
```

### 5. Retry Logic

Implement retry logic for transient failures:

```typescript
const retryRequest = async (fn: () => Promise<any>, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

---

## Migration Guide

### From v1.3.2 to v1.3.4

#### 1. Update Endpoint URLs

```typescript
// Old
const response = await apiClient.post('/api/v1/blog/generate', {...});

// New (Recommended)
const response = await apiClient.post('/api/v1/blog/generate-unified', {
  blog_type: 'standard',
  ...request
});
```

#### 2. Update Request Models

```typescript
// Old
interface BlogRequest {
  topic: string;
  keywords: string[];
  // ...
}

// New
interface UnifiedBlogRequest {
  blog_type: 'standard' | 'enhanced' | 'local_business' | 'abstraction';
  topic: string;
  keywords?: string[];
  // ... conditional fields based on blog_type
}
```

#### 3. Handle New Response Types

```typescript
// Old
const result: BlogGenerationResult = response.data;

// New
const result: BlogGenerationResponse = response.data;
// Type depends on blog_type
```

#### 4. Local Business Blogs

```typescript
// New feature - no migration needed
const response = await apiClient.post('/api/v1/blog/generate-unified', {
  blog_type: 'local_business',
  topic: 'best restaurants in NYC',
  location: 'New York, NY',
});
```

---

## Support & Resources

- **API Documentation:** `/docs` (Swagger UI)
- **ReDoc Documentation:** `/redoc`
- **Health Check:** `/health`
- **Status:** `/api/v1/config`

---

**Version:** 1.3.4  
**Last Updated:** 2025-11-20  
**Maintained by:** Blog Writer SDK Team

