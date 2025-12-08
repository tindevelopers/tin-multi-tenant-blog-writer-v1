-- Check Applied Migrations and Identify Problems (FIXED)
-- Run this in Supabase SQL Editor

-- First, let's check the actual structure of the migrations table
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'supabase_migrations'
AND table_name = 'schema_migrations'
ORDER BY ordinal_position;

-- Now check migrations (using correct column names)
-- The table might use 'version' and 'name' columns, but timestamp might be different
SELECT 
  version,
  name,
  -- Try different possible timestamp columns
  COALESCE(
    NULLIF(version::text, '')::timestamp,
    NULL
  ) as possible_timestamp
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 50;

-- Alternative: Check all columns available
SELECT *
FROM supabase_migrations.schema_migrations
LIMIT 5;

