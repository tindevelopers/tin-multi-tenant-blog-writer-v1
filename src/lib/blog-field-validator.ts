/**
 * Blog Field Validator
 * Validates that all required fields for blog creation are present
 */

export interface BlogFieldValidationResult {
  isValid: boolean;
  missingRequired: string[];
  missingRecommended: string[];
  warnings: string[];
}

export interface BlogFieldData {
  title?: string;
  content?: string;
  excerpt?: string;
  slug?: string;
  featured_image?: string;
  featured_image_alt?: string;
  thumbnail_image?: string;
  thumbnail_image_alt?: string;
  author_name?: string;
  author_image?: string;
  author_bio?: string;
  seo_title?: string;
  meta_description?: string;
  published_at?: string;
  locale?: string;
  is_featured?: boolean;
  read_time?: number;
  word_count?: number;
  [key: string]: unknown;
}

const REQUIRED_FIELDS = ['title', 'content'] as const;
const RECOMMENDED_FIELDS = ['excerpt', 'featured_image', 'author_name', 'meta_description'] as const;

/**
 * Validates blog field data
 */
export function validateBlogFields(data: BlogFieldData): BlogFieldValidationResult {
  const missingRequired: string[] = [];
  const missingRecommended: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!data[field] || String(data[field]).trim().length === 0) {
      missingRequired.push(field);
    }
  }

  // Check recommended fields
  for (const field of RECOMMENDED_FIELDS) {
    if (!data[field] || String(data[field]).trim().length === 0) {
      missingRecommended.push(field);
    }
  }

  // Generate warnings
  if (!data.slug && data.title) {
    warnings.push('Slug will be auto-generated from title');
  }

  if (data.featured_image && !data.featured_image_alt) {
    warnings.push('Featured image is missing alt text (accessibility concern)');
  }

  if (data.thumbnail_image && !data.thumbnail_image_alt) {
    warnings.push('Thumbnail image is missing alt text (accessibility concern)');
  }

  if (!data.locale) {
    warnings.push('Locale not specified, defaulting to "en"');
  }

  if (data.word_count && !data.read_time) {
    warnings.push('Read time can be calculated from word count');
  }

  return {
    isValid: missingRequired.length === 0,
    missingRequired,
    missingRecommended,
    warnings,
  };
}

/**
 * Generates a slug from a title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Calculates read time from word count
 * Assumes average reading speed of 200 words per minute
 */
export function calculateReadTime(wordCount: number): number {
  const wordsPerMinute = 200;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Extracts all blog fields from various data sources
 */
export function extractBlogFields(data: {
  title?: string;
  content?: string;
  excerpt?: string;
  metadata?: Record<string, unknown>;
  seo_data?: Record<string, unknown>;
  featured_image?: {
    image_url?: string;
    alt_text?: string;
  };
  word_count?: number;
}): BlogFieldData {
  const fields: BlogFieldData = {
    title: data.title,
    content: data.content,
    excerpt: data.excerpt,
    word_count: data.word_count,
  };

  // Extract from metadata
  if (data.metadata) {
    fields.slug = data.metadata.slug as string | undefined;
    fields.featured_image = data.metadata.featured_image as string | undefined;
    fields.featured_image_alt = data.metadata.featured_image_alt as string | undefined;
    fields.thumbnail_image = data.metadata.thumbnail_image as string | undefined;
    fields.thumbnail_image_alt = data.metadata.thumbnail_image_alt as string | undefined;
    fields.author_name = data.metadata.author_name as string | undefined;
    fields.author_image = data.metadata.author_image as string | undefined;
    fields.author_bio = data.metadata.author_bio as string | undefined;
    fields.locale = (data.metadata.locale as string | undefined) || 'en';
    fields.is_featured = data.metadata.is_featured as boolean | undefined;
    fields.read_time = data.metadata.read_time as number | undefined;
    fields.published_at = data.metadata.published_at as string | undefined;
  }

  // Extract from seo_data
  if (data.seo_data) {
    fields.seo_title = data.seo_data.meta_title as string | undefined;
    fields.meta_description = data.seo_data.meta_description as string | undefined;
  }

  // Extract from featured_image object
  if (data.featured_image) {
    fields.featured_image = data.featured_image.image_url;
    fields.featured_image_alt = data.featured_image.alt_text;
  }

  // Calculate read_time if word_count is available
  if (data.word_count && !fields.read_time) {
    fields.read_time = calculateReadTime(data.word_count);
  }

  // Generate slug if not provided
  if (!fields.slug && data.title) {
    fields.slug = generateSlug(data.title);
  }

  return fields;
}

