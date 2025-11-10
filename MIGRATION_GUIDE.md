# How to Run Database Migrations

This guide explains how to run the environment-suffixed tables migration.

## 🎯 Quick Start

### Option 1: Supabase Dashboard (Easiest - Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New query**

3. **Copy Migration SQL**
   - Open the file: `supabase/migrations/20250115000000_add_environment_integrations.sql`
   - Copy **ALL** the SQL content (Cmd+A / Ctrl+A, then Cmd+C / Ctrl+C)

4. **Paste and Run**
   - Paste the SQL into the query editor
   - Click **Run** (or press Cmd+Enter / Ctrl+Enter)
   - Wait for execution to complete

5. **Verify Success**
   - You should see "Success. No rows returned" or similar success message
   - Check the **Table Editor** to verify tables were created:
     - `integrations_dev`
     - `integrations_staging`
     - `integrations_prod`
     - `recommendations_dev`
     - `recommendations_staging`
     - `recommendations_prod`

### Option 2: Supabase CLI (For Developers)

1. **Install Supabase CLI** (if not installed)
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link to Your Project**
   ```bash
   supabase link --project-ref your-project-ref
   ```
   - Find your project ref in Supabase dashboard URL or project settings

4. **Run Migration**
   ```bash
   # Push all migrations
   supabase db push
   
   # Or run specific migration
   supabase migration up
   ```

### Option 3: Direct SQL Connection (Advanced)

If you have direct database access:

```bash
# Using psql
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  -f supabase/migrations/20250115000000_add_environment_integrations.sql
```

## 📋 Step-by-Step: Supabase Dashboard Method

### Step 1: Access SQL Editor

1. Log in to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New query** button

### Step 2: Open Migration File

The migration file is located at:
```
supabase/migrations/20250115000000_add_environment_integrations.sql
```

You can:
- Open it in your code editor
- Or view it in the terminal:
  ```bash
  cat supabase/migrations/20250115000000_add_environment_integrations.sql
  ```

### Step 3: Copy SQL Content

Copy the **entire** contents of the migration file. It should start with:
```sql
-- Migration: Add Environment-Suffixed Integration Tables
-- This migration adds support for environment-specific tables...
```

And end with:
```sql
COMMENT ON COLUMN recommendations_dev.per_keyword IS 'JSONB array with per-keyword recommendations...';
```

### Step 4: Paste and Execute

1. Paste the SQL into the Supabase SQL Editor
2. Review the SQL (optional but recommended)
3. Click the **Run** button (or press Cmd+Enter / Ctrl+Enter)
4. Wait for execution (usually takes 1-5 seconds)

### Step 5: Verify Tables Created

1. Go to **Table Editor** in Supabase dashboard
2. Look for these new tables:
   - ✅ `integrations_dev`
   - ✅ `integrations_staging`
   - ✅ `integrations_prod`
   - ✅ `recommendations_dev`
   - ✅ `recommendations_staging`
   - ✅ `recommendations_prod`

## 🔍 Verification Queries

Run these in SQL Editor to verify:

### Check Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE 'integrations_%' OR table_name LIKE 'recommendations_%')
ORDER BY table_name;
```

Expected output: 6 tables (3 integrations + 3 recommendations)

### Check Indexes Created
```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename LIKE 'integrations_%' OR tablename LIKE 'recommendations_%'
ORDER BY tablename, indexname;
```

Expected output: Multiple indexes per table

### Check Table Structure
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'integrations_dev'
ORDER BY ordinal_position;
```

Expected columns:
- `id` (uuid)
- `tenant_id` (uuid)
- `provider` (text)
- `connection` (jsonb)
- `created_at` (timestamptz)

## 🚨 Troubleshooting

### Error: "relation already exists"
**Solution**: The tables already exist. This is safe - the migration uses `CREATE TABLE IF NOT EXISTS`, so it won't fail. You can:
- Skip the migration (tables already exist)
- Or drop and recreate if needed (⚠️ deletes data)

### Error: "permission denied"
**Solution**: Make sure you're using:
- Supabase Dashboard (uses your project's admin access)
- Or service role key if using CLI/API

### Error: "extension does not exist"
**Solution**: The migration includes `CREATE EXTENSION IF NOT EXISTS`, but if it fails:
```sql
-- Run manually in SQL Editor
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### Tables Not Showing Up
**Solution**:
1. Refresh the Table Editor page
2. Check if you're looking at the correct schema (should be `public`)
3. Verify migration ran successfully (check SQL Editor history)

## 📊 After Migration: Data Migration (Optional)

If you have existing data in the unified `integrations` table, migrate it:

```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run data migration
npx tsx scripts/migrate-integrations-to-environment-tables.ts dev
```

## ✅ Success Checklist

After running the migration, verify:

- [ ] Migration executed without errors
- [ ] All 6 tables visible in Table Editor
- [ ] Indexes created (check with verification queries)
- [ ] Can insert test data (optional):
  ```sql
  INSERT INTO integrations_dev (tenant_id, provider, connection)
  VALUES ('00000000-0000-0000-0000-000000000000', 'webflow', '{"test": true}');
  ```

## 🔗 Related Files

- Migration SQL: `supabase/migrations/20250115000000_add_environment_integrations.sql`
- Data Migration Script: `scripts/migrate-integrations-to-environment-tables.ts`
- Migration README: `supabase/migrations/README.md`

## 💡 Tips

1. **Backup First**: Always backup your database before running migrations (Supabase does this automatically, but good to verify)

2. **Test in Dev**: Run migrations in dev/staging before production

3. **Check Logs**: Review SQL Editor history to see execution logs

4. **RLS Policies**: The migration includes commented-out RLS policies. Uncomment them if you want Row Level Security enabled.

5. **Environment Detection**: The application will automatically use the correct table based on `NODE_ENV` and `VERCEL_ENV`

---

**Need Help?** Check `supabase/migrations/README.md` for more details.

