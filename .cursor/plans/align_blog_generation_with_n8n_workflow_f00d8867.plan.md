---
name: Align Blog Generation with n8n Workflow
overview: "Transform the current single-step blog generation into a 6-step sequential workflow (matching n8n) that runs entirely in the backend, maintaining the same user experience. The workflow will include: introduction generation, outline creation, website interlinking analysis, comprehensive article body with strict link distribution, enhanced conclusion, and final assembly."
todos:
  - id: create-n8n-workflow-endpoint
    content: Create new API endpoint for 6-step n8n workflow at src/app/api/blog-writer/generate-enhanced-v2/route.ts
    status: pending
  - id: implement-introduction-generator
    content: "Implement Step 1: Introduction generator with hook, explanation, and transition requirements"
    status: pending
    dependencies:
      - create-n8n-workflow-endpoint
  - id: implement-outline-generator
    content: "Implement Step 2: Outline generator that creates detailed H2/H3 structure before body generation"
    status: pending
    dependencies:
      - implement-introduction-generator
  - id: enhance-interlinking-analyzer
    content: "Enhance Step 3: Interlinking analyzer to return 8-12 links with absolute URLs and strategic placement"
    status: pending
    dependencies:
      - implement-outline-generator
  - id: implement-article-body-generator
    content: "Implement Step 4: Article body generator with strict link distribution rules and comparison chart integration"
    status: pending
    dependencies:
      - enhance-interlinking-analyzer
  - id: implement-conclusion-generator
    content: "Implement Step 5: Conclusion generator with 200-350 words, 3-5 takeaways, and specific formatting"
    status: pending
    dependencies:
      - implement-article-body-generator
  - id: implement-content-assembler
    content: "Implement Step 6: Content assembler that combines all components with enhanced formatting"
    status: pending
    dependencies:
      - implement-conclusion-generator
  - id: implement-comparison-chart
    content: Implement comparison chart generator that creates markdown tables for product comparisons
    status: pending
    dependencies:
      - implement-article-body-generator
  - id: implement-link-validator
    content: Create link distribution validator to ensure compliance with n8n rules
    status: pending
    dependencies:
      - implement-article-body-generator
  - id: update-url-format
    content: Modify site-context-service and interlinking-engine to return absolute URLs instead of relative paths
    status: pending
    dependencies:
      - enhance-interlinking-analyzer
  - id: integrate-workflow-option
    content: Add workflow_mode parameter to existing endpoints and route to n8n workflow when enabled
    status: pending
    dependencies:
      - create-n8n-workflow-endpoint
  - id: update-progress-tracking
    content: Update progress updates to show 6-step workflow progress (0-100% across 6 steps)
    status: pending
    dependencies:
      - create-n8n-workflow-endpoint
---

# Align Blo

g Generation with n8n Workflow Approach

## Overview

Transform the current blog generation system to follow the n8n workflow's 6-step sequential process, all executed in the backend without user intervention. The user experience remains the same (single request, async processing), but the backend will generate content in structured phases.

## Architecture Changes

### Current State

- Single-step generation: One LLM call produces entire article
- General linking guidelines (4-6 internal, 3-4 external)
- No explicit outline generation
- Basic introduction/conclusion requirements
- No comparison chart support

### Target State (n8n-aligned)

- 6-step sequential workflow:

1. Introduction generation
2. Outline generation
3. Website interlinking analysis
4. Article body with strict link distribution
5. Enhanced conclusion
6. Content assembly

## Implementation Plan

### Phase 1: Backend API Changes

#### 1.1 Create New 6-Step Workflow Endpoint

**File**: `src/app/api/blog-writer/generate-enhanced-v2/route.ts` (new file)Create a new endpoint that orchestrates the 6-step workflow:

- Accepts same request parameters as current endpoint
- Returns `job_id` for async processing (maintains UX)
- Internally executes 6 sequential steps

**Steps Implementation**:

