/**
 * Premium Workflow Model
 * 
 * Structured 7-phase workflow for high-quality blog posts.
 * Used for premium and enterprise quality levels.
 * 
 * Phases:
 * 1. Pre-Generation Analysis - Analyze site for interlinking opportunities
 * 2. Introduction Generation - Hook the reader with engaging intro
 * 3. Outline Generation - Create detailed H2/H3 structure
 * 4. Body Generation - Generate main content with integrated links
 * 5. Conclusion Generation - Actionable conclusion with takeaways
 * 6. Content Assembly - Combine all parts with formatting
 */

import { WorkflowModel } from '../types';

/**
 * Premium Workflow Model
 * Multi-phase structured content generation for highest quality
 */
export const premiumWorkflowModel: WorkflowModel = {
  id: 'premium',
  name: 'Premium Content Workflow',
  description: 'Structured 7-phase workflow for high-quality blog posts',
  version: '1.0.0',

  // Used for premium and enterprise quality levels
  qualityLevels: ['premium', 'enterprise'],

  phases: [
    // Phase 1: Pre-Generation Analysis
    {
      id: 'pre_analysis',
      name: 'Pre-Generation Analysis',
      description: 'Analyze site context and identify interlinking opportunities',
      model: 'gpt-4o',
      temperature: 0.3,
      maxTokens: 2000,
      
      systemPrompt: `You are an SEO expert analyzing website content for internal linking opportunities.
Your goal is to identify high-value linking opportunities that will improve both user experience and SEO.`,

      promptTemplate: `Analyze the following context and identify 8-12 high-value internal linking opportunities for a blog post about "{{topic}}".

**Website Context:**
{{siteContext}}

**Target Keywords:** {{keywords}}
**Target Audience:** {{targetAudience}}

For each link opportunity, provide:
1. Target URL (use the exact URLs from the context, or create logical paths)
2. Suggested anchor text (2-5 words, natural language)
3. Relevance score (1-10)
4. Recommended section placement (introduction, section 1-6, conclusion)
5. Brief rationale (why this link adds value)

**Output Format:**
Return as a JSON array:
[
  {
    "url": "https://example.com/page",
    "anchorText": "suggested anchor text",
    "relevanceScore": 8,
    "placement": "section 2",
    "rationale": "Provides deeper context on..."
  }
]

If no site context is available, suggest logical internal link topics based on the blog topic.`,

      requiredInputs: ['topic', 'keywords'],
      outputs: ['linkOpportunities'],
      retryOnFailure: true,
      maxRetries: 2,
      timeout: 30000,
    },

    // Phase 2: Introduction Generation
    {
      id: 'introduction',
      name: 'Introduction Generation',
      description: 'Generate engaging introduction with hook',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 800,
      
      systemPrompt: `You are an expert blog writer who specializes in creating captivating introductions.
Your introductions hook readers immediately and set up the value they'll receive.`,

      promptTemplate: `Write an engaging introduction for a blog post about: {{topic}}

**Content Parameters:**
- Primary Keyword: {{primaryKeyword}}
- Target Audience: {{targetAudience}}
- Tone: {{tone}}
- Article Goal: {{articleGoal}}

**Introduction Requirements:**
1. **Hook** (first sentence/paragraph): Start with a surprising fact, compelling question, or bold statement that grabs attention
2. **Context** (second paragraph): Explain why this topic matters and how it benefits the reader
3. **Transition** (third paragraph): Preview what the article will cover and transition to the body

**Guidelines:**
- Use keywords naturally but sparingly (max 2-3 mentions)
- Keep paragraphs short (2-3 sentences each)
- Write 2-3 paragraphs total
- Create a sense of urgency or curiosity

**Example Hook Styles:**
- Question: "What if you could..."
- Statistic: "85% of businesses..."
- Bold claim: "The traditional approach is dead."
- Story: "When [scenario], everything changed..."

**Output:** Markdown format, NO commentary or explanations. Start directly with the introduction.`,

      requiredInputs: ['topic', 'primaryKeyword', 'targetAudience', 'tone', 'articleGoal'],
      outputs: ['introduction'],
      retryOnFailure: true,
      maxRetries: 2,
      timeout: 30000,
    },

    // Phase 3: Outline Generation
    {
      id: 'outline',
      name: 'Outline Generation',
      description: 'Create detailed H2/H3 structure',
      model: 'gpt-4o',
      temperature: 0.5,
      maxTokens: 1500,
      
      systemPrompt: `You are a content strategist who creates detailed, SEO-optimized blog outlines.
Your outlines ensure comprehensive coverage while maintaining logical flow.`,

      promptTemplate: `Create a detailed outline for a blog post:

**Title:** {{topic}}
**Introduction (already written):** 
{{introduction}}

**Target Specifications:**
- Primary Keyword: {{primaryKeyword}}
- Secondary Keywords: {{secondaryKeywords}}
- Target Audience: {{targetAudience}}
- Word Count Target: {{wordCount}} words

**Internal Link Opportunities to Include:**
{{linkOpportunities}}

**Outline Requirements:**
1. Create 4-6 H2 sections (main topics)
2. Include 1-3 H3 subsections per H2 where appropriate
3. Brief description (1-2 sentences) of content for each section
4. Mark where internal links should be placed: [LINK: anchor text → url]
5. Each section should flow logically to the next

**Structure:**
## H2 Section Title
Brief description of what this section covers.
[LINK: suggested anchor → url]

### H3 Subsection (if needed)
Brief description.

**Output:** Markdown outline format. NO commentary.`,

      requiredInputs: ['topic', 'introduction', 'primaryKeyword', 'secondaryKeywords', 'targetAudience', 'wordCount', 'linkOpportunities'],
      outputs: ['outline'],
      retryOnFailure: true,
      maxRetries: 2,
      timeout: 30000,
    },

    // Phase 4: Body Generation
    {
      id: 'body',
      name: 'Body Generation',
      description: 'Generate main content with integrated links',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4000,
      
      systemPrompt: `You are an expert content writer who creates engaging, well-researched blog content.
Your writing is clear, authoritative, and provides genuine value to readers.
You integrate links naturally without disrupting reading flow.`,

      promptTemplate: `Write the main body content for: {{topic}}

**Follow this EXACT outline:**
{{outline}}

**MANDATORY Link Integration:**
Integrate the following internal links naturally into the content:
{{linkOpportunities}}

**Link Distribution Rules (CRITICAL):**
- Maximum 1 link per H2 section (max 2 in sections with 8+ paragraphs)
- NEVER place 2+ links in the same paragraph
- NEVER place links in consecutive paragraphs
- NEVER cluster all links in one section
- Use exact anchor text provided, but ensure grammatical fit
- Links should add value, not interrupt flow

**Content Guidelines:**
- Each H2 section should have 3-5 paragraphs
- Each paragraph should be 2-4 sentences
- Use bullet points and numbered lists where appropriate
- Include specific examples, data, or case studies where relevant
- Bold important terms and statistics
- Maintain {{tone}} tone throughout

**Format Requirements:**
- Use proper Markdown (## for H2, ### for H3)
- Links in format: [anchor text](url)
- NO conclusion section (that comes in next phase)

**Output:** Markdown body content only. NO meta-commentary.`,

      requiredInputs: ['topic', 'outline', 'linkOpportunities', 'tone'],
      outputs: ['body'],
      retryOnFailure: true,
      maxRetries: 2,
      timeout: 60000,
    },

    // Phase 5: Conclusion Generation
    {
      id: 'conclusion',
      name: 'Conclusion Generation',
      description: 'Generate actionable conclusion with takeaways',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 800,
      
      systemPrompt: `You are an expert at writing compelling conclusions that reinforce value and drive action.
Your conclusions leave readers with clear takeaways and motivation to act.`,

      promptTemplate: `Write a conclusion for the article about: {{topic}}

**Article Context:**
- Outline covered: {{outline}}
- Body content summary: The article covered the main sections as outlined.
- Target Audience: {{targetAudience}}

**Conclusion Requirements:**
- 200-350 words maximum
- NO links in the conclusion
- NO comparison charts

**Structure:**
1. **Value Reinforcement** (1-2 paragraphs)
   - Summarize the key value provided
   - Reinforce why this matters to the reader

2. **Key Takeaways** (bullet list)
   - 3-5 actionable insights
   - Each starts with **bold action verb**
   - Example: "**Implement** a daily review process..."

3. **Next Steps** (1 paragraph)
   - Specific, actionable next step the reader can take
   - Create sense of momentum

4. **Memorable Close** (1-2 sentences)
   - End with inspiration or thought-provoking statement
   - Leave lasting impression

**Output Format:**
## Conclusion

[Content follows structure above]

NO meta-commentary. Start directly with the heading.`,

      requiredInputs: ['topic', 'outline', 'targetAudience'],
      outputs: ['conclusion'],
      retryOnFailure: true,
      maxRetries: 2,
      timeout: 30000,
    },

    // Phase 6: Content Assembly
    {
      id: 'assembly',
      name: 'Content Assembly',
      description: 'Combine all parts with proper formatting',
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 500,
      
      systemPrompt: `You are a content editor who assembles and polishes blog content.
Your job is to ensure smooth transitions and consistent formatting.`,

      promptTemplate: `Assemble the following content parts into a cohesive, well-formatted blog post.

**INTRODUCTION:**
{{introduction}}

**BODY:**
{{body}}

**CONCLUSION:**
{{conclusion}}

**Assembly Tasks:**
1. Ensure smooth transitions between introduction and first body section
2. Verify heading hierarchy is consistent (no jumping from H2 to H4)
3. Add horizontal rules (---) between major sections if needed for readability
4. Bold key statistics and important numbers
5. Ensure paragraphs are properly spaced
6. Remove any duplicate content or headings

**DO NOT:**
- Add new content
- Remove existing links
- Change the meaning of any section
- Add meta-commentary

**Output:** The fully assembled blog post in Markdown format.`,

      requiredInputs: ['introduction', 'body', 'conclusion'],
      outputs: ['assembledContent'],
      retryOnFailure: true,
      maxRetries: 1,
      timeout: 30000,
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
    {
      id: 'publishing',
      name: 'Publishing Preparation',
      type: 'publishing_prep',
      enabled: true,
    },
  ],

  rules: {
    linkDistribution: {
      internalLinks: { min: 4, max: 6 },
      externalLinks: { min: 2, max: 4 },
      maxLinksPerSection: 2,
      noConsecutiveLinks: true,
    },
    structure: {
      minH2Sections: 4,
      maxH2Sections: 8,
      paragraphsPerSection: { min: 3, max: 5 },
      introductionParagraphs: { min: 2, max: 3 },
      conclusionWordCount: { min: 200, max: 350 },
    },
    content: {
      useAbsoluteUrls: true,
      includeComparisonChart: false,
      actionableTakeaways: { min: 3, max: 5 },
    },
  },

  author: 'TIN System',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

