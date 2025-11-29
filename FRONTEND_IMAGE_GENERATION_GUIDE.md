# Frontend Image Generation Integration Guide

**Date:** 2025-01-XX  
**Status:** ✅ Image generation removed from blog endpoint, now separate endpoint

---

## 🎯 Overview

Image generation has been **removed** from the blog generation endpoint (`/api/v1/blog/generate-enhanced`) to improve performance and reduce complexity. Images should now be generated separately using the dedicated image generation endpoint.

**Benefits:**
- ✅ Faster blog generation (2-3 minutes instead of 4+ minutes)
- ✅ Non-blocking image generation
- ✅ Better error handling (blog generation doesn't fail if images fail)
- ✅ More flexible (generate images on-demand, retry failed images, etc.)

---

## 📋 Changes Summary

### What Changed

1. **Blog Endpoint (`/api/v1/blog/generate-enhanced`)**
   - ❌ No longer generates images automatically
   - ✅ Returns `generated_images: null` in response
   - ✅ Returns `warnings: []` (no image warnings)
   - ✅ Completes faster (no image generation delay)

2. **New Image Endpoint (`/api/v1/images/generate`)**
   - ✅ Dedicated endpoint for image generation
   - ✅ Can be called independently
   - ✅ Supports multiple images in parallel
   - ✅ Better error handling

---

## 🚀 Implementation Guide

### Step 1: Generate Blog (No Images)

```typescript
// Generate blog content first
const blogResponse = await fetch('/api/v1/blog/generate-enhanced', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic: 'Best Notary Services in California',
    keywords: ['notary services california'],
    tone: 'professional',
    length: 'medium',
    use_google_search: true,
    // ... other options
  })
});

const blog = await blogResponse.json();

// Blog is now ready (no images included)
console.log(blog.content); // Markdown content
console.log(blog.generated_images); // null
```

### Step 2: Generate Images Separately

After blog generation completes, generate images:

```typescript
// Generate featured image
const featuredImageResponse = await fetch('/api/v1/images/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: `Professional product photography: ${blog.title}. High quality, clean background, professional lighting`,
    style: 'photographic',
    aspect_ratio: '16:9',
    quality: 'high',
    provider: 'stability_ai'
  })
});

const featuredImage = await featuredImageResponse.json();

if (featuredImage.success && featuredImage.images.length > 0) {
  const imageUrl = featuredImage.images[0].image_url || 
                   `data:image/png;base64,${featuredImage.images[0].image_data}`;
  
  // Use imageUrl in your UI
  console.log('Featured image:', imageUrl);
}
```

### Step 3: Generate Multiple Images (Parallel)

For product blogs, you may want multiple images:

```typescript
// Generate images in parallel
const imagePromises = [
  // Featured image
  fetch('/api/v1/images/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: `Professional product photography: ${blog.title}. High quality, clean background`,
      style: 'photographic',
      aspect_ratio: '16:9',
      quality: 'high'
    })
  }),
  
  // Section images (if needed)
  ...blog.brand_recommendations?.slice(0, 3).map(brand => 
    fetch('/api/v1/images/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Professional product image: ${brand} ${blog.keywords[0]}. Clean, professional style`,
        style: 'photographic',
        aspect_ratio: '4:3',
        quality: 'standard'
      })
    })
  ) || []
];

const imageResponses = await Promise.all(imagePromises);
const images = await Promise.all(imageResponses.map(r => r.json()));

// Process successful images
const successfulImages = images
  .filter(img => img.success && img.images.length > 0)
  .map(img => ({
    url: img.images[0].image_url || `data:image/png;base64,${img.images[0].image_data}`,
    alt: img.prompt_used
  }));
```

---

## 📝 API Reference

### Image Generation Endpoint

**Endpoint:** `POST /api/v1/images/generate`

**Request Body:**
```typescript
{
  prompt: string;                    // Required: Image description (3-1000 chars)
  provider?: 'stability_ai';         // Optional: Defaults to 'stability_ai'
  style?: 'photographic' |           // Optional: Image style
         'digital_art' |
         'painting' |
         'sketch' |
         'cartoon' |
         'anime' |
         'realistic' |
         'abstract' |
         'minimalist' |
         'vintage' |
         'cyberpunk' |
         'fantasy' |
         'sci_fi' |
         'watercolor' |
         'oil_painting';
  aspect_ratio?: '1:1' |            // Optional: Defaults to '1:1'
            '3:4' |
            '4:3' |
            '16:9' |
            '21:9' |
            '2:3' |
            'custom';
  quality?: 'draft' |                // Optional: Defaults to 'standard'
          'standard' |
          'high' |
          'ultra';
  negative_prompt?: string;         // Optional: What to avoid (max 500 chars)
  seed?: number;                     // Optional: For reproducible results
  steps?: number;                    // Optional: 10-150 generation steps
  guidance_scale?: number;           // Optional: 1.0-20.0 prompt adherence
  width?: number;                    // Optional: Custom width (64-2048px)
  height?: number;                   // Optional: Custom height (64-2048px)
}
```

**Response:**
```typescript
{
  success: boolean;
  images: Array<{
    image_id: string;
    image_url?: string;              // URL if available
    image_data?: string;              // Base64 if URL not available
    width: number;
    height: number;
    format: string;
    size_bytes?: number;
  }>;
  generation_time_seconds: number;
  provider: 'stability_ai';
  model?: string;
  cost?: number;
  credits_used?: number;
  request_id?: string;
  prompt_used: string;
  error_message?: string;
  error_code?: string;
  provider_metadata?: object;
}
```

---

## 💡 Best Practices

### 1. Generate Images After Blog Content

```typescript
// ✅ Good: Generate blog first, then images
const blog = await generateBlog(request);
const images = await generateImages(blog);

