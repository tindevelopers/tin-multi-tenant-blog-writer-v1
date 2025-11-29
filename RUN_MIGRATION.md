# How to Run the Keyword Storage Migration

## Option 1: Supabase Dashboard (Recommended - Easiest)

1. **Go to your Supabase Dashboard**
   - Navigate to:** https://supabase.com/dashboard/project/edtxtpqrfpxeogukfunq

2. **Open SQL Editor:**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy the Migration SQL:**
   - Open the file: `supabase/migrations/20250124000000_enhanced_keyword_storage_with_caching.sql`
   - Copy ALL contents (Ctrl/Cmd + A, then Ctrl/Cmd + C)

4. **Run:
   - Paste into the SQL Editor
   - Click "Run" or press `Ctrl/Cmd + Enter`

5. **Verify Success:**
   - You should see "Success. No rows returned" or similar
   - Check the tables were created by running:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_name IN ('keyword_cache', 'keyword_research_results', 'keyword_terms');
   ```

## Option 2: Supabase CLI

If you have Supabase CLI linked:

```bash
# Make sure you're authenticated
supabase login

# Link to your project (if not already linked)
supabase link --project-ref edtxtpqrfpxeogukfunq

# Push the migration
supabase db push
```

## Option 3: Direct psql

If you have direct database access:

```bash
# Connection:
psql "postgresql://postgres:[YOUR_PASSWORD]@aws-1-eu-west-3.pooler.supabase.com:6543/postgres" -f supabase/migrations/20250124000000_enhanced_keyword_storage_with_caching.sql
```

## What Will Create

✅ **3 Tables:**
- `keyword_cache` (90-day expiration)
- `keyword_research_results` — Full storage
- `keyword_terms` — Individual keyword storage

✅ **4 Functions:**
- `get_cached_keyword()`
- `flush_keyword_cache()`
- `clean_expired_keyword_cache()`
- `update_keyword_access()`

✅ **Security:**
- Row Level Security (RLS) enabled
- 9 RLS policies
- 20+ indexes

## Verification Queries

After running, verify everything was created:

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
  AND routine_name IN ('get_cached_keyword', 'flush_keyword_cache', 'clean_expired_keyword_cache', 'update_keyword_access');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('keyword_cache', 'keyword_research_results', 'keyword_terms');
```

## Troubleshooting

If you get errors about policies already existing:

```sql
-- Drop existing policies first (run this before the migration)
DROP POLICY IF EXISTS "Users can view their own cached keywords" ON keyword_cache;
DROP POLICY IF EXISTS "Users can insert their own cached keywords" ON keyword_cache;
DROP POLICY IF EXISTS "Users can update their own cached keywords" ON keyword_cache;
-- Repeat for other tables if needed
```

The migration uses `CREATE TABLE IF NOT EXISTS` and `CREATE OR REPLACE FUNCTION`, so it's safe to run multiple times.

