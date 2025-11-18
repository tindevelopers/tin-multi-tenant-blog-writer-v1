# Frontend Testing Guide - Backend API Endpoints

## Base URL

**Development Environment:**
```
https://blog-writer-api-dev-613248238610.europe-west9.run.app
```

**Staging Environment:**
```
https://blog-writer-api-staging-613248238610.europe-west9.run.app
```

**Production Environment:**
```
https://blog-writer-api-prod-613248238610.us-east1.run.app
```

**Note:** The frontend automatically routes to the correct endpoint based on the Git branch:
- `develop` branch → Dev API
- `staging` branch → Staging API  
- `main`/`master` branch → Prod API

---

## 1. Health Check Endpoints

### GET `/health`
Check if the API is running.

**Request:**
```bash
curl https://blog-writer-api-dev-613248238610.europe-west9.run.app/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-16T18:55:10.197256"
}
```

### GET `/`
Get API information and status.

**Request:**
```bash
curl https://blog-writer-api-dev-613248238610.europe-west9.run.app/
```

**Response:**
```json
{
  "message": "Blog Writer SDK API",
  "version": "1.0.0",
  "environment": "cloud-run",
  "testing_mode": true,
  "docs": "/docs",
  "health": "/health",
  "endpoints": {
    "generate": "/api/v1/blog/generate",
    "analyze": "/api/v1/analyze",
    "keywords": "/api/v1/keywords"
  }
}
```

---

## 2. Enhanced Blog Generation Endpoint

### POST `/api/v1/blog/generate-enhanced`

**Main endpoint for blog generation** - Supports both synchronous and async modes.

#### Synchronous Mode (Default)

**Request:**
```bash
curl -X POST https://blog-writer-api-dev-613248238610.europe-west9.run.app/api/v1/blog/generate-enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Dog grooming tips for beginners",
    "keywords": ["dog grooming", "pet care"],
    "tone": "professional",
    "length": "short",
    "include_images": false
  }'
```

**JavaScript/Fetch Example:**
```javascript
const response = await fetch('https://blog-writer-api-dev-613248238610.europe-west9.run.app/api/v1/blog/generate-enhanced', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    topic: "Dog grooming tips for beginners",
    keywords: ["dog grooming", "pet care"],
    tone: "professional",
    length: "short",
    include_images: false
  })
});

const blogPost = await response.json();
console.log(blogPost);
```

**Response Structure:**
```json
{
  "title": "Dog Grooming Tips for Beginners",
  "content": "# Dog Grooming Tips for Beginners\n\n...",
  "meta_title": "Dog Grooming Tips for Beginners: Complete Guide",
  "meta_description": "Learn essential dog grooming tips...",
  "readability_score": 75.5,
  "seo_score": 85.0,
  "stage_results": [...],
  "citations": [
    {
      "text": "...",
      "url": "https://...",
      "title": "Source Title"
    }
  ],
  "total_tokens": 2500,
  "total_cost": 0.05,
  "generation_time": 45.2,
  "seo_metadata": {...},
  "internal_links": [
    {
      "text": "dog grooming",
      "url": "/dog-grooming"
    }
  ],
  "quality_score": 88.5,
  "quality_dimensions": {...},
  "structured_data": {...},
  "semantic_keywords": ["pet care", "dog hygiene"],
  "content_metadata": {...},
  "success": true,
  "warnings": []
}
```

**Request Parameters:**
- `topic` (string, required): Blog topic
- `keywords` (array, required): List of keywords
- `tone` (string, optional): "professional", "casual", "friendly", "technical" (default: "professional")
- `length` (string, optional): "short", "medium", "long" (default: "medium")
- `include_images` (boolean, optional): Whether to generate images (default: false)
- `use_google_search` (boolean, optional): Enable Google Search research (default: true)
- `use_serp_optimization` (boolean, optional): Enable SERP optimization (default: true)
- `use_consensus_generation` (boolean, optional): Use multi-model consensus (default: false)
- `use_semantic_keywords` (boolean, optional): Enable semantic keyword integration (default: true)
- `use_quality_scoring` (boolean, optional): Enable quality scoring (default: true)
- `use_knowledge_graph` (boolean, optional): Enable Google Knowledge Graph (default: false)

#### Async Mode

