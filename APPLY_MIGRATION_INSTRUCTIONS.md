# Apply Database Migration Instructions

## Issue
The `blog_platform_publishing` table is missing the `is_draft` column, causing a 500 error when creating publishing records.

## Solution
Run migration `005_ensure_draft_columns_exist.sql` to add the missing columns.

## Steps to Apply Migration

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/005_ensure_draft_columns_exist.sql`
4. Paste into the SQL Editor
5. Click **Run** to execute the migration

### Option 2: Via Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push

# Or apply specific migration
supabase migration up
```

### Option 3: Direct SQL Execution

Copy and run this SQL in your Supabase SQL Editor:

```sql
-- Add is_draft column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_platform_publishing' 
    AND column_name = 'is_draft'
  ) THEN
    ALTER TABLE blog_platform_publishing 
    ADD COLUMN is_draft BOOLEAN DEFAULT false;
    
    COMMENT ON COLUMN blog_platform_publishing.is_draft IS 'Whether the item was published as a draft (true) or published immediately (false)';
  END IF;
END $$;

-- Add platform_draft_status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_platform_publishing' 
    AND column_name = 'platform_draft_status'
  ) THEN
    ALTER TABLE blog_platform_publishing 
    ADD COLUMN platform_draft_status TEXT CHECK (platform_draft_status IN ('draft', 'published', 'unknown'));
    
```


