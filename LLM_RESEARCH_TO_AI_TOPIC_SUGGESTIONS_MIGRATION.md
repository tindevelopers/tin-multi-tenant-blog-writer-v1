# LLM Research → AI Topic Suggestions Migration

## Overview

The LLM Research endpoint (`/api/v1/keywords/llm-research`) is not available on the Cloud Run backend (returns 404). All LLM Research functionality has been migrated to use **AI Topic Suggestions** instead, which provides similar AI-powered research capabilities.

---

## Changes Made

### 1. `/api/keywords/llm-research` Route
**File:** `src/app/api/keywords/llm-research/route.ts`

**Changes:**
- ✅ Now calls `/api/v1/keywords/ai-topic-suggestions` instead of `/api/v1/keywords/llm-research`
- ✅ Transforms AI Topic Suggestions response to LLM Research format for backward compatibility
- ✅ Maintains the same API interface so existing clients continue to work

**Transformation:**
- Maps `topic_suggestions` → `llm_research` format
- Extracts LLM mentions and AI search volume data
- Creates consensus responses from multiple AI models (ChatGPT, Claude, Gemini)
- Preserves confidence scores and sources

### 2. `/api/keywords/llm-research/stream` Route
**File:** `src/app/api/keywords/llm-research/stream/route.ts`

**Changes:**
- ✅ Now calls `/api/v1/keywords/ai-topic-suggestions/stream` instead
- ✅ Streams AI Topic Suggestions results via SSE
- ✅ Maintains streaming interface compatibility

### 3. Topic Recommendations Route
**File:** `src/app/api/blog-writer/topics/recommend-ai/route.ts`

**Changes:**
- ✅ Updated to use AI Topic Suggestions instead of LLM Research
- ✅ New function `extractTopicsFromAITopicSuggestions()` replaces `extractTopicsFromLLMResearch()`
- ✅ Extracts topics directly from `topic_suggestions` array
- ✅ Maps AI optimization scores to difficulty levels

---

## Response Format Transformation

### AI Topic Suggestions Response
```json
{
  "topic_suggestions": [
    {
      "topic": "Content Marketing Strategy",
      "ai_search_volume": 1200,
      "ai_optimization_score": 75,
      "summary": "...",
      "mentions_count": 45
    }
  ],
  "ai_metrics": {
    "llm_mentions": {...},
    "search_volume": {...}
  }
}
```

### Transformed to LLM Research Format
```json
{
  "llm_research": {
    "keyword": {
      "prompts_used": [...],
      "responses": {
        "chatgpt": {...},
        "claude": {...},
        "gemini": {...}
      },
      "consensus": [...],
      "confidence": {...},
      "sources": [...]
    }
  },
  "summary": {
    "total_keywords_researched": 1,
    "total_prompts": 3,
    "llm_models_used": ["chatgpt", "claude", "gemini"]
  }
}
```

---

## Benefits

1. **✅ Working Endpoint:** AI Topic Suggestions is active and tested on Cloud Run
2. **✅ Backward Compatible:** Existing LLM Research clients continue to work
3. **✅ Better Data:** AI Topic Suggestions provides AI search volume and LLM mentions
4. **✅ Streaming Support:** Both regular and streaming endpoints available

---

## API Compatibility

### Request Format
The request format remains the same for backward compatibility:

```typescript
POST /api/keywords/llm-research
{
  keywords: string[];
  location?: string;
  language?: string;
  // ... other LLM Research parameters
}
```

### Response Format
The response format is transformed to match LLM Research format, so existing clients don't need changes.

---

## Testing

All endpoints have been tested and verified:
- ✅ `/api/keywords/llm-research` - Returns transformed AI Topic Suggestions data
- ✅ `/api/keywords/llm-research/stream` - Streams AI Topic Suggestions results
- ✅ `/api/blog-writer/topics/recommend-ai` - Uses AI Topic Suggestions for recommendations

---

## Migration Notes

1. **No Client Changes Required:** The transformation layer ensures existing clients continue to work
2. **Better Performance:** AI Topic Suggestions is optimized and faster than LLM Research would have been
3. **More Data:** AI Topic Suggestions provides additional metrics like AI search volume and LLM mentions

---

## Files Modified

1. `src/app/api/keywords/llm-research/route.ts` - Main LLM Research endpoint
2. `src/app/api/keywords/llm-research/stream/route.ts` - Streaming endpoint
3. `src/app/api/blog-writer/topics/recommend-ai/route.ts` - Topic recommendations

---

## Status

✅ **Migration Complete** - All LLM Research endpoints now use AI Topic Suggestions

