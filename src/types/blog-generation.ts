/**
 * Type definitions for blog generation API responses
 * Shared between backend API routes and frontend components
 */

export interface ProgressUpdate {
  stage: string;
  stage_number: number;
  total_stages: number;
  progress_percentage: number;
  status: string;
  details?: string;
  metadata: Record<string, any>;
  timestamp: number;
}

export interface EnhancedBlogResponse {
  // Core content fields
  content: string;
  title: string;
  excerpt: string;
  
  // Progress tracking
  progress_updates: ProgressUpdate[];
  
  // SEO and quality metrics
  meta_title?: string;
  meta_description?: string;
  readability_score: number;
  seo_score: number;
  quality_score?: number | null;
  quality_dimensions?: Record<string, number>;
  
  // Stage results and costs
  stage_results?: Array<{
    stage: string;
    provider: string;
    tokens: number;
    cost: number;
  }>;
  total_tokens?: number;
  total_cost?: number;
  generation_time?: number;
  
  // Citations and sources
  citations?: Array<{
    text: string;
    url: string;
    title: string;
  }>;
  
  // Enhanced features data
  semantic_keywords?: string[];
  structured_data?: Record<string, any> | null;
  knowledge_graph?: Record<string, any> | null;
  seo_metadata?: Record<string, any>;
  content_metadata?: Record<string, any>;
  
  // Warnings and status
  warnings?: string[];
  success?: boolean;
  
  // Word count
  word_count: number;
  
  // Suggestions
  suggestions?: string[];
  
  // Quality scores (legacy)
  quality_scores?: any;
  
  // v1.3.1: Internal links (3-5 automatically generated)
  internal_links?: Array<{
    anchor_text: string;
    url: string;
  }>;
  
  // v1.3.1: Generated images (null when images generated separately)
  generated_images?: Array<{
    type: 'featured' | 'section' | 'product';
    image_url: string;
    alt_text: string;
  }> | null;
  
  // Image placeholders for frontend-triggered generation
  image_placeholders?: {
    featured_image: {
      prompt: string;
      style: string;
      aspect_ratio: string;
      quality: string;
      type: string;
      keywords: string[];
    };
    section_images: Array<{
      position: number;
      prompt: string;
      style: string;
      aspect_ratio: string;
      quality: string;
      type: string;
    }>;
  };
  
  // Featured image (null when images generated separately)
  featured_image?: {
    image_id: string;
    image_url?: string;
    image_data?: string | null;
    width: number;
    height: number;
    format: string;
    alt_text: string;
    quality_score?: number;
    safety_score?: number;
  } | null;
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Image generation status
  image_generation_status?: {
    featured_image: string;
    featured_image_url: string | null;
    section_images_count: number;
    section_images: Array<{
      position: number;
      url: string | null;
      status: string;
    }>;
  };
}

