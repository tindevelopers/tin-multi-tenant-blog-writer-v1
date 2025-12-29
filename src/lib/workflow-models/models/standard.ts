/**
 * Standard Workflow Model
 * 
 * Fast single-step content generation for low/medium/high quality levels.
 * Optimized for speed while maintaining good quality.
 */

import { WorkflowModel } from '../types';

/**
 * Standard Workflow Model
 * Single-step generation that produces a complete blog post in one LLM call
 */
export const standardWorkflowModel: WorkflowModel = {
  id: 'standard',
  name: 'Standard Content Workflow',
  description: 'Fast single-step content generation for efficient blog production',
  version: '1.0.0',

  // Used for low, medium, and high quality levels
  qualityLevels: ['low', 'medium', 'high'],

  phases: [
    {
      id: 'generate',
      name: 'Content Generation',
      description: 'Generate complete blog post in one step',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4000,
      
      systemPrompt: `You are an expert blog writer with deep knowledge across many industries. 
Your writing is clear, engaging, and optimized for both readers and search engines.
Always produce well-structured content with proper markdown formatting.`,

      promptTemplate: `Generate a comprehensive, original blog post about: {{topic}}

**Target Specifications:**
- Keywords: {{keywords}}
- Target Audience: {{targetAudience}}
- Tone: {{tone}}
- Word Count: approximately {{wordCount}} words

**Content Requirements:**
1. Start with an engaging introduction that hooks the reader
2. Use clear H2 headings for main sections (at least 3-4 sections)
3. Include H3 subheadings where appropriate
4. Add bullet points and numbered lists for scannable content
5. End with a strong conclusion and call-to-action

**SEO Guidelines:**
- Include the primary keyword naturally in the first paragraph
- Use keywords throughout but avoid keyword stuffing
- Write meta-friendly opening paragraph

{{customInstructions}}

**Output Format:**
- Use proper Markdown formatting
- NO meta-commentary or explanations
- NO "Here's the blog post" introductions
- Start directly with the content`,

      requiredInputs: ['topic', 'keywords', 'targetAudience', 'tone', 'wordCount'],
      outputs: ['content'],
      retryOnFailure: true,
      maxRetries: 2,
      timeout: 60000,
    },
  ],

  postProcessing: [
    {
      id: 'images',
      name: 'Image Generation',
      type: 'image_generation',
      enabled: true,
      config: { 
        generateFeatured: true, 
        generateContent: false 
      },
    },
    {
      id: 'seo',
      name: 'SEO Enhancement',
      type: 'seo_enhancement',
      enabled: true,
    },
  ],

  rules: {
    linkDistribution: {
      internalLinks: { min: 4, max: 6 },
      externalLinks: { min: 3, max: 4 },
      maxLinksPerSection: 2,
      noConsecutiveLinks: false,
    },
    structure: {
      minH2Sections: 3,
      maxH2Sections: 6,
      paragraphsPerSection: { min: 2, max: 4 },
      introductionParagraphs: { min: 1, max: 2 },
      conclusionWordCount: { min: 100, max: 200 },
    },
    content: {
      useAbsoluteUrls: true,
      includeComparisonChart: false,
      actionableTakeaways: { min: 0, max: 3 },
    },
  },

  author: 'TIN System',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

