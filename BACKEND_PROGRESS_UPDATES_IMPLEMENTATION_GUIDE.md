# Backend API Modification Guide: Progress Updates Support

## Quick Summary

**Goal:** Modify the backend API to forward `progress_updates` array from the external API to the frontend.

**File to Modify:** `src/app/api/blog-writer/generate/route.ts`

**Key Changes:**
1. Add `ProgressUpdate` TypeScript interface
2. Extract `progress_updates` from external API response (after line 586)
3. Add `progress_updates` to BOTH response objects (lines 814 and 877)
4. Forward all enhanced endpoint fields (stage_results, citations, quality_score, etc.)

**Time Estimate:** 15-30 minutes

---

## Overview

This guide provides step-by-step instructions for modifying the backend API route (`src/app/api/blog-writer/generate/route.ts`) to support and forward `progress_updates` from the external enhanced blog generation endpoint.

## Current State

**File:** `src/app/api/blog-writer/generate/route.ts`

**Current Behavior:**
- Makes blocking call to external API
- Extracts only basic fields (content, title, excerpt)
- Does NOT forward `progress_updates` array
- Does NOT forward many enhanced endpoint fields

**External API Response Includes:**
- `progress_updates: ProgressUpdate[]` - Array of all progress updates
- `stage_results` - Cost breakdown per stage
- `citations` - Source citations
- `quality_score` - Overall quality score
- `quality_dimensions` - Detailed quality metrics
- `semantic_keywords` - AI-extracted keywords
- `structured_data` - Schema.org structured data
- And many more fields...

## Required Modifications

### Step 1: Add TypeScript Interface for Progress Updates

**Location:** Top of file (after imports, before route handler)

**Add this interface:**

```typescript
interface ProgressUpdate {
  stage: string;
  stage_number: number;
  total_stages: number;
  progress_percentage: number;
  status: string;
  details?: string;
  metadata: Record<string, any>;
  timestamp: number;
}
```

### Step 2: Extract Progress Updates from External API Response

**Location:** After line 586 (`const result = await response.json();`)

**Add this code:**

```typescript
// Extract progress updates from external API response
const progressUpdates: ProgressUpdate[] = result.progress_updates || [];
console.log('📊 Progress updates received:', {
  count: progressUpdates.length,
  stages: progressUpdates.map(u => u.stage),
  latestProgress: progressUpdates.length > 0 
    ? progressUpdates[progressUpdates.length - 1].progress_percentage 
    : 0
});
```

### Step 3: Forward All Enhanced Endpoint Fields

**Location:** Around line 814-850 (in the FIRST `transformedResult` object - when `result.success && result.blog_post`)

**IMPORTANT:** There are TWO response paths in the code. You need to update BOTH:
1. **Path 1:** Line 814-862 (when `result.success && result.blog_post`)
2. **Path 2:** Line 877-922 (when `result.content || result.title`)

Both paths need to include `progress_updates`.

**Current Code:**
```typescript
const transformedResult = {
  content: enhancedContent,
  title: result.blog_post.title || '',
  excerpt: result.blog_post.excerpt || '',
  // ... limited fields
};
```

**Replace with:**

```typescript
const transformedResult = {
  // Core content fields
  content: enhancedContent,
  title: result.blog_post?.title || result.title || '',
  excerpt: result.blog_post?.excerpt || result.blog_post?.summary || result.meta_description || '',
  
  // SEO and quality metrics
  meta_title: result.meta_title || result.title || '',
  meta_description: result.meta_description || result.excerpt || '',
  readability_score: result.readability_score || 0,
  seo_score: result.seo_score || 0,
  quality_score: result.quality_score || null,
  quality_dimensions: result.quality_dimensions || {},
  
  // Stage results and costs
  stage_results: result.stage_results || [],
  total_tokens: result.total_tokens || 0,
  total_cost: result.total_cost || 0,
  generation_time: result.generation_time || 0,
  
  // Citations and sources
  citations: result.citations || [],
  
  // Enhanced features data
  semantic_keywords: result.semantic_keywords || [],
  structured_data: result.structured_data || null,
  knowledge_graph: result.knowledge_graph || null,
  seo_metadata: result.seo_metadata || {},
  content_metadata: result.content_metadata || {},
  
  // Warnings and status
  warnings: result.warnings || [],
  success: result.success !== false, // Default to true if not specified
  
  // PROGRESS UPDATES - NEW
  progress_updates: progressUpdates, // Forward all progress updates
  
  // Word count
  word_count: result.word_count || 0,
  
  // Suggestions (if available)
  suggestions: result.suggestions || [],
  
  // Quality scores (if available)
  quality_scores: result.quality_scores || null,
  
  // Include generated featured image if available
  featured_image: featuredImage ? {
    image_id: featuredImage.image_id,
    image_url: featuredImage.image_url,
    image_data: featuredImage.image_data,
    width: featuredImage.width,
    height: featuredImage.height,
    format: featuredImage.format,
    alt_text: `Featured image for ${result.blog_post?.title || result.title || topic || 'blog post'}`,
    quality_score: featuredImage.quality_score,
    safety_score: featuredImage.safety_score
  } : null,
  
  // Metadata about the generation process
  metadata: {
    used_brand_voice: !!brandVoice,
    used_preset: !!contentPreset,
    endpoint_used: endpoint,
    enhanced: shouldUseEnhanced,
    image_generated: !!featuredImage,
    section_images_generated: sectionImages.length,
    content_enhanced: true,
    content_format: 'rich_html',
    product_research_requested: requiresProductResearch,
    has_progress_updates: progressUpdates.length > 0,
    total_progress_stages: progressUpdates.length > 0 
      ? progressUpdates[progressUpdates.length - 1].total_stages 
      : null,
  }
};
```

