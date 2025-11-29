# Keyword Storage Diagnosis

## Current Status

✅ **Migration**: Successfully completed and verified
- All tables exist and are accessible
- All RPC functions work correctly
- Indexes are functioning

❌ **Storage**: No keyword research data is being stored
- 0 research results in `keyword_research_results` table
- 0 keyword terms in `keyword_terms` table
- Only 1 test cache entry exists

## Storage Flow Analysis

The storage should happen in two places:

### 1. Automatic Storage via `keywordResearchWithStorage.researchKeyword()`
**Location**: `src/lib/keyword-research-with-storage.ts` (line 294-371)

**When it runs**:
- When `autoStore: true` (default)
- When user is authenticated
- When research data is fetched from API (not from cache)

**What it stores**:
- Main research result in `keyword_research_results`
- Individual keyword term in `keyword_terms`
- Cache entry in `keyword_cache`

### 2. Manual Storage via Hook
**Location**: `src/hooks/useEnhancedKeywordResearch.ts` (line 198-280)

**When it runs**:
- After `comprehensiveResearch()` completes
- When user is authenticated
- After clusters are created

**What it stores**:
- Primary keyword research result
- Related terms as individual keyword terms

## Possible Issues

### Issue 1: Cache Hit Preventing Storage
If cached data is found, the function returns early without storing new data. This is expected behavior, but means:
- First-time searches should store
- Subsequent searches use cache (no new storage)

**Check**: Are searches returning cached data immediately?

### Issue 2: Silent Storage Failures
Storage errors might be caught and logged but not surfaced to the UI.

**Check**: Look for these log messages:
- `"Error storing keyword research"`
- `"Failed to store keyword research"`
- `"Error storing research result"`

### Issue 3: RLS Policy Blocking
Row Level Security policies might be blocking inserts.

**Check**: Verify user is authenticated and policies allow inserts.

### Issue 4: Storage Not Being Called
The storage code might not be executing if there's an early return or error.

**Check**: Verify `researchKeyword` is completing successfully.

## Diagnostic Steps

### Step 1: Check Browser Console
When running a keyword search, look for:
- `"Auto-storing keyword research result"`
- `"Storing keyword research result"`
- `"Research result stored successfully"`
- Any error messages

### Step 2: Check Network Tab
Look for API calls to:
- `/api/keywords/store` (if used)
- Supabase REST API calls to `keyword_research_results`

### Step 3: Verify Authentication
Ensure user is logged in and authenticated:
```javascript
// In browser console
const { createClient } = await import('@/lib/supabase/client');
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user?.id);
```

### Step 4: Test Storage Directly
Run a test to see if storage works:
```typescript
// In browser console
const enhancedKeywordStorage = (await import('@/lib/keyword-storage-enhanced')).default;
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();

const result = await enhancedKeywordStorage.storeKeywordResearch(
  user.id,
  {
    keyword: 'test keyword',
    location: 'United States',
    language: 'en',
    search_type: 'traditional',
    traditional_data: {
      keyword: 'test keyword',
      search_volume: 1000,
      keyword_difficulty: 50,
      competition: 0.5,
      cpc: 1.5,
      related_keywords: [],
    },
  }
);

console.log('Storage result:', result);
```

## Next Steps

1. **Run a keyword search** in the UI and monitor:
   - Browser console for storage logs
   - Network tab for API calls
   - Check if errors occur

2. **Check if storage is being called**:
   - Add breakpoints in `keyword-research-with-storage.ts` line 294
   - Add breakpoints in `useEnhancedKeywordResearch.ts` line 198

3. **Verify RLS policies**:
   - Ensure user can insert into `keyword_research_results`
   - Check if policies are correctly configured

4. **Test with a fresh keyword**:
   - Use a keyword that hasn't been searched before
   - This ensures cache won't prevent storage

## Expected Behavior

When a keyword search is performed:

1. **First Search**:
   - Check cache → Not found
   - Check database → Not found
   - Fetch from API
   - Store in `keyword_research_results`
   - Store keyword term in `keyword_terms`
   - Cache in `keyword_cache`

2. **Subsequent Searches**:
   - Check cache → Found
   - Return cached data (no new storage)

## Files to Check

- `src/lib/keyword-research-with-storage.ts` - Auto-storage logic
- `src/lib/keyword-storage-enhanced.ts` - Storage service
- `src/hooks/useEnhancedKeywordResearch.ts` - Hook storage logic
- Browser console logs
- Network tab API calls

