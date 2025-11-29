# Image Generation Queue - Frontend Implementation Guide

This guide explains how to integrate the image generation queue system into your frontend application.

## Overview

The image generation API (`/api/blog-writer/images/generate`) now **always** creates a queue entry and returns a `queue_id` in the response. This allows you to:

- Track image generation progress in real-time
- Handle long-running generation tasks
- Provide better user feedback
- Retry failed generations
- Monitor generation history

## API Response Structure

### Success Response

```typescript
{
  success: true,
  queue_id: string,           // Always present - use this to track status
  image: {
    image_id: string,
    image_url: string,
    width: number,
    height: number,
    format: string,
    alt_text: string,
    quality_score: number,
    safety_score: number,
    asset_id: string | null,
    type: 'featured' | 'section',
    position?: number
  },
  generation_time_seconds: number,
  provider: string,
  model: string,
  cost: number
}
```

### Error Response

```typescript
{
  error: string,
  // queue_id may still be present if queue entry was created before error
}
```

## Implementation Steps

### Step 1: Call the Image Generation API

```typescript
const generateImage = async (params: {
  prompt: string;
  style?: string;
  aspect_ratio?: string;
  quality?: string;
  type?: 'featured' | 'section';
  blog_topic?: string;
  keywords?: string[];
  section_title?: string;
  position?: number;
}) => {
  try {
    const response = await fetch('/api/blog-writer/images/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Image generation failed');
    }

    // Always capture queue_id
    const queueId = result.queue_id;
    
    if (queueId) {
      // Store queueId for tracking
      setImageQueueId(queueId);
      console.log('✅ Image generation queued:', queueId);
    }

    // Check if image is already generated (synchronous completion)
    if (result.success && result.image) {
      // Image generated immediately - use it
      return result.image;
    }

    // If queue_id exists but no image, generation is in progress
    if (queueId) {
      // Start tracking queue status
      return { queue_id: queueId, status: 'generating' };
    }

    return result;
  } catch (error) {
    console.error('❌ Image generation error:', error);
    throw error;
  }
};
```

### Step 2: Track Queue Status

You have two options for tracking status:

#### Option A: Polling (Simple)

```typescript
const pollImageQueueStatus = async (queueId: string): Promise<any> => {
  const maxAttempts = 60; // 5 minutes max (5 second intervals)
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`/api/image-queue/${queueId}/status`);
      const data = await response.json();

      if (data.status === 'generated') {
        // Generation complete - return the image
        return {
          image_url: data.generated_image_url,
          image_id: data.generated_image_id,
          width: data.image_width,
          height: data.image_height,
          format: data.image_format,
          alt_text: data.alt_text,
          quality_score: data.quality_score,
          safety_score: data.safety_score,
          asset_id: data.asset_id,
        };
      }

      if (data.status === 'failed') {
        throw new Error(data.generation_error || 'Image generation failed');
      }

      // Still generating - wait and retry
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second intervals
      attempts++;
    } catch (error) {
      console.error('Error polling queue status:', error);
      throw error;
    }
  }

  throw new Error('Image generation timeout');
};
```

#### Option B: Server-Sent Events (Recommended for Real-time UI)

Create a hook similar to `useQueueStatusSSE`:

