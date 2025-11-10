# How to Run the Workflow Tables Migration

## 📍 Where to Run the Migration

You need to run the SQL migration in your **Supabase Dashboard** using the **SQL Editor**.

## 🚀 Step-by-Step Instructions

### Option 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Sign in to your account
   - Select your project (or create one if you don't have one)

2. **Navigate to SQL Editor**
   - In the left sidebar, click on **"SQL Editor"**
   - Click **"New query"** button (top right)

3. **Open the Migration File**
   - Open the file: `supabase/migrations/20250116000000_add_workflow_tables.sql`
   - Copy **ALL** the contents (Ctrl+A / Cmd+A, then Ctrl+C / Cmd+C)

4. **Paste and Run**
   - Paste the SQL into the Supabase SQL Editor
   - Click the **"RUN"** button (or press Ctrl+Enter / Cmd+Enter)
   - Wait for the success message ✅

5. **Verify Tables Were Created**
   - Go to **"Table Editor"** in the left sidebar
   - You should see these new tables:
     - `workflow_sessions`
     - `keyword_collections`
     - `keyword_clusters`

### Option 2: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Navigate to your project directory
cd /Users/foo/projects/adminpanel-template-blog-writer-next-js

# Link to your Supabase project (if not already linked)
supabase link --project-ref your-project-ref

# Push the migration
supabase db push
```

## 🔍 Verify Migration Success

After running the migration, verify:

1. **Check Tables Exist**
   - Go to Supabase Dashboard → Table Editor
   - Look for: `workflow_sessions`, `keyword_collections`, `keyword_clusters`

2. **Check RLS Policies**
   - Go to Supabase Dashboard → Authentication → Policies
   - Verify policies exist for all three tables

3. **Test the Workflow**
   - Navigate to `/admin/workflow/objective` in your app
   - Create a new workflow session
   - Verify it saves correctly

## ⚠️ Important Notes

- **Run this migration AFTER** you've already set up the base schema (`supabase/schema.sql`)
- The migration uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times
- Make sure you're connected to the correct Supabase project
- If you see errors, check that the `organizations` and `users` tables exist first

## 🐛 Troubleshooting

### Error: "relation 'organizations' does not exist"
- **Solution**: Run `supabase/schema.sql` first to create the base tables

### Error: "permission denied"
- **Solution**: Make sure you're using the SQL Editor (not Table Editor) and have proper permissions

### Error: "duplicate key value violates unique constraint"
- **Solution**: This is normal if tables already exist. The migration uses `IF NOT EXISTS` so it's safe.

## 📝 Quick Reference

**File Location**: `supabase/migrations/20250116000000_add_workflow_tables.sql`

**Supabase Dashboard URL**: 
- Your project: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
- Or navigate: Dashboard → SQL Editor → New Query

**What It Creates**:
- `workflow_sessions` table
- `keyword_collections` table  
- `keyword_clusters` table
- Indexes for performance
- RLS policies for security
- Auto-update triggers

