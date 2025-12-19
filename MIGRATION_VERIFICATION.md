# Database Migration Verification

## Migration: content_goal_prompts

**File**: `supabase/migrations/20250120000002_add_content_goal_prompts_fixed.sql`

**Status**: ✅ Applied

---

## Verification Queries

Run these queries in your Supabase SQL Editor to confirm the migration was successful:

### 1. Check Table Exists
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'content_goal_prompts';
```

**Expected Result**: Should return 1 row with `content_goal_prompts`

---

### 2. Check Default Prompts
```sql
SELECT 
  content_goal, 
  prompt_title, 
  is_system_default,
  is_active,
  priority
FROM content_goal_prompts 
WHERE is_system_default = true
ORDER BY content_goal;
```

**Expected Result**: Should return 4 rows:
- `seo` - "SEO & Rankings - Default"
- `engagement` - "Engagement - Default"  
- `conversions` - "Conversions - Default"
- `brand_awareness` - "Brand Awareness - Default"

---

### 3. Check RLS Policies
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'content_goal_prompts'
ORDER BY policyname;
```

**Expected Result**: Should return 4 policies:
- "System admins can delete prompts"
- "System admins can insert prompts"
- "System admins can update prompts"
- "System admins can view all prompts"

---

### 4. Check Indexes
```sql
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'content_goal_prompts'
ORDER BY indexname;
```

**Expected Result**: Should return 4 indexes:
- `idx_content_goal_prompts_org_goal`
- `idx_content_goal_prompts_system_defaults`
- `unique_active_prompt_per_goal_org`
- `unique_active_system_prompt_per_goal`

---

### 5. Check Function Exists
```sql
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_content_goal_prompt';
```

**Expected Result**: Should return 1 row with `get_content_goal_prompt` function

---

### 6. Test Function Works
```sql
-- Test with a null org_id (should return system default)
SELECT * FROM get_content_goal_prompt(NULL, 'seo');
```

**Expected Result**: Should return the default SEO prompt with full details

---

## Verification Complete ✅

If all queries above return the expected results, the migration was successfully applied!

**Date Verified**: December 19, 2025