**Request:**
```bash
curl -X POST "https://blog-writer-api-dev-613248238610.europe-west9.run.app/api/v1/blog/generate-enhanced?async_mode=true" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Advanced Python programming techniques",
    "keywords": ["python", "programming"],
    "tone": "professional",
    "length": "medium",
    "include_images": false
  }'
```

**JavaScript/Fetch Example:**
```javascript
const response = await fetch('https://blog-writer-api-dev-613248238610.europe-west9.run.app/api/v1/blog/generate-enhanced?async_mode=true', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    topic: "Advanced Python programming techniques",
    keywords: ["python", "programming"],
    tone: "professional",
    length: "medium",
    include_images: false
  })
});

const jobResponse = await response.json();
console.log('Job ID:', jobResponse.job_id);
```

**Response (Async Mode):**
```json
{
  "job_id": "c35fb264-5451-4a3b-80c6-c27fd9c34cb3",
  "status": "queued",
  "message": "Blog generation job queued successfully",
  "estimated_completion_time": 240
}
```

**Check Job Status:**
```bash
curl https://blog-writer-api-dev-613248238610.europe-west9.run.app/api/v1/blog/jobs/{job_id}
```

**JavaScript Example:**
```javascript
async function checkJobStatus(jobId) {
  const response = await fetch(`https://blog-writer-api-dev-613248238610.europe-west9.run.app/api/v1/blog/jobs/${jobId}`);
  const status = await response.json();
  
  console.log('Status:', status.status);
  console.log('Progress:', status.progress_percentage + '%');
  console.log('Current Stage:', status.current_stage);
  
  if (status.status === 'completed') {
    console.log('Blog:', status.result);
  }
  
  return status;
}

// Poll every 5 seconds
const jobId = 'c35fb264-5451-4a3b-80c6-c27fd9c34cb3';
const interval = setInterval(async () => {
  const status = await checkJobStatus(jobId);
  if (status.status === 'completed' || status.status === 'failed') {
    clearInterval(interval);
  }
}, 5000);
```

**Job Status Response:**
```json
{
  "job_id": "c35fb264-5451-4a3b-80c6-c27fd9c34cb3",
  "status": "completed",
  "progress_percentage": 100.0,
  "current_stage": "completed",
  "queued_at": "2025-11-16T18:55:10.197256",
  "started_at": "2025-11-16T18:55:15.123456",
  "completed_at": "2025-11-16T18:59:30.789012",
  "result": {
    "title": "...",
    "content": "...",
    "internal_links": [...],
    ...
  },
  "error_message": null
}
```

**Job Status Values:**
- `pending`: Job created but not yet queued
- `queued`: Job queued in Cloud Tasks
- `processing`: Job is being processed
- `completed`: Job completed successfully
- `failed`: Job failed with error

---

## 3. Keyword Analysis Endpoints

### POST `/api/v1/keywords/analyze`

Analyze keywords and get search volume, CPC, and related keywords.

**Request:**
```bash
curl -X POST https://blog-writer-api-dev-613248238610.europe-west9.run.app/api/v1/keywords/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["dog grooming"],
    "location": "United States",
    "language": "en"
  }'
```

**JavaScript/Fetch Example:**
```javascript
const response = await fetch('https://blog-writer-api-dev-613248238610.europe-west9.run.app/api/v1/keywords/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    keywords: ["dog grooming"],
    location: "United States",
    language: "en"
  })
});

