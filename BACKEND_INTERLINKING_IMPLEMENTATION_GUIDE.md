# Backend Interlinking Implementation Guide

**Version:** 1.0.0  
**Last Updated:** 2025-11-15  
**Status:** 📋 Implementation Guide  
**API Base URL:** `https://blog-writer-api-dev-613248238610.europe-west1.run.app`

---

## Overview

This guide explains how to implement interlinking opportunities on the **Backend (Google Cloud Run API)**. The backend is responsible for:

1. **Receiving** publishing target structure from frontend
2. **Analyzing** existing content for interlinking opportunities
3. **Matching** keywords to existing content
4. **Generating** interlinking recommendations with relevance scores
5. **Returning** specific interlink opportunities with URLs and anchor text

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Endpoint Specification](#api-endpoint-specification)
3. [Request Format](#request-format)
4. [Structure Processing](#structure-processing)
5. [Interlinking Algorithm](#interlinking-algorithm)
6. [Response Format](#response-format)
7. [Implementation Examples](#implementation-examples)
8. [Best Practices](#best-practices)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│              Frontend (Next.js)                              │
│                                                               │
│  Sends:                                                       │
│  {                                                           │
│    provider: "webflow",                                      │
│    connection: {                                             │
│      api_token: "...",                                       │
│      site_id: "...",                                         │
│      structure: {                                            │
│        collections: [...],                                  │
│        existing_content: [...]                               │
│      }                                                       │
│    },                                                        │
│    keywords: ["keyword1", "keyword2"]                       │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP POST
                          ▼
┌─────────────────────────────────────────────────────────────┐
│    Backend API: /api/v1/integrations/connect-and-recommend   │
│                                                               │
│  1. Extract structure from connection object                 │
│  2. Analyze existing_content array                           │
│  3. Match keywords to existing content                       │
│  4. Calculate relevance scores                               │
│  5. Generate interlink opportunities                         │
│  6. Return recommendations                                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ JSON Response
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend (Next.js)                              │
│                                                               │
│  Receives:                                                    │
│  {                                                           │
│    recommended_interlinks: 15,                               │
│    per_keyword: [                                            │
│      {                                                        │
│        keyword: "keyword1",                                  │
│        suggested_interlinks: 5,                              │
│        interlink_opportunities: [...]                        │
│      }                                                       │
│    ]                                                         │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoint Specification

### Endpoint

```
POST /api/v1/integrations/connect-and-recommend
```

### Authentication

- **Header:** `Authorization: Bearer {API_KEY}`
- **Optional:** API key may not be required for open API

### Request Timeout

- **Recommended:** 30 seconds
- **Maximum:** 60 seconds

---

## Request Format

### Request Body Structure

```typescript
interface ConnectAndRecommendRequest {
  // Optional: Organization/tenant ID
  tenant_id?: string;
  
  // Required: Provider type
  provider: 'webflow' | 'wordpress' | 'shopify' | 'medium';
  
  // Required: Connection object with structure
  connection: {
    // Provider-specific credentials
    api_token?: string;        // Webflow, Medium
    site_id?: string;          // Webflow
    base_url?: string;         // WordPress
    username?: string;         // WordPress
    password?: string;         // WordPress
    access_token?: string;     // Medium
    user_id?: string;          // Medium
    shop_domain?: string;      // Shopify
    access_token?: string;     // Shopify
    
    // Structure (provided by frontend)
    structure?: {
      // Provider-specific structure
      collections?: Array<{
        id: string;
        name: string;
        slug: string;
        fields: Array<{
          id: string;
          name: string;
          type: string;
          slug: string;
        }>;
      }>;
      
      post_types?: Array<{
        name: string;
        label: string;
      }>;
      
      publications?: Array<{
        id: string;
        name: string;
        description: string;
      }>;
      
      blogs?: Array<{
        id: string;
        handle: string;
        title: string;
      }>;
      
      // Existing content for interlinking analysis
      existing_content: Array<{
        id: string;
        title: string;
        url: string;
        slug: string;
        keywords: string[];
        categories?: string[];
        published_at: string;
        excerpt?: string;
      }>;
    };
  };
  
  // Required: Keywords for analysis (1-50 keywords)
  keywords: string[];
}
```

### Example Request: Webflow

```json
{
  "tenant_id": "org-uuid-123",
  "provider": "webflow",
  "connection": {
    "api_token": "wf_token_abc123",
    "site_id": "site_xyz789",
    "structure": {
      "collections": [
        {
          "id": "coll_123",
          "name": "Blog Posts",
          "slug": "blog-posts",
          "fields": [
            {
              "id": "field_1",
              "name": "Post Title",
              "type": "PlainText",
              "slug": "post-title"
            }
          ]
        }
      ],
      "existing_content": [
        {
          "id": "item_456",
          "title": "How to Build a Website",
          "url": "https://example.com/blog/how-to-build-a-website",
          "slug": "how-to-build-a-website",
          "keywords": ["website", "build", "tutorial", "web development"],
          "published_at": "2024-01-15T10:00:00Z"
        },
        {
          "id": "item_789",
          "title": "Best Web Hosting Services",
          "url": "https://example.com/blog/best-web-hosting",
          "slug": "best-web-hosting",
          "keywords": ["hosting", "web hosting", "services", "comparison"],
          "published_at": "2024-01-10T14:30:00Z"
        }
      ]
    }
  },
  "keywords": [
    "web development",
    "website builder",
    "hosting services"
  ]
}
```

### Example Request: WordPress

```json
{
  "tenant_id": "org-uuid-123",
  "provider": "wordpress",
  "connection": {
    "base_url": "https://example.com",
    "username": "admin",
    "password": "password123",
    "structure": {
      "post_types": [
        {
          "name": "post",
          "label": "Posts"
        }
      ],
      "existing_content": [
        {
          "id": "123",
          "title": "WordPress SEO Guide",
          "url": "https://example.com/wordpress-seo-guide",
          "slug": "wordpress-seo-guide",
          "keywords": ["wordpress", "seo", "optimization", "guide"],
          "categories": ["SEO", "WordPress"],
          "published_at": "2024-01-12T09:00:00Z"
        }
      ]
    }
  },
  "keywords": [
    "wordpress optimization",
    "seo tips"
  ]
}
```

---

## Structure Processing

### Step 1: Extract Structure

The backend should first check if structure is provided in the `connection.structure` object:

```python
# Python example (pseudo-code)
def extract_structure(connection: dict) -> dict:
    """Extract structure from connection object."""
    if 'structure' in connection:
        return connection['structure']
    
    # Fallback: Fetch structure using credentials
    return fetch_structure_from_provider(
        provider=connection.get('provider'),
        credentials=connection
    )
```

### Step 2: Validate Structure

Validate that the structure contains required fields:

```python
def validate_structure(structure: dict) -> bool:
    """Validate structure has required fields."""
    required_fields = ['existing_content']
    
    if not all(field in structure for field in required_fields):
        return False
    
    # Validate existing_content is array
    if not isinstance(structure['existing_content'], list):
        return False
    
    # Validate each content item has required fields
    required_content_fields = ['id', 'title', 'url', 'keywords']
    for item in structure['existing_content']:
        if not all(field in item for field in required_content_fields):
            return False
    
    return True
```

### Step 3: Normalize Content

Normalize existing content to a standard format for analysis:

```python
def normalize_content(existing_content: list) -> list:
    """Normalize existing content to standard format."""
    normalized = []
    
    for item in existing_content:
        normalized.append({
            'id': item.get('id'),
            'title': item.get('title', ''),
            'url': item.get('url', ''),
            'slug': item.get('slug', ''),
            'keywords': item.get('keywords', []),
            'categories': item.get('categories', []),
            'published_at': item.get('published_at'),
            'excerpt': item.get('excerpt', ''),
            # Normalize keywords to lowercase
            'keywords_normalized': [
                kw.lower().strip() 
                for kw in item.get('keywords', [])
            ]
        })
    
    return normalized
```

---

## Interlinking Algorithm

### Algorithm Overview

1. **Keyword Matching**: Match input keywords to existing content keywords
2. **Relevance Scoring**: Calculate relevance score for each match
3. **Ranking**: Rank opportunities by relevance
4. **Anchor Text Generation**: Generate appropriate anchor text
5. **Filtering**: Filter out low-relevance matches

### Step 1: Keyword Matching

```python
def match_keywords_to_content(
    keywords: list,
    existing_content: list
) -> dict:
    """Match keywords to existing content."""
    matches = {}
    
    for keyword in keywords:
        keyword_lower = keyword.lower().strip()
        keyword_words = keyword_lower.split()
        
        matches[keyword] = []
        
        for content in existing_content:
            # Check exact keyword match
            if keyword_lower in content['keywords_normalized']:
                matches[keyword].append({
                    'content': content,
                    'match_type': 'exact',
                    'score': 1.0
                })
                continue
            
            # Check partial match (keyword contains content keyword or vice versa)
            for content_keyword in content['keywords_normalized']:
                # Check if keyword contains content keyword
                if content_keyword in keyword_lower:
                    matches[keyword].append({
                        'content': content,
                        'match_type': 'partial',
                        'score': 0.7
                    })
                    break
                
                # Check if content keyword contains keyword
                if keyword_lower in content_keyword:
                    matches[keyword].append({
                        'content': content,
                        'match_type': 'partial',
                        'score': 0.7
                    })
                    break
            
            # Check title match
            title_lower = content['title'].lower()
            if keyword_lower in title_lower:
                matches[keyword].append({
                    'content': content,
                    'match_type': 'title',
                    'score': 0.8
                })
                continue
            
            # Check word overlap
            content_words = set(
                ' '.join(content['keywords_normalized'] + [title_lower]).split()
            )
            keyword_words_set = set(keyword_words)
            overlap = len(keyword_words_set.intersection(content_words))
            
            if overlap > 0:
                score = overlap / len(keyword_words_set)
                if score >= 0.3:  # At least 30% word overlap
                    matches[keyword].append({
                        'content': content,
                        'match_type': 'word_overlap',
                        'score': score * 0.6  # Lower weight for word overlap
                    })
    
    return matches
```

### Step 2: Relevance Scoring

```python
def calculate_relevance_score(
    keyword: str,
    content: dict,
    match_type: str,
    base_score: float
) -> float:
    """Calculate comprehensive relevance score."""
    score = base_score
    
    # Boost score based on recency (newer content gets slight boost)
    if content.get('published_at'):
        published_date = parse_date(content['published_at'])
        days_old = (datetime.now() - published_date).days
        
        # Content less than 30 days old gets 10% boost
        if days_old < 30:
            score *= 1.1
        # Content less than 90 days old gets 5% boost
        elif days_old < 90:
            score *= 1.05
    
    # Boost score if keyword appears in title
    title_lower = content['title'].lower()
    keyword_lower = keyword.lower()
    if keyword_lower in title_lower:
        score *= 1.2
    
    # Boost score based on keyword count in content
    keyword_count = sum(
        1 for kw in content['keywords_normalized']
        if keyword_lower in kw or kw in keyword_lower
    )
    if keyword_count > 1:
        score *= (1 + keyword_count * 0.1)
    
    # Normalize score to 0-1 range
    return min(score, 1.0)
```

### Step 3: Anchor Text Generation

```python
def generate_anchor_text(
    keyword: str,
    content: dict
) -> str:
    """Generate appropriate anchor text for interlink."""
    title = content['title']
    keyword_lower = keyword.lower()
    title_lower = title.lower()
    
    # If keyword is in title, use the exact phrase from title
    if keyword_lower in title_lower:
        # Find the phrase in title that contains the keyword
        words = title.split()
        for i, word in enumerate(words):
            if keyword_lower in word.lower():
                # Return 2-4 word phrase around the keyword
                start = max(0, i - 1)
                end = min(len(words), i + 3)
                return ' '.join(words[start:end])
    
    # If keyword matches a content keyword, use that
    for content_keyword in content['keywords_normalized']:
        if keyword_lower in content_keyword or content_keyword in keyword_lower:
            return content_keyword.title()
    
    # Fallback: Use keyword as-is (capitalized)
    return keyword.title()
```

### Step 4: Complete Interlinking Analysis

```python
def analyze_interlinking_opportunities(
    keywords: list,
    existing_content: list
) -> dict:
    """Complete interlinking analysis."""
    # Normalize content
    normalized_content = normalize_content(existing_content)
    
    # Match keywords to content
    matches = match_keywords_to_content(keywords, normalized_content)
    
    # Process matches and calculate scores
    per_keyword_results = []
    
    for keyword in keywords:
        keyword_matches = matches.get(keyword, [])
        
        # Calculate relevance scores
        opportunities = []
        seen_content_ids = set()
        
        for match in keyword_matches:
            content = match['content']
            content_id = content['id']
            
            # Skip duplicates
            if content_id in seen_content_ids:
                continue
            seen_content_ids.add(content_id)
            
            # Calculate final relevance score
            relevance_score = calculate_relevance_score(
                keyword=keyword,
                content=content,
                match_type=match['match_type'],
                base_score=match['score']
            )
            
            # Only include opportunities with score >= 0.4
            if relevance_score >= 0.4:
                anchor_text = generate_anchor_text(keyword, content)
                
                opportunities.append({
                    'target_url': content['url'],
                    'target_title': content['title'],
                    'anchor_text': anchor_text,
                    'relevance_score': round(relevance_score, 2)
                })
        
        # Sort by relevance score (descending)
        opportunities.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        # Limit to top 10 opportunities per keyword
        opportunities = opportunities[:10]
        
        per_keyword_results.append({
            'keyword': keyword,
            'suggested_interlinks': len(opportunities),
            'interlink_opportunities': opportunities
        })
    
    # Calculate total recommended interlinks
    total_interlinks = sum(
        result['suggested_interlinks']
        for result in per_keyword_results
    )
    
    return {
        'recommended_interlinks': total_interlinks,
        'per_keyword': per_keyword_results
    }
```

---

## Response Format

### Success Response

```typescript
interface ConnectAndRecommendResponse {
  provider: string;
  tenant_id?: string;
  saved_integration: boolean;  // Whether integration was saved to Supabase
  recommended_interlinks: number;
  recommended_backlinks: number;  // For future use
  per_keyword: Array<{
    keyword: string;
    difficulty?: number;  // Keyword difficulty (if available)
    suggested_interlinks: number;
    suggested_backlinks: number;  // For future use
    interlink_opportunities: Array<{
      target_url: string;
      target_title: string;
      anchor_text: string;
      relevance_score: number;  // 0.0 to 1.0
    }>;
  }>;
  notes?: string;
}
```

### Example Response

```json
{
  "provider": "webflow",
  "tenant_id": "org-uuid-123",
  "saved_integration": true,
  "recommended_interlinks": 15,
  "recommended_backlinks": 0,
  "per_keyword": [
    {
      "keyword": "web development",
      "suggested_interlinks": 5,
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
      "suggested_interlinks": 3,
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
  "notes": "Found 15 interlinking opportunities across 2 keywords"
}
```

### Error Response

```json
{
  "error": "HTTP 400",
  "message": "Keywords array must contain 1-50 keywords",
  "details": {
    "provided_count": 0,
    "required_min": 1,
    "required_max": 50
  }
}
```

---

## Implementation Examples

### Python Implementation (Flask/FastAPI)

```python
from flask import Flask, request, jsonify
from typing import List, Dict, Any

app = Flask(__name__)

@app.route('/api/v1/integrations/connect-and-recommend', methods=['POST'])
def connect_and_recommend():
    """Handle connect and recommend request."""
    try:
        data = request.get_json()
        
        # Validate request
        if not data:
            return jsonify({
                'error': 'HTTP 400',
                'message': 'Request body is required'
            }), 400
        
        provider = data.get('provider')
        connection = data.get('connection', {})
        keywords = data.get('keywords', [])
        tenant_id = data.get('tenant_id')
        
        # Validate provider
        if provider not in ['webflow', 'wordpress', 'shopify', 'medium']:
            return jsonify({
                'error': 'HTTP 400',
                'message': f'Invalid provider: {provider}'
            }), 400
        
        # Validate keywords
        if not keywords or not isinstance(keywords, list):
            return jsonify({
                'error': 'HTTP 400',
                'message': 'Keywords array is required'
            }), 400
        
        if len(keywords) < 1 or len(keywords) > 50:
            return jsonify({
                'error': 'HTTP 400',
                'message': 'Keywords array must contain 1-50 keywords'
            }), 400
        
        # Extract structure from connection
        structure = connection.get('structure')
        
        if not structure:
            # Fallback: Fetch structure using credentials
            structure = fetch_structure_from_provider(provider, connection)
        
        # Validate structure
        if not validate_structure(structure):
            return jsonify({
                'error': 'HTTP 400',
                'message': 'Invalid structure: existing_content is required'
            }), 400
        
        # Analyze interlinking opportunities
        existing_content = structure.get('existing_content', [])
        analysis_result = analyze_interlinking_opportunities(
            keywords=keywords,
            existing_content=existing_content
        )
        
        # Attempt to save integration to Supabase (best-effort)
        saved_integration = False
        if tenant_id:
            try:
                saved_integration = save_integration_to_supabase(
                    tenant_id=tenant_id,
                    provider=provider,
                    connection=connection
                )
            except Exception as e:
                # Log error but don't fail the request
                print(f"Failed to save integration to Supabase: {e}")
        
        # Build response
        response = {
            'provider': provider,
            'tenant_id': tenant_id,
            'saved_integration': saved_integration,
            'recommended_interlinks': analysis_result['recommended_interlinks'],
            'recommended_backlinks': 0,  # For future implementation
            'per_keyword': analysis_result['per_keyword']
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({
            'error': 'HTTP 500',
            'message': str(e)
        }), 500
```

### Node.js/TypeScript Implementation

```typescript
import express from 'express';

const app = express();
app.use(express.json());

interface ConnectAndRecommendRequest {
  tenant_id?: string;
  provider: 'webflow' | 'wordpress' | 'shopify' | 'medium';
  connection: {
    structure?: {
      existing_content: Array<{
        id: string;
        title: string;
        url: string;
        slug: string;
        keywords: string[];
        published_at: string;
      }>;
    };
    [key: string]: any;
  };
  keywords: string[];
}

app.post('/api/v1/integrations/connect-and-recommend', async (req, res) => {
  try {
    const { tenant_id, provider, connection, keywords } = req.body as ConnectAndRecommendRequest;
    
    // Validate request
    if (!provider || !connection || !keywords) {
      return res.status(400).json({
        error: 'HTTP 400',
        message: 'provider, connection, and keywords are required'
      });
    }
    
    if (!['webflow', 'wordpress', 'shopify', 'medium'].includes(provider)) {
      return res.status(400).json({
        error: 'HTTP 400',
        message: `Invalid provider: ${provider}`
      });
    }
    
    if (!Array.isArray(keywords) || keywords.length < 1 || keywords.length > 50) {
      return res.status(400).json({
        error: 'HTTP 400',
        message: 'Keywords array must contain 1-50 keywords'
      });
    }
    
    // Extract structure
    let structure = connection.structure;
    
    if (!structure) {
      // Fallback: Fetch structure using credentials
      structure = await fetchStructureFromProvider(provider, connection);
    }
    
    // Validate structure
    if (!structure?.existing_content || !Array.isArray(structure.existing_content)) {
      return res.status(400).json({
        error: 'HTTP 400',
        message: 'Structure must contain existing_content array'
      });
    }
    
    // Analyze interlinking opportunities
    const analysisResult = analyzeInterlinkingOpportunities(
      keywords,
      structure.existing_content
    );
    
    // Attempt to save to Supabase (best-effort)
    let savedIntegration = false;
    if (tenant_id) {
      try {
        savedIntegration = await saveIntegrationToSupabase(
          tenant_id,
          provider,
          connection
        );
      } catch (error) {
        console.error('Failed to save integration to Supabase:', error);
        // Continue without failing the request
      }
    }
    
    // Build response
    const response = {
      provider,
      tenant_id,
      saved_integration: savedIntegration,
      recommended_interlinks: analysisResult.recommended_interlinks,
      recommended_backlinks: 0,
      per_keyword: analysisResult.per_keyword
    };
    
    return res.json(response);
    
  } catch (error) {
    return res.status(500).json({
      error: 'HTTP 500',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});
```

---

## Best Practices

### 1. Structure Validation

Always validate structure before processing:

```python
def validate_structure(structure: dict) -> tuple[bool, str]:
    """Validate structure and return (is_valid, error_message)."""
    if not structure:
        return False, "Structure is required"
    
    if 'existing_content' not in structure:
        return False, "Structure must contain existing_content"
    
    if not isinstance(structure['existing_content'], list):
        return False, "existing_content must be an array"
    
    if len(structure['existing_content']) == 0:
        return False, "existing_content cannot be empty"
    
    # Validate each content item
    required_fields = ['id', 'title', 'url', 'keywords']
    for i, item in enumerate(structure['existing_content']):
        for field in required_fields:
            if field not in item:
                return False, f"Content item {i} missing required field: {field}"
    
    return True, ""
```

### 2. Performance Optimization

For large existing_content arrays, optimize the matching algorithm:

```python
def optimize_content_indexing(existing_content: list) -> dict:
    """Create index for faster keyword matching."""
    index = {
        'by_keyword': {},  # keyword -> [content_ids]
        'by_title_word': {},  # word -> [content_ids]
        'content_by_id': {}  # content_id -> content
    }
    
    for content in existing_content:
        content_id = content['id']
        index['content_by_id'][content_id] = content
        
        # Index by keywords
        for keyword in content.get('keywords_normalized', []):
            if keyword not in index['by_keyword']:
                index['by_keyword'][keyword] = []
            index['by_keyword'][keyword].append(content_id)
        
        # Index by title words
        title_words = content['title'].lower().split()
        for word in title_words:
            if word not in index['by_title_word']:
                index['by_title_word'][word] = []
            index['by_title_word'][word].append(content_id)
    
    return index
```

### 3. Error Handling

Implement comprehensive error handling:

```python
def handle_structure_error(error: Exception, provider: str) -> dict:
    """Handle structure-related errors gracefully."""
    error_messages = {
        'webflow': 'Failed to fetch Webflow structure. Please check API token and site ID.',
        'wordpress': 'Failed to fetch WordPress structure. Please check credentials.',
        'medium': 'Failed to fetch Medium structure. Please check access token.',
        'shopify': 'Failed to fetch Shopify structure. Please check shop domain and access token.'
    }
    
    return {
        'error': 'HTTP 500',
        'message': error_messages.get(provider, 'Failed to fetch structure'),
        'details': str(error)
    }
```

### 4. Caching

Consider caching structure data to reduce API calls:

```python
from functools import lru_cache
import hashlib
import json

@lru_cache(maxsize=100)
def get_cached_structure(provider: str, connection_hash: str) -> dict:
    """Get cached structure if available."""
    # Implementation depends on your caching solution
    # (Redis, Memcached, etc.)
    pass

def get_connection_hash(connection: dict) -> str:
    """Generate hash for connection object (excluding structure)."""
    connection_copy = {k: v for k, v in connection.items() if k != 'structure'}
    return hashlib.md5(json.dumps(connection_copy, sort_keys=True).encode()).hexdigest()
```

### 5. Logging

Implement comprehensive logging:

```python
import logging

logger = logging.getLogger(__name__)

def analyze_with_logging(keywords: list, existing_content: list) -> dict:
    """Analyze with logging."""
    logger.info(f"Starting interlinking analysis for {len(keywords)} keywords")
    logger.debug(f"Analyzing against {len(existing_content)} existing content items")
    
    try:
        result = analyze_interlinking_opportunities(keywords, existing_content)
        
        logger.info(
            f"Analysis complete: {result['recommended_interlinks']} "
            f"interlinks recommended"
        )
        
        return result
    except Exception as e:
        logger.error(f"Interlinking analysis failed: {e}", exc_info=True)
        raise
```

---

## Testing

### Test Cases

1. **Valid Request with Structure**
   - Should return recommendations
   - Should include relevance scores
   - Should limit opportunities per keyword

2. **Request without Structure**
   - Should fetch structure from provider API
   - Should return recommendations

3. **Empty Existing Content**
   - Should return empty recommendations
   - Should not error

4. **Invalid Keywords**
   - Should validate keyword count (1-50)
   - Should return appropriate error

5. **No Matches**
   - Should return empty opportunities
   - Should not error

### Example Test

```python
def test_interlinking_analysis():
    """Test interlinking analysis."""
    keywords = ['web development', 'hosting']
    
    existing_content = [
        {
            'id': '1',
            'title': 'How to Build a Website',
            'url': 'https://example.com/build-website',
            'slug': 'build-website',
            'keywords': ['website', 'build', 'web development'],
            'published_at': '2024-01-15T10:00:00Z'
        },
        {
            'id': '2',
            'title': 'Best Web Hosting Services',
            'url': 'https://example.com/hosting',
            'slug': 'hosting',
            'keywords': ['hosting', 'web hosting', 'services'],
            'published_at': '2024-01-10T14:30:00Z'
        }
    ]
    
    result = analyze_interlinking_opportunities(keywords, existing_content)
    
    assert result['recommended_interlinks'] > 0
    assert len(result['per_keyword']) == 2
    assert result['per_keyword'][0]['keyword'] == 'web development'
    assert len(result['per_keyword'][0]['interlink_opportunities']) > 0
```

---

## Summary Checklist

### Backend Implementation Checklist

- [ ] **API Endpoint**
  - [ ] Implement `/api/v1/integrations/connect-and-recommend`
  - [ ] Validate request parameters
  - [ ] Handle provider-specific logic

- [ ] **Structure Processing**
  - [ ] Extract structure from connection object
  - [ ] Validate structure format
  - [ ] Normalize existing content
  - [ ] Fallback: Fetch structure if not provided

- [ ] **Interlinking Algorithm**
  - [ ] Keyword matching logic
  - [ ] Relevance scoring
  - [ ] Anchor text generation
  - [ ] Ranking and filtering

- [ ] **Response Format**
  - [ ] Return per_keyword recommendations
  - [ ] Include relevance scores
  - [ ] Include target URLs and titles
  - [ ] Include anchor text suggestions

- [ ] **Error Handling**
  - [ ] Validate keywords (1-50)
  - [ ] Validate provider type
  - [ ] Handle missing structure
  - [ ] Handle API errors gracefully

- [ ] **Supabase Integration (Optional)**
  - [ ] Save integration to Supabase
  - [ ] Handle save failures gracefully
  - [ ] Return saved_integration status

- [ ] **Performance**
  - [ ] Optimize for large content arrays
  - [ ] Implement caching (optional)
  - [ ] Set appropriate timeouts

- [ ] **Testing**
  - [ ] Unit tests for matching algorithm
  - [ ] Integration tests for API endpoint
  - [ ] Test with real provider data

---

## Next Steps

1. Implement the API endpoint in your backend
2. Test with sample structure data
3. Integrate with frontend
4. Monitor performance and optimize
5. Add additional matching strategies as needed

