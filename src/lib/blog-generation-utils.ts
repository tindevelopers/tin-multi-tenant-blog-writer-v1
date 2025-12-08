/**
 * Blog Generation Utilities
 * Helper functions for generating blogs with custom instructions and quality features
 * Based on CLIENT_SIDE_PROMPT_GUIDE.md v1.3.0
 */

import { getWordCountExpectation } from './word-count-expectations';

export type TemplateType = 
  | 'expert_authority' 
  | 'how_to_guide' 
  | 'comparison' 
  | 'case_study' 
  | 'news_update' 
  | 'tutorial' 
  | 'listicle' 
  | 'review';

export type ContentLength = 'short' | 'medium' | 'long' | 'very_long'; // UI type
export type APIContentLength = 'short' | 'medium' | 'long' | 'extended'; // API type

// Maximum character limit for custom_instructions field (API constraint)
// Backend supports up to 5000 characters for detailed instructions + site context
export const MAX_CUSTOM_INSTRUCTIONS_LENGTH = 5000;

/**
 * Generate default custom instructions based on template type
 * 
 * Note: Backend supports up to 5000 characters for detailed instructions + site context.
 */
export function getDefaultCustomInstructions(
  templateType?: TemplateType,
  includeAdvanced: boolean = true
): string {
  const baseInstructions = `
CRITICAL STRUCTURE REQUIREMENTS:

1. HEADING HIERARCHY (MANDATORY):
   - Start with exactly ONE H1: # [Title]
   - Use H2 (##) for main sections (minimum 4 sections)
   - Use H3 (###) for subsections
   - Ensure proper nesting: H1 > H2 > H3
   - Each H2 section must have 3-5 paragraphs

2. CONTENT FORMAT:
   - Introduction: 2-3 paragraphs after H1
   - Main sections: Each H2 with 3-5 paragraphs
   - Use bullet points and numbered lists
   - Keep paragraphs to 3-4 sentences
   - Add transitions between sections
   - Conclusion: H2 section summarizing key points

3. LINKING REQUIREMENTS:
   - Include 4-6 internal links: [descriptive text](/related-topic)
   - Include 3-4 external links: [source name](https://authoritative-url.com)
   - Links must be natural and contextual
   - Use descriptive anchor text (not "click here")
   - Place links within relevant paragraphs

4. IMAGE PLACEMENT:
   - Add image placeholder after H1: ![Featured image](image-url)
   - Add image placeholders before major H2 sections
   - Use descriptive alt text for SEO

5. WRITING QUALITY:
   - Use specific examples and real-world scenarios
   - Include actionable advice and step-by-step instructions
   - Add data points and statistics where relevant
   - Write for human readers first, SEO second
   - Use active voice and clear language
   - Avoid generic or vague statements

6. CONTENT DEPTH:
   - Provide unique insights, not just rehashed information
   - Include specific examples, case studies, or real-world applications
   - Cite sources naturally within the content
   - Demonstrate expertise and authority
   - Include current information from 2025 where relevant
  `;

  const templateSpecificInstructions: Record<TemplateType, string> = {
    expert_authority: `
TEMPLATE-SPECIFIC REQUIREMENTS (Expert Authority):
- Position content as authoritative expert opinion
- Include data-driven analysis and research findings
- Use professional terminology appropriate for the field
- Reference industry standards and best practices
- Provide expert recommendations based on experience
    `,
    how_to_guide: `
TEMPLATE-SPECIFIC REQUIREMENTS (How-To Guide):
- Provide clear step-by-step instructions
- List prerequisites or materials needed upfront
- Include troubleshooting tips for common issues
- Add visual cues (e.g., "Step 1:", "Next:", "Finally:")
- Include safety warnings where applicable
- Provide expected outcomes for each step
    `,
    comparison: `
TEMPLATE-SPECIFIC REQUIREMENTS (Comparison):
- Use structured comparison format (tables or side-by-side)
- List pros and cons for each option
- Provide clear recommendations with reasoning
- Include price, features, and use case comparisons
- Help readers make informed decisions
    `,
    case_study: `
TEMPLATE-SPECIFIC REQUIREMENTS (Case Study):
- Present real-world examples with specific details
- Include measurable results and data points
- Show before/after scenarios
- Provide actionable insights readers can apply
- Cite specific companies, products, or situations
    `,
    news_update: `
TEMPLATE-SPECIFIC REQUIREMENTS (News Update):
- Focus on recent developments (2024-2025)
- Include expert opinions and industry reactions
- Provide context and background information
- Explain implications for readers
- Link to original sources
    `,
    tutorial: `
TEMPLATE-SPECIFIC REQUIREMENTS (Tutorial):
- Define clear learning objectives upfront
- Break content into digestible sections
- Include practice exercises or examples
- Add progress checkpoints
- Provide resources for further learning
    `,
    listicle: `
TEMPLATE-SPECIFIC REQUIREMENTS (Listicle):
- Use numbered or bulleted format
- Each item should be substantial (not just a sentence)
- Include engaging headings for each item
- Provide detailed explanations for each point
- Maintain consistent format throughout
    `,
    review: `
TEMPLATE-SPECIFIC REQUIREMENTS (Review):
- Provide comprehensive evaluation
- Cover all important aspects (pros, cons, features)
- Include personal experience or testing results
- Give clear recommendations with context
- Compare with alternatives when relevant
    `,
  };

  if (templateType && templateSpecificInstructions[templateType]) {
    return baseInstructions + '\n' + templateSpecificInstructions[templateType];
  }

  return baseInstructions;
}

