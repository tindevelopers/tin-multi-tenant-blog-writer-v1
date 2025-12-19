# Content Goal Prompts Management Guide

## Overview

The Content Goal Prompts system allows you to customize how AI generates content based on your specific business goals. Each content goal (SEO, Engagement, Conversions, Brand Awareness) has its own detailed prompt that guides the AI's writing style, structure, and focus.

---

## Accessing the Prompt Manager

**URL**: `/admin/settings/content-prompts`

**Who Can Access**:
- **System Admins**: Full access to all prompts (system defaults + all organizations)
- **Organization Admins**: Can create and manage custom prompts for their organization
- **Regular Users**: Can view prompts but cannot modify

---

## Features

### 1. View All Prompts
- **Table View**: See all prompts with details (goal, type, priority, status)
- **Filtering**: Filter by goal type, system/org, active/inactive status
- **Search**: Full-text search across prompt titles and content
- **Stats Dashboard**: See total prompts, system defaults, organization-specific, and active prompts

### 2. Create Custom Prompts
- Override system defaults with organization-specific prompts
- Set custom priority levels (higher priority = selected first)
- Include detailed instructions for the AI
- Optional user-facing prompt templates

### 3. Manage Prompts
- **Edit**: Modify existing prompts
- **Delete**: Remove custom prompts (falls back to system default)
- **Toggle Active/Inactive**: Enable or disable prompts without deleting
- **Clone**: Duplicate existing prompts as a starting point

### 4. Import/Export
- **Export**: Download prompts as JSON for backup or sharing
- **Import**: (Coming soon) Upload JSON files to restore or transfer prompts

---

## The 4 Content Goals

### 1. SEO & Rankings 🔍
**Purpose**: Optimize content for search engine visibility and organic traffic

**Focus Areas**:
- Comprehensive keyword optimization
- Proper heading hierarchy (H1, H2, H3)
- Long-form, in-depth content (2000+ words)
- Internal linking opportunities
- Featured snippet optimization
- E-E-A-T signals (Experience, Expertise, Authoritativeness, Trustworthiness)
- Schema markup opportunities
- Natural keyword placement

**Best For**:
- Blog posts targeting specific keywords
- Pillar content and comprehensive guides
- Educational content
- Product pages and service descriptions

---

### 2. Engagement 💬
**Purpose**: Maximize reader interaction, shares, comments, and social activity

**Focus Areas**:
- Compelling, attention-grabbing headlines
- Storytelling and narrative elements
- Interactive elements (questions, polls, CTAs)
- Visual content suggestions
- Relatable examples and case studies
- Emotional connection with audience
- Conversational, accessible tone
- Comment-worthy sections

**Best For**:
- Social media content
- Opinion pieces and thought leadership
- Community-building content
- Stories and case studies
- Viral content campaigns

---

### 3. Conversions 💰
**Purpose**: Drive sales, sign-ups, lead generation, and desired actions

**Focus Areas**:
- Clear value propositions and benefits
- Problem-solution framework
- Social proof and testimonials
- Urgency and scarcity elements
- Strategic CTA placements
- Objection handling and FAQs
- Trust signals and credibility indicators
- Comparison tables and decision frameworks

**Best For**:
- Landing pages
- Product descriptions
- Sales pages
- Lead magnets
- Email capture pages
- Promotional content

---

### 4. Brand Awareness 🏢
**Purpose**: Build brand recognition, establish thought leadership, and strengthen identity

**Focus Areas**:
- Brand voice and personality consistency
- Thought leadership and industry insights
- Unique perspectives and original ideas
- Brand values and mission alignment
- Educational content positioning
- Visual brand identity suggestions
- Industry trend analysis
- Community building elements

**Best For**:
- Company blog posts
- Thought leadership articles
- Industry commentary
- Brand stories and mission content
- Corporate communications
- Long-term positioning content

---

## How to Create a Custom Prompt

### Step 1: Navigate to Prompt Manager
Go to `/admin/settings/content-prompts`

### Step 2: Click "New Prompt"
The create modal will open

### Step 3: Fill in Details

#### Content Goal *
Select which goal this prompt is for:
- SEO & Rankings
- Engagement
- Conversions
- Brand Awareness

#### Prompt Title *
Give your prompt a descriptive name:
- Example: "SEO - Tech SaaS Focus"
- Example: "Conversions - E-commerce Style"

#### System Prompt * (Most Important)
This is the main instruction sent to the AI. Be very detailed and specific.

**Template Structure**:
```
You are [role description]. Your primary goal is to [main objective].

Focus on:
- [Specific instruction 1]
- [Specific instruction 2]
- [Specific instruction 3]
...

Writing Style:
- [Tone guidance]
- [Structure guidance]
- [Format preferences]

Content Elements:
- [What to include]
- [What to emphasize]
- [What to avoid]

Additional Guidelines:
- [Industry-specific notes]
- [Brand voice considerations]
- [Technical requirements]
```