const analysis = await response.json();
console.log(analysis);
```

**Response Structure:**
The response can contain either `enhanced_analysis` (from enhanced endpoint) or `keyword_analysis` (from regular endpoint), or both for backward compatibility:

```json
{
  "enhanced_analysis": {
    "dog grooming": {
      "search_volume": 1300,
      "global_search_volume": 0,
      "difficulty": "medium",
      "competition": 0.65,
      "cpc": 3.81,
      "trend_score": 0.75,
      "recommended": true,
      "reason": "Good search volume with moderate competition",
      "related_keywords": ["best dog grooming", "dog grooming tips"],
      "long_tail_keywords": ["how to groom a dog at home"],
      "parent_topic": "Dog Grooming",
      "cluster_score": 0.5
    }
  },
  "keyword_analysis": {
    "dog grooming": {
      "search_volume": 1300,
      "cpc": 3.81,
      "competition": 0.65
    }
  },
  "clusters": [
    {
      "parent_topic": "Dog Grooming",
      "keywords": ["dog grooming", "pet grooming"],
      "cluster_score": 0.5,
      "keyword_count": 2
    }
  ],
  "suggested_keywords": ["dog grooming tips", "pet grooming services"],
  "total_keywords": 25,
  "original_keywords": ["dog grooming"],
  "location": {
    "used": "United States",
    "detected_from_ip": false,
    "specified": true
  },
  "testing_mode": false,
  "saved_search_id": "uuid-here"
}
```

**Request Parameters:**
- `keywords` (array, required): List of keywords to analyze (max 20 for optimal results)
- `location` (string, optional): Location name (default: "United States")
- `language` (string, optional): Language code (default: "en")
- `max_suggestions_per_keyword` (number, optional): Max suggestions per keyword (default: 75, min: 5)
- `include_search_volume` (boolean, optional): Include search volume data (default: true)
- `include_serp` (boolean, optional): Include SERP data (default: false)
- `include_trends` (boolean, optional): Include trend data (default: false)
- `include_keyword_ideas` (boolean, optional): Include keyword ideas (default: false)
- `include_relevant_pages` (boolean, optional): Include relevant pages (default: false)
- `include_serp_ai_summary` (boolean, optional): Include SERP AI summary (default: false)
- `competitor_domain` (string, optional): Competitor domain for analysis
- `search_query` (string, optional): Original search query for saving
- `search_type` (string, optional): "how_to", "listicle", "product", "brand", "comparison", "qa", "evergreen", "seasonal", "general"
- `niche` (string, optional): Industry/niche category
- `search_mode` (string, optional): "keywords", "matching_terms", "related_terms", "questions", "ads_ppc"
- `save_search` (boolean, optional): Save search to database (default: true)
- `filters` (object, optional): Additional filters

**Note:** The frontend API route (`/api/keywords/analyze`) automatically:
1. Tries the enhanced endpoint first (`/api/v1/keywords/enhanced`)
2. Falls back to regular endpoint if enhanced returns 503
3. Applies testing mode limits if `TESTING_MODE=true`
4. Saves search to database if `save_search=true` and user is authenticated
5. Returns both `enhanced_analysis` and `keyword_analysis` for backward compatibility

### POST `/api/v1/keywords/enhanced`

Enhanced keyword analysis with clustering and SERP data.

**Request:**
```bash
curl -X POST https://blog-writer-api-dev-613248238610.europe-west9.run.app/api/v1/keywords/enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["dog grooming"],
    "location": "United States",
    "language": "en",
    "max_suggestions_per_keyword": 5,
    "include_clustering": true,
    "include_serp": true
  }'
```

**Response Structure:**
```json
{
  "enhanced_analysis": {
    "dog grooming": {
      "search_volume": 1300,
      "global_search_volume": 0,
      "difficulty": "medium",
      "competition": 0.65,
      "cpc": 3.81,
      "trend_score": 0.75,
      "recommended": true,
      "reason": "Good search volume with moderate competition",
      "related_keywords": ["best dog grooming", "dog grooming tips"],
      "long_tail_keywords": ["how to groom a dog at home"],
      "parent_topic": "Dog Grooming",
      "cluster_score": 0.5,
      "category_type": "topic",
      "primary_intent": "informational",
      "intent_probabilities": {
        "informational": 0.8,
        "commercial": 0.15,
        "transactional": 0.05
      },
      "monthly_searches": [
        {"month": "2024-01", "volume": 1200},
        {"month": "2024-02", "volume": 1300}
      ],
      "also_rank_for": ["pet grooming"],
      "also_talk_about": ["dog care", "pet hygiene"]
    }
  },
  "clusters": [
    {
      "parent_topic": "Dog Grooming",
      "keywords": ["dog grooming", "pet grooming"],
      "cluster_score": 0.5,
      "keyword_count": 2,
      "category_type": "topic"
    }
  ],
  "cluster_summary": {
    "total_keywords": 25,
    "cluster_count": 5,
    "unclustered_count": 3
  },
  "suggested_keywords": ["dog grooming tips", "pet grooming services"],
  "total_keywords": 25,
  "original_keywords": ["dog grooming"],
  "location": {
    "used": "United States",
    "detected_from_ip": false,
    "specified": true
  }
}
```

**Request Parameters:**
- `keywords` (array, required): List of keywords (max 20 for optimal results)
- `location` (string, optional): Location name (default: "United States")
- `language` (string, optional): Language code (default: "en")
- `max_suggestions_per_keyword` (number, required): Must be >= 5 (default: 75, max: 150)
- `include_search_volume` (boolean, optional): Include search volume (default: true)
- `include_clustering` (boolean, optional): Enable keyword clustering (default: true)
- `include_serp` (boolean, optional): Include SERP data (default: false)
- `include_trends` (boolean, optional): Include trend data (default: false)
- `include_keyword_ideas` (boolean, optional): Include keyword ideas (default: false)
- `include_relevant_pages` (boolean, optional): Include relevant pages (default: false)
- `include_serp_ai_summary` (boolean, optional): Include SERP AI summary (default: false)
- `competitor_domain` (string, optional): Competitor domain for analysis

---

## 4. Standard Blog Generation Endpoint

### POST `/api/v1/blog/generate`

Simpler blog generation endpoint (without enhanced features).

**Request:**
```bash
curl -X POST https://blog-writer-api-dev-613248238610.europe-west9.run.app/api/v1/blog/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Python programming tips",
    "keywords": ["python"],
    "tone": "professional",
    "length": "medium"
  }'