```typescript
// hooks/useImageQueueStatusSSE.ts
"use client";

import { useState, useEffect, useRef } from "react";
import { logger } from '@/utils/logger';

type ImageQueueStatus = 'queued' | 'generating' | 'generated' | 'failed' | 'cancelled';

interface ImageQueueStatusUpdate {
  status: ImageQueueStatus;
  progress_percentage: number;
  current_stage?: string;
  timestamp: string;
  generated_image_url?: string;
  generated_image_id?: string;
  generation_error?: string;
}

export function useImageQueueStatusSSE(queueId: string | null) {
  const [status, setStatus] = useState<ImageQueueStatus | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [stage, setStage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageData, setImageData] = useState<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!queueId) {
      return;
    }

    // Note: For now, use polling since SSE endpoint may not be implemented yet
    // You can implement SSE endpoint similar to blog-queue/[id]/status
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/image-queue/${queueId}/status`);
        const data = await response.json();

        setStatus(data.status);
        setProgress(data.progress_percentage || 0);
        setStage(data.current_stage || "");
        
        if (data.generation_error) {
          setError(data.generation_error);
        }

        if (data.status === 'generated' && data.generated_image_url) {
          setImageUrl(data.generated_image_url);
          setImageData({
            image_id: data.generated_image_id,
            image_url: data.generated_image_url,
            width: data.image_width,
            height: data.image_height,
            format: data.image_format,
            alt_text: data.alt_text,
            quality_score: data.quality_score,
            safety_score: data.safety_score,
            asset_id: data.asset_id,
          });
          clearInterval(pollInterval);
        }

        if (data.status === 'failed') {
          setError(data.generation_error || 'Image generation failed');
          clearInterval(pollInterval);
        }
      } catch (err) {
        logger.error("Error polling image queue status:", err);
        setError("Failed to fetch status");
      }
    }, 2000); // Poll every 2 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [queueId]);

  return {
    status,
    progress,
    stage,
    error,
    imageUrl,
    imageData,
  };
}
```

### Step 3: Complete Example Component

```typescript
"use client";

import { useState } from 'react';
import { useImageQueueStatusSSE } from '@/hooks/useImageQueueStatusSSE';

