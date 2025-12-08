# Cloud Run Endpoints Status Report

**Date:** Generated automatically  
**API URL:** `https://blog-writer-api-dev-613248238610.europe-west9.run.app`  
**Environment:** Development

---

## ✅ Active Endpoints

### 1. Health Check
- **Endpoint:** `GET /health`
- **Status:** ✅ Active
- **Response:** `{ status: "healthy", timestamp: "...", version: "..." }`

### 2. Enhanced Keyword Analysis
- **Endpoint:** `POST /api/v1/keywords/enhanced`
- **Status:** ✅ Active
- **Note:** Use this endpoint for enhanced analysis with SERP, clustering, and AI features
- **Response includes:**
  - `enhanced_analysis` - Detailed keyword analysis
  - `suggested_keywords` - Related keyword suggestions
  - `clusters` - Keyword clusters
  - `serp_analysis` - SERP analysis data

### 3. Enhanced Analysis (Streaming)
- **Endpoint:** `POST /api/v1/keywords/enhanced/stream`
- **Status:** ✅ Active
- **Format:** Server-Sent Events (SSE)
- **Use case:** Real-time progress updates for long-running analyses

### 4. AI Topic Suggestions
- **Endpoint:** `POST /api/v1/keywords/ai-topic-suggestions`
- **Status:** ✅ Active
- **Features:**
  - AI search volume metrics
  - LLM mentions tracking
  - Content gaps identification
  - Citation opportunities
- **Response includes:**
  - `topic_suggestions` - AI-optimized topic suggestions
  - `ai_metrics` - AI search volume and LLM mentions
  - `content_gaps` - Content gap analysis

### 5. AI Topic Suggestions (Streaming)
- **Endpoint:** `POST /api/v1/keywords/ai-topic-suggestions/stream`
- **Status:** ✅ Active
- **Format:** Server-Sent Events (SSE)
- **Use case:** Real-time AI topic discovery

### 6. Traditional Keyword Analyze
- **Endpoint:** `POST /api/v1/keywords/analyze`
- **Status:** ✅ Active
- **Use case:** Standard keyword analysis without enhanced features
- **Response includes:**
  - `keyword_analysis` - Basic keyword metrics

---

## ❌ Endpoints Not Available

### LLM Research
- **Endpoint:** `POST /api/v1/keywords/llm-research`
- **Status:** ❌ Not Available (404)
- **Note:** This endpoint is not implemented on the backend. Use AI Topic Suggestions instead.

---

## 📋 Available Endpoints (from OpenAPI)

The following keyword-related endpoints are available on the Cloud Run backend:

```
/api/v1/keywords/ai-mentions
/api/v1/keywords/ai-optimization
/api/v1/keywords/ai-topic-suggestions
/api/v1/keywords/ai-topic-suggestions/stream
/api/v1/keywords/analyze
/api/v1/keywords/difficulty
/api/v1/keywords/enhanced
/api/v1/keywords/enhanced/stream
/api/v1/keywords/extract
/api/v1/keywords/goal-based-analysis
/api/v1/keywords/goal-based-analysis/stream
/api/v1/keywords/suggest
```

---

## 🔧 Testing

Run the test script to verify endpoint status:

```bash
npx tsx scripts/test-cloud-run-endpoints.ts
```

---

## 📝 Notes

1. **Endpoint Path Correction:** The enhanced analysis endpoint is `/api/v1/keywords/enhanced` (not `/enhanced-analysis`)

2. **LLM Research:** The `/api/v1/keywords/llm-research` endpoint is not available. Use `/api/v1/keywords/ai-topic-suggestions` for AI-powered research instead.

3. **Streaming Endpoints:** Both enhanced analysis and AI topic suggestions support streaming via SSE for better UX during long-running operations.

4. **API Key:** Some endpoints may require authentication. Set `BLOG_WRITER_API_KEY` environment variable if needed.

---

## ✅ Summary

**Total Endpoints Tested:** 6  
**Active:** 6 ✅  
**Failed:** 0 ❌

All critical endpoints for enhanced search and AI search are **ACTIVE** and responding correctly on Google Cloud Run.










