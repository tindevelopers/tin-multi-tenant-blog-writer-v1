/**
 * Comparison Workflow Model
 * 
 * Specialized workflow for product comparison content with mandatory comparison charts.
 * Extends the premium workflow structure but adds comparison-specific phases.
 * 
 * Triggered when:
 * - Content type is 'comparison', 'review', or 'product'
 * - Template type includes comparison elements
 * - Product research is enabled
 */

import { WorkflowModel } from '../types';

/**
 * Comparison Workflow Model
 * Multi-phase workflow optimized for product comparison articles
 */
export const comparisonWorkflowModel: WorkflowModel = {
  id: 'comparison',
  name: 'Product Comparison Workflow',
  description: 'Structured workflow for product comparison content with mandatory charts',
  version: '1.0.0',

  // Triggered by premium/enterprise quality with comparison content types
  qualityLevels: ['premium', 'enterprise'],
  contentTypes: ['comparison', 'review', 'product', 'versus', 'best'],

  phases: [
    // Phase 1: Product Research Analysis
    {
      id: 'product_analysis',
      name: 'Product Research Analysis',
      description: 'Analyze products to compare and gather key data points',
      model: 'gpt-4o',
      temperature: 0.3,
      maxTokens: 2500,
      
      systemPrompt: `You are a product research analyst who gathers and organizes product data for comparison articles.
Your analysis is thorough, unbiased, and focused on what matters most to buyers.`,

      promptTemplate: `Analyze products for a comparison article about: {{topic}}

**Target Audience:** {{targetAudience}}
**Keywords:** {{keywords}}

**Research Requirements:**
1. Identify 3-5 products/options to compare
2. For each product, gather:
   - Name and brand
   - Key features (5-7 most important)
   - Price range or pricing model
   - Pros (3-5 genuine advantages)
   - Cons (2-4 honest limitations)
   - Best use case / ideal customer
   - Notable differentiator

3. Identify comparison criteria:
   - 5-7 key factors for comparison
   - Importance weight for each factor
   - How products rank on each factor

**Output Format (JSON):**
{
  "products": [
    {
      "name": "Product Name",
      "brand": "Brand",
      "features": ["feature1", "feature2"],
      "priceRange": "$XX - $XXX",
      "pros": ["pro1", "pro2"],
      "cons": ["con1", "con2"],
      "bestFor": "Ideal customer description",
      "differentiator": "What makes it unique"
    }
  ],
  "comparisonCriteria": [
    {
      "factor": "Factor Name",
      "weight": "High/Medium/Low",
      "description": "Why this matters"
    }
  ],
  "overallWinner": "Product for most users",
  "winnerRationale": "Why this is the top pick"
}`,

      requiredInputs: ['topic', 'keywords', 'targetAudience'],
      outputs: ['productAnalysis'],
      retryOnFailure: true,
      maxRetries: 2,
      timeout: 45000,
    },

    // Phase 2: Comparison Chart Generation
    {
      id: 'comparison_chart',
      name: 'Comparison Chart Generation',
      description: 'Generate markdown comparison table',
      model: 'gpt-4o',
      temperature: 0.3,
      maxTokens: 1500,
      
      systemPrompt: `You are a content formatter who creates clear, scannable comparison tables.
Your tables help readers quickly understand key differences between products.`,

      promptTemplate: `Create a comparison chart based on this product analysis:

{{productAnalysis}}

**Chart Requirements:**
1. Create a markdown table comparing all products
2. Include these columns:
   - Feature/Criteria (first column)
   - One column per product
3. Include rows for:
   - Price range
   - Top 5-6 key features
   - Best for / ideal user
   - Our rating (X/5 stars)
4. Use checkmarks (✓), X marks (✗), or descriptive text
5. Keep cells concise (1-3 words ideally)

**Format Example:**
| Feature | Product A | Product B | Product C |
|---------|-----------|-----------|-----------|
| Price | $99/mo | $149/mo | $79/mo |
| Feature 1 | ✓ | ✓ | ✗ |
| Best For | Small teams | Enterprise | Startups |
| Rating | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

**Additional Output:**
After the table, provide a brief "Quick Take" (2-3 sentences) summarizing the key differentiators.

**Output:** Markdown table + Quick Take. NO commentary.`,

      requiredInputs: ['productAnalysis'],
      outputs: ['comparisonChart', 'quickTake'],
      retryOnFailure: true,
      maxRetries: 2,
      timeout: 30000,
    },

    // Phase 3: Introduction with Hook
    {
      id: 'introduction',
      name: 'Introduction Generation',
      description: 'Generate comparison-focused introduction',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 800,
      
      systemPrompt: `You are an expert blog writer who helps readers navigate product decisions.
Your introductions acknowledge the challenge of choosing and promise clarity.`,

      promptTemplate: `Write an engaging introduction for a comparison article: {{topic}}

**Products Being Compared:**
{{productAnalysis}}

**Quick Summary:**
{{quickTake}}

**Target Audience:** {{targetAudience}}
**Tone:** {{tone}}

**Introduction Requirements:**
1. **Hook** - Acknowledge the challenge/frustration of choosing
2. **Promise** - What clarity this article provides
3. **Preview** - Mention you'll cover: features, pricing, pros/cons
4. **Quick Answer** - Tease the overall winner for those in a hurry

**Structure (3 paragraphs):**
- Paragraph 1: Hook + empathy with reader's situation
- Paragraph 2: What this guide covers and why it's trustworthy
- Paragraph 3: Quick preview of winner + invitation to explore why

**Output:** Markdown introduction. NO commentary.`,

      requiredInputs: ['topic', 'productAnalysis', 'quickTake', 'targetAudience', 'tone'],
      outputs: ['introduction'],
      retryOnFailure: true,
      maxRetries: 2,
      timeout: 30000,
    },

    // Phase 4: Individual Product Sections
    {
      id: 'product_reviews',
      name: 'Product Reviews Generation',
      description: 'Generate detailed section for each product',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4000,
      
      systemPrompt: `You are a product reviewer who writes fair, helpful product breakdowns.
Your reviews help readers understand if a product is right for them.`,

      promptTemplate: `Write detailed review sections for each product in: {{topic}}

**Product Data:**
{{productAnalysis}}

**Internal Links to Include:**
{{siteContext}}

**Section Structure for EACH Product:**

## [Product Name]: [Tagline summarizing its strength]

### Overview
2-3 paragraphs covering:
- What it is and who makes it
- Primary value proposition
- Target user/use case

### Key Features
- Bullet list of 5-7 features
- Each with brief explanation of benefit
- Bold the feature name

### Pros and Cons

**What We Like:**
- ✓ Pro 1 with brief explanation
- ✓ Pro 2 with brief explanation
- ✓ Pro 3 with brief explanation

**What Could Be Better:**
- ✗ Con 1 with context
- ✗ Con 2 with context

### Pricing
- Clear pricing breakdown
- Any hidden costs or considerations
- Value assessment

### Best For
One paragraph on ideal customer profile.

---

**Link Integration Rules:**
- Maximum 1-2 links per product section
- Use natural anchor text
- Links should add value for readers wanting to learn more

**Output:** All product sections in Markdown. NO commentary.`,

      requiredInputs: ['topic', 'productAnalysis', 'siteContext'],
      outputs: ['productReviews'],
      retryOnFailure: true,
      maxRetries: 2,
      timeout: 60000,
    },

    // Phase 5: Buying Guide Section
    {
      id: 'buying_guide',
      name: 'Buying Guide Generation',
      description: 'Generate how-to-choose section',
      model: 'gpt-4o',
      temperature: 0.6,
      maxTokens: 1500,
      
      systemPrompt: `You are a buying advisor who helps readers make confident purchase decisions.
Your guidance is practical, unbiased, and focused on reader needs.`,

      promptTemplate: `Write a buying guide section for: {{topic}}

**Products Covered:**
{{productAnalysis}}

**Target Audience:** {{targetAudience}}

**Section Structure:**

## How to Choose the Right [Product Category]

### Key Factors to Consider
For each of 4-6 factors:
- **Factor Name**: Why it matters and what to look for
- Which products excel at this factor

### Questions to Ask Yourself
- 3-5 questions readers should consider
- Brief guidance for each question

### Our Recommendations

**Best Overall:** [Product] - [1 sentence why]
**Best Value:** [Product] - [1 sentence why]  
**Best for [Use Case]:** [Product] - [1 sentence why]

### Final Verdict
2-3 paragraphs with:
- Summary of key differentiators
- Clear recommendation for different user types
- Confidence in the recommendation

**Output:** Markdown buying guide section. NO commentary.`,

      requiredInputs: ['topic', 'productAnalysis', 'targetAudience'],
      outputs: ['buyingGuide'],
      retryOnFailure: true,
      maxRetries: 2,
      timeout: 45000,
    },

    // Phase 6: FAQ Section
    {
      id: 'faq',
      name: 'FAQ Generation',
      description: 'Generate frequently asked questions',
      model: 'gpt-4o',
      temperature: 0.5,
      maxTokens: 1200,
      
      systemPrompt: `You are an FAQ writer who anticipates reader questions and provides clear answers.
Your FAQs address real concerns buyers have when making decisions.`,

      promptTemplate: `Generate an FAQ section for: {{topic}}

**Products Covered:**
{{productAnalysis}}

**Keywords to Address:** {{keywords}}

**FAQ Requirements:**
- 5-7 questions buyers commonly ask
- Include questions about:
  - Pricing and value
  - Specific features
  - Comparisons between options
  - Use case suitability
  - Implementation/setup

**Format:**

## Frequently Asked Questions

### Q: [Question]?
[2-4 sentence answer]

### Q: [Question]?
[2-4 sentence answer]

**Guidelines:**
- Questions should sound natural (how real users ask)
- Answers should be helpful and direct
- Include specific product mentions where relevant
- Good for SEO featured snippets

**Output:** Markdown FAQ section. NO commentary.`,

      requiredInputs: ['topic', 'productAnalysis', 'keywords'],
      outputs: ['faq'],
      retryOnFailure: true,
      maxRetries: 2,
      timeout: 30000,
    },

    // Phase 7: Content Assembly
    {
      id: 'assembly',
      name: 'Content Assembly',
      description: 'Assemble all sections with comparison chart placement',
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 500,
      
      systemPrompt: `You are a content editor who assembles comparison articles for maximum clarity and usability.`,

      promptTemplate: `Assemble this comparison article in the correct order:

**INTRODUCTION:**
{{introduction}}

**COMPARISON CHART (place after intro):**
{{comparisonChart}}

**PRODUCT REVIEWS:**
{{productReviews}}

**BUYING GUIDE:**
{{buyingGuide}}

**FAQ:**
{{faq}}

**Assembly Order:**
1. Introduction
2. Quick Comparison Chart (with ## Quick Comparison heading)
3. Individual Product Reviews
4. Buying Guide / How to Choose
5. FAQ
6. (No separate conclusion needed - buying guide covers this)

**Tasks:**
- Add appropriate section transitions
- Ensure consistent heading hierarchy
- Add horizontal rules between major sections
- Verify all links are properly formatted

**Output:** Complete assembled article in Markdown.`,

      requiredInputs: ['introduction', 'comparisonChart', 'productReviews', 'buyingGuide', 'faq'],
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
        generateContent: true,
        productImages: true,
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
      internalLinks: { min: 4, max: 8 },
      externalLinks: { min: 2, max: 4 },
      productLinks: { min: 2, max: 5 },
      maxLinksPerSection: 2,
      noConsecutiveLinks: true,
    },
    structure: {
      minH2Sections: 6,
      maxH2Sections: 12,
      paragraphsPerSection: { min: 2, max: 5 },
      introductionParagraphs: { min: 2, max: 3 },
      conclusionWordCount: { min: 150, max: 300 },
    },
    content: {
      useAbsoluteUrls: true,
      includeComparisonChart: true, // Mandatory for this workflow
      actionableTakeaways: { min: 3, max: 5 },
    },
  },

  author: 'TIN System',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

