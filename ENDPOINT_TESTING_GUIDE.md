# Endendpoint Testing Guide

## Quick Test Commands

All endpoints can be tested using `curl` or any HTTP client (Postman, Insomnia, etc.).

**Base URLs:**
- **Frontend API (Next.js)**: `http://localhost:3000/api`
- **Backend API (Blog Writer)**: `https://blog-writer-api-dev-kq42l26tuq-od.a.run.app/api/v1`

---

## Frontend API Endpoints (Next.js Routes)

### 1. Keyword Suggestions
**Endpoint:** `POST /api/keywords/suggest`

**Request:**
```bash
curl -X POST http://localhost:3000/api/keywords/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "python programming",
    "limit": 20,
    "location": "United States",
    "language": "en"
  }'
```

**Expected Response:**
```json
{
  "suggestions": [...],
  "keyword_suggestions": [...],
  "total_suggestions": 20,
  "clusters": [],
  "cluster_summary": {}
}
```

---

### 2. Keyword Analysis
**Endpoint:** `POST /api/keywords/analyze`

**Request:**
```bash
curl -X POST http://localhost:3000/api/keywords/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["python", "programming"],
    "location": "United States",
    "language": "en",
    "max_suggestions_per_keyword": 10
  }'
```

**Expected Response:**
```json
{
  "keyword_analysis": {
    "python": {
      "search_volume": 100000,
      "difficulty": "medium",
      "competition": 0.5,
      "cpc": 2.5
    }
  }
}
```

---

### 3. AI Topic Suggestions
**Endpoint:** `POST /api/keywords/ai-topic-suggestions`

**Request:**
```bash
curl -X POST http://localhost:3000/api/keywords/ai-topic-suggestions \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["python", "programming"],
    "location": "United States",
    "language": "en",
    "include_ai_search_volume": true,
    "include_llm_mentions": true,
    "limit": 10,
    "content_objective": "Educational blog post",
    "target_audience": "Developers",
    "industry": "Technology"
  }'
```

**Expected Response:**
```json
{
  "topic_suggestions": [...],
  "ai_metrics": {
    "search_volume": {...},
    "llm_mentions": {...}
  }
}
```

---

### 4. AI Topic Suggestions (Streaming)
**Endpoint:** `POST /api/keywords/ai-topic-suggestions/stream`

**Request:**
```bash
curl -X POST http://localhost:3000/api/keywords/ai-topic-suggestions/stream \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["python"],
    "limit": 10
  }'
```

**Expected Response:** Server-Sent Events (SSE) stream

---

### 5. Goal-Based Analysis
**Endpoint:** `POST /api/keywords/goal-based-analysis/stream`

**Request:**
```bash
curl -X POST http://localhost:3000/api/keywords/goal-based-analysis/stream \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["python"],
    "content_goal": "SEO & Rankings",
    "location": "United States",
    "language": "en",
    "include_serp": true
  }'
```

**Expected Response:** Server-Sent Events (SSE) stream

---

### 6. Keyword Storage - Store Research Results
**Endpoint:** `POST /api/keywords/store`

**Request:**
```bash
curl -X POST http://localhost:3000/api/keywords/store \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "keyword": "python programming",
    "location": "United States",
    "language": "en",
    "search_type": "traditional",
    "traditional_data": {
      "keyword": "python programming",
      "search_volume": 100000,
      "keyword_difficulty": 50,
      "competition": 0.5,
      "cpc": 2.5
    },
    "related_terms": [...]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "research_result_id": "uuid-here"
}
```

---

### 7. Keyword Storage - List Research Results
**Endpoint:** `GET /api/keywords/research-results`

**Request:**
```bash
curl -X GET "http://localhost:3000/api/keywords/research-results?page=1&limit=10" \
  -H "Cookie: your-auth-cookie"
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10)
- `keyword` (optional): Filter by keyword
- `search_type` (optional): Filter by type (traditional, ai, both)
- `location` (optional): Filter by location
- `language` (optional): Filter by language

**Expected Response:**
```json
{
  "success": true,
  "results": [...],
  "total": 10,
  "page": 1,
  "limit": 10
}
```

---

### 8. Keyword Storage - List Keyword Terms
**Endpoint:** `GET /api/keywords/list`

**Request:**
```bash
curl -X GET "http://localhost:3000/api/keywords/list?research_result_id=uuid-here" \
  -H "Cookie: your-auth-cookie"
```

**Query Parameters:**
- `research_result_id` (optional): Filter by research result ID

**Expected Response:**
```json
{
  "success": true,
  "terms": [...]
}
```

---

### 9. Keyword Storage - Flush Cache
**Endpoint:** `POST /api/keywords/flush-cache`

**Request:**
```bash
curl -X POST http://localhost:3000/api/keywords/flush-cache \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "keyword": "python programming",
    "location": "United States",
    "language": "en",
    "search_type": "traditional"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Cache flushed successfully"
}
```

---

### 10. Keyword Storage - Verify Storage
**Endpoint:** `GET /api/keywords/verify-storage`

**Request:**
```bash
curl -X GET http://localhost:3000/api/keywords/verify-storage \
  -H "Cookie: your-auth-cookie"