/**
 * Map word count to length category (UI-friendly)
 */
export function mapWordCountToLength(wordCount: number): ContentLength {
  if (wordCount >= 3000) {
    return 'very_long';
  } else if (wordCount >= 2000) {
    return 'long';
  } else if (wordCount >= 1000) {
    return 'medium';
  } else {
    return 'short';
  }
}

/**
 * Convert UI length type to API length type
 * API expects 'extended' instead of 'very_long'
 */
export function convertLengthToAPI(length: ContentLength): APIContentLength {
  if (length === 'very_long') {
    return 'extended';
  }
  return length as APIContentLength;
}

/**
 * Get recommended quality features based on quality level
 */
export interface QualityFeatureConfig {
  use_google_search: boolean;
  use_fact_checking: boolean;
  use_citations: boolean;
  use_serp_optimization: boolean;
  use_consensus_generation: boolean;
  use_knowledge_graph: boolean;
  use_semantic_keywords: boolean;
  use_quality_scoring: boolean;
}

export function getQualityFeaturesForLevel(qualityLevel: string): QualityFeatureConfig {
  const isPremium = qualityLevel === 'premium' || qualityLevel === 'enterprise';
  const isHigh = qualityLevel === 'high';

  return {
    use_google_search: isPremium || isHigh,
    use_fact_checking: isPremium || isHigh,
    use_citations: isPremium || isHigh,
    use_serp_optimization: isPremium || isHigh,
    use_consensus_generation: isPremium, // Best quality: GPT-4o + Claude
    use_knowledge_graph: isPremium,
    use_semantic_keywords: isPremium || isHigh,
    use_quality_scoring: isPremium || isHigh,
  };
}

const BLOG_TYPE_OPTIONS = [
  'custom',
  'brand',
  'top_10',
  'product_review',
  'how_to',
  'comparison',
  'guide',
  'tutorial',
  'listicle',
  'case_study',
  'news',
  'opinion',
  'interview',
  'faq',
  'checklist',
  'tips',
  'definition',
  'benefits',
  'problem_solution',
  'trend_analysis',
  'statistics',
  'resource_list',
  'timeline',
  'myth_busting',
  'best_practices',
  'getting_started',
  'advanced',
  'troubleshooting',
] as const;

type BlogTypeOption = typeof BLOG_TYPE_OPTIONS[number];

/**
 * Blog generation mode (v1.4)
 * - quick_generate: Fast, cost-effective using DataForSEO (30-60s)
 * - multi_phase: Premium 12-stage pipeline with advanced features
 */
export type BlogGenerationMode = 'quick_generate' | 'multi_phase';

/**
 * Research depth options (v1.4)
 */
export type ResearchDepth = 'basic' | 'standard' | 'comprehensive';

export interface EnhancedBlogRequestOptions {
  topic: string;
  keywords?: string[];
  targetAudience?: string;
  tone?: string;
  wordCount?: number;
  qualityLevel?: string;
  customInstructions?: string;
  templateType?: string;
  length?: ContentLength | APIContentLength | string | null;
  includeFAQ?: boolean;
  includeToc?: boolean;
  location?: string;
  featureOverrides?: Partial<QualityFeatureConfig>;
  extraFields?: Record<string, unknown>;
  
  // v1.4: Generation mode support
  mode?: BlogGenerationMode;  // Default: "quick_generate"
  
  // v1.4: Google Search Console multi-site support
  gscSiteUrl?: string | null;  // Site-specific GSC URL
  
  // v1.4: Research depth
  researchDepth?: ResearchDepth;  // Default: "standard"
}