export function ImageGenerator() {
  const [queueId, setQueueId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<any>(null);
  
  const { status, progress, stage, error, imageData } = useImageQueueStatusSSE(queueId);

  const handleGenerateImage = async () => {
    setIsGenerating(true);
    setQueueId(null);
    setGeneratedImage(null);

    try {
      const response = await fetch('/api/blog-writer/images/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'A beautiful sunset over mountains',
          style: 'photographic',
          aspect_ratio: '16:9',
          quality: 'high',
          type: 'featured',
          blog_topic: 'Nature Photography',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Image generation failed');
      }

      // Check if image was generated immediately
      if (result.success && result.image) {
        setGeneratedImage(result.image);
        setIsGenerating(false);
        return;
      }

      // Otherwise, track via queue
      if (result.queue_id) {
        setQueueId(result.queue_id);
      }
    } catch (err) {
      console.error('Generation error:', err);
      setIsGenerating(false);
    }
  };

  // Update generated image when queue completes
  useEffect(() => {
    if (imageData && status === 'generated') {
      setGeneratedImage(imageData);
      setIsGenerating(false);
    }
  }, [imageData, status]);

  return (
    <div>
      <button 
        onClick={handleGenerateImage}
        disabled={isGenerating}
      >
        {isGenerating ? 'Generating...' : 'Generate Image'}
      </button>

      {queueId && (
        <div className="mt-4">
          <p>Queue ID: {queueId}</p>
          <p>Status: {status || 'queued'}</p>
          {progress > 0 && (
            <div>
              <p>Progress: {progress}%</p>
              <progress value={progress} max={100} />
            </div>
          )}
          {stage && <p>Stage: {stage}</p>}
          {error && <p className="text-red-500">Error: {error}</p>}
        </div>
      )}

      {generatedImage && (
        <div className="mt-4">
          <img 
            src={generatedImage.image_url} 
            alt={generatedImage.alt_text}
            className="max-w-full"
          />
          <p>Quality Score: {generatedImage.quality_score}</p>
        </div>
      )}
    </div>
  );
}
```

## Integration with Existing Image Insert Modal

If you're using the `ImageInsertModal` component, update it to handle queue tracking:

```typescript
// In ImageInsertModal.tsx or similar component

const handleGenerateFromExcerpt = async () => {
  setIsGenerating(true);
  setError(null);

  try {
    const response = await fetch('/api/blog-writer/images/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: excerpt, // Use excerpt as prompt
        style: 'photographic',
        aspect_ratio: '16:9',
        quality: 'high',
        type: 'featured',
        blog_topic: blogTopic,
        keywords: keywords,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Image generation failed');
    }

    // Handle immediate completion
    if (result.success && result.image) {
      onImageSelect(result.image);
      setIsGenerating(false);
      return;
    }

    // Handle queue-based generation
    if (result.queue_id) {
      setImageQueueId(result.queue_id);
      // Show progress indicator
      // The useImageQueueStatusSSE hook will handle status updates
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to generate image');
    setIsGenerating(false);
  }
};

// Then use the hook to track status
const { status, progress, imageData } = useImageQueueStatusSSE(imageQueueId);

useEffect(() => {
  if (imageData && status === 'generated') {
    onImageSelect(imageData);
    setIsGenerating(false);
  }
}, [imageData, status]);
```

## Queue Status Endpoints

### Get Queue Status
```typescript
GET /api/image-queue/[queueId]/status

Response:
{
  success: true,
  queue_id: string,
  status: 'queued' | 'generating' | 'generated' | 'failed' | 'cancelled',
  progress_percentage: number,
  current_stage?: string,
  generated_image_url?: string,
  generated_image_id?: string,
  image_width?: number,
  image_height?: number,
  image_format?: string,
  alt_text?: string,
  quality_score?: number,
  safety_score?: number,
  asset_id?: string,
  generation_error?: string,
  queued_at: string,
  generation_started_at?: string,
  generation_completed_at?: string,
  metadata: object
}
```

### List Queue Items
```typescript
GET /api/image-queue?status=generating&limit=50&offset=0

Response:
{
  success: true,
  items: Array<ImageQueueItem>,
  count: number
}
```

## Status Values

- `queued` - Request is in queue, waiting to start
- `generating` - Image generation in progress
- `generated` - Successfully generated (image available)
- `failed` - Generation failed (check `generation_error`)
- `cancelled` - Generation was cancelled

## Best Practices

1. **Always capture `queue_id`** - Even if generation completes immediately, the queue_id is useful for tracking and history

2. **Handle both synchronous and asynchronous responses** - The API may return the image immediately for fast generations, or just a queue_id for longer ones

3. **Show progress feedback** - Use the `progress_percentage` and `current_stage` to show users what's happening

4. **Poll or use SSE** - For better UX, poll every 2-5 seconds or implement SSE for real-time updates

5. **Handle errors gracefully** - Check for `generation_error` and display user-friendly messages

6. **Store queue_id** - Consider storing queue_id in localStorage or state management for persistence across page refreshes

7. **List queue history** - Use `/api/image-queue` to show users their generation history

## Migration from Old Implementation

If you have existing code that calls the image generation API:

**Before:**
```typescript
const result = await fetch('/api/blog-writer/images/generate', {...});
const data = await result.json();
// Use data.image directly
```

**After:**
```typescript
const result = await fetch('/api/blog-writer/images/generate', {...});
const data = await result.json();

if (data.queue_id && !data.image) {
  // Track via queue
  trackQueueStatus(data.queue_id);
} else if (data.image) {
  // Use image directly (immediate completion)
  useImage(data.image);
}
```

## Example: Full Integration with TipTap Editor

```typescript
// In TipTapEditor component or ImageInsertModal

const [imageQueueId, setImageQueueId] = useState<string | null>(null);
const { status, progress, imageData } = useImageQueueStatusSSE(imageQueueId);

const handleGenerateImage = async (excerpt: string) => {
  try {
    const response = await fetch('/api/blog-writer/images/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: excerpt,
        type: 'featured',
        style: 'photographic',
      }),
    });

    const result = await response.json();

    if (result.queue_id) {
      setImageQueueId(result.queue_id);
      // Show progress UI
    }

    if (result.image) {
      // Immediate completion
      insertImageIntoEditor(result.image);
    }
  } catch (error) {
    console.error('Generation failed:', error);
  }
};

// Watch for queue completion
useEffect(() => {
  if (imageData && status === 'generated') {
    insertImageIntoEditor(imageData);
    setImageQueueId(null); // Reset
  }
}, [imageData, status]);
```

## Troubleshooting

### Queue ID not returned
- Check that the API request was successful (status 200)
- Verify the response includes `queue_id` field
- Check browser console for errors

### Status stuck on "generating"
- Check network connectivity
- Verify the queue item exists: `GET /api/image-queue/[queueId]/status`
- Check server logs for errors

### Image not appearing after "generated" status
- Verify `generated_image_url` is present in status response
- Check that the URL is accessible
- Verify Cloudinary upload completed successfully

## Next Steps

1. Implement the `useImageQueueStatusSSE` hook (or use polling)
2. Update your image generation UI to show progress
3. Add queue history view using `/api/image-queue`
4. Consider implementing SSE endpoint for real-time updates (similar to blog queue)

