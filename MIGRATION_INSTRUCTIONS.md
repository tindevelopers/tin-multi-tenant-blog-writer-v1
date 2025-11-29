# Keyword Storage and Caching Migration Instructions

## Migration File to Run

Run this migration file in your Supabase SQL Editor:

**File:** `supabase/migrations/20250124000000_enhanced_keyword_storage_with_caching.sql`

## What This Migration Creates

### Tables Created:
1. **keyword_cache** - 90-day cache for keyword research results
2. **keyword_research_results** - Full storage of keyword research
3. **keyword_terms** - Individual keyword storage (Ahrefs/SpyFu style)

### Functions Created:
1. **get_cached_keyword()** - Retrieves cached keyword data if not expired
2. **flush_keyword_cache()** - Flushes cache entries (for manual cache clearing)
3. **clean_expired_keyword_cache()** - Removes expired cache entries
4. **update_keyword_access()** - Updates access tracking

### Security:
- Row Level Security (RLS) enabled on all tables
- Policies ensure users can only access their own data

## How to Run

### Option 1: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of `supabase/migrations/20250124000000_enhanced_keyword_storage_with_caching.sql`
5. Click **Run** or press `Cmd/Ctrl + Enter`

### Option 2: Supabase CLI
```bash
# If using Supabase CLI
supabase db push
```

### Option 3: Direct SQL Connection
```bash
# Using psql
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/20250124000000_enhanced_keyword_storage_with_caching.sql
```

## Verification

After running the migration, verify the tables were created:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('keyword_cache', 'keyword_research_results', 'keyword_terms');

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_cached_keyword', 'flush_keyword_cache', 'clean_expired_keyword_cache');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('keyword_cache', 'keyword_research_results', 'keyword_terms');
```

## Important Notes

- This migration uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times
- All indexes are created with `IF NOT EXISTS` for safety
- RLS policies are created without `IF NOT EXISTS` - if they already exist, you may need to drop them first
- The migration references `auth.users` table which should already exist in Supabase

## Troubleshooting

If you encounter errors:

1. **Policy already exists**: Drop existing policies first:
```sql
DROP POLICY IF EXISTS "Users can view their own cached keywords" ON keyword_cache;
DROP POLICY IF EXISTS "Users can insert their own cached keywords" ON keyword_cache;
DROP POLICY IF EXISTS "Users can update their own cached keywords" ON keyword_cache;
-- Repeat for other tables...
```

2. **Function already exists**: The migration uses `CREATE OR REPLACE FUNCTION`, so this should be fine

3. **Table already exists**: The migration uses `CREATE TABLE IF NOT EXISTS`, so existing tables won't be affected
