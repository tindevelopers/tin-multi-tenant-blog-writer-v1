# Frontend Integration Guide - Version 1.4

## 🎯 Overview

This guide covers all recent updates to the Blog Writer API, including:
- **Multi-site Google Search Console support**
- **Quick Generate vs Multi-Phase modes**
- **Google Search Console integration for both modes**
- **New request fields and requirements**

---

## 📋 Table of Contents

1. [Quick Generate vs Multi-Phase Modes](#quick-generate-vs-multi-phase-modes)
2. [Google Search Console Integration](#google-search-console-integration)
3. [Request Model Updates](#request-model-updates)
4. [Frontend Implementation](#frontend-implementation)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)

---

## 🚀 Quick Generate vs Multi-Phase Modes

### Quick Generate Mode (`mode: "quick_generate"`)

**Use Case:** Fast, cost-effective blog generation

**Features:**
- ✅ Uses DataForSEO Content Generation API
- ✅ Fast generation (30-60 seconds)
- ✅ Cost-effective (uses DataForSEO pricing)
- ✅ Good SEO optimization built-in
- ✅ Supports all 28 blog types

**When to Use:**
- High-volume content needs
- Quick turnaround required
- Budget-conscious projects
- Standard blog content

**Example:**
```typescript
{
  "topic": "How to Start a Dog Grooming Business",
  "keywords": ["dog grooming", "pet business", "grooming services"],
  "mode": "quick_generate",
  "blog_type": "how_to",
  "length": "medium"
}
```

### Multi-Phase Mode (`mode: "multi_phase"`)

**Use Case:** Premium, comprehensive blog generation

**Features:**
- ✅ 12-stage comprehensive pipeline
- ✅ Advanced SEO optimization
- ✅ Readability optimization (targets 60-70 Flesch Reading Ease)
- ✅ E-E-A-T optimization (first-hand experience indicators)
- ✅ Citation generation (mandatory, 5+ citations)
- ✅ Google Custom Search integration
- ✅ Google Knowledge Graph integration
- ✅ Google Search Console integration (NEW)
- ✅ AI optimization (LLM Mentions, LLM Responses)
- ✅ Quality scoring

**When to Use:**
- Premium content needs
- Maximum SEO impact required
- Content requiring citations
- Comprehensive research needed

**Example:**
```typescript
{
  "topic": "Using Euras Technology to Fix Leaks",
  "keywords": ["leak repair", "waterproofing", "basement leaks"],
  "mode": "multi_phase",
  "gsc_site_url": "https://eurastechnology.com",  // Site-specific
  "use_citations": true,  // Mandatory for multi_phase
  "length": "long"
}
```

---

## 🔍 Google Search Console Integration

### What Google Search Console Provides

Google Search Console enhances blog generation by providing:

1. **Query Performance Data**
   - Which queries drive traffic to your site
   - Click-through rates (CTR)
   - Average position in search results
   - Impressions and clicks

2. **Content Opportunities**
   - High-impression queries with low CTR
   - Queries ranking in positions 4-20 (improvement potential)
   - Keywords with high opportunity scores

3. **Content Gap Analysis**
   - Keywords you're not ranking for
   - Keywords ranking low (position > 10)
   - Recommendations for new content

### How It Helps Both Modes

#### Quick Generate Mode
- **Keyword Validation:** Verifies target keywords are performing well
- **Content Opportunities:** Identifies high-opportunity keywords to target
- **Performance Context:** Provides site-specific performance data

#### Multi-Phase Mode
- **Research Enhancement:** Uses GSC data in research/outline stage
- **Content Gap Analysis:** Identifies gaps for target keywords
- **Opportunity Targeting:** Focuses on high-opportunity keywords
- **Performance Optimization:** Optimizes content based on site performance

---

## 📝 Request Model Updates

### New Field: `gsc_site_url`

**Type:** `string | null` (optional)

**Description:** Google Search Console site URL for multi-site support

**Format:**
- URL Prefix: `https://example.com` or `https://www.example.com`
- Domain Property: `sc-domain:example.com` (includes all subdomains)

**When to Provide:**
- ✅ You have multiple websites
- ✅ You want site-specific Search Console data
- ✅ Different sites per blog generation request

**When to Omit:**
- ✅ Single site setup (uses default `GSC_SITE_URL`)
- ✅ Site URL not available
- ✅ Search Console not configured

**Example:**
```typescript
{
  "topic": "Blog topic",
  "keywords": ["keyword1", "keyword2"],
  "gsc_site_url": "https://site1.com",  // Optional
  "mode": "multi_phase"
}
```

### Updated Field: `mode`

**Type:** `"quick_generate" | "multi_phase"`

**Default:** `"quick_generate"`

**Description:** Blog generation mode

**Impact:**
- `quick_generate`: Uses DataForSEO Content Generation API
- `multi_phase`: Uses comprehensive 12-stage pipeline

### Updated Field: `custom_instructions`

**Type:** `string | null` (optional)

**Max Length:** 5000 characters (increased from 2000)

**Description:** Additional instructions for content generation

---

## 💻 Frontend Implementation

### TypeScript Interface

```typescript
interface EnhancedBlogGenerationRequest {
  // Required fields
  topic: string;  // 3-200 characters
  keywords: string[];  // At least 1 keyword
  
  // Generation mode
  mode?: "quick_generate" | "multi_phase";  // Default: "quick_generate"
  
  // Google Search Console (NEW)
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
  
  // Research depth
  research_depth?: "basic" | "standard" | "comprehensive";  // Default: "standard"
}

enum BlogContentType {
  CUSTOM = "custom",
  BRAND = "brand",
  TOP_10 = "top_10",
  PRODUCT_REVIEW = "product_review",
  HOW_TO = "how_to",
  COMPARISON = "comparison",
  GUIDE = "guide",
  TUTORIAL = "tutorial",
  LISTICLE = "listicle",
  CASE_STUDY = "case_study",
  NEWS = "news",
  OPINION = "opinion",
  INTERVIEW = "interview",
  FAQ = "faq",
  CHECKLIST = "checklist",
  TIPS = "tips",
  DEFINITION = "definition",
  BENEFITS = "benefits",
  PROBLEM_SOLUTION = "problem_solution",
  TREND_ANALYSIS = "trend_analysis",
  STATISTICS = "statistics",
  RESOURCE_LIST = "resource_list",
  TIMELINE = "timeline",
  MYTH_BUSTING = "myth_busting",
  BEST_PRACTICES = "best_practices",
  GETTING_STARTED = "getting_started",
  ADVANCED = "advanced",
  TROUBLESHOOTING = "troubleshooting"
}

enum ContentTone {
  PROFESSIONAL = "professional",
  CASUAL = "casual",
  FRIENDLY = "friendly",
  AUTHORITATIVE = "authoritative",
  CONVERSATIONAL = "conversational"
}

enum ContentLength {
  SHORT = "short",      // ~500 words
  MEDIUM = "medium",    // ~1500 words
  LONG = "long",        // ~2500 words
  EXTENDED = "extended" // ~4000 words
}
```

### React Hook Example

```typescript
import { useState } from 'react';

interface BlogGenerationOptions {
  topic: string;
  keywords: string[];
  mode?: "quick_generate" | "multi_phase";
  gsc_site_url?: string | null;
  siteId?: string;  // Your site identifier
  // ... other options
}

const useBlogGeneration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const generateBlog = async (options: BlogGenerationOptions) => {
    setLoading(true);
    setError(null);
    
    try {
      // Map site ID to GSC site URL (if you have multiple sites)
      const siteUrlMap: Record<string, string> = {
        "site-1": "https://site1.com",
        "site-2": "https://site2.com",
        "site-3": "sc-domain:example.com"
      };
      
      const gscSiteUrl = options.gsc_site_url || 
                        (options.siteId ? siteUrlMap[options.siteId] : null);
      
      const requestBody: EnhancedBlogGenerationRequest = {
        topic: options.topic,
        keywords: options.keywords,
        mode: options.mode || "quick_generate",
        gsc_site_url: gscSiteUrl || undefined,  // Only include if provided
        // ... other fields
      };
      
      const response = await fetch('/api/v1/blog/generate-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Blog generation failed');
      }
      
      const data = await response.json();
      
      // Check for warnings
      if (data.warnings && data.warnings.length > 0) {
        console.warn('Blog generation warnings:', data.warnings);
        // Display warnings to user (non-blocking)
      }
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return { generateBlog, loading, error };
};
```

### Component Example

```typescript
import React, { useState } from 'react';
import { useBlogGeneration } from './useBlogGeneration';

const BlogGeneratorForm: React.FC = () => {
  const { generateBlog, loading, error } = useBlogGeneration();
  const [siteUrl, setSiteUrl] = useState<string>('');
  const [mode, setMode] = useState<"quick_generate" | "multi_phase">("quick_generate");
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData(e.target as HTMLFormElement);
    const topic = formData.get('topic') as string;
    const keywords = (formData.get('keywords') as string).split(',').map(k => k.trim());
    
    try {
      const result = await generateBlog({
        topic,
        keywords,
        mode,
        gsc_site_url: siteUrl || null,  // Pass site URL if provided
      });
      
      // Handle success
      console.log('Blog generated:', result);
    } catch (err) {
      // Error already handled in hook
      console.error('Generation failed:', err);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Topic:</label>
        <input type="text" name="topic" required />
      </div>
      
      <div>
        <label>Keywords (comma-separated):</label>
        <input type="text" name="keywords" required />
      </div>
      
      <div>
        <label>Generation Mode:</label>
        <select value={mode} onChange={(e) => setMode(e.target.value as any)}>
          <option value="quick_generate">Quick Generate (Fast, Cost-Effective)</option>
          <option value="multi_phase">Multi-Phase (Premium Quality)</option>
        </select>
      </div>
      
      {/* NEW: Google Search Console Site URL */}
      <div>
        <label>
          Google Search Console Site URL (Optional):
          <small>
            {mode === "multi_phase" 
              ? " Recommended for site-specific insights"
              : " Optional: Provides keyword performance data"}
          </small>
        </label>
        <input
          type="text"
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
          placeholder="https://example.com or sc-domain:example.com"
        />
        <small>
          Leave empty to use default site, or provide site-specific URL
        </small>
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Generating...' : 'Generate Blog'}
      </button>
      
      {error && <div className="error">{error}</div>}
    </form>
  );
};
```

---

## ⚠️ Error Handling

### Common Errors

#### 1. Google Search Console Not Configured

**Error:** `503 Service Unavailable`

**Message:** `"Google Search Console not configured (GSC_SITE_URL)"`

**Solution:**
- Provide `gsc_site_url` in request, OR
- Configure default `GSC_SITE_URL` in backend

**Frontend Handling:**
```typescript
if (error.status === 503 && error.message.includes('Search Console')) {
  // Show warning, but allow generation to continue
  console.warn('Search Console not available, continuing without GSC data');
}
```

#### 2. Multi-Phase Mode Requires Citations

**Error:** `503 Service Unavailable`

**Message:** `"Google Custom Search API is required for Multi-Phase workflow citations"`

**Solution:**
- Ensure Google Custom Search is configured in backend
- This is a backend configuration issue

**Frontend Handling:**
```typescript
if (error.status === 503 && error.message.includes('Custom Search')) {
  // Show error to user
  alert('Multi-Phase mode requires Google Custom Search. Please contact support.');
}
```

#### 3. API Unavailable Warnings

**Response includes:** `warnings` array

**Example:**
```json
{
  "title": "Blog Title",
  "content": "...",
  "warnings": [
    "API_UNAVAILABLE: Google Search Console data unavailable",
    "API_ERROR: Citation generation failed"
  ]
}
```

**Frontend Handling:**
```typescript
if (result.warnings && result.warnings.length > 0) {
  // Display non-blocking warnings
  result.warnings.forEach(warning => {
    console.warn(warning);
    // Show toast notification or warning banner
  });
}
```

---

## ✅ Best Practices

### 1. **Site URL Management**

**For Single Site:**
- Don't provide `gsc_site_url` (uses default)
- Configure default in backend

**For Multiple Sites:**
- Store site URLs in your frontend config
- Map site IDs to GSC site URLs
- Pass `gsc_site_url` per request

**Example:**
```typescript
const SITE_CONFIG = {
  "site-1": {
    name: "Main Site",
    gsc_url: "https://mainsite.com"
  },
  "site-2": {
    name: "Blog Site",
    gsc_url: "https://blog.example.com"
  }
};
```

### 2. **Mode Selection**

**Use Quick Generate When:**
- ✅ High volume content needs
- ✅ Quick turnaround required
- ✅ Standard blog content
- ✅ Budget-conscious

**Use Multi-Phase When:**
- ✅ Premium content needed
- ✅ Maximum SEO impact required
- ✅ Citations needed
- ✅ Comprehensive research required

### 3. **Google Search Console Usage**

**Always Provide `gsc_site_url` When:**
- ✅ You have site-specific performance data
- ✅ You want content gap analysis
- ✅ You want opportunity identification
- ✅ Multi-site setup

**Optional But Recommended:**
- Even for Quick Generate mode
- Provides keyword performance context
- Helps identify content opportunities

### 4. **Error Handling**

**Always Check:**
- ✅ Response `warnings` array
- ✅ HTTP status codes
- ✅ Error messages for actionable items

**Display Warnings:**
- Non-blocking notifications
- Inform user but don't block workflow
- Log for monitoring

---

## 📊 Response Model

```typescript
interface EnhancedBlogGenerationResponse {
  title: string;
  content: string;
  excerpt?: string | null;
  meta_description?: string | null;
  seo_metadata?: {
    keywords?: string[];
    readability_score?: number;
    word_count?: number;
    // ... other SEO data
  };
  warnings?: string[];  // NEW: Non-blocking warnings
  // ... other fields
}
```

---

## 🔄 Migration Guide

### From Previous Version

**Changes:**
1. ✅ Added `gsc_site_url` field (optional)
2. ✅ `mode` field now required (defaults to `"quick_generate"`)
3. ✅ `custom_instructions` max length increased to 5000
4. ✅ Response includes `warnings` array

**Migration Steps:**

1. **Update TypeScript Interfaces:**
   ```typescript
   // Add gsc_site_url field
   gsc_site_url?: string | null;
   ```

2. **Update Request Logic:**
   ```typescript
   // Map site IDs to GSC URLs if needed
   const gscSiteUrl = getSiteUrl(siteId);
   ```

3. **Handle Warnings:**
   ```typescript
   // Check and display warnings
   if (response.warnings) {
     displayWarnings(response.warnings);
   }
   ```

---

## 📞 Support

**Questions?**
- Check API documentation: `/docs` endpoint
- Review error messages for specific issues
- Check backend logs for detailed errors

**Common Issues:**
- GSC site URL format: Use `https://example.com` or `sc-domain:example.com`
- Service account access: Ensure GSC access is granted
- Multiple sites: Use per-request `gsc_site_url`

---

## 📝 Summary

**Key Updates:**
1. ✅ **Multi-site GSC support** - Pass `gsc_site_url` per request
2. ✅ **Mode selection** - Choose `quick_generate` or `multi_phase`
3. ✅ **GSC integration** - Works for both modes
4. ✅ **Warnings array** - Check for non-blocking issues
5. ✅ **Increased limits** - `custom_instructions` now 5000 chars

**Required Changes:**
- Add `gsc_site_url` field to request model (optional)
- Handle `warnings` array in response
- Update mode selection UI

**Optional Enhancements:**
- Site URL mapping for multi-site setups
- Warning display UI
- Mode recommendation logic

