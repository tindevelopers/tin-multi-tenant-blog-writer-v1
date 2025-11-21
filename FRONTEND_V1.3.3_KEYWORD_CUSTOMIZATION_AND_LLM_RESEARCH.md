# Frontend Integration Guide: Keyword Customization & LLM Research

**API Version**: 1.3.3  
**Date**: 2025-11-19  
**Status**: ✅ Ready for Integration

---

## 🎯 Overview

Version 1.3.3 introduces **full customization** for keyword analysis and a **separate LLM research endpoint** with SSE streaming support. This update provides granular control over keyword analysis parameters and powerful AI-powered research capabilities.

### Key Features

1. **Full Customization** - Control SERP depth, related keywords, keyword ideas, and AI volume
2. **Search Type Presets** - Quick setup for common use cases (competitor analysis, content research, etc.)
3. **Separate LLM Research** - Dedicated endpoint for AI-powered keyword research
4. **SSE Streaming** - Real-time progress updates for both keyword analysis and LLM research
5. **Backward Compatible** - All existing requests continue to work

---

## 📋 What's New

### 1. Enhanced Keyword Analysis Customization

The `/api/v1/keywords/enhanced` endpoint now supports extensive customization:

- **SERP Analysis**: Control depth, prompts, analysis type, and features
- **Related Keywords**: Customize graph traversal depth and result limits
- **Keyword Ideas**: Filter by type (questions/topics/all) and set limits
- **AI Volume**: Toggle inclusion and set historical timeframe

### 2. Search Type Presets

Quick setup for common scenarios:

- `competitor_analysis` - Deep competitor research
- `content_research` - Comprehensive content research
- `quick_analysis` - Fast metrics without deep analysis
- `comprehensive_analysis` - Full analysis with all features
- `enhanced_keyword_analysis` - Balanced default (unchanged)

### 3. New LLM Research Endpoints

**Separate endpoints** for AI-powered research:

- `POST /api/v1/keywords/llm-research` - Standard endpoint
- `POST /api/v1/keywords/llm-research/stream` - SSE streaming endpoint

### 4. Enhanced Streaming

Both endpoints support SSE streaming with detailed progress updates.

---

## 🔧 API Changes

### Enhanced Keyword Analysis Request

**Endpoint**: `POST /api/v1/keywords/enhanced`

**New Request Fields:**

```typescript
interface EnhancedKeywordAnalysisRequest {
  // Existing fields
  keywords: string[];
  location?: string;
  language?: string;
  search_type?: string;  // NEW: Preset configurations
  include_serp?: boolean;
  max_suggestions_per_keyword?: number;
  
  // NEW: SERP Customization
  serp_depth?: number;                    // Default: 20, Range: 5-100
  serp_prompt?: string;                    // Custom prompt for AI summary
  include_serp_features?: string[];        // Default: ["featured_snippet", "people_also_ask", "videos", "images"]
  serp_analysis_type?: "basic" | "ai_summary" | "both";  // Default: "both"
  
  // NEW: Related Keywords Customization
  related_keywords_depth?: number;        // Default: 1, Range: 1-4
  related_keywords_limit?: number;        // Default: 20, Range: 5-100
  
  // NEW: Keyword Ideas Customization
  keyword_ideas_limit?: number;            // Default: 50, Range: 10-200
  keyword_ideas_type?: "all" | "questions" | "topics";  // Default: "all"
  
  // NEW: AI Volume Customization
  include_ai_volume?: boolean;             // Default: true
  ai_volume_timeframe?: number;            // Default: 12, Range: 1-24 (months)
}
```

### LLM Research Request

**Endpoint**: `POST /api/v1/keywords/llm-research`

**Request Model:**

```typescript
interface LLMResearchRequest {
  keywords: string[];                      // Max 10 keywords
  prompts?: string[];                      // Optional: Auto-generated if not provided
  llm_models?: string[];                   // Default: ["chatgpt", "claude", "gemini"]
  max_tokens?: number;                     // Default: 500, Range: 100-2000
  location?: string;                       // Default: "United States"
  language?: string;                       // Default: "en"
  include_consensus?: boolean;             // Default: true
  include_sources?: boolean;               // Default: true
  research_type?: "quick" | "comprehensive" | "fact_check" | "content_research";  // Default: "comprehensive"
}
```

