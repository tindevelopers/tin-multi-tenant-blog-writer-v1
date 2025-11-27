# Blog Generation - Force Async Mode Frontend Guide

## Overview

Currently, the blog generation API supports both synchronous and asynchronous modes. To ensure **all blog generation always goes through queues** and provides better user experience, we should force async mode.

## Current State

- ✅ Backend **always creates a queue entry** (regardless of async_mode)
- ⚠️ Frontend does **not** pass `async_mode=true` by default
- ⚠️ Frontend handles both immediate content and queue-based responses
- ⚠️ This can lead to long-running requests and timeouts

## Required Changes

### 1. Update `blogWriterAPI.generateBlog()` Method

**File:** `src/lib/blog-writer-api.ts`

**Current Code:**
```typescript
async generateBlog(params: {...}): Promise<Record<string, unknown> | null> {
  try {
    logger.debug('Starting blog generation via local API route', { params });
    
    // Use local API route instead of external API to avoid CORS issues
    const response = await fetch('/api/blog-writer/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    // ... rest of code
  }
}
```

**Updated Code:**
```typescript
async generateBlog(params: {...}): Promise<Record<string, unknown> | null> {
  try {
    logger.debug('Starting blog generation via local API route (async mode)', { params });
    
    // Always use async_mode=true to force queue-based generation
    const response = await fetch('/api/blog-writer/generate?async_mode=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API request failed: ${response.status} ${errorData.error || response.statusText}`);
    }
    
    const result = await response.json();
    logger.debug('Blog generation queued successfully', { 
      queue_id: result.queue_id,
      job_id: result.job_id 
    });
    
    // In async mode, result will always have queue_id and possibly job_id
    // Never expect immediate content
    return result;
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error('Failed to generate blog'), {
      endpoint: '/api/blog-writer/generate',
      params
    });
    return null;
  }
}
```

### 2. Update Frontend Component to Always Expect Queue Response

**File:** `src/app/admin/drafts/new/page.tsx`

**Current Code (lines 434-443):**
```typescript
// Capture queue_id if present
if (result && (result as any).queue_id) {
  const capturedQueueId = (result as any).queue_id;
  setQueueId(capturedQueueId);
  setQueueStatus("generating");
  console.log('✅ Queue ID captured:', capturedQueueId);
  
  // Show success message with link to queue
  alert(`Blog generation started! View progress in the queue dashboard. Queue ID: ${capturedQueueId}`);
}

if (result && result.content && typeof result.content === 'string' && result.content.trim().length > 0) {
  // Handle immediate content...
}
```

**Updated Code:**
```typescript
// In async mode, we ALWAYS get a queue_id, never immediate content
if (result && (result as any).queue_id) {
  const capturedQueueId = (result as any).queue_id;
  setQueueId(capturedQueueId);
  setQueueStatus("generating");
  setIsGenerating(false); // Stop loading spinner since generation is queued
  console.log('✅ Blog generation queued:', capturedQueueId);
  
  // Show success message - generation is queued, not complete
  // The SSE hook will handle progress updates
  // Don't show alert - let the progress UI handle feedback
} else {
  // This should never happen in async mode, but handle gracefully
  console.warn('⚠️ No queue_id returned from async generation');
  setIsGenerating(false);
  alert('Blog generation started but queue ID not received. Please check the queue dashboard.');
}