### Step 4: Update Logging to Include Progress Information

**Location:** After extracting progress updates (Step 2)

**Add enhanced logging:**

```typescript
console.log('📊 Progress updates received:', {
  count: progressUpdates.length,
  stages: progressUpdates.map(u => u.stage),
  latestProgress: progressUpdates.length > 0 
    ? progressUpdates[progressUpdates.length - 1].progress_percentage 
    : 0,
  latestStatus: progressUpdates.length > 0 
    ? progressUpdates[progressUpdates.length - 1].status 
    : 'No progress data'
});
```

### Step 5: Handle Backward Compatibility

**Location:** When checking for progress updates

**Add fallback logic:**

```typescript
// Extract progress updates from external API response
// Handle both new format (progress_updates array) and legacy format
let progressUpdates: ProgressUpdate[] = [];

if (result.progress_updates && Array.isArray(result.progress_updates)) {
  // New format: array of progress updates
  progressUpdates = result.progress_updates;
} else if (result.progress) {
  // Legacy format: single progress object (convert to array)
  progressUpdates = [{
    stage: result.progress.stage || 'unknown',
    stage_number: result.progress.stage_number || 0,
    total_stages: result.progress.total_stages || 12,
    progress_percentage: result.progress.progress_percentage || 0,
    status: result.progress.status || 'Processing',
    details: result.progress.details,
    metadata: result.progress.metadata || {},
    timestamp: result.progress.timestamp || Date.now() / 1000
  }];
} else {
  // No progress data - create a synthetic update for completion
  progressUpdates = [{
    stage: 'finalization',
    stage_number: 12,
    total_stages: 12,
    progress_percentage: 100,
    status: 'Blog generation complete',
    details: 'Content generated successfully',
    metadata: {},
    timestamp: Date.now() / 1000
  }];
}
```

### Step 6: Verify Response Structure

**Location:** Before returning the response (around line 850)

**Add validation:**

```typescript
// Verify progress updates structure
if (progressUpdates.length > 0) {
  const latest = progressUpdates[progressUpdates.length - 1];
  console.log('✅ Latest progress:', {
    stage: latest.stage,
    percentage: latest.progress_percentage,
    status: latest.status
  });
}

// Ensure response includes progress_updates
if (!transformedResult.progress_updates) {
  transformedResult.progress_updates = progressUpdates;
}
```

## Complete Code Changes Summary

### Change 1: Add Interface (Top of file)

```typescript
// Add after imports
interface ProgressUpdate {
  stage: string;
  stage_number: number;
  total_stages: number;
  progress_percentage: number;
  status: string;
  details?: string;
  metadata: Record<string, any>;
  timestamp: number;
}
```

### Change 2: Extract Progress Updates (After line 586)

```typescript
const result = await response.json();

// Extract progress updates from external API response
let progressUpdates: ProgressUpdate[] = [];

if (result.progress_updates && Array.isArray(result.progress_updates)) {
  progressUpdates = result.progress_updates;
} else if (result.progress) {
  // Legacy format support
  progressUpdates = [{
    stage: result.progress.stage || 'unknown',
    stage_number: result.progress.stage_number || 0,
    total_stages: result.progress.total_stages || 12,
    progress_percentage: result.progress.progress_percentage || 0,
    status: result.progress.status || 'Processing',
    details: result.progress.details,
    metadata: result.progress.metadata || {},
    timestamp: result.progress.timestamp || Date.now() / 1000
  }];
}

console.log('📊 Progress updates received:', {
  count: progressUpdates.length,
  latestProgress: progressUpdates.length > 0 
    ? progressUpdates[progressUpdates.length - 1].progress_percentage 
    : 0
});
```

