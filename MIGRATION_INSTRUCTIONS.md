# How to Apply Content Goal Prompts Migration

## Option 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor**:
   - Go to your Supabase project dashboard
   - Click on **"SQL Editor"** in the left sidebar
   - Click **"New query"**

2. **Copy the Migration File**:
   - Open the file: `supabase/migrations/20250120000002_add_content_goal_prompts.sql`
   - Copy **ALL** contents (233 lines)

3. **Paste and Run**:
   - Paste the SQL into the SQL Editor
   - Click **"RUN"** (or press `Ctrl+Enter` / `Cmd+Enter`)
   - Wait for the success message ✅

4. **Verify the Migration**:
   - Go to **"Table Editor"** in the left sidebar
   - You should see a new table: `content_goal_prompts`
   - Check that it has 4 rows (the default system prompts)

## Option 2: Using Supabase CLI (If Installed)

If you have Supabase CLI installed:

```bash
# Navigate to your project directory
cd /Users/foo/projects/adminpanel-template-blog-writer-next-js

# Link to your Supabase project (if not already linked)
supabase link --project-ref your-project-ref

# Apply the migration
supabase db push
```

## Verification Steps

After applying the migration, verify:

1. **Table Created**:
   ```sql
   SELECT COUNT(*) FROM content_goal_prompts;
   ```
   Should return: `4` (one for each content goal)

2. **Default Prompts Exist**:
   ```sql
   SELECT content_goal, prompt_title, is_system_default 
   FROM content_goal_prompts 
   ORDER BY content_goal;
   ```
   Should show:
   - `brand_awareness` - Brand Awareness - Default
   - `conversions` - Conversions - Default
   - `engagement` - Engagement - Default
   - `seo` - SEO & Rankings - Default

3. **RLS Policies Active**:
   ```sql
   SELECT tablename, policyname 
   FROM pg_policies 
   WHERE tablename = 'content_goal_prompts';
   ```
   Should show 4 policies (SELECT, INSERT, UPDATE, DELETE)

4. **Function Created**:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'get_content_goal_prompt';
   ```
   Should return the function name

## Troubleshooting

### Error: "relation already exists"
- The table might already exist. Check if you've run this migration before.
- If you need to re-run, you can drop the table first (be careful!):
  ```sql
  DROP TABLE IF EXISTS content_goal_prompts CASCADE;
  ```
  Then re-run the migration.

### Error: "permission denied"
- Make sure you're using the SQL Editor with proper permissions
- Check that you're logged in as a project owner/admin

### Error: "constraint violation"
- The unique indexes might conflict with existing data
- Check if there are duplicate prompts:
  ```sql
  SELECT content_goal, org_id, COUNT(*) 
  FROM content_goal_prompts 
  WHERE is_active = true 
  GROUP BY content_goal, org_id 
  HAVING COUNT(*) > 1;
  ```

## Next Steps After Migration

1. **Access Admin Interface**:
   - Navigate to `/admin/settings/content-prompts` in your app
   - You should see all 4 content goals with their default prompts

2. **Test Content Generation**:
   - Create a workflow with a content goal selected
   - Generate content
   - Check console logs for: `📝 Adding content goal prompt to API request`

3. **Customize Prompts** (Optional):
   - Go to `/admin/settings/content-prompts`
   - Click "Create Custom" for any content goal
   - Edit the system prompt to match your needs
   - Save

## Migration File Location

The migration file is located at:
```
supabase/migrations/20250120000002_add_content_goal_prompts.sql
```