// REMOVE the immediate content handling block - async mode never returns content immediately
// The content will be fetched via queue status when generation completes
```

### 3. Ensure Queue Status Tracking is Active

**File:** `src/app/admin/drafts/new/page.tsx`

Make sure the SSE hook is properly set up (it already is, but verify):

```typescript
// This should already exist around line 145
const { status: sseStatus, progress: sseProgress, stage: sseStage } = useQueueStatusSSE(queueId);
```

### 4. Update Content Fetching Logic

**File:** `src/app/admin/drafts/new/page.tsx`

The existing `useEffect` that fetches content from queue (around line 160) should handle this, but ensure it's working correctly:

```typescript
// This useEffect should already exist and handle fetching content when queue completes
useEffect(() => {
  const fetchGeneratedContent = async () => {
    // Only fetch if we have a queueId and status indicates completion
    if (!queueId || sseStatus !== 'generated' || generatedContent) {
      return;
    }

    try {
      logger.debug('📥 Fetching generated content from queue:', queueId);
      const response = await fetch(`/api/blog-queue/${queueId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch generated content');
      }

      const result = await response.json();
      const queueItem = result.queue_item;

      if (queueItem?.generated_content || queueItem?.generation_metadata) {
        const metadata = queueItem.generation_metadata || {};
        const excerptValue = metadata.excerpt || queueItem.generated_title || '';
        const excerpt: string = typeof excerptValue === 'string' ? excerptValue : String(excerptValue);
        const title = queueItem.generated_title || formData.title || '';
        const content = queueItem.generated_content || '';

        const blogContent = {
          title,
          content,
          excerpt,
          meta_description: metadata.meta_description || excerpt,
          seo_score: metadata.seo_score,
          readability_score: metadata.readability_score,
          quality_score: metadata.quality_score,
          word_count: metadata.word_count,
          metadata: metadata,
        };

        setGeneratedContent(blogContent);
        
        setFormData(prev => ({
          ...prev,
          title: title || prev.title,
          content: content || prev.content,
          excerpt: excerpt || prev.excerpt,
        }));
      }
    } catch (error) {
      logger.error('❌ Error fetching generated content from queue:', error);
    }
  };

  fetchGeneratedContent();
}, [queueId, sseStatus, generatedContent]);
```

## Complete Updated `handleGenerateContent` Function

Here's the complete updated function:

```typescript
const handleGenerateContent = async () => {
  if (!formData.topic) {
    alert("Please enter a topic for your blog post");
    return;
  }

  setIsGenerating(true);
  setQueueId(null); // Reset queue ID
  setGeneratedContent(null); // Reset generated content
  
  try {
    // Use research results if available, otherwise use form data
    let keywords: string[] = [];
    let targetAudience = formData.target_audience;
    let wordCount = formData.word_count;

    if (researchResults) {
      keywords = researchResults.seo_insights.secondary_keywords;
      targetAudience = researchResults.content_strategy.target_audience;
      wordCount = researchResults.seo_insights.content_length_recommendation;
      keywords.unshift(researchResults.seo_insights.primary_keyword);
    } else {
      keywords = formData.keywords.split(',').map(k => k.trim()).filter(k => k);
    }
    
    console.log('🚀 Generating content (async mode):', {
      topic: formData.topic,
      keywords,
      targetAudience,
      tone: formData.tone,
      wordCount
    });
    
    // Call API - now always uses async_mode=true
    const result = await blogWriterAPI.generateBlog({
      topic: formData.topic,
      keywords: keywords.length > 0 ? keywords : undefined,
      target_audience: targetAudience || undefined,
      tone: formData.tone,
      word_count: wordCount,
      preset_id: formData.preset_id || undefined,
      quality_level: formData.quality_level,
      include_external_links: formData.include_external_links,
      include_backlinks: formData.include_backlinks,
      backlink_count: formData.include_backlinks ? formData.backlink_count : undefined,
      template_type: formData.template_type,
      custom_instructions: formData.custom_instructions || undefined,
      length: formData.length,
      use_google_search: isPremiumQuality ? true : formData.use_google_search,
      use_fact_checking: isPremiumQuality ? true : formData.use_fact_checking,
      use_citations: isPremiumQuality ? true : formData.use_citations,
      use_serp_optimization: isPremiumQuality ? true : formData.use_serp_optimization,
      use_consensus_generation: isPremiumQuality ? true : formData.use_consensus_generation,
      use_knowledge_graph: isPremiumQuality ? true : formData.use_knowledge_graph,
      use_semantic_keywords: isPremiumQuality ? true : formData.use_semantic_keywords,
      use_quality_scoring: isPremiumQuality ? true : formData.use_quality_scoring,
    });

    console.log('🔍 Generation result:', result);

    // In async mode, we ALWAYS get a queue_id, never immediate content
    if (result && (result as any).queue_id) {
      const capturedQueueId = (result as any).queue_id;
      setQueueId(capturedQueueId);
      setQueueStatus("generating");
      setIsGenerating(false); // Stop loading - generation is queued
      console.log('✅ Blog generation queued:', capturedQueueId);
      
      // Don't show alert - let the progress UI handle feedback
      // The SSE hook will update status automatically
    } else {
      // This should never happen in async mode
      console.error('❌ No queue_id returned from async generation');
      setIsGenerating(false);
      alert('Blog generation failed to start. Please try again.');
    }

    // REMOVED: Immediate content handling - async mode never returns content immediately
    
  } catch (error) {
    console.error('❌ Error generating content:', error);
    setIsGenerating(false);
    alert('Failed to start blog generation. Please try again.');
  }
};
```

## Response Structure in Async Mode

When `async_mode=true`, the API returns:

```typescript
{
  job_id?: string,              // External API job ID (if backend uses async)
  status: 'queued',             // Status from external API
  message?: string,             // Status message
  estimated_completion_time?: string,
  queue_id: string              // Our internal queue ID (ALWAYS present)
}
```

**Note:** The `queue_id` is **always** present because the backend creates a queue entry before calling the external API.

## Benefits of Forcing Async Mode

1. ✅ **Consistent behavior** - All generations go through the same flow
2. ✅ **No timeouts** - Long-running generations don't block the request
3. ✅ **Better UX** - Real-time progress updates via SSE
4. ✅ **Reliability** - Failed generations are tracked in queue
5. ✅ **Scalability** - Can handle many concurrent generations
6. ✅ **History** - All generations are tracked in database

## Migration Checklist

- [ ] Update `blogWriterAPI.generateBlog()` to always pass `async_mode=true`
- [ ] Remove immediate content handling logic from `handleGenerateContent`
- [ ] Update UI to show "Generation queued" instead of "Generating..."
- [ ] Ensure SSE hook is active and working
- [ ] Test that content is fetched from queue when status becomes "generated"
- [ ] Remove any alerts about immediate completion
- [ ] Update error handling for async-only flow

## Testing

After making changes:

1. **Test successful generation:**
   - Start generation
   - Verify `queue_id` is captured
   - Verify SSE shows progress updates
   - Verify content appears when status becomes "generated"

2. **Test error handling:**
   - Start generation with invalid parameters
   - Verify error is shown
   - Verify queue entry shows "failed" status

3. **Test queue dashboard:**
   - Verify generation appears in queue list
   - Verify status updates correctly
   - Verify can view details

## Backward Compatibility

⚠️ **Breaking Change:** This removes support for synchronous blog generation. If you need to support both modes, you can:

1. Add a parameter to `generateBlog()` to control async mode
2. Keep both code paths but default to async mode
3. Or create separate methods: `generateBlogAsync()` and `generateBlogSync()`

However, for consistency with image generation (which is always async), we recommend forcing async mode for all blog generations.