```

---

## 5. Error Handling

### Error Response Format

```json
{
  "error": "HTTP 500",
  "message": "Enhanced blog generation failed: ...",
  "timestamp": "2025-11-16T18:55:10.197256"
}
```

### Common Error Codes

- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid credentials
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Endpoint not found
- `422 Unprocessable Entity`: Validation error (e.g., max_suggestions_per_keyword < 5)
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable (enhanced endpoint may fallback to regular)

### JavaScript Error Handling Example

```javascript
async function generateBlog(requestData) {
  try {
    const response = await fetch('https://blog-writer-api-dev-613248238610.europe-west9.run.app/api/v1/blog/generate-enhanced', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || `HTTP ${response.status}`);
    }

    const blogPost = await response.json();
    return blogPost;
  } catch (error) {
    console.error('Blog generation failed:', error);
    throw error;
  }
}
```

---

## 6. Testing Scenarios

### Scenario 1: Quick Blog Generation (Synchronous)

```javascript
const quickBlog = await generateBlog({
  topic: "Quick test blog",
  keywords: ["test"],
  tone: "professional",
  length: "short",
  include_images: false
});
```

### Scenario 2: Long Blog with Async Mode

```javascript
// Start async job
const jobResponse = await fetch('https://blog-writer-api-dev-613248238610.europe-west9.run.app/api/v1/blog/generate-enhanced?async_mode=true', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic: "Comprehensive guide to Python programming",
    keywords: ["python", "programming", "tutorial"],
    tone: "professional",
    length: "long",
    include_images: false
  })
});

const { job_id } = await jobResponse.json();

// Poll for completion
const checkStatus = async () => {
  const status = await fetch(`https://blog-writer-api-dev-613248238610.europe-west9.run.app/api/v1/blog/jobs/${job_id}`);
  return await status.json();
};

// Poll every 5 seconds
const pollInterval = setInterval(async () => {
  const status = await checkStatus();
  if (status.status === 'completed') {
    clearInterval(pollInterval);
    console.log('Blog ready:', status.result);
  } else if (status.status === 'failed') {
    clearInterval(pollInterval);
    console.error('Blog generation failed:', status.error_message);
  }
}, 5000);
```

### Scenario 3: Keyword Research Before Blog Generation

```javascript
// First, analyze keywords using frontend API route
const keywordAnalysis = await fetch('/api/keywords/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keywords: ["dog grooming", "pet care"],
    location: "United States",
    language: "en",
    search_type: "general",
    save_search: true
  })
});

const analysis = await keywordAnalysis.json();

// Extract keywords from enhanced_analysis or keyword_analysis
const keywordData = analysis.enhanced_analysis || analysis.keyword_analysis || {};
const topKeywords = Object.keys(keywordData)
  .filter(keyword => keywordData[keyword].recommended !== false)
  .slice(0, 5);

