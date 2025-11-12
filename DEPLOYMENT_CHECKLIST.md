# Deployment Checklist

## Database Migrations Required

### ✅ Migration: `20250120000002_add_content_goal_prompts.sql`

**Status**: Not yet applied to database

**What it does**:
- Creates `content_goal_prompts` table for AI prompt management
- Adds indexes for fast lookups
- Sets up RLS policies for organization-based access
- Inserts default system prompts for SEO, Engagement, Conversions, and Brand Awareness

**How to Apply**:
1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/sql/new
2. Open `supabase/migrations/20250120000002_add_content_goal_prompts.sql`
3. Copy the entire file contents
4. Paste into SQL Editor
5. Click **"RUN"**
6. Verify success message ✅

**Verification**:
```sql
-- Check table was created
SELECT * FROM content_goal_prompts LIMIT 5;

-- Should show 4 system default prompts
SELECT content_goal, prompt_title, is_system_default 
FROM content_goal_prompts 
WHERE is_system_default = true;
```

---

## Code Changes Summary

### Files Modified (Need to be committed):
- `src/app/api/keywords/suggest/route.ts` - Added search volume request parameters
- `src/app/admin/workflow/clusters/page.tsx` - Fixed cluster score calculation
- `src/app/admin/drafts/view/[id]/page.tsx` - Enhanced image detection and preview
- `src/app/admin/drafts/view/[id]/rich-preview.css` - Enhanced blog styling
- `src/layout/AppSidebar.tsx` - Added Settings menu with Content Prompts link

### New Files (Need to be committed):
- `src/app/admin/drafts/view/[id]/rich-preview.css` - Blog preview styles
- `src/app/admin/settings/content-prompts/` - Content prompts UI
- `src/lib/content-enhancer.ts` - Content enhancement utilities
- `supabase/migrations/20250120000002_add_content_goal_prompts.sql` - Database migration

### Documentation Files (Optional):
- `BLOG_ISSUES_FIXES.md` - Summary of fixes
- `API_ENHANCEMENT_REQUIREMENTS.md` - API requirements
- Other analysis docs

---

## Deployment Steps

### 1. Apply Database Migration
**CRITICAL**: Run the migration in Supabase before deploying code.

### 2. Commit Changes
```bash
# Add all changes
git add .

# Commit with descriptive message
git commit -m "Fix: Search volume, cluster scores, blog preview, and content prompts UI

- Add explicit search volume request to keywords API
- Fix cluster score calculation to handle null volumes
- Enhance blog preview styling and image detection
- Add Content Prompts UI to sidebar Settings menu
- Add database migration for content_goal_prompts table"

# Push to repository
git push origin develop
```

### 3. Vercel Deployment
Vercel should automatically deploy when you push to `develop` branch (if auto-deploy is enabled).

**Manual Deployment** (if needed):
```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# Deploy
vercel --prod
```

### 4. Verify Environment Variables
Ensure these are set in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BLOG_WRITER_API_URL`
- `BLOG_WRITER_API_KEY`
- `NEXT_PUBLIC_APP_URL`

---

## Post-Deployment Verification

1. ✅ Check search volume appears in keyword suggestions
2. ✅ Verify cluster scores are varied (not all 36.6)
3. ✅ Test blog preview styling looks professional
4. ✅ Access Content Prompts UI from Settings menu
5. ✅ Verify images appear in blog previews
6. ✅ Test content goal prompts are applied during blog generation

---

## Rollback Plan

If issues occur:
1. Database: The migration uses `IF NOT EXISTS` so it's safe to re-run
2. Code: Revert the commit and redeploy
3. Check server logs for any errors

