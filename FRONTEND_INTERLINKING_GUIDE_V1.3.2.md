# Frontend Interlinking Integration Guide

**Version:** 1.3.2  
**Last Updated:** 2025-11-15  
**Status:** ✅ **READY FOR INTEGRATION**

---

## 🎉 What's New

The backend now supports **intelligent interlinking analysis** that matches your keywords to existing content and provides specific interlink opportunities with URLs, anchor text, and relevance scores.

---

## 📋 Overview

The interlinking feature helps you:
- **Find relevant content** to link to from your new blog posts
- **Get specific URLs** and anchor text suggestions
- **Score opportunities** by relevance (0.0 to 1.0)
- **Match keywords** to existing content using multiple strategies

---

## 🚀 Quick Start

### Basic Usage

```typescript
const response = await fetch('/api/v1/integrations/connect-and-recommend-v2', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'webflow',
    tenant_id: 'your-tenant-id',
    connection: {
      api_token: 'your-token',
      site_id: 'your-site-id',
      structure: {
        existing_content: [
          {
            id: 'item_1',
            title: 'How to Build a Website',
            url: 'https://example.com/blog/how-to-build-a-website',
            slug: 'how-to-build-a-website',
            keywords: ['website', 'build', 'tutorial'],
            published_at: '2024-01-15T10:00:00Z'
          }
        ]
      }
    },
    keywords: ['web development', 'website builder']
  })
});

const result = await response.json();
// result.per_keyword[0].interlink_opportunities contains specific URLs and anchor text
```

---

## 📡 API Endpoints

### Endpoint 1: Enhanced Legacy Endpoint

**URL:** `POST /api/v1/integrations/connect-and-recommend`

**Description:** Enhanced version of the existing endpoint. Automatically uses interlinking analyzer when structure is provided.

**Request:**
```typescript
interface LegacyRequest {
  provider: 'webflow' | 'wordpress' | 'shopify' | 'medium';
  tenant_id?: string;
  connection: {
    // Provider credentials
    api_token?: string;
    site_id?: string;
    // ... other provider fields
    
    // NEW: Structure with existing content
    structure?: {
      existing_content: Array<{
        id: string;
        title: string;
        url: string;
        slug: string;
        keywords: string[];
        categories?: string[];
        published_at?: string;
        excerpt?: string;
      }>;
    };
  };
  keywords: string[]; // 1-50 keywords
}
```

**Response:**
```typescript
interface LegacyResponse {
  provider: string;
  tenant_id?: string;
  saved_integration: boolean;
  recommended_interlinks: number;
  recommended_backlinks: number;
  per_keyword: Array<{
    keyword: string;
    difficulty?: number;
    suggested_interlinks: number;
    suggested_backlinks: number;
  }>;
  notes?: string;
}
```

**Note:** This endpoint maintains backward compatibility. If no structure is provided, it falls back to heuristic recommendations.

---

### Endpoint 2: New Enhanced Endpoint (Recommended)

**URL:** `POST /api/v1/integrations/connect-and-recommend-v2`

**Description:** New endpoint that returns full interlink opportunity details with URLs, titles, anchor text, and relevance scores.

**Request:**
```typescript
interface EnhancedRequest {
  provider: 'webflow' | 'wordpress' | 'shopify' | 'medium';
  tenant_id?: string;
  connection: {
    // Provider credentials
    api_token?: string;
    site_id?: string;
    // ... other provider fields
    
    // REQUIRED: Structure with existing content
    structure: {
      existing_content: Array<{
        id: string;
        title: string;
        url: string;
        slug: string;
        keywords: string[];
        categories?: string[];
        published_at?: string;
        excerpt?: string;
      }>;
    };
  };
  keywords: string[]; // 1-50 keywords
}
```

