# AI Optimization Response Debugging Guide

## Issue Summary

AI optimization scores are showing as **0/100** for all topics, and keywords are being split into individual words instead of preserved as phrases.

## Root Cause Analysis

### 1. AI Score Showing 0/100

**Possible Causes:**
- Cloud Run endpoint is returning `ai_optimization_score: 0` for keywords with no AI search volume
- Response structure might be different than expected
- Field names might be different (camelCase vs snake_case)

**Expected Response Structure:**
```json
{
  "ai_optimization_analysis": {
    "pet grooming": {
      "ai_optimization_score": 75,  // 0-100
      "ai_search_volume": 1200,
      "traditional_search_volume": 201000,
      "ai_recommended": true,
      "ai_reason": "High AI visibility with growing trend",
      "comparison": {
        "ai_growth_trend": "increasing"
      }
    }
  }
}
```

### 2. Keywords Being Split

**Fixed:** Updated keyword extraction to preserve 2-3 word phrases instead of splitting into individual words.

## Testing

### Test Scripts Created

1. **`test-topic-recommender-flow.js`** - Simulates the full flow from objective page
2. **`test-ai-optimization-mock.js`** - Tests parsing logic with mock data
3. **`test-ai-optimization-response.js`** - Direct test of AI optimization endpoint

### Running Tests

```bash
# Test full topic recommender flow
node test-topic-recommender-flow.js

# Test parsing logic with mock data
node test-ai-optimization-mock.js

# Test AI optimization endpoint directly
node test-ai-optimization-response.js
```

## Debugging Steps

### When Cloud Run is Available:

1. **Check Response Structure:**
   - Look at browser console logs (development mode)
   - Check server logs for "AI Optimization Response Debug" messages
   - Verify `ai_optimization_analysis` exists in response

2. **Verify Field Names:**
   - Check if fields use `snake_case` (ai_optimization_score) or `camelCase` (aiOptimizationScore)
   - Our code now handles both formats

3. **Check Score Values:**
   - If scores are legitimately 0, keywords have no AI search volume
   - This is expected behavior for keywords not searched in AI tools
   - Consider filtering out 0-score keywords or showing them differently

4. **Verify Keywords:**
   - Ensure keywords are preserved as phrases (e.g., "pet grooming" not ["pet", "grooming"])
   - Check that keyword extraction creates 2-3 word phrases

## Code Changes Made

### 1. Keyword Extraction (`src/lib/blog-writer-api.ts`)
- Changed from splitting words to preserving 2-3 word phrases
- Improved stop word filtering
- Better phrase extraction from objective text

### 2. Response Parsing (`src/lib/blog-writer-api.ts`)
- Added fallbacks for different field name formats
- Better null/undefined handling
- Comprehensive debug logging

### 3. Topic Keywords Storage (`src/app/admin/workflow/objective/page.tsx`)
- Store topic keywords when topic is selected
- Pass keywords to keyword research page via sessionStorage/workflow_data
- Preserve keywords as phrases

### 4. Keyword Research Integration (`src/app/admin/workflow/keywords/page.tsx`)
- Load topic keywords from sessionStorage
- Use first keyword as initial search query
- Make all topic keywords available for research

## Next Steps

1. **When Cloud Run is Available:**
   - Run `test-topic-recommender-flow.js` to see actual response
   - Check browser console for debug logs
   - Verify response structure matches expected format

2. **If Scores are Legitimately 0:**
   - Consider filtering out 0-score topics
   - Or show them with a different indicator (e.g., "Traditional SEO only")
   - Focus on keywords with AI scores > 0

3. **If Response Structure is Different:**
   - Update parsing logic based on actual response
   - Add additional field name mappings if needed

## Expected Behavior

- **Keywords with AI search volume > 0:** Should show scores > 0
- **Keywords with no AI search volume:** Will show score = 0 (this is correct)
- **Keywords preserved as phrases:** "pet grooming" stays as one phrase
- **Topic keywords passed to research:** First keyword auto-populates search query

