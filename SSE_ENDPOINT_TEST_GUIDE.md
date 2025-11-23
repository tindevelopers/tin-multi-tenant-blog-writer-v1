# SSE Keyword Research Endpoint Testing Guide

## Endpoint Details

- **Route**: `/api/keywords/research/stream`
- **Method**: POST
- **Authentication**: Required (uses Supabase auth)
- **Content-Type**: `text/event-stream` (SSE)

## Request Format

```json
{
  "keyword": "pet grooming",
  "location": "United States",
  "language": "en",
  "searchType": "traditional" | "ai" | "both",
  "useCache": true,
  "autoStore": true
}
```

## Response Format (SSE Stream)

The endpoint streams Server-Sent Events with the following structure:

```
data: {"type":"progress","stage":"checking_cache","progress":10,"message":"Checking cache..."}

data: {"type":"complete","keyword":"pet grooming","source":"cache","cached":true,"traditionalData":{...}}

data: {"type":"error","error":"Error message"}
```

## Event Types

### 1. Progress Events (`type: "progress"`)
- `stage`: Current stage (e.g., "checking_cache", "fetching_api", "analyzing_traditional")
- `progress`: Progress percentage (0-100)
- `message`: Human-readable status message

### 2. Complete Events (`type: "complete"`)
- `keyword`: The researched keyword
- `source`: Data source ("cache", "database", "api")
- `cached`: Whether result was from cache
- `traditionalData`: Traditional SEO data (if available)
- `aiData`: AI optimization data (if available)
- `relatedTerms`: Array of related keywords
- `matchingTerms`: Array of matching terms

### 3. Error Events (`type: "error"`)
- `error`: Error message

## Testing Methods

### Method 1: Browser Console (Recommended)

1. Open your browser and navigate to `http://localhost:3000`
2. Log in to your account
3. Open browser console (F12)
4. Copy and paste the test function from `test-sse-endpoint-browser.js`
5. Run: `testSSEKeywordResearch()`

### Method 2: curl (with authentication cookie)

```bash
# First, get your auth cookie from browser DevTools > Application > Cookies
# Look for cookie starting with "sb-" and containing "auth-token"

curl -X POST http://localhost:3000/api/keywords/research/stream \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-YOUR-PROJECT-REF.auth-token=YOUR-TOKEN" \
  -d '{
    "keyword": "pet grooming",
    "location": "United States",
    "language": "en",
    "searchType": "traditional",
    "useCache": true,
    "autoStore": true
  }' \
  -N \
  --no-buffer
```

### Method 3: Postman/Insomnia

1. Set method to POST
2. URL: `http://localhost:3000/api/keywords/research/stream`
3. Headers:
   - `Content-Type: application/json`
   - `Cookie: sb-YOUR-PROJECT-REF.auth-token=YOUR-TOKEN` (from browser)
4. Body (JSON):
```json
{
  "keyword": "pet grooming",
  "location": "United States",
  "language": "en",
  "searchType": "traditional"
}
```

## Expected Flow

1. **Check Cache** (10% progress)
   - Looks for cached results in `keyword_cache` table
   - If found, returns immediately with `source: "cache"`

2. **Check Database** (20% progress)
   - Looks for stored results in `keyword_research_results` table
   - If found, re-caches and returns with `source: "database"`

3. **Fetch from API** (40-70% progress)
   - Calls backend API for traditional data (if `searchType` includes "traditional")
   - Calls backend API for AI data (if `searchType` includes "ai")
   - Progress updates at each stage

4. **Store Results** (90% progress)
   - Stores results in database (if `autoStore: true`)
   - Caches results (if `useCache: true`)

5. **Complete** (100% progress)
   - Returns final result with all data

## Test Scenarios

### Scenario 1: Cache Hit
- First request: Should fetch from API and cache
- Second request: Should return from cache immediately

### Scenario 2: Database Hit
- Request with expired cache: Should fetch from database and re-cache

### Scenario 3: Fresh API Call
- Request with new keyword: Should fetch from API, store, and cache

### Scenario 4: Traditional Search Only
- `searchType: "traditional"`: Should only fetch traditional SEO data

### Scenario 5: AI Search Only
- `searchType: "ai"`: Should only fetch AI optimization data

### Scenario 6: Both Search Types
- `searchType: "both"`: Should fetch both traditional and AI data

## Troubleshooting

### Error: "Unauthorized"
- **Cause**: Missing or invalid authentication cookie
- **Solution**: Ensure you're logged in and include the auth cookie in the request

### Error: "keyword is required"
- **Cause**: Missing or empty keyword in request body
- **Solution**: Ensure `keyword` field is present and not empty

### No Events Received
- **Cause**: Connection issue or endpoint error
- **Solution**: Check server logs and ensure endpoint is running

### Stream Closes Immediately
- **Cause**: Error occurred during processing
- **Solution**: Check for error events in the stream

## Success Criteria

✅ Endpoint returns 200 OK  
✅ Content-Type is `text/event-stream`  
✅ Progress events are received  
✅ Complete event is received with data  
✅ Results are stored in database (if `autoStore: true`)  
✅ Results are cached (if `useCache: true`)  