### Change 3: Update Response Object - Path 1 (Around line 814)

**Replace the FIRST `transformedResult` object** (when `result.success && result.blog_post`) with the expanded version shown in Step 3 above.

### Change 4: Update Response Object - Path 2 (Around line 877)

**Also update the SECOND `transformedResult` object** (when `result.content || result.title`) to include progress_updates:

```typescript
// Around line 877-922
const transformedResult = {
  content: enhancedContent,
  title: result.title || result.blog_post?.title || '',
  excerpt: result.excerpt || result.summary || result.blog_post?.excerpt || '',
  word_count: result.word_count || 0,
  seo_score: result.seo_score || 0,
  readability_score: result.readability_score || 0,
  warnings: result.warnings || [],
  suggestions: result.suggestions || [],
  
  // ADD PROGRESS UPDATES HERE
  progress_updates: progressUpdates,
  
  // ADD OTHER ENHANCED FIELDS
  meta_title: result.meta_title || result.title || '',
  meta_description: result.meta_description || result.excerpt || '',
  quality_score: result.quality_score || null,
  quality_dimensions: result.quality_dimensions || {},
  stage_results: result.stage_results || [],
  total_tokens: result.total_tokens || 0,
  total_cost: result.total_cost || 0,
  generation_time: result.generation_time || 0,
  citations: result.citations || [],
  semantic_keywords: result.semantic_keywords || [],
  structured_data: result.structured_data || null,
  knowledge_graph: result.knowledge_graph || null,
  seo_metadata: result.seo_metadata || {},
  content_metadata: result.content_metadata || {},
  success: result.success !== false,
  
  // ... rest of existing fields (featured_image, metadata, etc.)
};
```

**Key additions:**
- `progress_updates: progressUpdates`
- All enhanced endpoint fields (stage_results, citations, quality_score, etc.)
- Enhanced metadata including `has_progress_updates` flag

## Testing Checklist

After making these changes, verify:

- [ ] `progress_updates` array is included in response
- [ ] All progress updates are forwarded (not just the latest)
- [ ] Response includes all enhanced endpoint fields
- [ ] Backward compatibility works (if external API doesn't return progress_updates)
- [ ] Logging shows progress update information
- [ ] Frontend can access `response.progress_updates` array
- [ ] Latest progress update is accessible as `progress_updates[progress_updates.length - 1]`

## Expected Response Structure

After modifications, the API response should match:

```typescript
{
  // Core content
  content: string,
  title: string,
  excerpt: string,
  
  // Progress tracking (NEW)
  progress_updates: [
    {
      stage: "keyword_analysis",
      stage_number: 2,
      total_stages: 12,
      progress_percentage: 16.67,
      status: "Analyzing keywords with DataForSEO Labs",
      details: "Analyzing 8 keywords...",
      metadata: {},
      timestamp: 1763064703.123
    },
    // ... more updates
  ],
  
  // Enhanced metrics
  quality_score: 85.5,
  seo_score: 92.3,
  readability_score: 78.2,
  stage_results: [...],
  citations: [...],
  semantic_keywords: [...],
  // ... other fields
}
```

## Important Notes

1. **Progress Updates Array**: The external API returns ALL progress updates in a single array. Forward the entire array to the frontend.

2. **Latest Progress**: Frontend should access the latest update via:
   ```typescript
   const latest = response.progress_updates[response.progress_updates.length - 1];
   ```

3. **Backward Compatibility**: Handle cases where external API might not return `progress_updates` (older versions or errors).

4. **Performance**: Progress updates array can be large (20-30 items). Ensure response size is acceptable.

5. **Type Safety**: Add TypeScript types for all new fields to maintain type safety.

## Next Steps After Backend Changes

Once backend is modified:

1. Update frontend to read `progress_updates` from response
2. Display progress bar using `progress_percentage`
3. Show current stage using `status` and `details`
4. Display progress history using the full `progress_updates` array
5. Implement UI components as described in the streaming guide

## Files to Modify

1. **Primary:** `src/app/api/blog-writer/generate/route.ts`
   - Add ProgressUpdate interface
   - Extract progress_updates from external API response
   - Include progress_updates in transformedResult
   - Forward all enhanced endpoint fields

2. **Optional:** Create type definitions file
   - `src/types/blog-generation.ts` (if you want shared types)

## Verification

After implementation, test with:

```bash
# Make a test request
curl -X POST http://localhost:3000/api/blog-writer/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "test topic",
    "keywords": ["test"]
  }' | jq '.progress_updates'
```

Should return an array of progress updates.

