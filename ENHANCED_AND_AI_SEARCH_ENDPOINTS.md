# Enhanced Search & AI Search Endpoints

## Overview

The system provides multiple endpoints for keyword research with both traditional SEO analysis and AI-powered search capabilities.

---

## 1. Enhanced Keyword Analysis Endpoint

**Endpoint:** `POST /api/keywords/analyze`

**Description:** Comprehensive keyword analysis with enhanced features including SERP analysis, related keywords, and AI volume data.

### Request Parameters

```typescript
{
  keywords: string[];                    // Required: Array of keywords to analyze
  location?: string;                     // Default: "United States"
  language?: string;                     // Default: "en"
  search_type?: 
    | "competitor_analysis"
    | "content_research"
    | "quick_analysis"
    | "comprehensive_analysis"
    | "enhanced_keyword_analysis";       // Enhanced mode with full features
  include_search_volume?: boolean;      // Default: true
  include_serp?: boolean;                // Include SERP analysis
  serp_depth?: number;                   // Default: 20, Range: 5-100
  serp_prompt?: string;                 // Custom prompt for AI summary
  include_serp_features?: string[];     // ["featured_snippet", "people_also_ask", "videos", "images"]
  serp_analysis_type?: "basic" | "ai_summary" | "both";
  related_keywords_depth?: number;      // Default: 1, Range: 1-4
  related_keywords_limit?: number;      // Default: 20, Range: 5-100
  keyword_ideas_limit?: number;         // Default: 50, Range: 10-200
  keyword_ideas_type?: "all" | "questions" | "topics";
  include_ai_volume?: boolean;          // Default: true
  ai_volume_timeframe?: number;         // Default: 12, Range: 1-24 (months)
}
```

### Response Format

```typescript
{
  keyword_analysis: {
    [keyword: string]: {
      keyword: string;
      search_volume: number;
      difficulty: "very_easy" | "easy" | "medium" | "hard" | "very_hard";
      competition: number;              // 0.0-1.0
      cpc: number;
      primary_intent: "informational" | "navigational" | "commercial" | "transactional";
      trend_score: number;
      parent_topic?: string;
      related_keywords?: string[];
      // Enhanced features:
      serp_analysis?: SERPAnalysis;
      ai_search_volume?: number;
      keyword_ideas?: KeywordIdea[];
      relevant_pages?: RelevantPage[];
    }
  }
}
```

### Usage Example

```typescript
const response = await fetch('/api/keywords/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keywords: ['content marketing'],
    location: 'United States',
    language: 'en',
    search_type: 'enhanced_keyword_analysis',
    include_serp: true,
    serp_analysis_type: 'both',
    include_ai_volume: true,
  }),
});
```

---

## 2. AI Topic Suggestions Endpoint

**Endpoint:** `POST /api/keywords/ai-topic-suggestions`

**Description:** AI-powered topic suggestions optimized for LLM/AI search engines (ChatGPT, Perplexity, etc.) with AI search volume and mentions data.

### Request Parameters

```typescript
{
  keywords?: string[];                  // Optional: Keywords to analyze
  content_objective?: string;           // Optional: Content objective/description
  target_audience?: string;             // Optional: Target audience description
  industry?: string;                    // Optional: Industry/niche
  content_goals?: string[];             // Optional: Content goals
  location?: string;                     // Default: "United States"
  language?: string;                     // Default: "en"
  include_ai_search_volume?: boolean;  // Default: true
  include_llm_mentions?: boolean;       // Default: true
  include_llm_responses?: boolean;      // Default: false
  limit?: number;                       // Default: 50
}
```

**Note:** Either `keywords` OR `content_objective` must be provided.

### Response Format

```typescript
{
  topic_suggestions: Array<{
    topic: string;
    ai_search_volume: number;
    ai_optimization_score: number;      // 0-100
    mentions_count: number;
    platform: "chat_gpt" | "google";
    // Additional fields...
  }>;
  ai_metrics: {
    search_volume: Record<string, any>;
    llm_mentions: Record<string, LLMMentionsData>;
  };
}
```

### Usage Example

```typescript
const response = await fetch('/api/keywords/ai-topic-suggestions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keywords: ['content marketing'],
    location: 'United States',
    language: 'en',
    include_ai_search_volume: true,
    include_llm_mentions: true,
  }),
});
```

---

## 3. Combined Research Stream Endpoint

**Endpoint:** `POST /api/keywords/research/stream`

**Description:** Server-side streaming endpoint that combines traditional and AI search, with caching and database storage.

