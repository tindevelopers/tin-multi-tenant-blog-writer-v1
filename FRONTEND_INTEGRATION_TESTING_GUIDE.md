# Frontend Integration & Testing Guide

**Version:** 1.3.6  
**Base URL:** `https://blog-writer-api-dev-kq42l26tuq-od.a.run.app`  
**Last Updated:** 2025-11-23

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Endpoint Testing Summary](#endpoint-testing-summary)
3. [AI Topic Suggestions](#ai-topic-suggestions)
4. [SERP Analysis](#serp-analysis)
5. [Content Generation](#content-generation)
6. [Goal-Based Keyword Analysis](#goal-based-keyword-analysis)
7. [Cost Optimization](#cost-optimization)
8. [Error Handling](#error-handling)
9. [TypeScript Types](#typescript-types)

---

## 🚀 Quick Start

### Base Configuration

```typescript
const API_BASE_URL = 'https://blog-writer-api-dev-kq42l26tuq-od.a.run.app';

const defaultHeaders = {
  'Content-Type': 'application/json',
  // Add authentication headers if needed
};
```

### Testing Checklist

- ✅ AI Topic Suggestions - Working
- ✅ LLM Mentions - Working (with platform fallback)
- ✅ SERP Analysis - Working (via goal-based analysis)
- ✅ Content Generation - Working
- ✅ Enhanced Content Generation - Working

---

## 📊 Endpoint Testing Summary

### Tested & Verified Endpoints

| Endpoint | Status | Cost/Request | Notes |
|----------|--------|--------------|-------|
| `/api/v1/keywords/ai-topic-suggestions` | ✅ Working | ~$0.12 | Requires `limit >= 10` |
| `/api/v1/keywords/ai-mentions` | ✅ Working | ~$0.12 | Platform fallback: `chat_gpt` → `google` |
| `/api/v1/keywords/goal-based-analysis` | ✅ Working | ~$0.15-0.30 | Includes SERP when `include_serp: true` |
| `/api/v1/generate` | ✅ Working | Variable | Basic content generation |
| `/api/v1/blog/generate-enhanced` | ✅ Working | Variable | Multi-stage pipeline |

---

## 🎯 AI Topic Suggestions

### Endpoint

```
POST /api/v1/keywords/ai-topic-suggestions
```

### Request Example

```typescript
interface AITopicSuggestionsRequest {
  keywords: string[];                    // Required: 1-10 keywords
  location?: string;                     // Default: "United States"
  language?: string;                     // Default: "en"
  include_ai_search_volume?: boolean;    // Default: true
  include_llm_mentions?: boolean;        // Default: true
  include_llm_responses?: boolean;        // Default: false
  limit?: number;                        // Default: 50, Min: 10, Max: 200
  content_objective?: string;            // Optional: Content objective
  target_audience?: string;               // Optional: Target audience
  industry?: string;                      // Optional: Industry/niche
  content_goals?: string[];              // Optional: Content goals
}

// Example Request
const request = {
  keywords: ["python", "programming"],
  location: "United States",
  language: "en",
  include_ai_search_volume: true,
  include_llm_mentions: true,
  limit: 10  // Minimum: 10
};

const response = await fetch(`${API_BASE_URL}/api/v1/keywords/ai-topic-suggestions`, {
  method: 'POST',
  headers: defaultHeaders,
  body: JSON.stringify(request)
});

const data = await response.json();
```

### Response Structure

```typescript
interface AITopicSuggestionsResponse {
  seed_keywords: string[];
  location: {
    used: string;
    detected?: string;
  };
  language: string;
  topic_suggestions: Array<{
    topic: string;
    source_keyword: string;
    ai_search_volume: number;
    mentions: number;
    search_volume: number;
    difficulty: number;
    // ... other fields
  }>;
  ai_metrics: {
    search_volume: Record<string, {
      ai_search_volume: number;
      ai_monthly_searches: Array<{
        year: number;
        month: number;
        search_volume: number;
      }>;
      ai_trend: number;
    }>;
    llm_mentions: Record<string, {
      target: string;
      platform: string;              // "chat_gpt" or "google"
      ai_search_volume: number;
      mentions_count: number;         // ✅ Now correctly populated
      top_pages: Array<{
        url: string;
        title: string;
        domain: string;
        mentions: number;
        ai_search_volume: number;
        platforms: string[];
        rank_group: number;
      }>;
      aggregated_metrics: {
        ai_search_volume: number;
        mentions_count: number;
      };
    }>;
  };
  summary: {
    total_suggestions: number;
    high_priority_topics: number;
    trending_topics: number;
    // ... other summary fields
  };
}
```

### Test Results

**Test 1: "chatgpt" keyword**
```json
{
  "ai_metrics": {
    "llm_mentions": {
      "chatgpt": {
        "platform": "chat_gpt",
        "mentions_count": 5277,
        "ai_search_volume": 2142,
        "top_pages": 20
      }
    }
  }
}
```

**Test 2: "python" keyword**
```json
{
  "ai_metrics": {
    "llm_mentions": {
      "python": {
        "platform": "chat_gpt",
        "mentions_count": 27233,
        "ai_search_volume": 6256
      }
    }
  }
}
```

### Platform Fallback

The endpoint automatically tries platforms in order:
1. `chat_gpt` (works best for United States)
2. `google` (works for US, UK, Germany, Canada, Australia)

**Platform Selection:**
- United States: Uses `chat_gpt` (5,277 mentions for "chatgpt")
- United Kingdom: Falls back to `google` (4,161+ mentions available)

---

## 🔍 SERP Analysis

### Via Goal-Based Analysis

**Endpoint:**
```
POST /api/v1/keywords/goal-based-analysis
```

**Request Example:**

```typescript
interface GoalBasedAnalysisRequest {
  keywords: string[];
  content_goal: "SEO & Rankings" | "Engagement" | "Conversions" | "Brand Awareness";
  location?: string;
  language?: string;
  include_serp?: boolean;              // Default: true
  include_content_analysis?: boolean;   // Default: true
  include_llm_mentions?: boolean;       // Default: true
}

const request = {
  keywords: ["python programming"],
  content_goal: "SEO & Rankings",
  location: "United States",
  language: "en",
  include_serp: true,
  include_llm_mentions: true
};

const response = await fetch(`${API_BASE_URL}/api/v1/keywords/goal-based-analysis`, {
  method: 'POST',
  headers: defaultHeaders,
  body: JSON.stringify(request)
});

const data = await response.json();
```

### Response Structure (SEO & Rankings)

```typescript
interface GoalBasedAnalysisResponse {
  content_goal: string;
  keywords: string[];
  location: string;
  language: string;
  analysis: {
    search_volume: Record<string, {
      search_volume: number;
      competition: string;
      cpc: number;
      monthly_searches: Array<{
        year: number;
        month: number;
        search_volume: number;
      }>;
    }>;
    difficulty: Record<string, number>;
    keyword_overview: any;  // Raw DataForSEO response
    serp_analysis: {
      keyword: string;
      location: string;
      organic_results: Array<{
        title: string;
        url: string;
        description: string;
        position: number;
        domain: string;
      }>;
      featured_snippet?: {
        title: string;
        url: string;
        description: string;
      };
      people_also_ask?: Array<{
        question: string;
        answer: string;
        url: string;
      }>;
      related_searches?: string[];
    };
    llm_mentions: {
      platform: string;
      mentions_count: number;
      ai_search_volume: number;
      top_pages: Array<any>;
    };
    recommendations: string[];
  };
}
```

### Test Results

**SERP Analysis Test:**
- ✅ Search volume data returned
- ✅ Monthly searches trend available
- ✅ SERP analysis included when `include_serp: true`
- ✅ LLM mentions included when `include_llm_mentions: true`

---

## ✍️ Content Generation

### Basic Content Generation

**Endpoint:**
```
POST /api/v1/generate
```

**Request Example:**

```typescript
interface BlogGenerationRequest {
  topic: string;
  keywords?: string[];
  tone?: "professional" | "casual" | "friendly" | "formal";
  length?: "short" | "medium" | "long";
  format?: "markdown" | "html";
}

const request = {
  topic: "Introduction to Python Programming",
  keywords: ["python", "programming"],
  tone: "professional",
  length: "short",
  format: "markdown"
};

const response = await fetch(`${API_BASE_URL}/api/v1/generate`, {
  method: 'POST',
  headers: defaultHeaders,
  body: JSON.stringify(request)
});

const data = await response.json();
```

### Enhanced Content Generation

**Endpoint:**
```
POST /api/v1/blog/generate-enhanced
```

**Request Example:**

```typescript
interface EnhancedBlogGenerationRequest {
  topic: string;
  keywords?: string[];
  tone?: string;
  length?: string;
  use_serp_optimization?: boolean;
  use_knowledge_graph?: boolean;
  use_semantic_keywords?: boolean;
  use_quality_scoring?: boolean;
}

const request = {
  topic: "Python Basics",
  keywords: ["python"],
  tone: "professional",
  length: "short",
  use_serp_optimization: true,
  use_knowledge_graph: true
};

const response = await fetch(`${API_BASE_URL}/api/v1/blog/generate-enhanced`, {
  method: 'POST',
  headers: defaultHeaders,
  body: JSON.stringify(request)
});

const data = await response.json();
```

### Response Structure

```typescript
interface BlogGenerationResponse {
  success: boolean;
  blog_post: {
    title: string;
    content: string;
    meta_title?: string;
    meta_description?: string;
  };
  generation_time_seconds: number;
  word_count: number;
  seo_score?: number;
  readability_score?: number;
  warnings?: string[];
  suggestions?: string[];
}

// Enhanced Response
interface EnhancedBlogGenerationResponse {
  title: string;
  content: string;
  meta_title: string;
  meta_description: string;
  readability_score: number;
  seo_score: number;
  stage_results: {
    research?: any;
    draft?: any;
    enhancement?: any;
    seo?: any;
  };
  citations: Array<{
    url: string;
    title: string;
  }>;
  total_tokens: number;
  total_cost: number;
  generation_time: number;
  seo_metadata: any;
  internal_links: Array<any>;
  quality_score: number;
  quality_dimensions: any;
  structured_data: any;
  semantic_keywords: string[];
  content_metadata: any;
}
```

### Test Results

**Basic Generation:**
- ✅ Content generated successfully
- ✅ Title: "The Complete Guide to Introduction to Python Programming"
- ✅ Content length: ~4,047 characters
- ✅ SEO and readability scores included

**Enhanced Generation:**
- ✅ Multi-stage pipeline working
- ✅ Content length: ~4,015 characters
- ✅ Quality scoring included
- ✅ Citations included
- ✅ Semantic keywords included

---

## 🎯 Goal-Based Keyword Analysis

### Endpoints by Goal

#### 1. SEO & Rankings

**Focus:** High search volume, low difficulty, ranking opportunities

```typescript
const request = {
  keywords: ["python programming"],
  content_goal: "SEO & Rankings",
  location: "United States",
  language: "en",
  include_serp: true,
  include_llm_mentions: true
};
```

**Returns:**
- Search volume data
- Keyword difficulty
- SERP analysis
- LLM mentions
- SEO recommendations

#### 2. Engagement

**Focus:** Question-based keywords, trending topics

```typescript
const request = {
  keywords: ["python"],
  content_goal: "Engagement",
  location: "United States",
  language: "en",
  include_serp: true,
  include_content_analysis: true,
  include_llm_mentions: true
};
```

**Returns:**
- Search intent (informational)
- PAA questions from SERP
- Content analysis
- LLM mentions
- Engagement recommendations

#### 3. Conversions

**Focus:** Commercial intent, high CPC

```typescript
const request = {
  keywords: ["python course"],
  content_goal: "Conversions",
  location: "United States",
  language: "en",
  include_serp: true,
  include_llm_mentions: true
};
```

**Returns:**
- CPC analysis
- Commercial intent
- Shopping results
- LLM mentions
- Conversion recommendations

#### 4. Brand Awareness

**Focus:** Brand mentions, industry keywords

```typescript
const request = {
  keywords: ["python"],
  content_goal: "Brand Awareness",
  location: "United States",
  language: "en",
  include_content_analysis: true,
  include_llm_mentions: true
};
```

**Returns:**
- Content sentiment analysis
- Brand mention analysis
- Competitor analysis
- LLM mentions
- Brand awareness recommendations

---

## 💰 Cost Optimization

### Cost Estimates (Per Request)

| Endpoint | Typical Cost | Notes |
|----------|--------------|-------|
| AI Topic Suggestions | $0.12 | With `limit=10`, includes LLM mentions |
| LLM Mentions | $0.12 | Per keyword, platform fallback included |
| Goal-Based Analysis | $0.15-0.30 | Varies by goal and included features |
| SERP Analysis | $0.05-0.10 | When included in goal-based analysis |
| Content Generation | Variable | Depends on length and features |

### Cost-Saving Tips

1. **Use `limit=10`** for AI Topic Suggestions (minimum required)
2. **Use `platform="auto"`** for LLM Mentions (automatic fallback)
3. **Only include needed features** in goal-based analysis
4. **Cache results** when possible
5. **Batch requests** when analyzing multiple keywords

### Example: Low-Cost Test Request

```typescript
// Cost: ~$0.12
const testRequest = {
  keywords: ["python"],
  location: "United States",
  language: "en",
  include_ai_search_volume: true,
  include_llm_mentions: true,
  limit: 10  // Minimum required
};
```

---

## ⚠️ Error Handling

### Common Errors

#### 1. Validation Error: Limit Too Low

```json
{
  "detail": [
    {
      "type": "greater_than_equal",
      "loc": ["body", "limit"],
      "msg": "Input should be greater than or equal to 10",
      "input": 5
    }
  ]
}
```

**Solution:** Use `limit >= 10`

#### 2. Missing Keywords

```json
{
  "detail": "No keywords provided. Please provide at least one keyword in the 'keywords' array."
}
```

**Solution:** Always provide at least one keyword

#### 3. DataForSEO Not Configured

```json
{
  "detail": "DataForSEO API not configured"
}
```

**Solution:** Check API credentials configuration

### Error Handling Example

```typescript
async function callAPI(endpoint: string, request: any) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'API request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    
    // Handle specific error types
    if (error.message.includes('greater_than_equal')) {
      // Suggest fixing limit
      throw new Error('Limit must be at least 10');
    }
    
    throw error;
  }
}
```

---

## 📝 TypeScript Types

### Complete Type Definitions

```typescript
// AI Topic Suggestions
interface AITopicSuggestionsRequest {
  keywords: string[];
  location?: string;
  language?: string;
  include_ai_search_volume?: boolean;
  include_llm_mentions?: boolean;
  include_llm_responses?: boolean;
  limit?: number;  // Min: 10, Max: 200
  content_objective?: string;
  target_audience?: string;
  industry?: string;
  content_goals?: string[];
}

interface LLMMentionsData {
  target: string;
  target_type: string;
  platform: "chat_gpt" | "google";
  ai_search_volume: number;
  mentions_count: number;
  top_pages: Array<{
    url: string;
    title: string;
    domain: string;
    mentions: number;
    ai_search_volume: number;
    platforms: string[];
    rank_group: number;
  }>;
  top_domains: Array<any>;
  topics: Array<any>;
  aggregated_metrics: {
    ai_search_volume: number;
    mentions_count: number;
  };
  metadata: Record<string, any>;
}

interface AITopicSuggestionsResponse {
  seed_keywords: string[];
  location: {
    used: string;
    detected?: string;
  };
  language: string;
  topic_suggestions: Array<any>;
  content_gaps: Array<any>;
  citation_opportunities: Array<any>;
  ai_metrics: {
    search_volume: Record<string, any>;
    llm_mentions: Record<string, LLMMentionsData>;
  };
  summary: {
    total_suggestions: number;
    high_priority_topics: number;
    trending_topics: number;
    low_competition_topics: number;
    content_gaps_count: number;
    citation_opportunities_count: number;
  };
}

// Goal-Based Analysis
type ContentGoal = "SEO & Rankings" | "Engagement" | "Conversions" | "Brand Awareness";

interface GoalBasedAnalysisRequest {
  keywords: string[];
  content_goal: ContentGoal;
  location?: string;
  language?: string;
  include_serp?: boolean;
  include_content_analysis?: boolean;
  include_llm_mentions?: boolean;
}

// Content Generation
interface BlogGenerationRequest {
  topic: string;
  keywords?: string[];
  tone?: "professional" | "casual" | "friendly" | "formal";
  length?: "short" | "medium" | "long";
  format?: "markdown" | "html";
}
```

---

## 🧪 Testing Examples

### Example 1: AI Topic Suggestions

```typescript
async function testAITopicSuggestions() {
  const request = {
    keywords: ["python"],
    location: "United States",
    language: "en",
    include_ai_search_volume: true,
    include_llm_mentions: true,
    limit: 10
  };

  const response = await fetch(`${API_BASE_URL}/api/v1/keywords/ai-topic-suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  const data = await response.json();
  
  console.log('Mentions Count:', data.ai_metrics.llm_mentions.python?.mentions_count);
  console.log('Platform:', data.ai_metrics.llm_mentions.python?.platform);
  console.log('AI Search Volume:', data.ai_metrics.llm_mentions.python?.ai_search_volume);
  
  return data;
}
```

### Example 2: SERP Analysis via Goal-Based

```typescript
async function testSERPAnalysis() {
  const request = {
    keywords: ["python programming"],
    content_goal: "SEO & Rankings",
    location: "United States",
    language: "en",
    include_serp: true,
    include_llm_mentions: true
  };

  const response = await fetch(`${API_BASE_URL}/api/v1/keywords/goal-based-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  const data = await response.json();
  
  console.log('SERP Results:', data.analysis.serp_analysis?.organic_results?.length);
  console.log('LLM Mentions:', data.analysis.llm_mentions?.mentions_count);
  
  return data;
}
```

### Example 3: Content Generation

```typescript
async function testContentGeneration() {
  const request = {
    topic: "Introduction to Python",
    keywords: ["python"],
    tone: "professional",
    length: "short",
    format: "markdown"
  };

  const response = await fetch(`${API_BASE_URL}/api/v1/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  const data = await response.json();
  
  console.log('Title:', data.blog_post.title);
  console.log('Content Length:', data.blog_post.content.length);
  console.log('SEO Score:', data.seo_score);
  
  return data;
}
```

---

## ✅ Verification Checklist

Before deploying to production, verify:

- [ ] AI Topic Suggestions returns `mentions_count > 0`
- [ ] Platform fallback works (test with UK location)
- [ ] SERP analysis returns organic results
- [ ] Content generation produces valid content
- [ ] Error handling works for validation errors
- [ ] Cost estimates are within budget
- [ ] Rate limiting is handled
- [ ] Caching is implemented where appropriate

---

## 📞 Support

For issues or questions:
1. Check error messages in response
2. Verify request format matches examples
3. Ensure `limit >= 10` for AI Topic Suggestions
4. Check API credentials configuration
5. Review Cloud Run logs for detailed errors

---

## 🔄 Changelog

### Version 1.3.6 (2025-11-23)
- ✅ Fixed `mentions_count` parsing (now uses `total_count` from API)
- ✅ Added automatic platform fallback (`chat_gpt` → `google`)
- ✅ Verified all endpoints working correctly
- ✅ Updated cost estimates
- ✅ Added comprehensive testing examples

---

**Last Updated:** 2025-11-23  
**Status:** ✅ All endpoints tested and working