---

## 📊 Search Type Presets

### competitor_analysis

**Use Case**: Analyze competitor content and identify gaps

**Defaults Applied:**
```typescript
{
  include_serp: true,
  serp_depth: 30,
  serp_analysis_type: "both",
  related_keywords_depth: 2,
  related_keywords_limit: 30,
  keyword_ideas_limit: 100,
  max_suggestions_per_keyword: 100
}
```

### content_research

**Use Case**: Deep research for comprehensive content

**Defaults Applied:**
```typescript
{
  keyword_ideas_limit: 100,
  related_keywords_depth: 2,
  related_keywords_limit: 50,
  max_suggestions_per_keyword: 100,
  include_ai_volume: true
}
```

### quick_analysis

**Use Case**: Fast keyword metrics without deep analysis

**Defaults Applied:**
```typescript
{
  max_suggestions_per_keyword: 10,
  include_serp: false,
  include_ai_volume: false,
  related_keywords_limit: 10,
  keyword_ideas_limit: 20,
  serp_depth: 10
}
```

### comprehensive_analysis

**Use Case**: Full analysis with all features

**Defaults Applied:**
```typescript
{
  max_suggestions_per_keyword: 150,
  include_serp: true,
  serp_depth: 50,
  related_keywords_depth: 3,
  related_keywords_limit: 100,
  keyword_ideas_limit: 200,
  include_ai_volume: true
}
```

### enhanced_keyword_analysis (default)

**Use Case**: Balanced analysis with good coverage

**Defaults Applied:**
- Current behavior (no changes)
- All features enabled with moderate limits

---

## 💻 Frontend Integration

### TypeScript Types

```typescript
// Enhanced Keyword Analysis Request
interface EnhancedKeywordAnalysisRequest {
  keywords: string[];
  location?: string;
  language?: string;
  search_type?: 
    | "competitor_analysis"
    | "content_research"
    | "quick_analysis"
    | "comprehensive_analysis"
    | "enhanced_keyword_analysis";
  include_serp?: boolean;
  max_suggestions_per_keyword?: number;
  
  // SERP Customization
  serp_depth?: number;
  serp_prompt?: string;
  include_serp_features?: string[];
  serp_analysis_type?: "basic" | "ai_summary" | "both";
  
  // Related Keywords
  related_keywords_depth?: number;
  related_keywords_limit?: number;
  
  // Keyword Ideas
  keyword_ideas_limit?: number;
  keyword_ideas_type?: "all" | "questions" | "topics";
  
  // AI Volume
  include_ai_volume?: boolean;
  ai_volume_timeframe?: number;
}

// LLM Research Request
interface LLMResearchRequest {
  keywords: string[];  // Max 10
  prompts?: string[];
  llm_models?: string[];
  max_tokens?: number;
  location?: string;
  language?: string;
  include_consensus?: boolean;
  include_sources?: boolean;
  research_type?: "quick" | "comprehensive" | "fact_check" | "content_research";
}

// Progress Update (for SSE streaming)
interface ProgressUpdate {
  stage: string;
  stage_number: number;
  total_stages: number;
  progress_percentage: number;
  status: string;
  details?: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

// LLM Research Response
interface LLMResearchResponse {
  llm_research: Record<string, {
    prompts_used: string[];
    responses: Record<string, Record<string, {
      text: string;
      tokens: number;
      model: string;
      timestamp: string;
    }>>;
    consensus?: string[];
    differences?: string[];
    sources?: Array<{ url: string; title: string }>;
    confidence?: {
      chatgpt: number;
      claude: number;
      gemini: number;
      average: number;
    };
  }>;
  summary: {
    total_keywords_researched: number;
    total_prompts: number;
    total_llm_queries: number;
    llm_models_used: string[];
    average_confidence: number;
    sources_found: number;
    research_type: string;
  };
}
```

