# Frontend Update: AI Topic Suggestions Endpoint

## ✅ No Endpoint Change Required

**Endpoint**: `POST /api/v1/keywords/ai-topic-suggestions`  
**Status**: Same endpoint, enhanced functionality

---

## 🔄 Optional Frontend Updates

### Option 1: No Changes Needed (Backward Compatible)

The endpoint is **backward compatible**. If your frontend currently sends:
```typescript
{
  keywords: ['pet grooming']
}
```

It will continue to work exactly as before. The endpoint will:
- Use the provided keywords
- Return enhanced topic suggestions with more fields
- Your existing code will work, but won't display the new fields

### Option 2: Enhanced Integration (Recommended)

To take advantage of the new features, update your frontend to:

#### 1. Update Request Interface

```typescript
interface AITopicSuggestionsRequest {
  // Existing (still works)
  keywords?: string[];
  
  // NEW: Send content objective instead of keywords
  content_objective?: string;    // e.g., "I want to write articles about concrete remediation"
  target_audience?: string;       // e.g., "general consumers"
  industry?: string;              // e.g., "Construction"
  content_goals?: string[];       // e.g., ["SEO & Rankings", "Engagement"]
  
  // Existing fields (unchanged)
  location?: string;
  language?: string;
  include_ai_search_volume?: boolean;
  include_llm_mentions?: boolean;
  include_llm_responses?: boolean;
  limit?: number;
}
```

#### 2. Update Response Interface

```typescript
interface TopicSuggestion {
  topic: string;                    // Full blog post idea (e.g., "Complete Guide to Concrete Remediation")
  source_keyword: string;
  ai_search_volume: number;
  mentions: number;
  
  // NEW fields available
  search_volume: number;            // Traditional search volume
  difficulty: number;                // 0-100
  competition: number;               // 0-1
  cpc: number;                       // Cost per click
  ranking_score: number;             // 0-100
  opportunity_score: number;         // 0-100
  estimated_traffic: number;
  reason: string;                    // Why this topic would rank well
  related_keywords: string[];       // Up to 5 related keywords
  source: "ai_generated" | "llm_mentions" | "top_cited_pages" | "llm_responses";
}
```

#### 3. Update Your API Call

**Before:**
```typescript
const response = await fetch('/api/v1/keywords/ai-topic-suggestions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keywords: ['concrete remediation']
  })
});
```

**After (Enhanced):**
```typescript
const response = await fetch('/api/v1/keywords/ai-topic-suggestions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content_objective: 'I want to write articles about concrete remediation',
    target_audience: 'general consumers',
    industry: 'Construction',
    content_goals: ['SEO & Rankings', 'Engagement'],
    limit: 50
  })
});
```

---

## 📊 What Changed

### Request Changes
- ✅ `keywords` is now **optional** (was required)
- ✅ New optional fields: `content_objective`, `target_audience`, `industry`, `content_goals`
- ✅ If `content_objective` is provided, keywords are automatically extracted

### Response Changes
- ✅ `topic` field now contains **full blog post ideas** (not just keywords)
- ✅ Added: `search_volume`, `difficulty`, `competition`, `cpc`
- ✅ Added: `ranking_score`, `opportunity_score`, `estimated_traffic`
- ✅ Added: `reason`, `related_keywords`
- ✅ `source` now includes `"ai_generated"` option

---

## 🎯 Benefits of Updating

1. **Better Topic Quality**: Full blog post ideas instead of word variations
2. **More Context**: Send content objective, audience, industry for better results
3. **Richer Data**: Access to search volume, difficulty, ranking scores
4. **Better UX**: Display reasons why topics rank well

---

## ⚠️ Breaking Changes

**None!** The endpoint is fully backward compatible. Existing code will continue to work.

---

## 📝 Migration Checklist

- [ ] Update TypeScript interfaces (optional)
- [ ] Update API call to use `content_objective` (optional)
- [ ] Update UI to display new fields (optional)
- [ ] Test with existing `keywords` parameter (should still work)
- [ ] Test with new `content_objective` parameter

---

**Status**: ✅ No breaking changes. Updates are optional but recommended for better results.