**Response:**
```typescript
interface EnhancedResponse {
  provider: string;
  tenant_id?: string;
  saved_integration: boolean;
  recommended_interlinks: number;
  recommended_backlinks: number;
  per_keyword: Array<{
    keyword: string;
    difficulty?: number;
    suggested_interlinks: number;
    suggested_backlinks: number;
    interlink_opportunities: Array<{
      target_url: string;
      target_title: string;
      anchor_text: string;
      relevance_score: number; // 0.0 to 1.0
    }>;
  }>;
  notes?: string;
}
```

---

## 📝 TypeScript Interfaces

### Complete Type Definitions

```typescript
// Request Models
interface ConnectAndRecommendRequest {
  tenant_id?: string;
  provider: 'webflow' | 'wordpress' | 'shopify' | 'medium';
  connection: {
    // Provider-specific credentials
    api_token?: string;
    site_id?: string;
    base_url?: string;
    username?: string;
    password?: string;
    access_token?: string;
    user_id?: string;
    shop_domain?: string;
    
    // Structure (REQUIRED for v2 endpoint)
    structure?: {
      existing_content: ExistingContentItem[];
    };
  };
  keywords: string[]; // 1-50 keywords
}

interface ExistingContentItem {
  id: string;
  title: string;
  url: string;
  slug: string;
  keywords: string[];
  categories?: string[];
  published_at?: string; // ISO format
  excerpt?: string;
}

// Response Models
interface ConnectAndRecommendResponse {
  provider: string;
  tenant_id?: string;
  saved_integration: boolean;
  recommended_interlinks: number;
  recommended_backlinks: number;
  per_keyword: KeywordInterlinkAnalysis[];
  notes?: string;
}

interface KeywordInterlinkAnalysis {
  keyword: string;
  difficulty?: number;
  suggested_interlinks: number;
  suggested_backlinks: number;
  interlink_opportunities: InterlinkOpportunity[];
}

interface InterlinkOpportunity {
  target_url: string;
  target_title: string;
  anchor_text: string;
  relevance_score: number; // 0.0 to 1.0
}
```

---

## 💡 Usage Examples

### Example 1: Get Interlink Opportunities

```typescript
async function getInterlinkOpportunities(
  provider: string,
  existingContent: ExistingContentItem[],
  keywords: string[]
) {
  const response = await fetch('/api/v1/integrations/connect-and-recommend-v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      connection: {
        structure: {
          existing_content: existingContent
        }
      },
      keywords
    })
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  
  const result: ConnectAndRecommendResponse = await response.json();
  return result;
}

// Usage
const opportunities = await getInterlinkOpportunities(
  'webflow',
  [
    {
      id: 'post-1',
      title: 'How to Build a Website',
      url: 'https://example.com/blog/how-to-build-a-website',
      slug: 'how-to-build-a-website',
      keywords: ['website', 'build', 'tutorial'],
      published_at: '2024-01-15T10:00:00Z'
    }
  ],
  ['web development', 'website builder']
);

// Access opportunities
opportunities.per_keyword.forEach(keywordAnalysis => {
  console.log(`Keyword: ${keywordAnalysis.keyword}`);
  console.log(`Found ${keywordAnalysis.suggested_interlinks} opportunities`);
  
  keywordAnalysis.interlink_opportunities.forEach(opp => {
    console.log(`  - ${opp.anchor_text} -> ${opp.target_url} (score: ${opp.relevance_score})`);
  });
});
```

### Example 2: React Hook for Interlinking

```typescript
import { useState, useCallback } from 'react';

interface UseInterlinkingOptions {
  provider: string;
  existingContent: ExistingContentItem[];
}

export function useInterlinking({ provider, existingContent }: UseInterlinkingOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConnectAndRecommendResponse | null>(null);
  
  const analyzeKeywords = useCallback(async (keywords: string[]) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/v1/integrations/connect-and-recommend-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          connection: {
            structure: {
              existing_content: existingContent
            }
          },
          keywords
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to analyze interlinking opportunities');
      }
      
      const data = await response.json();
      setResult(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [provider, existingContent]);
  
  return { loading, error, result, analyzeKeywords };
}
```