// Use top keywords for blog generation
const blog = await generateBlog({
  topic: "Dog grooming guide",
  keywords: topKeywords,
  tone: "professional",
  length: "medium"
});
```

### Scenario 4: Testing Mode Keyword Research

```javascript
// When TESTING_MODE=true, limits are automatically applied
const response = await fetch('/api/keywords/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keywords: ["dog grooming", "pet care", "dog training", "pet health", "dog food", "pet supplies"],
    location: "United States",
    language: "en",
    max_suggestions_per_keyword: 75 // Will be limited to 5 in testing mode
  })
});

const data = await response.json();

// Check if testing mode is active
if (data.testing_mode) {
  console.log('Testing mode active - limited data returned');
  console.log('Indicator:', data.testing_mode_indicator);
}

// Results will be limited to:
// - Max 5 primary keywords
// - Max 5 suggestions per keyword
// - Max 5 related keywords per keyword
// - Max 5 long-tail keywords per keyword
// - Max 5 clusters
```

---

## 7. Internal Links Format

**Important:** Internal links are returned as an array of objects with `text` and `url` keys.

```javascript
const blogPost = await generateBlog({...});

// Access internal links
if (blogPost.internal_links && Array.isArray(blogPost.internal_links)) {
  blogPost.internal_links.forEach(link => {
    console.log(`Link: ${link.text} -> ${link.url}`);
    // Example: Link: dog grooming -> /dog-grooming
  });
}
```

**Format:**
```json
{
  "internal_links": [
    {
      "text": "dog grooming",
      "url": "/dog-grooming"
    },
    {
      "text": "pet care",
      "url": "/pet-care"
    }
  ]
}
```

---

## 8. Testing Mode

When `TESTING_MODE=true` is enabled (via `NEXT_PUBLIC_TESTING_MODE` or `TESTING_MODE` environment variable), the API applies data limits:

### Frontend Limits (Applied in `/api/keywords/analyze` route):
- **Max Primary Keywords**: 5 per search
- **Max Suggestions**: 5 per keyword (reduced from 75)
- **Max Related Keywords**: 5 per keyword
- **Max Long-tail Keywords**: 5 per keyword
- **Max Clusters**: 5
- **Max Keywords per Cluster**: 10
- **Max Total Keywords**: 25 per session

### Backend Limits (Applied in Blog Writer API):
- Similar limits applied server-side when `TESTING_MODE=true`

### Check Testing Mode Status:
```bash
curl https://blog-writer-api-dev-613248238610.europe-west9.run.app/
```

Response includes `"testing_mode": true/false`.

### Frontend Testing Mode Indicator:
When testing mode is active, the frontend displays a yellow banner:
```
🧪 Testing Mode Active
Limited data retrieval is enabled to reduce API costs during testing.
Results are restricted to 5 keywords, 5 suggestions per keyword, and 5 clusters maximum.
```

---

## 9. Frontend API Routes

The frontend provides Next.js API routes that proxy requests to the backend:

### POST `/api/keywords/analyze`
Proxies to backend `/api/v1/keywords/enhanced` or `/api/v1/keywords/analyze`

**Features:**
- Automatic endpoint selection (enhanced first, fallback to regular)
- Testing mode limit application
- Search persistence to database
- Response normalization (returns both `enhanced_analysis` and `keyword_analysis`)

**Example:**
```javascript
const response = await fetch('/api/keywords/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keywords: ["dog grooming"],
    location: "United States",
    language: "en",
    search_type: "general",
    save_search: true
  })
});

