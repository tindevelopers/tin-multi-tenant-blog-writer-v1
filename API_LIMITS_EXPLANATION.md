# API Limits Explanation

## Why Are There API Limits?

API limits exist for several important reasons:

### 1. **API Validation Requirements** (Backend/API-Side)
The enhanced keyword analysis endpoint (`/api/v1/keywords/enhanced`) has a **validation requirement**:
- `max_suggestions_per_keyword` **must be >= 5** (minimum value)
- This is enforced by the API itself, not the client
- **Purpose**: The enhanced endpoint provides advanced features (search volume, clustering, parent topics) that require this minimum to function properly

### 2. **Batch Size Limits** (Client-Side Enforcement)
The client-side code enforces a **batch size limit**:
- Maximum **30 keywords per analysis request**
- This is enforced in the client code (`src/lib/keyword-research.ts` and `src/app/api/keywords/analyze/route.ts`)
- **Purpose**: 
  - Prevents API timeouts
  - Reduces memory usage
  - Ensures faster response times
  - Prevents hitting API rate limits

### 3. **Rate Limiting** (API-Side)
The API may have rate limits to:
- Prevent abuse
- Ensure fair usage across all users
- Maintain API stability

---

## Where Are Limits Enforced?

### Client-Side Limits (`src/lib/keyword-research.ts` and `src/app/api/keywords/analyze/route.ts`)

**Batch Size Limit (30 keywords)**:
```typescript
// Enforced in both client and API route
if (keywords.length > 30) {
  throw new Error(`Cannot analyze more than 30 keywords at once...`);
}
```

**max_suggestions_per_keyword Conversion**:
```typescript
// Client-side: Converts 0 to 5 (minimum)
max_suggestions_per_keyword: maxSuggestionsPerKeyword && maxSuggestionsPerKeyword >= 5
  ? maxSuggestionsPerKeyword
  : 5, // Minimum required value for enhanced endpoint
```

### API-Side Limits (Backend API)

**Enhanced Endpoint Validation**:
- The API validates that `max_suggestions_per_keyword >= 5`
- Returns `422 Unprocessable Entity` if validation fails
- This is enforced by the FastAPI backend at `https://blog-writer-api-dev-613248238610.europe-west1.run.app`

---

## Why Is This Failing?

Based on the console logs showing `max_suggestions_per_keyword: 0`:

### Root Cause
The client-side code is **explicitly passing `0`** when calling `analyzeKeywords()`:

```typescript
// In performBlogResearch() - lines 738 and 770
const batchAnalysis = await this.analyzeKeywords(batch, 0, location);
keywordAnalysis = await this.analyzeKeywords(allKeywords, 0, location);
```

### The Fix
The code **should** convert `0` to `5` automatically:

```typescript
// In analyzeKeywords() - lines 322-324
max_suggestions_per_keyword: maxSuggestionsPerKeyword && maxSuggestionsPerKeyword >= 5
  ? maxSuggestionsPerKeyword
  : 5, // Minimum required value
```

### Why It Might Still Fail

1. **Code Not Deployed**: The fix might not be deployed to production yet
2. **Build Cache**: The browser might be using cached JavaScript
3. **Logic Issue**: The condition `maxSuggestionsPerKeyword && maxSuggestionsPerKeyword >= 5` evaluates to `false` when `maxSuggestionsPerKeyword` is `0`, so it should use `5`, but there might be an edge case

### Verification

The console log shows the **client-side request body** before it goes to the Next.js API route. The API route (`src/app/api/keywords/analyze/route.ts`) should also convert `0` to `5` before sending to the backend API.

---

## Solution

### Option 1: Update performBlogResearch to Pass 5 Instead of 0

Change the calls in `performBlogResearch()` to pass `5` instead of `0`:

```typescript
// Instead of:
const batchAnalysis = await this.analyzeKeywords(batch, 0, location);

// Use:
const batchAnalysis = await this.analyzeKeywords(batch, 5, location);
```

### Option 2: Ensure Conversion Logic Works

The current conversion logic should work, but we can make it more explicit:

```typescript
max_suggestions_per_keyword: Math.max(5, maxSuggestionsPerKeyword || 5)
```

This ensures it's always at least 5, regardless of input.

---

## Summary

- **API Limit (30 keywords)**: Client-side enforcement to prevent API overload
- **API Validation (max_suggestions >= 5)**: Backend API requirement for enhanced endpoint
- **Current Issue**: Code passes `0` explicitly, which should be converted to `5` but might not be working due to deployment/build cache
- **Solution**: Either update the explicit `0` calls to `5`, or ensure the conversion logic is working correctly