### Example 3: Display Interlink Opportunities

```tsx
import React from 'react';
import { InterlinkOpportunity } from './types';

interface InterlinkOpportunitiesListProps {
  opportunities: InterlinkOpportunity[];
  keyword: string;
}

export function InterlinkOpportunitiesList({ 
  opportunities, 
  keyword 
}: InterlinkOpportunitiesListProps) {
  if (opportunities.length === 0) {
    return (
      <div className="text-gray-500">
        No interlinking opportunities found for "{keyword}"
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">
        Interlinking Opportunities for "{keyword}"
      </h3>
      {opportunities.map((opp, index) => (
        <div 
          key={index}
          className="border rounded-lg p-4 hover:bg-gray-50"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <a
                href={opp.target_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                {opp.target_title}
              </a>
              <p className="text-sm text-gray-600 mt-1">
                Anchor text: <code className="bg-gray-100 px-1 rounded">
                  {opp.anchor_text}
                </code>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {opp.target_url}
              </p>
            </div>
            <div className="ml-4">
              <div className="text-right">
                <div className="text-sm font-semibold text-green-600">
                  {(opp.relevance_score * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500">relevance</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 🎯 Key Features

### 1. **Intelligent Keyword Matching**

The backend uses multiple matching strategies:
- **Exact Match**: Keyword exactly matches a content keyword (highest priority)
- **Partial Match**: Keyword contains content keyword or vice versa
- **Title Match**: Keyword appears in content title (high priority)
- **Word Overlap**: Semantic matching based on word overlap (30%+ threshold)

### 2. **Relevance Scoring**

Each opportunity gets a relevance score (0.0 to 1.0) based on:
- **Match Type**: Exact matches score higher
- **Recency**: Newer content gets a boost (10% for <30 days, 5% for <90 days)
- **Title Match**: 20% boost if keyword is in title
- **Keyword Count**: 10% boost per additional keyword match

### 3. **Quality Filtering**

- **Minimum Score**: Only opportunities with relevance >= 0.4 are included
- **Top 10 Limit**: Maximum 10 opportunities per keyword
- **Deduplication**: Duplicate content items are filtered out

### 4. **Anchor Text Generation**

The backend generates natural anchor text:
- Extracts exact phrases from titles when keyword is present
- Uses content keywords when matched
- Falls back to capitalized keyword

---

## ⚠️ Important Notes

### Structure Requirements

For the v2 endpoint, `structure.existing_content` is **required**. Each content item must have:
- `id` (string)
- `title` (string)
- `url` (string)
- `slug` (string)
- `keywords` (string[])

Optional fields:
- `categories` (string[])
- `published_at` (string, ISO format)
- `excerpt` (string)

### Error Handling

```typescript
try {
  const result = await getInterlinkOpportunities(...);
} catch (error) {
  if (error.response?.status === 400) {
    // Invalid request (missing structure, invalid keywords, etc.)
    console.error('Validation error:', error.response.data.detail);
  } else if (error.response?.status === 500) {
    // Server error
    console.error('Server error:', error.response.data.detail);
  } else {
    // Network or other error
    console.error('Request failed:', error.message);
  }
}
```

### Backward Compatibility

The original `/connect-and-recommend` endpoint still works:
- If structure is provided, it uses the interlinking analyzer
- If no structure is provided, it falls back to heuristic recommendations
- Response format remains the same (no breaking changes)

---

## 🔄 Migration Guide

### From Legacy Endpoint

**Before:**
```typescript
// Old endpoint (still works)
const response = await fetch('/api/v1/integrations/connect-and-recommend', {
  method: 'POST',
  body: JSON.stringify({
    provider: 'webflow',
    connection: { /* no structure */ },
    keywords: ['keyword1']
  })
});
// Response only has counts, no specific URLs
```

**After:**
```typescript
// New endpoint with structure
const response = await fetch('/api/v1/integrations/connect-and-recommend-v2', {
  method: 'POST',
  body: JSON.stringify({
    provider: 'webflow',
    connection: {
      structure: {
        existing_content: [/* your content */]
      }
    },
    keywords: ['keyword1']
  })
});
// Response has specific URLs, anchor text, and scores
```

---

## 📊 Response Examples

### Example Response (v2 Endpoint)

```json
{
  "provider": "webflow",
  "tenant_id": "org-123",
  "saved_integration": true,
  "recommended_interlinks": 5,
  "recommended_backlinks": 0,
  "per_keyword": [
    {
      "keyword": "web development",
      "difficulty": null,
      "suggested_interlinks": 3,
      "suggested_backlinks": 0,
      "interlink_opportunities": [
        {
          "target_url": "https://example.com/blog/how-to-build-a-website",
          "target_title": "How to Build a Website",
          "anchor_text": "How to Build a Website",
          "relevance_score": 0.92
        },
        {
          "target_url": "https://example.com/blog/web-development-tools",
          "target_title": "Best Web Development Tools",
          "anchor_text": "web development tools",
          "relevance_score": 0.85
        },
        {
          "target_url": "https://example.com/blog/frontend-frameworks",
          "target_title": "Top Frontend Frameworks for Web Development",
          "anchor_text": "Web Development",
          "relevance_score": 0.78
        }
      ]
    },
    {
      "keyword": "website builder",
      "difficulty": null,
      "suggested_interlinks": 2,
      "suggested_backlinks": 0,
      "interlink_opportunities": [
        {
          "target_url": "https://example.com/blog/how-to-build-a-website",
          "target_title": "How to Build a Website",
          "anchor_text": "How to Build",
          "relevance_score": 0.88
        }
      ]
    }
  ],
  "notes": "Found 5 interlinking opportunities from 3 existing content items"
}
```

---

## 🧪 Testing

### Test Request

```typescript
const testRequest = {
  provider: 'webflow',
  connection: {
    structure: {
      existing_content: [
        {
          id: 'post-1',
          title: 'How to Build a Website',
          url: 'https://example.com/blog/how-to-build-a-website',
          slug: 'how-to-build-a-website',
          keywords: ['website', 'build', 'tutorial', 'web development'],
          published_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 'post-2',
          title: 'Best Web Hosting Services',
          url: 'https://example.com/blog/best-web-hosting',
          slug: 'best-web-hosting',
          keywords: ['hosting', 'web hosting', 'services'],
          published_at: '2024-01-10T14:30:00Z'
        }
      ]
    }
  },
  keywords: ['web development', 'website builder', 'hosting services']
};
```

### Expected Results

- ✅ Should return opportunities for "web development" matching "How to Build a Website"
- ✅ Should return opportunities for "website builder" matching "How to Build a Website"
- ✅ Should return opportunities for "hosting services" matching "Best Web Hosting Services"
- ✅ Relevance scores should be between 0.4 and 1.0
- ✅ Anchor text should be natural phrases from titles

---

## 📚 Related Documentation

- **Backend Implementation Guide**: `BACKEND_INTERLINKING_IMPLEMENTATION_GUIDE.md`
- **Implementation Summary**: `INTERLINKING_IMPLEMENTATION_SUMMARY.md`
- **Complete API Reference**: `FRONTEND_DEPLOYMENT_GUIDE.md`

---

## 🆘 Support

If you encounter issues:

1. **Check Structure Format**: Ensure `existing_content` array has required fields
2. **Validate Keywords**: Must be 1-50 keywords
3. **Check Response**: Look for `notes` field for additional information
4. **Review Error Messages**: Backend returns specific validation errors

---

**Last Updated:** 2025-11-15  
**Version:** 1.3.2