### API Client Functions

```typescript
// Enhanced Keyword Analysis with Customization
async function analyzeKeywordsEnhanced(
  request: EnhancedKeywordAnalysisRequest
): Promise<EnhancedKeywordAnalysisResponse> {
  const response = await fetch('/api/v1/keywords/enhanced', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`);
  }

  return response.json();
}

// Enhanced Keyword Analysis with SSE Streaming
async function analyzeKeywordsEnhancedStreaming(
  request: EnhancedKeywordAnalysisRequest,
  onProgress: (update: ProgressUpdate) => void,
  onComplete: (result: EnhancedKeywordAnalysisResponse) => void,
  onError: (error: Error) => void
) {
  const response = await fetch('/api/v1/keywords/enhanced/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    onError(new Error(`Request failed: ${response.statusText}`));
    return;
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    onError(new Error('No response body'));
    return;
  }

  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));

          if (data.type === 'complete') {
            onComplete(data.result);
          } else if (data.type === 'error') {
            onError(new Error(data.error));
          } else {
            onProgress(data as ProgressUpdate);
          }
        } catch (e) {
          console.error('Failed to parse SSE data:', e);
        }
      }
    }
  }
}

// LLM Research (Standard)
async function performLLMResearch(
  request: LLMResearchRequest
): Promise<LLMResearchResponse> {
  const response = await fetch('/api/v1/keywords/llm-research', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`LLM research failed: ${response.statusText}`);
  }

  return response.json();
}

// LLM Research with SSE Streaming
async function performLLMResearchStreaming(
  request: LLMResearchRequest,
  onProgress: (update: ProgressUpdate) => void,
  onComplete: (result: LLMResearchResponse) => void,
  onError: (error: Error) => void
) {
  const response = await fetch('/api/v1/keywords/llm-research/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    onError(new Error(`Request failed: ${response.statusText}`));
    return;
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    onError(new Error('No response body'));
    return;
  }

  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));

          if (data.type === 'complete') {
            onComplete(data.result);
          } else if (data.type === 'error') {
            onError(new Error(data.error));
          } else {
            onProgress(data as ProgressUpdate);
          }
        } catch (e) {
          console.error('Failed to parse SSE data:', e);
        }
      }
    }
  }
}
```

### React Hooks

```typescript
import { useState, useCallback } from 'react';

// Enhanced Keyword Analysis Hook
function useEnhancedKeywordAnalysis() {
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [result, setResult] = useState<EnhancedKeywordAnalysisResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const analyze = useCallback(async (request: EnhancedKeywordAnalysisRequest) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgress(null);

    try {
      await analyzeKeywordsEnhancedStreaming(
        request,
        (update) => setProgress(update),
        (data) => {
          setResult(data);
          setIsLoading(false);
        },
        (err) => {
          setError(err);
          setIsLoading(false);
        }
      );
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
    }
  }, []);

  return {
    analyze,
    progress,
    result,
    error,
    isLoading
  };
}

// LLM Research Hook
function useLLMResearch() {
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [result, setResult] = useState<LLMResearchResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const research = useCallback(async (request: LLMResearchRequest) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgress(null);

    try {
      await performLLMResearchStreaming(
        request,
        (update) => setProgress(update),
        (data) => {
          setResult(data);
          setIsLoading(false);
        },
        (err) => {
          setError(err);
          setIsLoading(false);
        }
      );
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
    }
  }, []);

  return {
    research,
    progress,
    result,
    error,
    isLoading
  };
}
```

### Usage Examples

#### Example 1: Using Search Type Presets

```typescript
// Quick competitor analysis with preset
const { analyze, progress, result } = useEnhancedKeywordAnalysis();

const handleCompetitorAnalysis = () => {
  analyze({
    keywords: ['pet grooming'],
    search_type: 'competitor_analysis'  // Applies all competitor defaults
  });
};

