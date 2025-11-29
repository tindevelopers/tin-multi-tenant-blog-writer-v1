# Migration Update Required

## Issue
The Supabase RPC function `get_cached_keyword` is returning 400 errors, and queries are returning 406 errors. This requires updating the migration file.

## Changes Made
1. **Updated `get_cached_keyword` function** with:
   - `SECURITY DEFINER` to run with elevated privileges
   - `SET search_path = public` for security
   - Improved keyword matching with `LOWER(TRIM())`
   - Fixed UPDATE statement to only run if result found
   - Better NULL handling for `user_id`

2. **Added GRANT EXECUTE permissions** for RPC functions:
   - `get_cached_keyword` - granted to `authenticated` and `anon`
   - `flush_keyword_cache` - granted to `authenticated`
   - `clean_expired_keyword_cache` - granted to `authenticated`

3. **Improved API query handling**:
   - Added proper keyword encoding/decoding
   - Added count option to queries
   - Better error logging

## Action Required

**You need to run the updated migration in Supabase:**

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the updated function from `supabase/migrations/20250124000000_enhanced_keyword_storage_with_caching.sql`:

```sql
-- Update the get_cached_keyword function
CREATE OR REPLACE FUNCTION get_cached_keyword(
  p_keyword TEXT,
  p_location TEXT DEFAULT 'United States',
  p_language TEXT DEFAULT 'en',
  p_search_type TEXT DEFAULT 'traditional',
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  keyword TEXT,
  traditional_data JSONB,
  ai_data JSONB,
  related_terms JSONB,
  comprehensive_data JSONB,
  cached_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kc.id,
    kc.keyword,
    kc.traditional_data,
    kc.ai_data,
    kc.related_terms,
    kc.comprehensive_data,
    kc.cached_at,
    kc.expires_at
  FROM keyword_cache kc
  WHERE LOWER(TRIM(kc.keyword)) = LOWER(TRIM(p_keyword))
    AND kc.location = p_location
    AND kc.language = p_language
    AND kc.search_type = p_search_type
    AND (p_user_id IS NULL OR kc.user_id = p_user_id OR kc.user_id IS NULL)
    AND kc.expires_at > NOW();
  
  -- Update hit count and last accessed (only if we found a result)
  IF FOUND THEN
    UPDATE keyword_cache
    SET hit_count = COALESCE(hit_count, 0) + 1,
        last_accessed_at = NOW()
    WHERE LOWER(TRIM(keyword)) = LOWER(TRIM(p_keyword))
      AND location = p_location
      AND language = p_language
      AND search_type = p_search_type
      AND (p_user_id IS NULL OR user_id = p_user_id OR user_id IS NULL)
      AND expires_at > NOW();
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_cached_keyword TO authenticated;
GRANT EXECUTE ON FUNCTION get_cached_keyword TO anon;
GRANT EXECUTE ON FUNCTION flush_keyword_cache TO authenticated;
GRANT EXECUTE ON FUNCTION clean_expired_keyword_cache TO authenticated;
```

## Testing

After running the migration, you can test with:

```bash
npx tsx test-supabase-direct.ts
```

This will check:
- If research results are being stored
- If keyword terms are being stored
- If the RPC function works correctly
- If cache entries exist

## Expected Results

After the migration update:
- ✅ `get_cached_keyword` RPC should return 200 instead of 400
- ✅ `keyword_research_results` queries should return 200 instead of 406
- ✅ Keywords should be properly stored and retrievable

