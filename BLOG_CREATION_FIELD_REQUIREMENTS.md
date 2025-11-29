# Blog Creation Field Requirements

## Objective
Ensure all necessary fields for complete blog creation are captured during the blog creation process, especially for Webflow CMS publishing.

## Current Flow Analysis

### Step 1: Blog Generation (`/admin/drafts/new`)
- User fills form with: title, topic, keywords, target_audience, tone, word_count, etc.
- Content is generated via `/api/blog-writer/generate`
- Generated content includes: title, content, excerpt, meta_description, seo_score

### Step 2: Draft Saving (`/api/drafts/save`)
- Saves: title, content, excerpt, status, seo_data, metadata
- Featured image is extracted from content or provided

### Step 3: Publishing (`/api/blog-publishing/[id]/publish`)
- Maps blog fields to Webflow fields
- Uses field mappings to transform data

## Required Fields for Complete Blog Creation

### Core Fields (Required)
1. **Title** (`title`) - ✅ Currently captured
2. **Slug** (`slug`) - ⚠️ Generated but not stored in blog_posts table
3. **Content** (`content`) - ✅ Currently captured
4. **Excerpt/Summary** (`excerpt`) - ✅ Currently captured

### SEO Fields
5. **SEO Title** (`seo_data.meta_title`) - ✅ Currently captured
6. **Meta Description** (`seo_data.meta_description`) - ✅ Currently captured
7. **Title Tag** (`seo_data.title_tag`) - ⚠️ May be missing

### Image Fields
8. **Featured Image** (`metadata.featured_image`) - ✅ Currently captured
9. **Featured Image Alt Text** (`metadata.featured_image_alt`) - ⚠️ Missing
10. **Thumbnail Image** (`metadata.thumbnail_image`) - ⚠️ Missing
11. **Thumbnail Image Alt Text** (`metadata.thumbnail_image_alt`) - ⚠️ Missing
12. **Author Image** (`metadata.author_image`) - ⚠️ Missing

### Author Fields
13. **Author Name** (`metadata.author_name`) - ⚠️ Missing
14. **Author Bio** (`metadata.author_bio`) - ⚠️ Optional but useful

### Publishing Fields
15. **Publication Date** (`published_at`) - ✅ Exists but may not be set during creation
16. **Scheduled Date** (`scheduled_at`) - ✅ Exists
17. **Status** (`status`) - ✅ Currently captured
18. **Featured Flag** (`metadata.is_featured`) - ⚠️ Missing
19. **Locale** (`metadata.locale`) - ⚠️ Missing (defaults to 'en')

### Navigation Fields (Optional but useful)
20. **Next Post** (`metadata.next_post_id`) - ⚠️ Missing
21. **Previous Post** (`metadata.previous_post_id`) - ⚠️ Missing

### Read Time
22. **Read Time** (`metadata.read_time`) - ⚠️ Missing (can be calculated from word_count)

## Webflow Field Mapping Requirements

Based on Webflow CMS schema inspection, these fields need to be mapped:

| Our Field | Webflow Field | Type | Required |
|-----------|---------------|------|----------|
| title | name | PlainText | ✅ Yes |
| slug | slug | Slug | ✅ Yes |
| content | post-body | RichText | ✅ Yes |
| excerpt | post-summary | PlainText | ⚠️ Optional |
| featured_image | main-image | ImageRef | ⚠️ Optional |
| thumbnail_image | thumbnail-image | ImageRef | ⚠️ Optional |
| featured_image_alt | alt-text | PlainText | ⚠️ Optional |
| author_name | author-name | PlainText | ⚠️ Optional |
| author_image | author-image | ImageRef | ⚠️ Optional |
| is_featured | featured | Boolean | ⚠️ Optional |
| published_at | publish-date | Date | ⚠️ Optional |
| seo_title | seo-title | PlainText | ⚠️ Optional |
| meta_description | seo-description | PlainText | ⚠️ Optional |
| locale | locale | PlainText | ⚠️ Optional |
| read_time | read-time | Number | ⚠️ Optional |

## Implementation Plan

### Phase 1: Field Identification & Validation
1. Create a field requirements validator
2. Add field configuration step before blog creation
3. Show missing required fields warnings

### Phase 2: Form Enhancement
1. Add all missing fields to blog creation form
2. Add field validation
3. Add field grouping (Basic Info, SEO, Images, Author, Publishing)

### Phase 3: Backend Updates
1. Update `/api/drafts/save` to accept all fields
2. Generate slug if not provided
3. Calculate read_time from word_count
4. Set default values for optional fields

### Phase 4: Publishing Integration
1. Ensure all fields are passed to publishing endpoint
2. Verify field mappings work correctly
3. Test end-to-end publishing with all fields

## Field Validation Rules

### Required Fields (Cannot be empty)
- title
- content
- slug (auto-generated if not provided)

### Recommended Fields (Should be filled)
- excerpt
- meta_description
- author_name
- featured_image

### Optional Fields (Nice to have)
- thumbnail_image
- author_image
- author_bio
- read_time
- locale
- next_post_id
- previous_post_id
- is_featured

## Next Steps

1. ✅ Document field requirements (this file)
2. ⏳ Create field validator utility
3. ⏳ Update blog creation form
4. ⏳ Update save endpoint
5. ⏳ Test field capture and publishing