// Custom override with preset
analyze({
  keywords: ['pet grooming'],
  search_type: 'competitor_analysis',
  serp_depth: 50  // Override default (30) to get more results
});
```

#### Example 2: Full Customization

```typescript
// Complete control over all parameters
analyze({
  keywords: ['pet grooming', 'dog care'],
  location: 'United Kingdom',
  language: 'en',
  
  // SERP customization
  include_serp: true,
  serp_depth: 50,
  serp_prompt: 'What content gaps exist in top results?',
  serp_analysis_type: 'ai_summary',
  include_serp_features: ['featured_snippet', 'people_also_ask'],
  
  // Related keywords
  related_keywords_depth: 3,
  related_keywords_limit: 100,
  
  // Keyword ideas
  keyword_ideas_limit: 200,
  keyword_ideas_type: 'questions',  // Only question-type keywords
  
  // AI volume
  include_ai_volume: true,
  ai_volume_timeframe: 24  // 24 months of historical data
});
```

#### Example 3: LLM Research

```typescript
const { research, progress, result } = useLLMResearch();

// Quick research
research({
  keywords: ['pet grooming'],
  research_type: 'quick',
  llm_models: ['chatgpt', 'claude']
});

// Comprehensive research with custom prompts
research({
  keywords: ['pet grooming', 'dog care'],
  prompts: [
    'What are the key topics about pet grooming?',
    'What are common misconceptions?',
    'What questions do people ask?'
  ],
  research_type: 'comprehensive',
  llm_models: ['chatgpt', 'claude', 'gemini'],
  include_consensus: true,
  include_sources: true
});
```

#### Example 4: Using Both Endpoints Together

```typescript
// Sequential: Research first, then analyze
const performCompleteResearch = async (keywords: string[]) => {
  // Step 1: Get LLM insights
  const llmResult = await performLLMResearch({
    keywords,
    research_type: 'content_research'
  });
  
  // Step 2: Use insights to inform keyword analysis
  const analysisResult = await analyzeKeywordsEnhanced({
    keywords,
    search_type: 'competitor_analysis',
    serp_prompt: llmResult.llm_research[keywords[0]].consensus?.[0]
  });
  
  return { llmResult, analysisResult };
};

// Parallel: Both at the same time
const performParallelResearch = async (keywords: string[]) => {
  const [analysisResult, llmResult] = await Promise.all([
    analyzeKeywordsEnhanced({
      keywords,
      search_type: 'comprehensive_analysis'
    }),
    performLLMResearch({
      keywords,
      research_type: 'comprehensive'
    })
  ]);
  
  return { analysisResult, llmResult };
};
```

---

## 🔄 Migration Guide

### From v1.3.2 to v1.3.3

**No Breaking Changes** - All existing requests continue to work.

**Optional Enhancements:**

1. **Add Search Type Presets** (Recommended)
   ```typescript
   // Before
   analyze({
     keywords: ['pet grooming'],
     include_serp: true,
     max_suggestions_per_keyword: 100
   });
   
   // After (using preset)
   analyze({
     keywords: ['pet grooming'],
     search_type: 'competitor_analysis'  // Same result, cleaner code
   });
   ```

2. **Use Customization Variables** (Optional)
   ```typescript
   // Add granular control when needed
   analyze({
     keywords: ['pet grooming'],
     serp_depth: 50,
     related_keywords_limit: 100,
     keyword_ideas_type: 'questions'
   });
   ```

3. **Add LLM Research** (New Feature)
   ```typescript
   // New endpoint for AI research
   const llmResult = await performLLMResearch({
     keywords: ['pet grooming'],
     research_type: 'comprehensive'
   });
   ```

---

## 📊 Response Structure

### Enhanced Keyword Analysis Response

**Unchanged** - Same structure as v1.3.2, with improved data quality.

### LLM Research Response

**New Response Structure:**

```typescript
{
  llm_research: {
    "pet grooming": {
      prompts_used: string[];
      responses: {
        [prompt: string]: {
          chatgpt: { text: string; tokens: number; model: string; timestamp: string };
          claude: { text: string; tokens: number; model: string; timestamp: string };
          gemini: { text: string; tokens: number; model: string; timestamp: string };
        }
      };
      consensus?: string[];
      differences?: string[];
      sources?: Array<{ url: string; title: string }>;
      confidence?: {
        chatgpt: number;
        claude: number;
        gemini: number;
        average: number;
      };
    }
  };
  summary: {
    total_keywords_researched: number;
    total_prompts: number;
    total_llm_queries: number;
    llm_models_used: string[];
    average_confidence: number;
    sources_found: number;
    research_type: string;
  };
}
```

---

## 🎯 Best Practices

### 1. Use Search Type Presets

Presets provide optimized defaults for common scenarios:

```typescript
// ✅ Good: Use preset
analyze({ keywords: ['pet grooming'], search_type: 'competitor_analysis' });

