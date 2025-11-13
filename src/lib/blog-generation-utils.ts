/**
 * Blog Generation Utilities
 * Helper functions for generating blogs with custom instructions and quality features
 * Based on CLIENT_SIDE_PROMPT_GUIDE.md v1.3.0
 */

export type TemplateType = 
  | 'expert_authority' 
  | 'how_to_guide' 
  | 'comparison' 
  | 'case_study' 
  | 'news_update' 
  | 'tutorial' 
  | 'listicle' 
  | 'review';

export type ContentLength = 'short' | 'medium' | 'long' | 'very_long';

/**
 * Generate default custom instructions based on template type
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
 * Map word count to length category
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
 * Get recommended quality features based on quality level
 */
export function getQualityFeaturesForLevel(qualityLevel: string): {
  use_google_search: boolean;
  use_fact_checking: boolean;
  use_citations: boolean;
  use_serp_optimization: boolean;
  use_consensus_generation: boolean;
  use_knowledge_graph: boolean;
  use_semantic_keywords: boolean;
  use_quality_scoring: boolean;
} {
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
  const instructions = customInstructions || getDefaultCustomInstructions(templateType, true);

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