### Request Parameters

```typescript
{
  keyword: string;                      // Required: Primary keyword
  location?: string;                    // Default: "United States"
  language?: string;                    // Default: "en"
  searchType?: 'traditional' | 'ai' | 'both';  // Default: "traditional"
  useCache?: boolean;                   // Default: true
  autoStore?: boolean;                  // Default: true
}
```

### Response Format (SSE Stream)

The endpoint streams Server-Sent Events (SSE) with the following event types:

- `progress` - Progress updates during research
- `complete` - Final results
- `error` - Error messages

**Progress Events:**
```typescript
{
  type: 'progress',
  stage: 'checking_cache' | 'checking_database' | 'fetching_api' | 
         'analyzing_traditional' | 'analyzing_ai' | 'storing_results' | 'complete',
  progress: number,                    // 0-100
  message: string;
}
```

**Complete Event:**
```typescript
{
  type: 'complete',
  keyword: string;
  traditionalData?: {
    keyword: string;
    search_volume: number;
    keyword_difficulty: number;        // 0-100
    competition: number;
    cpc: number;
    search_intent: string;
    trend_score: number;
    parent_topic?: string;
    related_keywords: string[];
  };
  aiData?: {
    keyword: string;
    ai_search_volume: number;
    ai_optimization_score: number;
    ai_recommended: boolean;
    ai_mentions_count: number;
    ai_platform: string;
  };
  relatedTerms: Array<KeywordData>;
  matchingTerms: Array<KeywordData>;
  source: 'cache' | 'database' | 'api';
  cached: boolean;
}
```

### Usage Example

```typescript
const eventSource = new EventSource('/api/keywords/research/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keyword: 'content marketing',
    location: 'United States',
    language: 'en',
    searchType: 'both',  // Get both traditional and AI results
    useCache: true,
    autoStore: true,
  }),
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'progress') {
    console.log(`Progress: ${data.progress}% - ${data.message}`);
  } else if (data.type === 'complete') {
    console.log('Results:', data);
  }
};
```

---

## 4. LLM Research Endpoint

**Endpoint:** `POST /api/keywords/llm-research`

**Description:** LLM-powered keyword research using AI models to analyze and suggest keywords.

### Request Parameters

```typescript
{
  keywords: string[];                  // Required: Keywords to research
  location?: string;
  language?: string;
  // Additional LLM-specific parameters...
}
```

**Note:** This endpoint may not be available on all backend versions. Check availability before use.

---

## Comparison Table

| Feature | Enhanced Analysis | AI Topic Suggestions | Research Stream |
|---------|------------------|---------------------|-----------------|
| **Traditional SEO** | ✅ Yes | ❌ No | ✅ Yes (optional) |
| **AI Search Volume** | ✅ Yes | ✅ Yes | ✅ Yes (optional) |
| **LLM Mentions** | ❌ No | ✅ Yes | ✅ Yes (optional) |
| **SERP Analysis** | ✅ Yes | ❌ No | ❌ No |
| **Streaming** | ❌ No | ❌ No | ✅ Yes |
| **Caching** | ❌ No | ❌ No | ✅ Yes |
| **Database Storage** | ✅ Yes | ❌ No | ✅ Yes |
| **Multiple Keywords** | ✅ Yes | ✅ Yes | ❌ Single keyword |

---

## Recommended Usage

### For Traditional SEO Research
Use `/api/keywords/analyze` with `search_type: "enhanced_keyword_analysis"`

### For AI-Optimized Content
Use `/api/keywords/ai-topic-suggestions` with `include_ai_search_volume: true`

### For Combined Research with Progress Updates
Use `/api/keywords/research/stream` with `searchType: "both"`

---

## Backend API Endpoints

All endpoints proxy to the Blog Writer API:
- Enhanced Analysis: `${BLOG_WRITER_API_URL}/api/v1/keywords/enhanced-analysis`
- AI Topic Suggestions: `${BLOG_WRITER_API_URL}/api/v1/keywords/ai-topic-suggestions`
- LLM Research: `${BLOG_WRITER_API_URL}/api/v1/keywords/llm-research`

---

## Error Handling

All endpoints handle:
- Backend service unavailability (503 errors)
- Cloud Run cold starts (automatic wake-up)
- Missing endpoints (404 fallbacks)
- Invalid parameters (422 validation errors)

---

## Authentication

All endpoints require:
- Authenticated user session (via Supabase)
- User must belong to an organization (`org_id`)