```

**Expected Response:**
```json
{
  "success": true,
  "verification": {
    "research_results": {...},
    "keyword_terms": {...},
    "keyword_cache": {...}
  }
}
```

---

### 11. Keyword Storage - Debug Info
**Endpoint:** `GET /api/keywords/debug`

**Request:**
```bash
curl -X GET http://localhost:3000/api/keywords/debug \
  -H "Cookie: your-auth-cookie"
```

**Expected Response:**
```json
{
  "success": true,
  "userId": "user-uuid",
  "checks": {
    "keyword_research_results": {...},
    "keyword_terms": {...},
    "keyword_cache": {...}
  }
}
```

---

### 12. Keyword Extraction
**Endpoint:** `POST /api/keywords/extract`

**Request:**
```bash
curl -X POST http://localhost:3000/api/keywords/extract \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Python is a programming language...",
    "max_keywords": 20
  }'
```

**Expected Response:**
```json
{
  "keywords": ["python", "programming", "language"]
}
```

---

### 13. Keyword Difficulty
**Endpoint:** `POST /api/keywords/difficulty`

**Request:**
```bash
curl -X POST http://localhost:3000/api/keywords/difficulty \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "python programming"
  }'
```

**Expected Response:**
```json
{
  "keyword": "python programming",
  "difficulty": "medium",
  "score": 50
}
```

---

### 14. Keyword Competitors
**Endpoint:** `POST /api/keywords/competitors`

**Request:**
```bash
curl -X POST http://localhost:3000/api/keywords/competitors \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "python programming",
    "location": "United States"
  }'
```

**Expected Response:**
```json
{
  "competitors": [...]
}
```

---

### 15. LLM Research
**Endpoint:** `POST /api/keywords/llm-research`

**Request:**
```bash
curl -X POST http://localhost:3000/api/keywords/llm-research \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["python"],
    "location": "United States",
    "language": "en"
  }'
```

**Expected Response:**
```json
{
  "llm_research": {...},
  "summary": {...}
}
```

---

### 16. LLM Research (Streaming)
**Endpoint:** `POST /api/keywords/llm-research/stream`

**Request:**
```bash
curl -X POST http://localhost:3000/api/keywords/llm-research/stream \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["python"]
  }'
```

**Expected Response:** Server-Sent Events (SSE) stream

---

### 17. Enhanced Keyword Analysis (Streaming)
**Endpoint:** `POST /api/keywords/analyze/stream`

**Request:**
```bash
curl -X POST http://localhost:3000/api/keywords/analyze/stream \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["python"],
    "location": "United States",
    "language": "en"
  }'
```

**Expected Response:** Server-Sent Events (SSE) stream

---

## Backend API Endpoints (Blog Writer API)

### 1. Keyword Suggest
**Endpoint:** `POST /api/v1/keywords/suggest`

**Request:**
```bash
curl -X POST https://blog-writer-api-dev-kq42l26tuq-od.a.run.app/api/v1/keywords/suggest \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "keyword": "python programming",
    "limit": 20
  }'
```

**Expected Response:**
```json
{
  "keyword_suggestions": [...],
  "suggestions": [...]
}
```

---

### 2. Keyword Enhanced Analysis
**Endpoint:** `POST /api/v1/keywords/enhanced`

**Request:**
```bash
curl -X POST https://blog-writer-api-dev-kq42l26tuq-od.a.run.app/api/v1/keywords/enhanced \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "keywords": ["python"],
    "location": "United States",
    "language": "en",
    "include_search_volume": true,
    "max_suggestions_per_keyword": 10
  }'
```

**Expected Response:**
```json
{
  "enhanced_analysis": {
    "python": {
      "search_volume": 100000,
      "difficulty": "medium",
      "competition": 0.5,
      "cpc": 2.5,
      "related_keywords": [...],
      "long_tail_keywords": [...]
    }
  }
}
```

---

### 3. Keyword Analyze
**Endpoint:** `POST /api/v1/keywords/analyze`

**Request:**
```bash
curl -X POST https://blog-writer-api-dev-kq42l26tuq-od.a.run.app/api/v1/keywords/analyze \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "keywords": ["python"],
    "location": "United States",
    "language": "en"
  }'
```

**Expected Response:**
```json
{
  "keyword_analysis": {
    "python": {...}
  }
}
```

---

### 4. AI Topic Suggestions
**Endpoint:** `POST /api/v1/keywords/ai-topic-suggestions`

**Request:**
```bash
curl -X POST https://blog-writer-api-dev-kq42l26tuq-od.a.run.app/api/v1/keywords/ai-topic-suggestions \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "keywords": ["python"],
    "location": "United States",
    "language": "en",
    "include_ai_search_volume": true,
    "include_llm_mentions": true,
    "limit": 10
  }'
