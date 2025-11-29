# Simplified Multi-Stage Flow Plan

## 🎯 Goal
Create a simple, linear flow from keyword research → saving research → choosing topics → creating blogs.

## 📋 Current Flow Analysis

### Current Pages (Too Many!)
1. `/admin/seo` - Main keyword research ✅ KEEP
2. `/admin/seo/keywords` - Keyword storage/history ❌ REMOVE (redundant)
3. `/admin/workflow/keywords` - Duplicate keyword research ❌ REMOVE
4. `/admin/workflow/objective` - Workflow objective ❌ REMOVE (not needed)
5. `/admin/workflow/topics` - Topics ❌ REMOVE (covered by content-clusters)
6. `/admin/workflow/ideas` - Ideas ❌ REMOVE (covered by content-clusters)
7. `/admin/workflow/clusters` - Clusters ❌ REMOVE (duplicate of content-clusters)
8. `/admin/workflow/strategy` - Strategy ❌ REMOVE (not needed)
9. `/admin/workflow/posts` - Posts ❌ REMOVE (covered by drafts)
10. `/admin/workflow/editor` - Editor ❌ REMOVE (covered by drafts/edit)
11. `/admin/workflow/manage` - Manage ❌ REMOVE (not needed)
12. `/admin/content-clusters` - Content clusters ✅ KEEP
13. `/admin/drafts/new` - New draft ✅ KEEP
14. `/admin/drafts` - Drafts list ✅ KEEP

## ✅ Simplified Flow

### Stage 1: Keyword Research & Save
**Page:** `/admin/seo`
- User enters keyword
- System researches keywords
- User selects keywords
- **NEW:** Add "Save Research" button that saves research session to database
- User can then proceed to generate content ideas

### Stage 2: Choose Topics for Blogs
**Page:** `/admin/content-clusters`
- Shows saved research sessions
- User selects a research session
- System shows content ideas/topics generated from that research
- User selects topics they want to create blogs from
- **Action:** "Create Blog" button navigates to draft creation

### Stage 3: Create Blog
**Page:** `/admin/drafts/new`
- Pre-populated with selected topic/keywords
- User configures blog settings
- System generates blog content
- User can edit and save draft

## 🔧 Implementation Steps

1. **Update `/admin/seo` page:**
   - Add "Save Research" button after research completes
   - Save research session to `keyword_research_sessions` table
   - Show success message when saved
   - Add "View Saved Research" link to content-clusters page

2. **Update `/admin/content-clusters` page:**
   - Show list of saved research sessions
   - Allow selecting a research session to view its content ideas
   - Show content ideas/topics for selected research
   - Add "Create Blog" button for each topic

3. **Update `/admin/drafts/new` page:**
   - Accept topic/keyword data from content-clusters
   - Pre-populate form with research data
   - Generate blog content

4. **Remove redundant pages:**
   - Delete `/admin/seo/keywords` (or redirect to seo)
   - Delete `/admin/workflow/*` pages (or redirect appropriately)
   - Update sidebar navigation

5. **Update sidebar:**
   - Remove workflow submenu
   - Keep: SEO Tools, Content Clusters, Drafts
   - Simplify navigation

## 📊 Database Flow

1. **Research Session Saved:**
   - Table: `keyword_research_sessions`
   - Contains: primary_keyword, location, keywords, research_results
   - Saved when user clicks "Save Research"

2. **Content Ideas Generated:**
   - Table: `content_clusters` (or similar)
   - Contains: cluster_name, pillar_keyword, content_ideas
   - Generated from saved research session

3. **Blog Created:**
   - Table: `blog_posts`
   - Contains: title, content, keywords, etc.
   - Created from selected content idea

## 🎨 UI Flow

```
┌─────────────────────────────────────────┐
│  Stage 1: Keyword Research              │
│  /admin/seo                             │
│  ┌───────────────────────────────────┐  │
│  │ Enter Keyword → Research          │  │
│  │ Select Keywords                    │  │
│  │ [Save Research] ← NEW             │  │
│  │ [Generate Content Ideas]           │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Stage 2: Choose Topics                 │
│  /admin/content-clusters                │
│  ┌───────────────────────────────────┐  │
│  │ View Saved Research Sessions       │  │
│  │ Select Research Session            │  │
│  │ View Content Ideas/Topics          │  │
│  │ Select Topics                      │  │
│  │ [Create Blog] → /admin/drafts/new  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Stage 3: Create Blog                    │
│  /admin/drafts/new                       │
│  ┌───────────────────────────────────┐  │
│  │ Pre-populated with topic/keywords  │  │
│  │ Configure blog settings            │  │
│  │ Generate content                   │  │
│  │ Edit & Save Draft                  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