```typescript
async function executeN8nWorkflow(params: {
  topic: string;
  keywords: string[];
  // ... other params
}): Promise<WorkflowResult> {
  // Step 1: Generate Introduction
  const introduction = await generateIntroduction(params);
  
  // Step 2: Generate Outline
  const outline = await generateOutline(params, introduction);
  
  // Step 3: Website Interlinking Analysis
  const interlinking = await analyzeInterlinking(params, outline);
  
  // Step 4: Generate Article Body
  const body = await generateArticleBody(params, outline, interlinking);
  
  // Step 5: Generate Conclusion
  const conclusion = await generateConclusion(params, body);
  
  // Step 6: Assemble Final Content
  const finalContent = await assembleContent(introduction, body, conclusion, interlinking);
  
  return finalContent;
}
```



#### 1.2 Step 1: Introduction Generation

**File**: `src/lib/blog-generation/n8n-workflow/introduction-generator.ts` (new file)Generate introduction following n8n specifications:

- Hook with surprising fact/question/statement
- Explain why topic matters
- Natural transition to body
- Keywords used naturally but sparingly
- 2-3 paragraphs

**Prompt Structure**:

```javascript
Write an engaging introduction for a blog post with the following details:
- Title: {topic}
- Primary Keyword: {primaryKeyword}
- Search intent: {searchIntent}
- Writing style: {style}
- Writing tone: {tone}
- Article goal: {goal}

The introduction should:
- Hook the reader with a surprising fact, question, or statement
- Explain why the topic matters and how it benefits the reader
- Transition naturally into the body of the article
- Use keywords naturally but sparingly

Output must be in Markdown format. Do NOT add commentary or explanations.
```



#### 1.3 Step 2: Outline Generation

**File**: `src/lib/blog-generation/n8n-workflow/outline-generator.ts` (new file)Generate detailed outline before writing body:

- Use introduction and all metadata
- Create H2 section structure
- Include subsections (H3) where appropriate
- Ensure minimum 4 H2 sections

**Prompt Structure**:

```javascript
Generate a detailed outline for a blog post with the following details:
- Title: {topic}
- Introduction: {introduction}
- Primary Keyword: {primaryKeyword}
- Search intent: {searchIntent}
- Secondary keywords: {secondaryKeywords}
- Writing style: {style}
- Writing tone: {tone}
- Article goal: {goal}

Create a comprehensive outline with:
- H2 headings for main sections (minimum 4 sections)
- H3 subheadings for subsections
- Brief description of content for each section

Output must be in Markdown format. Do NOT add commentary.
```



#### 1.4 Step 3: Website Interlinking Analysis

**File**: `src/lib/blog-generation/n8n-workflow/interlinking-analyzer.ts` (new file)Enhance existing interlinking to match n8n requirements:

- Analyze website using existing `InterlinkingEngine`
- Find 8-12 high-value internal linking opportunities
- Generate complete absolute URLs (not relative paths)
- Map anchor text to relevant website pages/products/collections
- Return structured link data with placement recommendations

**Key Changes**:

- Modify `InterlinkingEngine` to return absolute URLs
- Ensure all links include protocol and domain
- Validate URLs before returning
- Provide strategic rationale for each link

**Integration**:

- Leverage existing `src/lib/interlinking/interlinking-engine.ts`
- Enhance `src/lib/site-context-service.ts` to return absolute URLs
- Use Webflow integration to get site domain

#### 1.5 Step 4: Article Body Generation

**File**: `src/lib/blog-generation/n8n-workflow/article-body-generator.ts` (new file)Generate article body with strict link distribution rules:

- Follow exact outline structure
- Mandatory comparison chart integration (if applicable)
- Strict link distribution:
- 6-7 total links (2 external, 2 internal, 2 product)
- 1 link per H2 section (max 1-2 in 8+ paragraph sections)
- No 2+ links in same paragraph
- No links in consecutive paragraphs
- Links in minimum 4 different H2 sections
- Links only in main body, not conclusion

**Prompt Structure**:

```javascript
Write a comprehensive article body for "{topic}" targeting the primary keyword "{primaryKeyword}" with a {style} writing style and {tone} tone.

Content Specifications:
- Article Objective: {goal}
- Follow this exact outline structure: {outline}
- Add Conclusion as final H2 section

MANDATORY COMPARISON CHART INTEGRATION:
{comparisonChartData} - Place strategically in middle sections (H2 sections 3-5)

MANDATORY LINK DISTRIBUTION REQUIREMENTS:
- First H2 Section: 1 link (external, internal, OR product)
- Second H2 Section: 1 link (different type from section 1)
- Third H2 Section: 1-2 links (mix of types) + CONSIDER COMPARISON CHART PLACEMENT
- Fourth H2 Section: 1 link (different type) + ALTERNATIVE CHART PLACEMENT
- Fifth+ H2 Sections: Distribute remaining links (1 per section)

ABSOLUTE REQUIREMENTS:
❌ NEVER place 2+ links in the same paragraph
❌ NEVER place links in consecutive paragraphs
❌ NEVER cluster all links in one section
✅ MUST use 6-7 links total (distributed across all three types)
✅ MUST include at least 1 link from each type (external, internal, product)
✅ MUST spread across minimum 4 different H2 sections

External Backlinks: {externalLinks}
Internal Links: {internalLinks}
Product Links: {productLinks}

Output must be in Markdown format. Do NOT add commentary.
```



#### 1.6 Step 5: Conclusion Generation

**File**: `src/lib/blog-generation/n8n-workflow/conclusion-generator.ts` (new file)Generate enhanced conclusion following n8n specifications:

- 200-350 words maximum
- 3-5 actionable takeaways (bulleted)
- Value reinforcement + next steps + memorable close
- No links or charts
- Specific formatting (bold key items, line breaks)

**Prompt Structure**:

```javascript
Write an engaging conclusion for an article based on the following:

TITLE: {topic}
OUTLINE: {outline}
MAIN BODY CONTENT: {bodyContent}

CONCLUSION REQUIREMENTS:
- Write 200-350 words maximum
- Synthesize core value without simply repeating main points
- Provide 3-5 clear, actionable takeaways readers can implement immediately
- End with motivation and forward momentum

Mandatory Formatting (Markdown):
- Begin with "# Conclusion" as the heading
- Use 1-3 sentences per paragraph maximum with generous line breaks
- **Bold** 2-3 key action items or important concepts
- Convert takeaways into bulleted lists using markdown syntax (-)
- Create abundant white space between all elements

Structure:
1. Value Reinforcement: Open by reinforcing the core benefit/solution (1-2 paragraphs)
2. Key Takeaways: List 3-5 most important actionable insights as bulleted list
3. Next Steps: Provide specific, immediate actions readers can take
4. Memorable Close: End with an inspiring, quotable final thought

NO links or comparison charts in the conclusion section.
```



#### 1.7 Step 6: Content Assembly

**File**: `src/lib/blog-generation/n8n-workflow/content-assembler.ts` (new file)Assemble all components with enhanced formatting:

- Combine introduction, body, conclusion
- Integrate links at appropriate locations
- Apply visual enhancements (horizontal rules, blockquotes)
- Format statistics in bold
- Maintain consistent spacing

**Implementation**:

- Parse markdown from each step
- Insert links at specified anchor points
- Apply formatting rules
- Validate final structure

### Phase 2: Comparison Chart Solution

#### 2.1 Comparison Chart Generation Strategy

**Option A: Generate Markdown Table (Recommended)**

- When product research is enabled or comparison template is selected
- Generate markdown table with 5 products
- Include: features, pricing, pros/cons, recommendations
- Place in middle sections (H2 sections 3-5)

**Implementation**:

```typescript
interface ComparisonChart {
  products: Array<{
    name: string;
    features: string[];
    price?: string;
    pros: string[];
    cons: string[];
  }>;
  recommendations: string[]; // Top 2 recommended products
  placement: {
    section: number; // H2 section index (3-5)
    position: 'before' | 'after'; // Relative to section heading
  };
}

function generateComparisonChart(
  topic: string,
  keywords: string[],
  productResearch?: ProductResearchData
): ComparisonChart {
  // Generate or use product research data
  // Create markdown table
  // Return structured chart data
}
```

**Option B: Structured Data Placeholder**

- Generate structured JSON data
- Frontend renders as interactive chart component
- Backend provides markdown fallback

**Recommendation**: Use Option A (Markdown Table) for simplicity and compatibility.

#### 2.2 Integration Points

- Add to `article-body-generator.ts` when:
- `template_type === 'comparison'`
- `include_product_research === true`
- `include_comparison_section === true`
- Generate chart data before Step 4
- Pass to article body generator as structured data
- LLM integrates into content at specified placement

### Phase 3: Link Distribution Enforcement