function normalizeBlogType(templateType?: string): BlogTypeOption {
  if (!templateType) return 'custom';
  const normalized = templateType.toLowerCase() as BlogTypeOption;
  return BLOG_TYPE_OPTIONS.includes(normalized) ? normalized : 'custom';
}

function normalizeContentLength(
  length: ContentLength | APIContentLength | string | null | undefined,
  wordCount?: number
): ContentLength {
  if (length) {
    const normalized = length.toLowerCase();
    if (normalized === 'extended') return 'very_long';
    if (['short', 'medium', 'long', 'very_long'].includes(normalized)) {
      return normalized as ContentLength;
    }
  }
  return mapWordCountToLength(wordCount ?? 1500);
}

export function buildEnhancedBlogRequestPayload(
  options: EnhancedBlogRequestOptions
): Record<string, unknown> {
  const keywords = (options.keywords || [])
    .map(keyword => String(keyword).trim())
    .filter(Boolean);

  if (keywords.length === 0) {
    keywords.push(options.topic);
  }

  const normalizedLength = normalizeContentLength(options.length, options.wordCount);
  const apiLength = convertLengthToAPI(normalizedLength);
  const qualityLevel = options.qualityLevel || 'medium';
  const qualityFeatures: QualityFeatureConfig = {
    ...getQualityFeaturesForLevel(qualityLevel),
    ...(options.featureOverrides || {}),
  };

  const expectation = getWordCountExpectation(normalizedLength);
  const wordCountTarget =
    (options.wordCount && options.wordCount > 0 ? options.wordCount : undefined) ||
    expectation?.target ||
    1500;

  // v1.4: Determine default mode based on quality level
  // Premium/Enterprise quality levels default to multi_phase for best results
  const isPremiumQuality = qualityLevel === 'premium' || qualityLevel === 'enterprise';
  const defaultMode: BlogGenerationMode = isPremiumQuality ? 'multi_phase' : 'quick_generate';

  const payload: Record<string, unknown> = {
    blog_type: normalizeBlogType(options.templateType),
    topic: options.topic,
    keywords,
    target_audience: options.targetAudience || 'general',
    tone: (options.tone || 'professional'),
    length: apiLength,
    format: 'html',
    word_count_target: wordCountTarget,
    include_introduction: true,
    include_conclusion: true,
    include_faq: options.includeFAQ ?? false,
    include_toc: options.includeToc ?? false,
    use_dataforseo_content_generation: true,
    use_openai_fallback: true,
    ...qualityFeatures,
    
    // v1.4: Generation mode (defaults based on quality level)
    mode: options.mode || defaultMode,
    
    // v1.4: Research depth
    research_depth: options.researchDepth || 'standard',
  };

  // v1.4: Add GSC site URL if provided (multi-site support)
  if (options.gscSiteUrl) {
    payload.gsc_site_url = options.gscSiteUrl;
  }

  if (options.customInstructions) {
    // Enforce character limit to prevent API validation errors
    const instructions = options.customInstructions.length > MAX_CUSTOM_INSTRUCTIONS_LENGTH
      ? options.customInstructions.substring(0, MAX_CUSTOM_INSTRUCTIONS_LENGTH)
      : options.customInstructions;
    payload.custom_instructions = instructions;
  }

  if (options.location) {
    payload.location = options.location;
  }

  if (options.extraFields) {
    Object.assign(payload, options.extraFields);
  }

  return payload;
}

/**
 * Generate optimized blog generation request with all quality features
 */
export function createOptimizedBlogRequest(params: {
  topic: string;
  keywords: string[];
  qualityLevel?: string;
  templateType?: TemplateType;
  wordCount?: number;
  customInstructions?: string;
  targetAudience?: string;
  tone?: string;
}): Record<string, unknown> {
  const {
    topic,
    keywords,
    qualityLevel = 'medium',
    templateType,
    wordCount = 2000,
    customInstructions,
    targetAudience = 'general',
    tone = 'professional',
  } = params;

  const qualityFeatures = getQualityFeaturesForLevel(qualityLevel);
  const length = mapWordCountToLength(wordCount);
  let instructions = customInstructions || getDefaultCustomInstructions(templateType, true);
  
  // Ensure instructions don't exceed API limit
  if (instructions.length > MAX_CUSTOM_INSTRUCTIONS_LENGTH) {
    instructions = instructions.substring(0, MAX_CUSTOM_INSTRUCTIONS_LENGTH);
  }

  return {
    topic,
    keywords,
    target_audience: targetAudience,
    tone,
    word_count: wordCount,
    length,
    custom_instructions: instructions,
    template_type: templateType || 'expert_authority',
    ...qualityFeatures,
    content_format: 'html',
    include_formatting: true,
    include_images: true,
  };
}

