# Frontend Integration Guide v1.3.6

**Version:** 1.3.6  
**Date:** 2025-11-23  
**Base URL:** `https://blog-writer-api-dev-kq42l26tuq-od.a.run.app`  
**API Prefix:** `/api/v1`

---

## 🎉 What's New in v1.3.6

### ✨ Major Enhancements

1. **Expanded Blog Types** - 28 content types (top 80% of popular formats)
2. **Word Count Tolerance** - ±25% flexibility for natural content
3. **SEO Post-Processing** - Automatic traffic optimization
4. **Backlink Analysis** - Extract keywords from premium blogs

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Enhanced Blog Generation](#enhanced-blog-generation)
3. [Blog Types Reference](#blog-types-reference)
4. [SEO Optimization](#seo-optimization)
5. [Backlink Analysis](#backlink-analysis)
6. [TypeScript Types](#typescript-types)
7. [Error Handling](#error-handling)
8. [Examples](#examples)

---

## Quick Start

### Basic Blog Generation

```typescript
const response = await fetch(`${API_BASE_URL}/api/v1/blog/generate-enhanced`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic: 'Introduction to Python Programming',
    keywords: ['python', 'programming'],
    blog_type: 'tutorial',
    tone: 'professional',
    length: 'short',
    word_count_target: 300,
    optimize_for_traffic: true,
    use_dataforseo_content_generation: true
  })
});

const data = await response.json();
console.log(data.content); // Generated blog content
console.log(data.seo_score); // SEO score (0-100)
```

---

## Enhanced Blog Generation

### Endpoint

**POST** `/api/v1/blog/generate-enhanced`

### Request Body

```typescript
interface EnhancedBlogGenerationRequest {
  topic: string;                    // Main topic (3-200 chars)
  keywords: string[];                // Target SEO keywords (min 1)
  blog_type?: BlogContentType;       // Blog type (default: 'custom')
  tone?: ContentTone;                // Writing tone (default: 'professional')
  length?: ContentLength;            // Content length (default: 'medium')
  word_count_target?: number;        // Specific word count (100-10000)
  
  // SEO & Traffic Optimization
  optimize_for_traffic?: boolean;    // Enable SEO post-processing (default: true)
  
  // Backlink Analysis (Premium)
  analyze_backlinks?: boolean;       // Analyze backlinks for keywords (default: false)
  backlink_url?: string;             // URL to analyze (required if analyze_backlinks=true)
  
  // DataForSEO Content Generation
  use_dataforseo_content_generation?: boolean; // Use DataForSEO API (default: true)
  
  // Additional Options
  target_audience?: string;          // Target audience description
  custom_instructions?: string;      // Additional instructions (max 2000 chars)
  
  // Blog Type-Specific Fields
  brand_name?: string;               // For 'brand' type
  category?: string;                 // For 'top_10' or 'listicle' type
  product_name?: string;             // For 'product_review' type
  comparison_items?: string[];       // For 'comparison' type
}
```

### Response

```typescript
interface EnhancedBlogGenerationResponse {
  title: string;                     // Blog post title
  content: string;                   // Blog post content
  meta_title: string;                // SEO meta title
  meta_description: string;          // SEO meta description
  
  // Quality Metrics
  readability_score: number;         // Readability score (0-100)
  seo_score: number;                 // SEO score (0-100)
  
  // SEO Metadata
  seo_metadata: {
    semantic_keywords: string[];      // Integrated keywords
    subtopics: string[];             // Generated subtopics
    blog_type: string;               // Blog type used
    keyword_density: Record<string, {
      count: number;
      density: number;
    }>;                              // Keyword density per keyword
    headings_count: number;          // Number of headings
    avg_sentence_length: number;     // Average sentence length
    seo_factors: string[];           // SEO factors applied
    word_count_range: {
      min: number;                   // Minimum acceptable words
      max: number;                   // Maximum acceptable words
      actual: number;                // Actual word count
    };
    backlink_keywords?: string[];     // Keywords from backlink analysis
  };
  
  // Performance Metrics
  total_tokens: number;              // Total tokens used
  total_cost: number;                // Total cost in USD
  generation_time: number;           // Generation time in seconds
  
  // Success Indicators
  success: boolean;                  // Whether generation was successful
  warnings: string[];                // Warnings or issues encountered
}
```

---

## Blog Types Reference

### Available Blog Types (28 Total)

#### Core Types
- `custom` - Custom content with specific instructions
- `brand` - Brand overviews and histories
- `top_10` - Ranking lists with detailed entries
- `product_review` - Detailed product analysis
- `how_to` - Step-by-step guides
- `comparison` - Side-by-side comparisons
- `guide` - Comprehensive guides

#### Popular Content Types (Top 80%)
- `tutorial` - Step-by-step learning content
- `listicle` - Numbered lists (Top 5, Top 20, etc.)
- `case_study` - Real-world examples and results
- `news` - Current events and updates
- `opinion` - Editorial and thought leadership
- `interview` - Q&A with experts
- `faq` - Frequently asked questions
- `checklist` - Actionable checklists
- `tips` - Tips and tricks
- `definition` - What is X? Explanatory content
- `benefits` - Benefits-focused content
- `problem_solution` - Problem-solving content
- `trend_analysis` - Industry trends
- `statistics` - Data-driven content
- `resource_list` - Curated resources
- `timeline` - Historical or process timelines
- `myth_busting` - Debunking myths
- `best_practices` - Industry best practices
- `getting_started` - Beginner guides
- `advanced` - Advanced topics
- `troubleshooting` - Problem-solving guides

### TypeScript Enum

```typescript
enum BlogContentType {
  CUSTOM = 'custom',
  BRAND = 'brand',
  TOP_10 = 'top_10',
  PRODUCT_REVIEW = 'product_review',
  HOW_TO = 'how_to',
  COMPARISON = 'comparison',
  GUIDE = 'guide',
  TUTORIAL = 'tutorial',
  LISTICLE = 'listicle',
  CASE_STUDY = 'case_study',
  NEWS = 'news',
  OPINION = 'opinion',
  INTERVIEW = 'interview',
  FAQ = 'faq',
  CHECKLIST = 'checklist',
  TIPS = 'tips',
  DEFINITION = 'definition',
  BENEFITS = 'benefits',
  PROBLEM_SOLUTION = 'problem_solution',
  TREND_ANALYSIS = 'trend_analysis',
  STATISTICS = 'statistics',
  RESOURCE_LIST = 'resource_list',
  TIMELINE = 'timeline',
  MYTH_BUSTING = 'myth_busting',
  BEST_PRACTICES = 'best_practices',
  GETTING_STARTED = 'getting_started',
  ADVANCED = 'advanced',
  TROUBLESHOOTING = 'troubleshooting'
}
```

---

## SEO Optimization

### Word Count Tolerance

All blog types support **±25% word count tolerance**:

- **Target:** 300 words
- **Acceptable Range:** 225-375 words
- **Priority:** Quality over exact word count

### Automatic SEO Post-Processing

When `optimize_for_traffic: true` (default), the API automatically:

1. **Keyword Density Analysis** - Ensures optimal keyword density (1-2%)
2. **Heading Structure** - Optimizes heading hierarchy
3. **Readability Scoring** - Calculates readability metrics
4. **SEO Score Calculation** - Provides comprehensive SEO score (0-100)
5. **Word Count Validation** - Checks if content is within ±25% tolerance

### SEO Metrics in Response

```typescript
const seoMetrics = data.seo_metadata;

// Check if content is within tolerance
const withinTolerance = seoMetrics.word_count_range.actual >= 
                        seoMetrics.word_count_range.min &&
                        seoMetrics.word_count_range.actual <= 
                        seoMetrics.word_count_range.max;

// Display SEO factors
seoMetrics.seo_factors.forEach(factor => {
  console.log(`✅ ${factor}`);
});

// Check keyword density
Object.entries(seoMetrics.keyword_density).forEach(([keyword, data]) => {
  console.log(`${keyword}: ${data.density}% (${data.count} occurrences)`);
});
```

---

## Backlink Analysis

### Premium Feature

Extract high-performing keywords from premium blog URLs by analyzing their backlinks.

### Usage

```typescript
const response = await fetch(`${API_BASE_URL}/api/v1/blog/generate-enhanced`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic: 'Advanced Python Techniques',
    keywords: ['python', 'programming'],
    blog_type: 'advanced',
    analyze_backlinks: true,
    backlink_url: 'https://example.com/premium-blog-post',
    optimize_for_traffic: true
  })
});

const data = await response.json();

// Access extracted keywords
const backlinkKeywords = data.seo_metadata.backlink_keywords;
console.log('Keywords from backlink analysis:', backlinkKeywords);
```

### How It Works

1. Analyzes backlinks from the provided URL
2. Extracts keywords from anchor texts
3. Merges extracted keywords with your provided keywords
4. Generates content optimized with proven keywords

---

## TypeScript Types

### Complete Type Definitions

```typescript
// Content Tone
enum ContentTone {
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
  FRIENDLY = 'friendly',
  AUTHORITATIVE = 'authoritative',
  CONVERSATIONAL = 'conversational',
  TECHNICAL = 'technical',
  CREATIVE = 'creative'
}

// Content Length
enum ContentLength {
  SHORT = 'short',      // 300-600 words
  MEDIUM = 'medium',    // 600-1200 words
  LONG = 'long',        // 1200-2500 words
  EXTENDED = 'extended' // 2500+ words
}

// Blog Content Type (see Blog Types Reference above)
enum BlogContentType {
  // ... (all 28 types)
}

// Request Interface
interface EnhancedBlogGenerationRequest {
  topic: string;
  keywords: string[];
  blog_type?: BlogContentType;
  tone?: ContentTone;
  length?: ContentLength;
  word_count_target?: number;
  optimize_for_traffic?: boolean;
  analyze_backlinks?: boolean;
  backlink_url?: string;
  use_dataforseo_content_generation?: boolean;
  target_audience?: string;
  custom_instructions?: string;
  brand_name?: string;
  category?: string;
  product_name?: string;
  comparison_items?: string[];
}

// Response Interface
interface EnhancedBlogGenerationResponse {
  title: string;
  content: string;
  meta_title: string;
  meta_description: string;
  readability_score: number;
  seo_score: number;
  seo_metadata: {
    semantic_keywords: string[];
    subtopics: string[];
    blog_type: string;
    keyword_density: Record<string, { count: number; density: number }>;
    headings_count: number;
    avg_sentence_length: number;
    seo_factors: string[];
    word_count_range: {
      min: number;
      max: number;
      actual: number;
    };
    backlink_keywords?: string[];
  };
  total_tokens: number;
  total_cost: number;
  generation_time: number;
  success: boolean;
  warnings: string[];
}
```

---

## Error Handling

### Common Errors

```typescript
try {
  const response = await fetch(`${API_BASE_URL}/api/v1/blog/generate-enhanced`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const error = await response.json();
    
    // Handle specific error codes
    switch (response.status) {
      case 400:
        console.error('Bad Request:', error.detail);
        // Invalid request parameters
        break;
      case 500:
        console.error('Server Error:', error.detail);
        // Server-side error
        break;
      case 503:
        console.error('Service Unavailable:', error.detail);
        // Service not configured
        break;
      default:
        console.error('Unknown Error:', error);
    }
    return;
  }

  const data = await response.json();
  
  // Check for warnings
  if (data.warnings && data.warnings.length > 0) {
    console.warn('Warnings:', data.warnings);
  }
  
  // Check if content is within tolerance
  const wcRange = data.seo_metadata.word_count_range;
  if (wcRange.actual < wcRange.min || wcRange.actual > wcRange.max) {
    console.warn(`Content length (${wcRange.actual}) outside tolerance (${wcRange.min}-${wcRange.max})`);
  }
  
} catch (error) {
  console.error('Network Error:', error);
}
```

---

## Examples

### Example 1: Tutorial Blog

```typescript
const tutorialBlog = await fetch(`${API_BASE_URL}/api/v1/blog/generate-enhanced`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic: 'How to Build a REST API with Python',
    keywords: ['python', 'rest api', 'flask'],
    blog_type: 'tutorial',
    tone: 'professional',
    length: 'medium',
    word_count_target: 1500,
    optimize_for_traffic: true
  })
});
```

### Example 2: Case Study Blog

```typescript
const caseStudy = await fetch(`${API_BASE_URL}/api/v1/blog/generate-enhanced`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic: 'How Company X Increased Revenue by 300%',
    keywords: ['case study', 'revenue growth', 'marketing'],
    blog_type: 'case_study',
    tone: 'professional',
    length: 'long',
    optimize_for_traffic: true
  })
});
```

### Example 3: FAQ Blog

```typescript
const faqBlog = await fetch(`${API_BASE_URL}/api/v1/blog/generate-enhanced`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic: 'Frequently Asked Questions About SEO',
    keywords: ['seo', 'search engine optimization', 'faq'],
    blog_type: 'faq',
    tone: 'professional',
    length: 'medium',
    optimize_for_traffic: true
  })
});
```

### Example 4: Premium Blog with Backlink Analysis

```typescript
const premiumBlog = await fetch(`${API_BASE_URL}/api/v1/blog/generate-enhanced`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic: 'Advanced Python Techniques',
    keywords: ['python', 'programming'],
    blog_type: 'advanced',
    tone: 'professional',
    length: 'long',
    optimize_for_traffic: true,
    analyze_backlinks: true,
    backlink_url: 'https://example.com/premium-blog-post'
  })
});
```

### Example 5: Tips Blog

```typescript
const tipsBlog = await fetch(`${API_BASE_URL}/api/v1/blog/generate-enhanced`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic: '10 Tips for Better Blog Writing',
    keywords: ['blog writing', 'content creation', 'tips'],
    blog_type: 'tips',
    tone: 'friendly',
    length: 'short',
    word_count_target: 500,
    optimize_for_traffic: true
  })
});
```

---

## React Hook Example

```typescript
import { useState } from 'react';

interface UseBlogGenerationOptions {
  topic: string;
  keywords: string[];
  blog_type?: BlogContentType;
  word_count_target?: number;
  optimize_for_traffic?: boolean;
  analyze_backlinks?: boolean;
  backlink_url?: string;
}

export function useBlogGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EnhancedBlogGenerationResponse | null>(null);

  const generateBlog = async (options: UseBlogGenerationOptions) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/blog/generate-enhanced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...options,
          use_dataforseo_content_generation: true,
          optimize_for_traffic: options.optimize_for_traffic ?? true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Blog generation failed');
      }

      const result = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { generateBlog, loading, error, data };
}

// Usage
const { generateBlog, loading, error, data } = useBlogGeneration();

await generateBlog({
  topic: 'Introduction to Python',
  keywords: ['python', 'programming'],
  blog_type: 'tutorial',
  word_count_target: 300,
  optimize_for_traffic: true
});
```

---

## Cost Information

**Typical Cost per Blog Post:**
- Generate Text: ~$0.0038 (76 tokens × $0.00005)
- Generate Subtopics: $0.0001
- Generate Meta Tags: $0.001
- **Total: ~$0.005 per blog post** (300 words)

**With Backlink Analysis:**
- Additional cost for backlink API calls (varies by subscription)

---

## Migration from v1.3.5

### Changes

1. **New Blog Types** - 21 additional blog types available
2. **Word Count Tolerance** - Automatic ±25% tolerance (no code changes needed)
3. **SEO Metrics** - Enhanced `seo_metadata` with more detailed metrics
4. **Backlink Analysis** - New optional fields: `analyze_backlinks` and `backlink_url`

### No Breaking Changes

All existing code continues to work. New features are opt-in via new request fields.

---

## Support

- **API Documentation:** `/docs` (Swagger UI)
- **ReDoc:** `/redoc`
- **Health Check:** `/health`
