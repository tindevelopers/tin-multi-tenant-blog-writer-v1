# Enhanced Endpoint Verification Test

## Test Plan for `/api/v1/blog/generate-enhanced`

### 1. Endpoint Configuration Verification

**Location:** `src/app/api/blog-writer/generate/route.ts`

**Expected Configuration:**
- ✅ Endpoint: `/api/v1/blog/generate-enhanced`
- ✅ Base URL: `process.env.BLOG_WRITER_API_URL` or default
- ✅ Always enabled: `shouldUseEnhanced = true`
- ✅ Method: POST
- ✅ Headers: Content-Type, Authorization (if API_KEY present)

### 2. Required Parameters Check

The enhanced endpoint should receive:

#### Core Parameters:
- ✅ `topic` - Required
- ✅ `keywords` - Array of keywords
- ✅ `target_audience` - String
- ✅ `tone` - String
- ✅ `word_count` - Number
- ✅ `content_format` - Should be 'html'
- ✅ `include_formatting` - Boolean
- ✅ `include_images` - Boolean

#### Enhanced Parameters:
- ✅ `custom_instructions` - Optional, string
- ✅ `template_type` - Optional, string
- ✅ `length` - Mapped from UI ('short', 'medium', 'long', 'extended')
- ✅ `use_google_search` - Boolean
- ✅ `use_fact_checking` - Boolean
- ✅ `use_citations` - Boolean
- ✅ `use_serp_optimization` - Boolean
- ✅ `use_consensus_generation` - Boolean
- ✅ `use_knowledge_graph` - Boolean
- ✅ `use_semantic_keywords` - Boolean
- ✅ `use_quality_scoring` - Boolean
- ✅ `enhanced_keyword_insights` - Object (if available)
- ✅ `system_prompt` - String (if content goal prompt exists)
- ✅ `user_prompt_template` - String (if content goal prompt exists)
- ✅ `additional_instructions` - Object (if content goal prompt exists)
- ✅ `content_goal` - String (if content goal prompt exists)

### 3. Code Verification Checklist

#### ✅ Endpoint Selection (Line 252)
```typescript
const endpoint = '/api/v1/blog/generate-enhanced';
```
**Status:** ✅ Correct - Always uses enhanced endpoint

#### ✅ Request URL Construction (Line 567)
```typescript
const response = await fetch(`${API_BASE_URL}${endpoint}`, {
```
**Status:** ✅ Correct - Uses API_BASE_URL + endpoint

#### ✅ Request Method (Line 568)
```typescript
method: 'POST',
```
**Status:** ✅ Correct

#### ✅ Headers (Lines 569-572)
```typescript
headers: {
  'Content-Type': 'application/json',
  ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
}
```
**Status:** ✅ Correct

#### ✅ Topic Injection (Lines 448-451)
```typescript
const topicSpecificInstruction = `Write a comprehensive blog post about: ${topic}...`;
requestPayload.system_prompt = `${contentGoalPrompt.system_prompt}\n\n${topicSpecificInstruction}`;
```
**Status:** ✅ Correct - Topic is always included

#### ✅ Length Mapping (Lines 384-388)
```typescript
if (length) {
  requestPayload.length = convertLengthToAPI(length);
}
```
**Status:** ✅ Correct - Maps 'very_long' to 'extended'

#### ✅ Quality Features (Lines 394-415)
```typescript
requestPayload.use_google_search = ...
requestPayload.use_fact_checking = ...
// ... all quality features
```
**Status:** ✅ Correct - All quality features are included

#### ✅ Enhanced Keyword Insights (Lines 418-432)
```typescript
if (enhancedKeywordInsights.serpAISummary) {
  requestPayload.enhanced_keyword_insights = { ... };
}
```
**Status:** ✅ Correct - Enhanced insights are included when available

### 4. Test Cases

#### Test Case 1: Basic Blog Generation
**Input:**
- topic: "digital marketing"
- keywords: ["SEO", "content marketing"]
- quality_level: "medium"

**Expected:**
- Endpoint: `/api/v1/blog/generate-enhanced`
- All quality features set based on quality level
- Topic included in request

#### Test Case 2: Premium Quality
**Input:**
- topic: "AI tools"
- quality_level: "premium"

**Expected:**
- All quality features auto-enabled
- Enhanced keyword insights included
- Custom instructions included

#### Test Case 3: With Content Goal Prompt
**Input:**
- topic: "best laptops"
- content_goal: "seo"

**Expected:**
- system_prompt includes topic
- user_prompt_template includes topic
- additional_instructions includes topic and keywords

#### Test Case 4: Length Mapping
**Input:**
- length: "very_long"

**Expected:**
- requestPayload.length = "extended"

### 5. Verification Steps

1. ✅ Check endpoint constant is `/api/v1/blog/generate-enhanced`
2. ✅ Verify `shouldUseEnhanced` is always `true`
3. ✅ Confirm all quality features are included in payload
4. ✅ Verify topic is always included in prompts
5. ✅ Check length mapping works correctly
6. ✅ Verify enhanced keyword insights are passed when available
7. ✅ Confirm request headers are correct
8. ✅ Verify error handling for API failures

### 6. Potential Issues to Watch For

- ❌ Endpoint might fall back to regular endpoint (should not happen)
- ❌ Topic might be missing from prompts (should be fixed)
- ❌ Length might be 'very_long' instead of 'extended' (should be fixed)
- ❌ Quality features might not be included (should be included)
- ❌ Enhanced insights might not be passed (should be passed when available)

### 7. Logging Verification

The code should log:
- ✅ `🌐 Using endpoint: /api/v1/blog/generate-enhanced (Enhanced - Always Enabled)`
- ✅ `📤 Request payload:` (full payload)
- ✅ `📤 Key parameters being sent:` (summary)
- ✅ `📥 External API response status:` (response status)
- ✅ `✅ Blog generated successfully from external API` (on success)

### 8. Next Steps

1. Run actual API test with sample data
2. Verify response structure matches expectations
3. Check that enhanced features are actually being used
4. Monitor API logs to confirm correct endpoint is called
5. Test with different quality levels
6. Test with and without content goal prompts