```

**Expected Response:**
```json
{
  "topic_suggestions": [...],
  "ai_metrics": {...}
}
```

---

### 5. AI Topic Suggestions (Streaming)
**Endpoint:** `POST /api/v1/keywords/ai-topic-suggestions/stream`

**Request:**
```bash
curl -X POST https://blog-writer-api-dev-kq42l26tuq-od.a.run.app/api/v1/keywords/ai-topic-suggestions/stream \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "keywords": ["python"],
    "limit": 10
  }'
```

**Expected Response:** Server-Sent Events (SSE) stream

---

### 6. Goal-Based Analysis
**Endpoint:** `POST /api/v1/keywords/goal-based-analysis`

**Request:**
```bash
curl -X POST https://blog-writer-api-dev-kq42l26tuq-od.a.run.app/api/v1/keywords/goal-based-analysis \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "keywords": ["python"],
    "content_goal": "SEO & Rankings",
    "location": "United States",
    "language": "en",
    "include_serp": true
  }'
```

**Expected Response:**
```json
{
  "analysis": {...},
  "serp_data": {...}
}
```

---

### 7. Goal-Based Analysis (Streaming)
**Endpoint:** `POST /api/v1/keywords/goal-based-analysis/stream`

**Request:**
```bash
curl -X POST https://blog-writer-api-dev-kq42l26tuq-od.a.run.app/api/v1/keywords/goal-based-analysis/stream \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "keywords": ["python"],
    "content_goal": "SEO & Rankings"
  }'
```

**Expected Response:** Server-Sent Events (SSE) stream

---

### 8. AI Optimization
**Endpoint:** `POST /api/v1/keywords/ai-optimization`

**Request:**
```bash
curl -X POST https://blog-writer-api-dev-kq42l26tuq-od.a.run.app/api/v1/keywords/ai-optimization \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "keywords": ["python"],
    "location": "United States",
    "language": "en"
  }'
```

**Expected Response:**
```json
{
  "ai_optimization": {
    "python": {
      "ai_search_volume": 5000,
      "ai_optimization_score": 75
    }
  }
}
```

---

## Testing Tips

### 1. Authentication
Most endpoints require authentication. Get your auth cookie from the browser:
1. Open DevTools → Application → Cookies
2. Copy the `sb-*-auth-token` cookie value
3. Use it in curl: `-H "Cookie: sb-*-auth-token=your-token"`

### 2. Environment Variables
Make sure these are set:
- `BLOG_WRITER_API_URL` - Backend API URL
- `BLOG_WRITER_API_KEY` - Backend API key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

### 3. Testing Streaming Endpoints
For SSE endpoints, use a tool that supports streaming:
```bash
# Using curl with --no-buffer
curl -N -X POST http://localhost:3000/api/keywords/ai-topic-suggestions/stream \
  -H "Content-Type: application/json" \
  -d '{"keywords": ["python"], "limit": 10}'
```

### 4. Common Issues
- **404 Errors**: Check if endpoint exists in backend
- **401 Errors**: Verify authentication cookie
- **500 Errors**: Check server logs and environment variables
- **HTML Responses**: Endpoint may not exist, check backend API

---

## Quick Test Script

Save this as `test-endpoints.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api"
BACKEND_URL="https://blog-writer-api-dev-kq42l26tuq-od.a.run.app/api/v1"

echo "Testing Frontend Endpoints..."
echo ""

echo "1. Keyword Suggest:"
curl -X POST $BASE_URL/keywords/suggest \
  -H "Content-Type: application/json" \
  -d '{"keyword": "python", "limit": 5}' | jq .

echo ""
echo "2. Keyword Analyze:"
curl -X POST $BASE_URL/keywords/analyze \
  -H "Content-Type: application/json" \
  -d '{"keywords": ["python"], "location": "United States"}' | jq .

echo ""
echo "3. AI Topic Suggestions:"
curl -X POST $BASE_URL/keywords/ai-topic-suggestions \
  -H "Content-Type: application/json" \
  -d '{"keywords": ["python"], "limit": 5}' | jq .

echo ""
echo "Testing Backend Endpoints..."
echo ""

echo "4. Backend Suggest:"
curl -X POST $BACKEND_URL/keywords/suggest \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: $BLOG_WRITER_API_KEY" \
  -d '{"keyword": "python", "limit": 5}' | jq .
```

Make it executable: `chmod +x test-endpoints.sh`
Run it: `./test-endpoints.sh`

---

## Status Check

To verify all endpoints are working:

```bash
# Health check
curl http://localhost:3000/api/health

# Debug endpoint (requires auth)
curl http://localhost:3000/api/keywords/debug \
  -H "Cookie: your-auth-cookie"
```