#### User Prompt Template (Optional)
User-facing instructions that appear in the UI. Not sent to AI.

#### Priority
Number from 0-1000. Higher priority prompts are selected first.
- System defaults: 100
- Organization custom: 150+ (to override defaults)

#### Active Checkbox
Whether this prompt is currently active and can be used

#### System Default (System Admins Only)
Whether this is a system-wide default or organization-specific

### Step 4: Save
Click "Save Prompt" to create your custom prompt

---

## Example Custom Prompts

### Example 1: Tech Startup SEO

```
You are an expert technical SEO content writer specializing in SaaS and tech startups. Your primary goal is to create content that ranks highly for technical keywords while establishing thought leadership.

Focus on:
- Technical accuracy and depth
- Developer-friendly explanations
- Code examples and technical demonstrations
- Integration guides and API documentation
- Performance and scalability considerations
- Competitive technical comparisons
- Best practices and industry standards
- Proper technical terminology and jargon
- Links to documentation and resources

Writing Style:
- Professional but approachable
- Technical but accessible to non-developers
- Clear explanations with examples
- Step-by-step instructions when appropriate
- Use of diagrams and flowcharts

Content Structure:
- Executive summary for decision-makers
- Technical deep-dive for developers
- Implementation guides
- FAQ section addressing common issues
- Related resources and next steps

SEO Requirements:
- Target long-tail technical keywords
- Optimize for "how-to" and "what is" queries
- Include code snippets with proper syntax highlighting
- Internal links to related technical content
- Schema markup for HowTo and TechArticle
```

---

### Example 2: E-commerce Conversions

```
You are an expert e-commerce copywriter focused on driving product sales and increasing conversion rates. Your primary goal is to create product-focused content that addresses objections and compels purchases.

Focus on:
- Product benefits over features
- Emotional triggers and aspirational language
- Social proof and customer testimonials
- Risk reversal (guarantees, returns, warranties)
- Urgency and scarcity (limited stock, sales)
- Clear product comparisons
- Detailed specifications and use cases
- Visual product descriptions
- Cross-sell and upsell opportunities
- Trust signals (reviews, ratings, certifications)

Writing Style:
- Persuasive but not pushy
- Benefit-driven language
- Active voice and action words
- Scannable with bullet points
- Conversational and relatable

Content Structure:
- Attention-grabbing headline
- Hero benefit statement
- Problem identification
- Solution presentation
- Features and benefits list
- Social proof section
- Objection handling
- Strong call-to-action
- FAQ section
- Related products

Conversion Optimization:
- Multiple CTA placements (top, middle, bottom)
- Price justification and value demonstration
- Comparison tables with competitors
- Customer review highlights
- Money-back guarantee emphasis
- Limited-time offers when appropriate
```

---

### Example 3: Personal Brand Engagement

```
You are a personal brand storyteller focused on creating authentic, engaging content that builds deep connections with audiences. Your primary goal is to maximize engagement through relatable, shareable content.

Focus on:
- Personal anecdotes and real experiences
- Vulnerable and authentic storytelling
- Conversational, first-person narrative
- Questions that invite responses
- Controversial or thought-provoking angles
- Behind-the-scenes insights
- Lessons learned from failures
- Actionable takeaways
- Community-building elements
- Interactive elements (polls, questions)

Writing Style:
- Conversational and informal
- Use of "I" and "you" language
- Short sentences and paragraphs
- Emotional and evocative
- Humor when appropriate
- Empathetic and understanding

Content Structure:
- Hook with a compelling opening
- Personal story or example
- Relatable problem or situation
- Insights and lessons learned
- Practical application
- Call for community input
- Invitation to share experiences

Engagement Tactics:
- Ask direct questions throughout
- Invite comments and discussion
- Share controversial opinions (backed by reasoning)
- Use storytelling to illustrate points
- Create "shareable moments"
- End with a thought-provoking question
- Encourage tagging and sharing
```

---

### Example 4: B2B Brand Awareness

```
You are a B2B thought leader and industry analyst creating authoritative content that positions the brand as an industry expert. Your primary goal is to build long-term brand recognition and establish trust with enterprise decision-makers.

Focus on:
- Industry trends and analysis
- Data-driven insights and research
- Original perspectives and commentary
- Executive-level strategic thinking
- ROI and business value focus
- Case studies and success stories
- Best practices and frameworks
- Competitive landscape analysis
- Future predictions and implications
- Professional credibility signals

Writing Style:
- Professional and authoritative
- Data-backed and analytical
- Strategic and forward-thinking
- Neutral and objective tone
- Industry-specific terminology
- Executive-friendly language

Content Structure:
- Executive summary
- Industry context and background
- Key insights and findings
- Strategic implications
- Practical recommendations
- Supporting data and evidence
- Expert quotes and perspectives
- Conclusion with forward-looking view
- About the author/company section

Brand Positioning:
- Thought leadership emphasis
- Industry expertise demonstration
- Unique methodology or framework
- Company values alignment
- Long-term relationship building
- Educational value over sales pitch
- Professional credibility signals
- Industry recognition mentions
```