#### 3.1 Link Distribution Validator

**File**: `src/lib/blog-generation/n8n-workflow/link-distribution-validator.ts` (new file)Validate generated content meets link distribution rules:

- Count links per section
- Verify no 2+ links in same paragraph
- Verify no consecutive paragraph links
- Verify link types are distributed
- Return validation report with fixes if needed

#### 3.2 Post-Generation Link Adjustment

If validation fails:

- Use LLM to redistribute links
- Or programmatically adjust link placement
- Ensure compliance with all rules

### Phase 4: URL Format Changes

#### 4.1 Absolute URL Generation

**Files to modify**:

- `src/lib/site-context-service.ts`: Return absolute URLs
- `src/lib/interlinking/interlinking-engine.ts`: Generate absolute URLs
- `src/lib/interlinking/enhanced-interlinking-service.ts`: Use absolute URLs

**Changes**:

- Get site domain from Webflow integration
- Construct full URLs: `https://{domain}{path}`
- Validate URLs before returning
- Store absolute URLs in link opportunities

### Phase 5: Integration with Existing System

#### 5.1 Update Multi-Phase Workflow

**File**: `src/app/api/workflow/multi-phase/route.ts`

- Add option to use n8n workflow: `use_n8n_workflow: true`
- Route to new endpoint when enabled
- Maintain backward compatibility

#### 5.2 Update Blog Generation Route

**File**: `src/app/api/blog-writer/generate/route.ts`

- Add `workflow_mode: 'standard' | 'n8n'` parameter
- Route to appropriate workflow based on mode
- Default to 'standard' for backward compatibility

#### 5.3 Progress Updates

Update progress tracking to show 6 steps:

- Step 1: Generating introduction (0-15%)
- Step 2: Creating outline (15-25%)
- Step 3: Analyzing interlinking (25-35%)
- Step 4: Writing article body (35-75%)
- Step 5: Crafting conclusion (75-85%)
- Step 6: Assembling content (85-100%)

### Phase 6: Testing & Validation

#### 6.1 Unit Tests

- Test each step independently
- Validate link distribution rules
- Test comparison chart generation
- Verify URL format correctness

#### 6.2 Integration Tests

- Test full 6-step workflow
- Verify async job processing
- Test error handling and recovery
- Validate final output structure

## Files to Create

1. `src/app/api/blog-writer/generate-enhanced-v2/route.ts` - New 6-step workflow endpoint
2. `src/lib/blog-generation/n8n-workflow/introduction-generator.ts` - Step 1
3. `src/lib/blog-generation/n8n-workflow/outline-generator.ts` - Step 2
4. `src/lib/blog-generation/n8n-workflow/interlinking-analyzer.ts` - Step 3 (enhancement)
5. `src/lib/blog-generation/n8n-workflow/article-body-generator.ts` - Step 4
6. `src/lib/blog-generation/n8n-workflow/conclusion-generator.ts` - Step 5
7. `src/lib/blog-generation/n8n-workflow/content-assembler.ts` - Step 6
8. `src/lib/blog-generation/n8n-workflow/comparison-chart-generator.ts` - Chart generation
9. `src/lib/blog-generation/n8n-workflow/link-distribution-validator.ts` - Validation

## Files to Modify

1. `src/lib/site-context-service.ts` - Return absolute URLs
2. `src/lib/interlinking/interlinking-engine.ts` - Generate absolute URLs
3. `src/app/api/workflow/multi-phase/route.ts` - Add n8n workflow option
4. `src/app/api/blog-writer/generate/route.ts` - Add workflow mode parameter
5. `src/lib/blog-generation-utils.ts` - Add n8n workflow utilities

## Migration Strategy

1. **Phase 1**: Implement new 6-step workflow alongside existing system
2. **Phase 2**: Add feature flag to enable n8n workflow per organization
3. **Phase 3**: Test with select organizations
4. **Phase 4**: Make n8n workflow default for premium/enterprise quality
5. **Phase 5**: Deprecate old single-step workflow (optional)

## Success Criteria

- ✅ 6-step sequential workflow executes in backend
- ✅ Link distribution follows strict n8n rules
- ✅ Comparison charts generated and integrated
- ✅ Absolute URLs used for all internal links
- ✅ Enhanced introduction and conclusion formats