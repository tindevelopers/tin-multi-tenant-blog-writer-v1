/**
 * Type definitions for blog generation API responses
 * Shared between backend API routes and frontend components
 * 
 * Version 1.4 - Supports:
 * - Multi-site Google Search Console (gsc_site_url)
 * - Quick Generate vs Multi-Phase modes
 * - Enhanced custom_instructions (5000 chars)
 */

// ============ Enums and Constants ============

/**
 * Blog generation mode
 * - quick_generate: Fast, cost-effective using DataForSEO (30-60s)
 * - multi_phase: Premium 12-stage pipeline with advanced features
 */
export type BlogGenerationMode = 'quick_generate' | 'multi_phase';

/**
 * Content tone options
 */
export type ContentTone = 
  | 'professional' 
  | 'casual' 
  | 'friendly' 
  | 'authoritative' 
  | 'conversational'
  | 'technical'
  | 'creative';

/**
 * Content length options
 */
export type ContentLength = 'short' | 'medium' | 'long' | 'extended';

/**
 * Research depth options
 */
export type ResearchDepth = 'basic' | 'standard' | 'comprehensive';

/**
 * All 28 supported blog content types
 */
export type BlogContentType =
  | 'custom'
  | 'brand'
  | 'top_10'
  | 'product_review'
  | 'how_to'
  | 'comparison'
  | 'guide'
  | 'tutorial'
  | 'listicle'
  | 'case_study'
  | 'news'
  | 'opinion'
  | 'interview'
  | 'faq'
  | 'checklist'
  | 'tips'
  | 'definition'
  | 'benefits'
  | 'problem_solution'
  | 'trend_analysis'
  | 'statistics'
  | 'resource_list'
  | 'timeline'
  | 'myth_busting'
  | 'best_practices'
  | 'getting_started'
  | 'advanced'
  | 'troubleshooting';

// ============ Request Types ============

/**
 * Enhanced blog generation request (v1.4)
 * Supports both Quick Generate and Multi-Phase modes
 */
export interface EnhancedBlogGenerationRequest {
  // Required fields
  topic: string;  // 3-200 characters
  keywords: string[];  // At least 1 keyword
  
  // Generation mode (v1.4)
  mode?: BlogGenerationMode;  // Default: "quick_generate"
  
  // Google Search Console (v1.4 - multi-site support)
  gsc_site_url?: string | null;  // Optional: Site-specific URL
  
  // Blog type (for quick_generate)
  blog_type?: BlogContentType;  // Default: "custom"
  
  // Content options
  tone?: ContentTone;  // Default: "professional"
  length?: ContentLength;  // Default: "medium"
  word_count_target?: number;  // Optional: 100-10000
  
  // Enhanced options (for multi_phase)
  use_google_search?: boolean;  // Default: true
  use_fact_checking?: boolean;  // Default: true
  use_citations?: boolean;  // Default: true (mandatory for multi_phase)
  use_serp_optimization?: boolean;  // Default: true
  
  // Phase 3 options (for multi_phase)
  use_consensus_generation?: boolean;  // Default: false
  use_knowledge_graph?: boolean;  // Default: true
  use_semantic_keywords?: boolean;  // Default: true
  use_quality_scoring?: boolean;  // Default: true
  
  // Additional context
  target_audience?: string | null;
  custom_instructions?: string | null;  // Max 5000 characters
  template_type?: string | null;
  
  // Product research (for product review/comparison)
  include_product_research?: boolean;  // Default: false
  include_brands?: boolean;  // Default: true
  include_models?: boolean;  // Default: true
  include_prices?: boolean;  // Default: false
  include_features?: boolean;  // Default: true
  include_reviews?: boolean;  // Default: true
  include_pros_cons?: boolean;  // Default: true
  
  // Content structure
  include_product_table?: boolean;  // Default: false
  include_comparison_section?: boolean;  // Default: true
  include_buying_guide?: boolean;  // Default: true
  include_faq_section?: boolean;  // Default: true
  