// ❌ Bad: Don't wait for images before showing blog
const blog = await generateBlog(request);
await generateImages(blog); // Blocks UI
```

### 2. Handle Image Failures Gracefully

```typescript
try {
  const imageResponse = await fetch('/api/v1/images/generate', {...});
  const image = await imageResponse.json();
  
  if (!image.success) {
    console.warn('Image generation failed:', image.error_message);
    // Show placeholder or skip image
    return null;
  }
  
  return image.images[0];
} catch (error) {
  console.error('Image generation error:', error);
  // Show placeholder or skip image
  return null;
}
```

### 3. Use Parallel Generation for Multiple Images

```typescript
// ✅ Good: Generate all images in parallel
const images = await Promise.all([
  generateFeaturedImage(blog),
  generateSectionImage1(blog),
  generateSectionImage2(blog)
]);

// ❌ Bad: Sequential generation (slower)
const image1 = await generateFeaturedImage(blog);
const image2 = await generateSectionImage1(blog);
const image3 = await generateSectionImage2(blog);
```

### 4. Cache Images

```typescript
// Cache generated images to avoid regenerating
const imageCache = new Map<string, string>();

async function getOrGenerateImage(prompt: string): Promise<string> {
  if (imageCache.has(prompt)) {
    return imageCache.get(prompt)!;
  }
  
  const response = await fetch('/api/v1/images/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt })
  });
  
  const result = await response.json();
  const imageUrl = result.images[0]?.image_url;
  
  if (imageUrl) {
    imageCache.set(prompt, imageUrl);
  }
  
  return imageUrl;
}
```

### 5. Show Loading States

```typescript
// Show blog content immediately
setBlogContent(blog.content);
setLoadingImages(true);

// Generate images in background
generateImages(blog).then(images => {
  setImages(images);
  setLoadingImages(false);
});
```

---

## 🔄 Migration Checklist

- [ ] Update blog generation code to handle `generated_images: null`
- [ ] Remove code that expects images from blog endpoint
- [ ] Add image generation endpoint calls after blog generation
- [ ] Update UI to show blog content immediately (don't wait for images)
- [ ] Add loading states for image generation
- [ ] Handle image generation failures gracefully
- [ ] Test with and without images
- [ ] Update error handling for image generation

---

## 📊 Example: Complete Flow

```typescript
async function generateBlogWithImages(request: BlogRequest) {
  // Step 1: Generate blog content
  const blogResponse = await fetch('/api/v1/blog/generate-enhanced', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  
  if (!blogResponse.ok) {
    throw new Error('Blog generation failed');
  }
  
  const blog = await blogResponse.json();
  
  // Step 2: Show blog content immediately
  displayBlogContent(blog);
  
  // Step 3: Generate images in background
  const imagePromises = [];
  
  // Featured image
  if (shouldGenerateFeaturedImage(blog)) {
    imagePromises.push(
      generateImage({
        prompt: `Professional product photography: ${blog.title}. High quality, clean background`,
        style: 'photographic',
        aspect_ratio: '16:9',
        quality: 'high'
      })
    );
  }
  
  // Section images
  if (blog.brand_recommendations) {
    blog.brand_recommendations.slice(0, 3).forEach(brand => {
      imagePromises.push(
        generateImage({
          prompt: `Professional product image: ${brand} ${request.keywords[0]}`,
          style: 'photographic',
          aspect_ratio: '4:3',
          quality: 'standard'
        })
      );
    });
  }
  
  // Step 4: Process images as they complete
  Promise.allSettled(imagePromises).then(results => {
    const images = results
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .map(r => r.value.images[0]);
    
    // Insert images into blog content
    insertImagesIntoContent(blog.content, images);
  });
  
  return blog;
}

async function generateImage(request: ImageRequest) {
  const response = await fetch('/api/v1/images/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  
  if (!response.ok) {
    return { success: false, error_message: 'Request failed' };
  }
  
  return await response.json();
}
```

---

## 🐛 Error Handling

### Image Generation Errors

```typescript
const imageResponse = await fetch('/api/v1/images/generate', {...});

if (!imageResponse.ok) {
  // Handle HTTP errors
  const error = await imageResponse.json();
  console.error('Image generation failed:', error.detail);
  return null;
}

const image = await imageResponse.json();

if (!image.success) {
  // Handle API errors
  console.error('Image generation failed:', image.error_message);
  return null;
}

if (!image.images || image.images.length === 0) {
  // Handle empty results
  console.warn('No images generated');
  return null;
}

return image.images[0];
```

### Common Error Codes

- `503`: No image providers configured (check `STABILITY_AI_API_KEY`)
- `500`: Image generation failed (provider error)
- `400`: Invalid request (check prompt length, parameters)

---

## 📚 Additional Resources

- **Image Generation API Docs:** See `IMAGE_GENERATION_GUIDE.md`
- **Blog Generation API:** See `FRONTEND_ENHANCED_STREAMING_GUIDE.md`
- **API Base URL:** Check environment variable `NEXT_PUBLIC_API_URL` or similar

---

## ✅ Summary

1. **Blog endpoint no longer generates images** - Returns `generated_images: null`
2. **Use `/api/v1/images/generate`** - Separate endpoint for image generation
3. **Generate images after blog** - Don't block blog display on images
4. **Handle failures gracefully** - Images are optional, blog content is not
5. **Use parallel generation** - Generate multiple images simultaneously

---

**Questions?** Contact the backend team or check the API documentation.

