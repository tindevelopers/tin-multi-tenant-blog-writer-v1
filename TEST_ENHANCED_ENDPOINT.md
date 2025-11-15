# Testing the Enhanced Blog Writer Endpoint

## Test Files Created

1. **test-enhanced-endpoint.json** - Test payload with all enhanced features enabled
2. **test-enhanced-endpoint.js** - Node.js test script (requires authentication)

## Quick Test with cURL

### Option 1: Test via Local API Route (Requires Authentication)

```bash
# First, get your session cookie from the browser after logging in
# Then use it in the curl command:

curl -X POST http://localhost:3000/api/blog-writer/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie-here" \
  -d @test-enhanced-endpoint.json
```

### Option 2: Test Directly Against External API

```bash
# Test directly against the external Blog Writer API
curl -X POST https://blog-writer-api-dev-613248238610.europe-west1.run.app/api/v1/blog/generate-enhanced \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d @test-enhanced-endpoint.json
```

## Test Payload Structure

The `test-enhanced-endpoint.json` file includes:

```json
{
  "topic": "Best Pet Grooming Services in California",
  "keywords": ["pet grooming", "dog grooming", "cat grooming", ...],
  "target_audience": "Pet Parents",
  "tone": "professional",
  "word_count": 2000,
  "quality_level": "premium",
  "template_type": "how_to_guide",
  "length": "medium",
  "custom_instructions": "...",
  "use_google_search": true,
  "use_fact_checking": true,
  "use_citations": true,
  "use_serp_optimization": true,
  "use_consensus_generation": true,
  "use_knowledge_graph": true,
  "use_semantic_keywords": true,
  "use_quality_scoring": true
}
```

## Expected Response Structure

```json
{
  "title": "Generated Blog Title",
  "content": "Full blog content...",
  "excerpt": "Blog excerpt...",
  "meta_title": "SEO meta title",
  "meta_description": "SEO meta description",
  "readability_score": 85,
  "seo_score": 92,
  "quality_score": 88,
  "word_count": 2000,
  "total_tokens": 15000,
  "total_cost": 0.45,
  "generation_time": 120,
  "progress_updates": [
    {
      "stage": "Research",
      "stage_number": 1,
      "total_stages": 8,
      "progress_percentage": 12.5,
      "status": "completed",
      "details": "Gathering keyword data...",
      "timestamp": 1234567890
    }
  ],
  "citations": [
    {
      "text": "Citation text",
      "url": "https://example.com",
      "title": "Source Title"
    }
  ],
  "semantic_keywords": ["keyword1", "keyword2", ...],
  "stage_results": [...],
  "success": true,
  "warnings": []
}
```

## Testing Steps

### 1. Start the Development Server

```bash
npm run dev
```

### 2. Log in to the Application

Navigate to `http://localhost:3000` and log in to get a valid session.

### 3. Get Your Session Cookie

- Open browser DevTools (F12)
- Go to Application/Storage → Cookies
- Copy the `sb-xxx-auth-token` cookie value

### 4. Run the Test

```bash
# Using curl
curl -X POST http://localhost:3000/api/blog-writer/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-xxx-auth-token=YOUR_TOKEN_HERE" \
  -d @test-enhanced-endpoint.json \
  | jq '.' > test-result.json

# Or using the Node.js script (requires modification for auth)
node test-enhanced-endpoint.js local
```

### 5. Check the Results

```bash
# View the response
cat test-result.json | jq '.'

# Check specific fields
cat test-result.json | jq '.title'
cat test-result.json | jq '.progress_updates'
cat test-result.json | jq '.citations | length'
cat test-result.json | jq '.seo_score'
```

## Testing Different Scenarios

### Test 1: Basic Generation (No Enhanced Features)

```json
{
  "topic": "Introduction to Pet Grooming",
  "keywords": ["pet grooming"],
  "word_count": 1000,
  "quality_level": "standard"
}
```

### Test 2: Premium Quality with All Features

Use the provided `test-enhanced-endpoint.json` file.

### Test 3: Custom Instructions Only

```json
{
  "topic": "Pet Grooming Tips",
  "keywords": ["pet grooming", "dog grooming"],
  "custom_instructions": "Write in a friendly, conversational tone. Include practical tips and safety warnings.",
  "quality_level": "standard"
}
```

## Verification Checklist

- [ ] Request is accepted (200 status)
- [ ] Response includes `progress_updates` array
- [ ] `progress_updates` contains multiple stages
- [ ] Each stage has `stage`, `progress_percentage`, `status`, `details`
- [ ] Response includes `citations` array (if enabled)
- [ ] Response includes `semantic_keywords` (if enabled)
- [ ] `seo_score` and `readability_score` are present
- [ ] `total_cost` and `total_tokens` are calculated
- [ ] Content is generated and non-empty
- [ ] Title is relevant to the topic

## Troubleshooting

### Error: 401 Unauthorized
- Make sure you're logged in
- Check that your session cookie is valid
- Verify the cookie is included in the request

### Error: 422 Unprocessable Entity
- Check that all required fields are present
- Verify `length` is one of: "short", "medium", "long", "extended"
- Ensure `keywords` is an array, not a string

### Error: 503 Service Unavailable
- Cloud Run service might be starting up
- Wait 30-60 seconds and try again
- Check Cloud Run health endpoint

### No Progress Updates
- Verify `use_enhanced` is true (it's always enabled now)
- Check that the endpoint is `/api/v1/blog/generate-enhanced`
- Review server logs for errors

## Next Steps

After successful testing:
1. Verify progress updates are displayed in the UI
2. Test with different quality levels
3. Test with different template types
4. Verify citations are properly formatted
5. Check that semantic keywords are used in content

