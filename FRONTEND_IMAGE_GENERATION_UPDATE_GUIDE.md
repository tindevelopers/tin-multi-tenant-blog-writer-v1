# Frontend Image Generation Update Guide

**Version:** 2.0.0  
**Date:** 2025-01-15  
**API Version:** 1.3.6+

---

## 🎯 Overview

This guide provides instructions for updating your frontend to use the new content-aware image generation features. The new system provides:

1. **Content-Aware Prompt Generation** - Automatically generates prompts from blog content
2. **Progressive Enhancement** - Show content immediately, generate images in background
3. **Smart Defaults** - Automatic suggestions for featured and section images
4. **Batch Operations** - Generate multiple images in parallel
5. **Placement Suggestions** - Optimal image placement based on content structure

---

## 🚀 Quick Start

### 1. New API Endpoints

#### Get Image Suggestions from Content
```typescript
POST /api/v1/images/suggestions

Request Body:
{
  "content": "Your blog content in markdown...",
  "topic": "Your blog topic",
  "keywords": ["keyword1", "keyword2"],
  "tone": "professional" // optional, default: "professional"
}

Response:
{
  "suggestions": [
    {
      "image_type": "featured",
      "style": "photographic",
      "aspect_ratio": "16:9",
      "prompt": "Professional blog post featured image: Your topic...",
      "prompt_variations": [
        "Featured image for blog post about Your topic",
        "Professional header image: keyword1",
        // ... more variations
      ],
      "alt_text": "Featured image for Your topic",
      "placement": {
        "position": 0,
        "section": "Introduction",
        "priority": 5
      }
    },
    // ... more suggestions
  ],
  "total_suggestions": 3,
  "recommended_count": 2
}
```

#### Generate Image from Content
```typescript
POST /api/v1/images/generate-from-content

Request Body:
{
  "content": "Your blog content...",
  "topic": "Your blog topic",
  "keywords": ["keyword1", "keyword2"],
  "image_type": "featured" | "section_header" | "infographic",
  "tone": "professional", // optional
  "section_title": "Section Title" // optional, for section images
}

Response:
{
  "job_id": "uuid-here",
  "status": "pending"
}
```

---

## 📝 Implementation Guide

### Step 1: Update Image Generation Hook

Create or update your React hook for image generation:

```typescript
// hooks/useImageGeneration.ts
import { useState, useCallback } from 'react';

interface ImageSuggestion {
  image_type: string;
  style: string;
  aspect_ratio: string;
  prompt: string;
  prompt_variations: string[];
  alt_text: string;
  placement: {
    position: number;
    section: string;
    priority: number;
  };
}

interface ImageSuggestionsResponse {
  suggestions: ImageSuggestion[];
  total_suggestions: number;
  recommended_count: number;
}

export const useImageGeneration = () => {
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<ImageSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-api-url.com';

  // Get image suggestions from blog content
  const getImageSuggestions = useCallback(async (
    content: string,
    topic: string,
    keywords: string[],
    tone: string = 'professional'
  ): Promise<ImageSuggestionsResponse> => {
    setGenerating(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/images/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          topic,
          keywords,
          tone,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get suggestions: ${response.statusText}`);
      }

      const data: ImageSuggestionsResponse = await response.json();
      setSuggestions(data.suggestions);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, []);

  // Generate image from content
  const generateImageFromContent = useCallback(async (
    content: string,
    topic: string,
    keywords: string[],
    imageType: 'featured' | 'section_header' | 'infographic',
    tone: string = 'professional',
    sectionTitle?: string
  ): Promise<string> => {
    setGenerating(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/images/generate-from-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          topic,
          keywords,
          image_type: imageType,
          tone,
          section_title: sectionTitle,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate image: ${response.statusText}`);
      }

      const data = await response.json();
      return data.job_id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, []);

  // Generate image with custom prompt (existing functionality)
  const generateImage = useCallback(async (
    prompt: string,
    style: string = 'photographic',
    aspectRatio: string = '16:9',
    quality: string = 'high'
  ): Promise<string> => {
    setGenerating(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/images/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          provider: 'stability_ai',
          style,
          aspect_ratio: aspectRatio,
          quality,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate image: ${response.statusText}`);
      }

      const data = await response.json();
      return data.job_id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, []);

  return {
    generating,
    suggestions,
    error,
    getImageSuggestions,
    generateImageFromContent,
    generateImage,
  };
};
```

---

### Step 2: Create Image Suggestions Component

```typescript
// components/ImageSuggestionsPanel.tsx
import React, { useEffect, useState } from 'react';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { useImageJobStatus } from '@/hooks/useImageJobStatus'; // Your existing hook