  // Research depth (v1.4)
  research_depth?: ResearchDepth;  // Default: "standard"
  
  // Local business fields
  location?: string;
  max_businesses?: number;
  max_reviews_per_business?: number;
  include_business_details?: boolean;
  include_review_sentiment?: boolean;
  
  // DataForSEO options
  use_dataforseo_content_generation?: boolean;  // Default: true
  use_openai_fallback?: boolean;  // Default: true
}

// ============ Response Types ============

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

// ============ Image Generation Types (v2.0) ============

/**
 * Image type options for content-aware generation
 */
export type ImageType = 'featured' | 'section_header' | 'infographic';

/**
 * Image style options
 */
export type ImageStyle = 
  | 'photographic'
  | 'digital_art'
  | 'painting'
  | 'sketch'
  | 'cartoon'
  | 'anime'
  | 'realistic'
  | 'abstract'
  | 'minimalist'
  | 'vintage'
  | 'cyberpunk'
  | 'fantasy'
  | 'sci_fi'
  | 'watercolor'
  | 'oil_painting';

/**
 * Image aspect ratio options
 */
export type ImageAspectRatio = '1:1' | '3:4' | '4:3' | '16:9' | '21:9' | '2:3' | 'custom';

/**
 * Image quality options
 */
export type ImageQuality = 'draft' | 'standard' | 'high' | 'ultra';

/**
 * Image placement suggestion
 */
export interface ImagePlacement {
  position: number;
  section: string;
  priority: number; // 1-5, higher is more important
}

/**
 * Single image suggestion from content analysis
 */
export interface ImageSuggestion {
  image_type: ImageType;
  style: ImageStyle;
  aspect_ratio: ImageAspectRatio;
  prompt: string;
  prompt_variations: string[];
  alt_text: string;
  placement: ImagePlacement;
}

/**
 * Response from /api/v1/images/suggestions endpoint
 */
export interface ImageSuggestionsResponse {
  suggestions: ImageSuggestion[];
  total_suggestions: number;
  recommended_count: number;
}

/**
 * Request for image suggestions
 */
export interface ImageSuggestionsRequest {
  content: string;
  topic: string;
  keywords: string[];
  tone?: ContentTone;
}

/**
 * Request for content-aware image generation
 */
export interface GenerateFromContentRequest {
  content: string;
  topic: string;
  keywords: string[];
  image_type: ImageType;
  tone?: ContentTone;
  section_title?: string;
}

/**
 * Response from content-aware image generation
 */
export interface GenerateFromContentResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * Single image in batch generation request
 */
export interface BatchImageRequest {
  prompt: string;
  provider?: 'stability_ai';
  style?: ImageStyle;
  aspect_ratio?: ImageAspectRatio;
  quality?: ImageQuality;
  width?: number;
  height?: number;
}

/**
 * Batch image generation request
 */
export interface BatchGenerateRequest {
  images: BatchImageRequest[];
  blog_id?: string;
  workflow?: 'standard' | 'draft_then_final';
}

/**
 * Batch image generation response
 */
export interface BatchGenerateResponse {
  job_ids: string[];
  status: 'pending';
}

/**
 * Generated image result
 */
export interface GeneratedImageResult {
  image_id: string;
  image_url?: string;
  image_data?: string;
  width: number;
  height: number;
  format: string;
  size_bytes?: number;
  seed?: number;
  steps?: number;
  guidance_scale?: number;
  created_at: string;
  expires_at?: string;
  quality_score?: number;
  safety_score?: number;
  provider: 'stability_ai';
  model?: string;
}

/**
 * Image job status response
 */
export interface ImageJobStatusResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress_percentage?: number;
  result?: {
    success: boolean;
    images: GeneratedImageResult[];
    generation_time_seconds?: number;
    provider?: string;
    model?: string;
    cost?: number;
    prompt_used?: string;
    error_message?: string;
  };
  error_message?: string;
}