// ⚠️ Less optimal: Manual configuration
analyze({
  keywords: ['pet grooming'],
  include_serp: true,
  serp_depth: 30,
  related_keywords_depth: 2,
  // ... many more fields
});
```

### 2. Override Presets When Needed

Presets can be overridden for specific needs:

```typescript
analyze({
  keywords: ['pet grooming'],
  search_type: 'competitor_analysis',
  serp_depth: 50  // Override default 30
});
```

### 3. Use LLM Research Separately

LLM research is expensive - use it when needed:

```typescript
// ✅ Good: Use LLM research for content planning
const llmResult = await performLLMResearch({
  keywords: ['pet grooming'],
  research_type: 'content_research'
});

// Then use insights for keyword analysis
analyze({
  keywords: ['pet grooming'],
  serp_prompt: llmResult.llm_research['pet grooming'].consensus?.[0]
});
```

### 4. Monitor Progress with SSE

Use streaming endpoints for better UX:

```typescript
// ✅ Good: Show progress
analyzeKeywordsEnhancedStreaming(
  request,
  (update) => {
    updateProgressBar(update.progress_percentage);
    showStatus(update.status);
  },
  (result) => displayResults(result),
  (error) => showError(error)
);
```

### 5. Handle Errors Gracefully

```typescript
try {
  const result = await analyzeKeywordsEnhanced(request);
  // Process result
} catch (error) {
  if (error.message.includes('503')) {
    // Service unavailable - retry or show message
  } else if (error.message.includes('400')) {
    // Invalid request - show validation error
  } else {
    // Generic error handling
  }
}
```

---

## 💰 Cost Considerations

### Keyword Analysis

- **Base Cost**: Same as v1.3.2
- **Customization Impact**: 
  - Higher `serp_depth` = More API calls
  - Higher `related_keywords_limit` = More API calls
  - Higher `keyword_ideas_limit` = More API calls
  - `include_ai_volume: false` = Saves costs

### LLM Research

- **Per Request**: ~$0.12-0.18 per keyword (3 models, 2 prompts)
- **Cost Optimization**:
  - Use `research_type: "quick"` for single prompt
  - Use fewer models: `llm_models: ['chatgpt']`
  - Limit keywords: Max 10 per request (enforced)

---

## ⚠️ Breaking Changes

**None** - This is a backward-compatible update.

---

## 📝 Summary

### What's New

1. ✅ Full customization for keyword analysis
2. ✅ Search type presets for quick setup
3. ✅ Separate LLM research endpoints
4. ✅ SSE streaming for LLM research
5. ✅ Enhanced progress tracking

### Migration Required

**None** - All existing code continues to work.

### Recommended Updates

1. Use search type presets for cleaner code
2. Add LLM research for content planning
3. Use streaming endpoints for better UX
4. Leverage customization for specific needs

---

## 🔗 Related Documentation

- [LLM Research Endpoint Guide](./LLM_RESEARCH_ENDPOINT_GUIDE.md) - Detailed LLM research documentation
- [SSE Streaming Implementation](./SSE_STREAMING_IMPLEMENTATION.md) - Streaming architecture details
- [AI Enhancement Plan](./AI_ENHANCEMENT_PLAN.md) - Implementation plan and rationale

---

**API Version**: 1.3.3  
**Last Updated**: 2025-11-19  
**Status**: ✅ Production Ready