---

## Best Practices

### 1. Be Specific
✅ **Good**: "Use data-driven insights with specific metrics and percentages to support claims"
❌ **Bad**: "Use data"

### 2. Include Examples
✅ **Good**: "Include 2-3 customer testimonials with specific results (e.g., '30% increase in conversions')"
❌ **Bad**: "Include testimonials"

### 3. Define Tone Clearly
✅ **Good**: "Professional but approachable, like talking to a knowledgeable colleague"
❌ **Bad**: "Be professional"

### 4. Structure Instructions Logically
- Start with role and primary goal
- List focus areas
- Define writing style
- Specify content structure
- Add special requirements

### 5. Test and Iterate
- Create test content with your prompt
- Review quality and alignment
- Refine instructions based on results
- A/B test different prompt variations

### 6. Use Priority Wisely
- Default: 100
- Custom: 150 (overrides default)
- Experimental: 50 (falls back if better option exists)
- Critical: 200+ (always used when active)

---

## Priority System Explained

When a user selects a content goal, the system selects the best prompt using this logic:

1. **Organization-specific prompts** take priority over system defaults
2. Among multiple prompts, **highest priority number** wins
3. Only **active** prompts are considered
4. If multiple prompts have the same priority, the **most recently created** is used

**Example Scenario**:
- System Default SEO Prompt: Priority 100 (active)
- Your Custom SEO Prompt: Priority 150 (active)
- Result: Your custom prompt is used ✅

- System Default SEO Prompt: Priority 100 (active)
- Your Custom SEO Prompt: Priority 150 (inactive)
- Result: System default is used ✅

---

## Troubleshooting

### My custom prompt isn't being used
1. Check that it's marked as **Active**
2. Verify the **Priority** is higher than the system default (>100)
3. Confirm the **Content Goal** matches what you're selecting
4. Check you're logged into the correct organization

### The AI isn't following my instructions
1. Make instructions more specific and detailed
2. Add examples of desired output
3. Use clear, directive language ("Always...", "Never...", "Include...")
4. Test with different prompts to see what works best

### How do I revert to system defaults?
1. Delete your custom prompt, or
2. Mark your custom prompt as Inactive

### Can I have multiple prompts for the same goal?
Yes! Create multiple prompts with different priorities. Higher priority = used first.

---

## API Integration

### Get Best Prompt for Content Goal

```typescript
// SQL Function (already created in migration)
SELECT * FROM get_content_goal_prompt(
  'org_id_here', 
  'seo'  -- or 'engagement', 'conversions', 'brand_awareness'
);
```

### Example TypeScript Integration

```typescript
import { createClient } from '@/lib/supabase/client';

async function getPromptForGoal(orgId: string, contentGoal: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .rpc('get_content_goal_prompt', {
      p_org_id: orgId,
      p_content_goal: contentGoal
    });

  if (error) throw error;
  
  return data[0]; // Returns best matching prompt
}

// Usage
const prompt = await getPromptForGoal(userOrgId, 'seo');
console.log(prompt.system_prompt); // Use in AI generation
```

---

## FAQ

**Q: Can I create prompts for other organizations?**
A: No, unless you're a system admin. Organization users can only create prompts for their own organization.

**Q: Can I edit system default prompts?**
A: Only system admins can edit system defaults. Organization users should create custom prompts instead.

**Q: How many prompts can I create?**
A: Unlimited, but only one active prompt per goal will be used (the highest priority one).

**Q: Can I share prompts between organizations?**
A: Yes, use the Export feature to download prompts as JSON, then manually insert them into another organization's database.

**Q: Do prompts support variables/templates?**
A: Not yet, but this is planned for a future release. You can use the `user_prompt_template` field as a workaround.

**Q: Can I see which prompt was used for a specific blog post?**
A: Not currently, but prompt versioning and usage tracking is planned for a future release.

---

## Roadmap

### Coming Soon
- [ ] Prompt versioning and history
- [ ] A/B testing capabilities
- [ ] Usage analytics (which prompts generate best content)
- [ ] Template variables (e.g., {brand_name}, {industry})
- [ ] Prompt library with community examples
- [ ] Import functionality
- [ ] Prompt performance metrics
- [ ] AI-assisted prompt optimization

---

## Support

If you need help with content goal prompts:
1. Check this guide first
2. Review the example prompts
3. Experiment with different instructions
4. Contact your system administrator
5. Submit feedback for new features

---

**Last Updated**: December 19, 2025
**Version**: 1.0.0