const data = await response.json();
// data.enhanced_analysis - Enhanced analysis data
// data.keyword_analysis - Backward compatible format
// data.clusters - Keyword clusters
// data.saved_search_id - ID if search was saved
// data.testing_mode - Testing mode status
```

---

## 10. Complete Frontend Example

```javascript
class BlogWriterAPI {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async generateBlog(requestData, asyncMode = false) {
    const url = `${this.baseUrl}/api/v1/blog/generate-enhanced${asyncMode ? '?async_mode=true' : ''}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  async checkJobStatus(jobId) {
    const response = await fetch(`${this.baseUrl}/api/v1/blog/jobs/${jobId}`);
    if (!response.ok) {
      throw new Error(`Failed to check job status: ${response.status}`);
    }
    return await response.json();
  }

  async analyzeKeywords(keywords, options = {}) {
    // Use frontend API route for automatic handling
    const response = await fetch('/api/keywords/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keywords,
        location: options.location || 'United States',
        language: options.language || 'en',
        search_type: options.search_type || 'general',
        niche: options.niche,
        search_mode: options.search_mode || 'keywords',
        save_search: options.save_search !== false,
        max_suggestions_per_keyword: options.max_suggestions || 75,
        include_trends: options.include_trends || false,
        include_serp: options.include_serp || false
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  async healthCheck() {
    const response = await fetch(`${this.baseUrl}/health`);
    return await response.json();
  }
}

// Usage
const api = new BlogWriterAPI('https://blog-writer-api-dev-613248238610.europe-west9.run.app');

// Generate blog synchronously
const blog = await api.generateBlog({
  topic: "Dog grooming tips",
  keywords: ["dog grooming"],
  tone: "professional",
  length: "short"
});

// Analyze keywords (uses frontend route)
const keywordData = await api.analyzeKeywords(
  ["dog grooming", "pet care"],
  {
    location: "United States",
    language: "en",
    search_type: "general",
    save_search: true
  }
);

// Access enhanced analysis
const enhanced = keywordData.enhanced_analysis || {};
const primaryKeyword = Object.keys(enhanced)[0];
const metrics = enhanced[primaryKeyword];

console.log('Search Volume:', metrics.search_volume);
console.log('Difficulty:', metrics.difficulty);
console.log('CPC:', metrics.cpc);
console.log('Related Keywords:', metrics.related_keywords);
console.log('Clusters:', keywordData.clusters);

// Generate blog asynchronously
const job = await api.generateBlog({
  topic: "Advanced Python guide",
  keywords: ["python"],
  tone: "professional",
  length: "long"
}, true);

// Check job status
const status = await api.checkJobStatus(job.job_id);
```

---

## 11. Quick Test Checklist

- [ ] Health check endpoint returns `{"status": "healthy"}`
- [ ] Root endpoint returns API information with `testing_mode` field
- [ ] Synchronous blog generation works
- [ ] Async blog generation creates job
- [ ] Job status endpoint returns job information
- [ ] Keyword analysis returns `enhanced_analysis` or `keyword_analysis`
- [ ] Enhanced endpoint returns clusters and suggested keywords
- [ ] Frontend API route (`/api/keywords/analyze`) works correctly
- [ ] Testing mode limits are applied when enabled
- [ ] Testing mode indicator appears in UI when active
- [ ] Internal links are properly formatted (array of objects with `text` and `url`)
- [ ] Error handling works correctly
- [ ] Search persistence saves to database when authenticated
- [ ] Location parameter is correctly forwarded to backend

---

## 12. Response Structure Reference

### Keyword Analysis Response
```typescript
interface KeywordAnalysisResponse {
  // Enhanced analysis (from enhanced endpoint)
  enhanced_analysis?: Record<string, {
    search_volume?: number;
    global_search_volume?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    competition?: number;
    cpc?: number;
    trend_score?: number;
    recommended?: boolean;
    reason?: string;
    related_keywords?: string[];
    long_tail_keywords?: string[];
    parent_topic?: string;
    cluster_score?: number;
    category_type?: 'topic' | 'question' | 'action' | 'entity';
    primary_intent?: string;
    intent_probabilities?: Record<string, number>;
    monthly_searches?: Array<{ month: string; volume: number }>;
    also_rank_for?: string[];
    also_talk_about?: string[];
  }>;
  
  // Backward compatible format
  keyword_analysis?: Record<string, KeywordMetrics>;
  
  // Clustering data
  clusters?: Array<{
    parent_topic: string;
    keywords: string[];
    cluster_score: number;
    keyword_count: number;
    category_type?: string;
  }>;
  
  cluster_summary?: {
    total_keywords: number;
    cluster_count: number;
    unclustered_count: number;
  };
  
  // Suggested keywords
  suggested_keywords?: string[];
  total_keywords?: number;
  original_keywords?: string[];
  
  // Location info
  location?: {
    used: string;
    detected_from_ip: boolean;
    specified: boolean;
  };
  
  // Testing mode
  testing_mode?: boolean;
  testing_mode_indicator?: string;
  
  // Saved search
  saved_search_id?: string;
}
```

---

## Support

For issues or questions:
- Check API documentation: `https://blog-writer-api-dev-613248238610.europe-west9.run.app/docs`
- Review error messages in response
- Check Cloud Run logs for detailed error information
- Verify testing mode status in root endpoint response
- Check frontend console for testing mode indicator

