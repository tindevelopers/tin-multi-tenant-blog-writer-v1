/**
 * Image Generation Service
 * Handles image generation using Stability.ai via Blog Writer API
 */

const API_BASE_URL = process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-613248238610.europe-west1.run.app';
const API_KEY = process.env.BLOG_WRITER_API_KEY;

// TypeScript Types
export interface ImageGenerationRequest {
  prompt: string;                    // Required: 3-1000 characters
  provider?: 'stability_ai';         // Optional: defaults to stability_ai
  style?: ImageStyle;                 // Optional: photographic, digital_art, etc.
  aspect_ratio?: ImageAspectRatio;    // Optional: 1:1, 16:9, 4:3, etc.
  quality?: ImageQuality;             // Optional: draft, standard, high, ultra
  negative_prompt?: string;            // Optional: what to avoid
  seed?: number;                      // Optional: for reproducible results
  steps?: number;                      // Optional: 10-150 (default: 30)
  guidance_scale?: number;             // Optional: 1.0-20.0 (default: 7.0)
  width?: number;                      // Optional: 64-2048
  height?: number;                     // Optional: 64-2048
  tags?: string[];                     // Optional: for categorization
}

export interface ImageGenerationResponse {
  success: boolean;
  images: GeneratedImage[];
  generation_time_seconds: number;
  provider: 'stability_ai';
  model: string;
  cost: number;
  request_id?: string;
  prompt_used: string;
  error_message?: string;
}

export interface GeneratedImage {
  image_id: string;
  image_url?: string;                 // URL to access the image
  image_data?: string;                // Base64 encoded image
  width: number;
  height: number;
  format: string;                      // png, jpeg, etc.
  size_bytes?: number;
  seed?: number;
  steps?: number;
  guidance_scale?: number;
  created_at: string;
  expires_at?: string;
  quality_score?: number;              // 0-1
  safety_score?: number;               // 0-1
  provider: 'stability_ai';
  model?: string;
}

export type ImageStyle = 
  | 'photographic' | 'digital_art' | 'painting' | 'sketch' 
  | 'cartoon' | 'anime' | 'realistic' | 'abstract' 
  | 'minimalist' | 'vintage' | 'cyberpunk' | 'fantasy' 
  | 'sci_fi' | 'watercolor' | 'oil_painting';

export type ImageAspectRatio = 
  | '1:1' | '3:4' | '4:3' | '16:9' | '21:9' | '2:3' | 'custom';

export type ImageQuality = 'draft' | 'standard' | 'high' | 'ultra';

class BlogImageGenerator {
  private apiUrl: string;
  private apiKey: string;
  private useLocalRoute: boolean;

  constructor(apiUrl: string = API_BASE_URL, apiKey: string = API_KEY || '', useLocalRoute: boolean = false) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    // Use local API route on client-side to avoid CORS, direct URL on server-side
    this.useLocalRoute = useLocalRoute || (typeof window !== 'undefined');
  }

  /**
   * Generate an image from a text prompt
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    try {
      // Use local API route on client-side, direct URL on server-side
      const endpoint = this.useLocalRoute 
        ? '/api/images/generate'
        : `${this.apiUrl}/api/v1/images/generate`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Only add Authorization header when calling Cloud Run directly (server-side)
          ...(!this.useLocalRoute && this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        },
        body: JSON.stringify({
          provider: 'stability_ai',
          ...request
        }),
        signal: AbortSignal.timeout(60000), // 60 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        let error: any;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { detail: errorText || response.statusText };
        }
        
        const errorMessage = error.detail || error.error || error.message || `Image generation failed: ${response.statusText}`;
        console.error('❌ Image generation API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          endpoint: endpoint,
          hasApiKey: !!this.apiKey
        });
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Image generation API response:', {
        success: result.success,
        imagesCount: result.images?.length || 0,
        provider: result.provider,
        hasError: !!result.error_message
      });
      return result;
    } catch (error) {
      console.error('❌ Image generation error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        endpoint: this.useLocalRoute ? '/api/images/generate' : `${this.apiUrl}/api/v1/images/generate`
      });
      throw error;
    }
  }

  /**
   * Generate a featured image for a blog post
   */
  async generateFeaturedImage(
    topic: string,
    keywords: string[] = [],
    options: Partial<ImageGenerationRequest> = {}
  ): Promise<GeneratedImage | null> {
    try {
      // Build prompt from topic and keywords
      const keywordText = keywords.length > 0 
        ? ` featuring ${keywords.slice(0, 3).join(', ')}` 
        : '';
      const prompt = `Professional blog post featured image: ${topic}${keywordText}, high quality, modern design, clean background`;

      const response = await this.generateImage({
        prompt,
        style: 'photographic',
        aspect_ratio: '16:9',
        quality: 'high',
        width: 1920,
        height: 1080,
        negative_prompt: 'blurry, low quality, watermark, text overlay, logo',
        ...options
      });

      if (!response.success || response.images.length === 0) {
        console.warn('Image generation returned no images:', response.error_message);
        return null;
      }

      return response.images[0];
    } catch (error) {
      console.error('Failed to generate featured image:', error);
      // Don't throw - return null so blog generation can continue without image
      return null;
    }
  }

  /**
   * Generate image with retry logic
   */
  async generateImageWithRetry(
    request: ImageGenerationRequest,
    maxRetries: number = 2
  ): Promise<GeneratedImage | null> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.generateImage(request);
        if (response.success && response.images.length > 0) {
          return response.images[0];
        }
        throw new Error(response.error_message || 'Image generation failed');
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.message.includes('content policy') || 
              error.message.includes('401') || 
              error.message.includes('unauthorized')) {
            break; // Don't retry
          }
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    console.warn('Image generation failed after retries:', lastError?.message);
    return null;
  }
}

// Export singleton instance (for client-side usage - uses local API route)
// Server-side code should create its own instance with useLocalRoute=false
export const imageGenerator = new BlogImageGenerator(
  API_BASE_URL,
  API_KEY || '',
  typeof window !== 'undefined' // Use local route on client-side
);

// Export class for custom instances
export default BlogImageGenerator;