interface ImageSuggestionsPanelProps {
  blogContent: string;
  topic: string;
  keywords: string[];
  tone?: string;
  onImageGenerated?: (image: any, suggestion: ImageSuggestion) => void;
}

export const ImageSuggestionsPanel: React.FC<ImageSuggestionsPanelProps> = ({
  blogContent,
  topic,
  keywords,
  tone = 'professional',
  onImageGenerated,
}) => {
  const {
    suggestions,
    generating,
    error,
    getImageSuggestions,
    generateImageFromContent,
  } = useImageGeneration();

  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [generatingJobs, setGeneratingJobs] = useState<Map<number, string>>(new Map());

  // Load suggestions when content changes
  useEffect(() => {
    if (blogContent && topic) {
      getImageSuggestions(blogContent, topic, keywords, tone);
    }
  }, [blogContent, topic, keywords, tone]);

  const handleGenerateImage = async (suggestion: ImageSuggestion, index: number) => {
    try {
      const jobId = await generateImageFromContent(
        blogContent,
        topic,
        keywords,
        suggestion.image_type as any,
        tone,
        suggestion.placement.section
      );

      setGeneratingJobs(prev => new Map(prev).set(index, jobId));
      setSelectedSuggestions(prev => new Set(prev).add(index));

      // Poll for job completion
      pollJobStatus(jobId, suggestion, index);
    } catch (err) {
      console.error('Failed to generate image:', err);
    }
  };

  const pollJobStatus = async (jobId: string, suggestion: ImageSuggestion, index: number) => {
    // Use your existing job status polling logic
    // When complete, call onImageGenerated
    const { checkJobStatus } = useImageJobStatus();
    
    const interval = setInterval(async () => {
      const status = await checkJobStatus(jobId);
      
      if (status.status === 'completed' && status.result) {
        clearInterval(interval);
        setGeneratingJobs(prev => {
          const next = new Map(prev);
          next.delete(index);
          return next;
        });
        
        if (onImageGenerated) {
          onImageGenerated(status.result.images[0], suggestion);
        }
      } else if (status.status === 'failed') {
        clearInterval(interval);
        setGeneratingJobs(prev => {
          const next = new Map(prev);
          next.delete(index);
          return next;
        });
      }
    }, 2000); // Poll every 2 seconds
  };

  if (generating && suggestions.length === 0) {
    return (
      <div className="image-suggestions-loading">
        <p>Analyzing content for image opportunities...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="image-suggestions-error">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="image-suggestions-panel">
      <h3>Image Suggestions</h3>
      <p className="text-sm text-gray-600">
        {suggestions.length} suggestions found ({suggestions.filter(s => s.placement.priority >= 4).length} recommended)
      </p>

      <div className="suggestions-list">
        {suggestions.map((suggestion, index) => {
          const isGenerating = generatingJobs.has(index);
          const isSelected = selectedSuggestions.has(index);

          return (
            <div
              key={index}
              className={`suggestion-card ${isSelected ? 'selected' : ''} ${
                suggestion.placement.priority >= 4 ? 'recommended' : ''
              }`}
            >
              <div className="suggestion-header">
                <div>
                  <h4 className="suggestion-type">{suggestion.image_type}</h4>
                  <p className="suggestion-section">
                    {suggestion.placement.section} (Priority: {suggestion.placement.priority}/5)
                  </p>
                </div>
                {suggestion.placement.priority >= 4 && (
                  <span className="recommended-badge">Recommended</span>
                )}
              </div>

              <div className="suggestion-details">
                <p className="suggestion-prompt">{suggestion.prompt}</p>
                <p className="suggestion-alt-text">
                  <strong>Alt Text:</strong> {suggestion.alt_text}
                </p>
                <div className="suggestion-meta">
                  <span>Style: {suggestion.style}</span>
                  <span>Aspect Ratio: {suggestion.aspect_ratio}</span>
                </div>
              </div>

              {suggestion.prompt_variations.length > 0 && (
                <details className="prompt-variations">
                  <summary>Prompt Variations ({suggestion.prompt_variations.length})</summary>
                  <ul>
                    {suggestion.prompt_variations.map((variation, vIndex) => (
                      <li key={vIndex}>{variation}</li>
                    ))}
                  </ul>
                </details>
              )}

              <div className="suggestion-actions">
                {!isSelected && (
                  <button
                    onClick={() => handleGenerateImage(suggestion, index)}
                    disabled={isGenerating}
                    className="btn-generate"
                  >
                    {isGenerating ? 'Generating...' : 'Generate Image'}
                  </button>
                )}
                {isSelected && !isGenerating && (
                  <span className="generated-badge">✓ Generated</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

---

### Step 3: Integrate into Blog Editor

```typescript
// components/BlogEditor.tsx
import React, { useState } from 'react';
import { ImageSuggestionsPanel } from './ImageSuggestionsPanel';
import { ImageInsertModal } from './ImageInsertModal'; // Your existing component

export const BlogEditor: React.FC = () => {
  const [blogContent, setBlogContent] = useState('');
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [showImageSuggestions, setShowImageSuggestions] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);

  const handleImageGenerated = (image: any, suggestion: any) => {
    // Add image to generated images list
    setGeneratedImages(prev => [...prev, { image, suggestion }]);
    
    // Optionally auto-insert into content
    insertImageIntoContent(image, suggestion);
  };

  const insertImageIntoContent = (image: any, suggestion: any) => {
    // Insert image markdown at suggested position
    const imageMarkdown = `![${suggestion.alt_text}](${image.image_url})`;
    
    // Insert at suggested position or after relevant section
    const position = suggestion.placement.position;
    const newContent = 
      blogContent.slice(0, position) + 
      `\n\n${imageMarkdown}\n\n` + 
      blogContent.slice(position);
    
    setBlogContent(newContent);
  };

  return (
    <div className="blog-editor">
      {/* Your existing editor UI */}
      
      {/* Image Suggestions Panel */}
      {blogContent && (
        <div className="image-suggestions-section">
          <button
            onClick={() => setShowImageSuggestions(!showImageSuggestions)}
            className="btn-toggle-suggestions"
          >
            {showImageSuggestions ? 'Hide' : 'Show'} Image Suggestions
          </button>

          {showImageSuggestions && (
            <ImageSuggestionsPanel
              blogContent={blogContent}
              topic={topic}
              keywords={keywords}
              tone="professional"
              onImageGenerated={handleImageGenerated}
            />
          )}
        </div>
      )}

      {/* Existing Image Insert Modal */}
      <ImageInsertModal
        blogTopic={topic}
        keywords={keywords}
        onImageSelect={(image) => {
          // Handle manual image selection
        }}
      />
    </div>
  );
};
```

---

### Step 4: Progressive Enhancement Workflow

```typescript
// hooks/useProgressiveImageGeneration.ts
import { useState, useCallback } from 'react';
import { useImageGeneration } from './useImageGeneration';

export const useProgressiveImageGeneration = () => {
  const { getImageSuggestions, generateImageFromContent } = useImageGeneration();
  const [backgroundJobs, setBackgroundJobs] = useState<Map<string, any>>(new Map());

  // Start background generation for recommended images
  const startBackgroundGeneration = useCallback(async (
    content: string,
    topic: string,
    keywords: string[]
  ) => {
    try {
      // Get suggestions
      const { suggestions } = await getImageSuggestions(content, topic, keywords);
      
      // Generate only recommended images (priority >= 4) in background
      const recommendedSuggestions = suggestions.filter(s => s.placement.priority >= 4);
      
      const jobs = new Map();
      
      for (const suggestion of recommendedSuggestions) {
        const jobId = await generateImageFromContent(
          content,
          topic,
          keywords,
          suggestion.image_type as any,
          'professional',
          suggestion.placement.section
        );
        
        jobs.set(suggestion.image_type, {
          jobId,
          suggestion,
          status: 'pending',
        });
      }
      
      setBackgroundJobs(jobs);
      
      // Poll for completion
      pollBackgroundJobs(jobs);
      
      return jobs;
    } catch (err) {
      console.error('Background generation failed:', err);
      return new Map();
    }
  }, [getImageSuggestions, generateImageFromContent]);

  const pollBackgroundJobs = async (jobs: Map<string, any>) => {
    // Poll each job until complete
    // Update backgroundJobs state as jobs complete
    // Notify when images are ready
  };

  return {
    backgroundJobs,
    startBackgroundGeneration,
  };
};
```

---

### Step 5: Batch Image Generation

```typescript
// hooks/useBatchImageGeneration.ts
import { useState, useCallback } from 'react';

export const useBatchImageGeneration = () => {
  const [batchJobs, setBatchJobs] = useState<string[]>([]);
  const [batchStatus, setBatchStatus] = useState<'idle' | 'generating' | 'completed'>('idle');

  const generateBatch = useCallback(async (
    suggestions: ImageSuggestion[]
  ) => {
    setBatchStatus('generating');
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-api-url.com';

    try {
      // Prepare batch request
      const images = suggestions.map(suggestion => ({
        prompt: suggestion.prompt,
        provider: 'stability_ai',
        style: suggestion.style,
        aspect_ratio: suggestion.aspect_ratio,
        quality: 'high',
        width: suggestion.aspect_ratio === '16:9' ? 1920 : 1200,
        height: suggestion.aspect_ratio === '16:9' ? 1080 : 900,
      }));

      const response = await fetch(`${API_BASE_URL}/api/v1/images/batch-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images,
          blog_id: 'your-blog-id', // optional
          workflow: 'standard', // or 'draft_then_final'
        }),
      });

      if (!response.ok) {
        throw new Error(`Batch generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      setBatchJobs(data.job_ids);
      
      return data.job_ids;
    } catch (err) {
      console.error('Batch generation failed:', err);
      setBatchStatus('idle');
      throw err;
    }
  }, []);

  return {
    batchJobs,
    batchStatus,
    generateBatch,
  };
};
```

---

## 🎨 CSS Styling

```css
/* components/ImageSuggestionsPanel.css */
.image-suggestions-panel {
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-top: 2rem;
}

.suggestions-list {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.suggestion-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.2s;
}

.suggestion-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.suggestion-card.recommended {
  border-color: #10b981;
  background: #f0fdf4;
}

.suggestion-card.selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.suggestion-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1rem;
}

.suggestion-type {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  text-transform: capitalize;
}

.suggestion-section {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.recommended-badge {
  background: #10b981;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.suggestion-prompt {
  color: #374151;
  margin-bottom: 0.75rem;
  line-height: 1.5;
}

.suggestion-alt-text {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.suggestion-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #9ca3af;
}

.prompt-variations {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.prompt-variations summary {
  cursor: pointer;
  color: #3b82f6;
  font-weight: 500;
}

.prompt-variations ul {
  margin-top: 0.5rem;
  padding-left: 1.5rem;
  list-style: disc;
}

.prompt-variations li {
  margin-top: 0.25rem;
  color: #6b7280;
}

.suggestion-actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.btn-generate {
  background: #3b82f6;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-generate:hover:not(:disabled) {
  background: #2563eb;
}

.btn-generate:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.generated-badge {
  color: #10b981;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
```

---

## 📋 Migration Checklist

- [ ] Update `useImageGeneration` hook with new methods
- [ ] Create `ImageSuggestionsPanel` component
- [ ] Integrate suggestions panel into blog editor
- [ ] Add progressive enhancement workflow
- [ ] Implement batch generation UI
- [ ] Add CSS styling for new components
- [ ] Test content-aware prompt generation
- [ ] Test image placement suggestions
- [ ] Test batch operations
- [ ] Update error handling
- [ ] Add loading states
- [ ] Add success notifications

---

## 🔍 API Reference

### POST `/api/v1/images/suggestions`

**Request:**
```typescript
{
  content: string;      // Blog content in markdown
  topic: string;         // Main topic
  keywords: string[];    // Related keywords
  tone?: string;         // Optional: "professional" | "casual" | "technical"
}
```

**Response:**
```typescript
{
  suggestions: Array<{
    image_type: "featured" | "section_header" | "infographic";
    style: string;
    aspect_ratio: string;
    prompt: string;
    prompt_variations: string[];
    alt_text: string;
    placement: {
      position: number;
      section: string;
      priority: number; // 1-5
    };
  }>;
  total_suggestions: number;
  recommended_count: number;
}
```

### POST `/api/v1/images/generate-from-content`

**Request:**
```typescript
{
  content: string;
  topic: string;
  keywords: string[];
  image_type: "featured" | "section_header" | "infographic";
  tone?: string;
  section_title?: string; // Optional, for section images
}
```

**Response:**
```typescript
{
  job_id: string;
  status: "pending";
}
```

---

## 🎯 Best Practices

1. **Progressive Enhancement**: Show content immediately, generate images in background
2. **User Control**: Let users select which suggestions to generate
3. **Priority Display**: Highlight recommended images (priority >= 4)
4. **Error Handling**: Show clear error messages for failed generations
5. **Loading States**: Show progress for each image generation
6. **Batch Operations**: Use batch endpoint for multiple images
7. **Caching**: Cache suggestions to avoid re-analyzing unchanged content
8. **Placement**: Use placement suggestions to auto-insert images

---

## 🐛 Troubleshooting

### Suggestions not loading
- Check that content is valid markdown
- Verify topic and keywords are provided
- Check API endpoint URL

### Images not generating
- Verify job_id is returned
- Check job status endpoint
- Ensure Stability AI API key is configured

### Placement issues
- Verify content structure (H1, H2 headings)
- Check position values are valid
- Ensure content hasn't changed since suggestions

---

## 📚 Additional Resources

- [Image Generation API Documentation](./IMAGE_GENERATION_GUIDE.md)
- [Frontend Integration Guide](./FRONTEND_IMAGE_INTEGRATION_GUIDE.md)
- [Multi-Phase Improvements](./MULTI_PHASE_IMPROVEMENTS_IMPLEMENTATION.md)

---

## 💡 Example Usage Flow

1. **User generates blog content** → Content is ready
2. **Frontend calls `/suggestions`** → Gets image placement suggestions
3. **User reviews suggestions** → Sees recommended images highlighted
4. **User selects images to generate** → Frontend calls `/generate-from-content`
5. **Images generate in background** → User can continue editing
6. **Images complete** → Auto-inserted at suggested positions
7. **User can manually adjust** → Move or replace images as needed

This workflow provides a seamless, content-aware image generation experience!

