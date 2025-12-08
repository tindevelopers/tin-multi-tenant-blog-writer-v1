#!/usr/bin/env node

/**
 * Direct Cloud Run API Test - Bypasses frontend health checks
 * Tests 5000 character custom_instructions limit directly
 */

const CLOUD_RUN_URL = 'https://blog-writer-api-dev-613248238610.europe-west9.run.app';
const ENDPOINT = '/api/v1/blog/generate-enhanced';

// Detailed custom instructions (~3500 characters)
const DETAILED_INSTRUCTIONS = `
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

=== SITE-AWARE GENERATION CONTEXT ===

INTERNAL LINKING REQUIREMENTS:
Include links to these existing pages where contextually relevant:
1. "How to Start a Pet Grooming Business: Complete Guide" - https://www.example.com/pet-grooming-business-guide
   Keywords: pet grooming, business, startup
   Suggested anchor: "pet grooming business guide"
2. "Best Dog Grooming Equipment for Professionals" - https://www.example.com/dog-grooming-equipment
   Keywords: grooming, equipment, tools
   Suggested anchor: "professional grooming equipment"
3. "Pet Industry Market Trends 2025" - https://www.example.com/pet-industry-trends-2025
   Keywords: pet, industry, market, trends
   Suggested anchor: "pet industry trends"
4. "Mobile Dog Grooming: Pros and Cons" - https://www.example.com/mobile-dog-grooming
   Keywords: mobile, grooming, service
   Suggested anchor: "mobile grooming services"
5. "Dog Grooming Certification Requirements by State" - https://www.example.com/grooming-certification
   Keywords: certification, license, requirements
   Suggested anchor: "grooming certification requirements"

IMPORTANT: Naturally incorporate 2-4 of these internal links within the content body.

CONTENT DIFFERENTIATION:
The site already has content on related topics:
- How to Start a Pet Grooming Business: Complete Guide
- Best Dog Grooming Equipment for Professionals
- Pet Industry Market Trends 2025
- Mobile Dog Grooming: Pros and Cons
- Dog Grooming Certification Requirements by State

Ensure this new content provides UNIQUE value.

TOPIC CLUSTER CONTEXT:
This content belongs to a cluster covering: dog grooming, pet business, entrepreneurship, small business

=== END SITE CONTEXT ===
`;

const TEST_PAYLOAD = {
  topic: "Why should I start my own dog grooming business",
  keywords: ["dog grooming business", "pet grooming startup", "dog grooming entrepreneur"],
  target_audience: "Aspiring pet business entrepreneurs",
  tone: "professional",
  word_count_target: 1500,
  quality_level: "premium",
  template_type: "expert_authority",
  custom_instructions: DETAILED_INSTRUCTIONS,
  use_google_search: true,
  use_fact_checking: true,
  use_citations: true,
  use_serp_optimization: true,
  use_consensus_generation: true,
  use_knowledge_graph: true,
  use_semantic_keywords: true,
  use_quality_scoring: true,
  include_faq: true
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(\`\${colors[color]}\${msg}\${colors.reset}\`);
}

async function runTest() {
  console.log('\\n' + '='.repeat(70));
  log('🧪 DIRECT CLOUD RUN API TEST - 5000 CHAR LIMIT', 'cyan');
  console.log('='.repeat(70));
  
  log(\`\\nCustom Instructions: \${DETAILED_INSTRUCTIONS.length} characters\`, 'blue');
  log(\`Target: \${CLOUD_RUN_URL}\${ENDPOINT}\`, 'blue');
  log(\`\\nSending request (this may take 1-3 minutes)...\`, 'yellow');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(\`\${CLOUD_RUN_URL}\${ENDPOINT}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_PAYLOAD),
    });
    
    const responseTime = Date.now() - startTime;
    
    log(\`\\nResponse Status: \${response.status} \${response.statusText}\`, response.ok ? 'green' : 'red');
    log(\`Response Time: \${(responseTime / 1000).toFixed(2)} seconds\`, 'blue');
    
    const responseText = await response.text();
    
    if (!response.ok) {
      if (responseText.includes('string_too_long') || responseText.includes('max_length')) {
        log('\\n❌ BACKEND REJECTED - Still has 2000 char limit!', 'red');
        log('You need to update the Pydantic model in the backend.', 'yellow');
      } else {
        log('\\n❌ Request failed', 'red');
      }
      console.log('\\nError:', responseText.substring(0, 1000));
      return;
    }
    
    const result = JSON.parse(responseText);
    
    // Save result
    const fs = require('fs');
    fs.writeFileSync('./test-direct-cloudrun-result.json', JSON.stringify(result, null, 2));
    log('\\n💾 Full result saved to: test-direct-cloudrun-result.json', 'green');
    
    console.log('\\n' + '='.repeat(70));
    log('✅ SUCCESS - Backend accepted 5000 char custom_instructions!', 'green');
    console.log('='.repeat(70));
    
    // Display results
    log(\`\\n📄 Title: \${result.title || 'N/A'}\`, 'green');
    log(\`📊 Word Count: \${result.word_count || 'N/A'}\`, 'green');
    log(\`⭐ SEO Score: \${result.seo_score || 'N/A'}\`, 'green');
    log(\`📖 Readability: \${result.readability_score || 'N/A'}\`, 'green');
    log(\`⏱️  Generation Time: \${result.generation_time || result.generation_time_seconds || 'N/A'}s\`, 'green');
    
    // Quality features results
    log('\\n🔧 Quality Features Results:', 'cyan');
    log(\`   Citations: \${result.citations?.length || 0} found\`, result.citations?.length > 0 ? 'green' : 'yellow');
    log(\`   Semantic Keywords: \${result.semantic_keywords?.length || 0} found\`, result.semantic_keywords?.length > 0 ? 'green' : 'yellow');
    log(\`   Knowledge Graph: \${result.knowledge_graph ? 'Present' : 'Not returned'}\`, result.knowledge_graph ? 'green' : 'yellow');
    log(\`   Structured Data: \${result.structured_data ? 'Present' : 'Not returned'}\`, result.structured_data ? 'green' : 'yellow');
    log(\`   Quality Scores: \${result.quality_scores ? JSON.stringify(result.quality_scores) : 'Not returned'}\`, result.quality_scores ? 'green' : 'yellow');
    
    // Content preview
    if (result.content) {
      log('\\n📝 Content Preview (first 500 chars):', 'cyan');
      console.log(result.content.substring(0, 500) + '...');
    }
    
    log('\\n✅ Test complete!', 'green');
    
  } catch (error) {
    log(\`\\n❌ Error: \${error.message}\`, 'red');
    console.error(error);
  }
}

runTest();
