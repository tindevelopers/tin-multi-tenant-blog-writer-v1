#!/bin/bash

# Test the complete flow: DataForSEO Keywords → Content Generation
# Tests both endpoints to verify the flow works

BASE_URL="${NEXT_PUBLIC_APP_URL:-https://blogwriter.develop.tinconnect.com}"
TEST_KEYWORD="dog groomers"
TEST_LOCATION="United States"

echo "🚀 Testing Complete Flow: DataForSEO Keywords → Content Generation"
echo "=================================================================="
echo ""
echo "Base URL: $BASE_URL"
echo "Test Keyword: $TEST_KEYWORD"
echo "Test Location: $TEST_LOCATION"
echo ""

# Step 1: Test Keyword Analysis
echo "🔍 Step 1: Testing Keyword Analysis Endpoint"
echo "--------------------------------------------"
echo ""

KEYWORD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/keywords/analyze" \
  -H "Content-Type: application/json" \
  -d "{
    \"keywords\": [\"$TEST_KEYWORD\"],
    \"location\": \"$TEST_LOCATION\",
    \"language\": \"en\",
    \"max_suggestions_per_keyword\": 10,
    \"include_trends\": true,
    \"include_keyword_ideas\": true,
    \"include_relevant_pages\": true,
    \"include_serp_ai_summary\": true
  }")

HTTP_CODE=$(echo "$KEYWORD_RESPONSE" | tail -n1)
BODY=$(echo "$KEYWORD_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  echo "✅ Keyword Analysis Successful! (HTTP $HTTP_CODE)"
  echo ""
  
  # Extract some key data
  echo "Response preview:"
  echo "$BODY" | jq -r '.enhanced_analysis // .keyword_analysis | keys[0] // "No data"' 2>/dev/null || echo "$BODY" | head -c 200
  echo ""
  echo ""
else
  echo "❌ Keyword Analysis Failed! (HTTP $HTTP_CODE)"
  echo "Response:"
  echo "$BODY" | head -c 500
  echo ""
  echo ""
  exit 1
fi

# Step 2: Test Content Generation
echo "📝 Step 2: Testing Content Generation Endpoint"
echo "-----------------------------------------------"
echo ""

CONTENT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/blog-writer/generate" \
  -H "Content-Type: application/json" \
  -d "{
    \"topic\": \"Complete Guide to $TEST_KEYWORD\",
    \"keywords\": [\"$TEST_KEYWORD\", \"pet grooming services\", \"dog grooming near me\"],
    \"target_audience\": \"pet owners\",
    \"tone\": \"professional\",
    \"word_count\": 800,
    \"quality_level\": \"standard\",
    \"use_semantic_keywords\": true,
    \"use_enhanced\": true
  }")

HTTP_CODE=$(echo "$CONTENT_RESPONSE" | tail -n1)
BODY=$(echo "$CONTENT_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  echo "✅ Content Generation Successful! (HTTP $HTTP_CODE)"
  echo ""
  
  # Check for content
  HAS_CONTENT=$(echo "$BODY" | jq -r '.content // .blog_post.content // empty' 2>/dev/null)
  HAS_TITLE=$(echo "$BODY" | jq -r '.title // .blog_post.title // empty' 2>/dev/null)
  HAS_SEMANTIC=$(echo "$BODY" | jq -r '.semantic_keywords // empty' 2>/dev/null)
  
  if [ -n "$HAS_CONTENT" ]; then
    CONTENT_LENGTH=$(echo "$HAS_CONTENT" | wc -c)
    echo "✅ Content Generated: $CONTENT_LENGTH characters"
    echo ""
    echo "Content Preview (first 300 chars):"
    echo "$HAS_CONTENT" | head -c 300
    echo "..."
    echo ""
  else
    echo "⚠️  No content found in response"
  fi
  
  if [ -n "$HAS_TITLE" ]; then
    echo "✅ Title: $HAS_TITLE"
  fi
  
  if [ -n "$HAS_SEMANTIC" ]; then
    SEMANTIC_COUNT=$(echo "$HAS_SEMANTIC" | jq -r 'length' 2>/dev/null || echo "0")
    echo "✅ Semantic Keywords: $SEMANTIC_COUNT keywords"
    echo "$HAS_SEMANTIC" | jq -r '.[0:5] | join(", ")' 2>/dev/null || echo "   (unable to parse)"
  fi
  
  echo ""
  echo "Full Response Structure:"
  echo "$BODY" | jq -r 'keys | join(", ")' 2>/dev/null || echo "$BODY" | head -c 500
  echo ""
  echo ""
else
  echo "❌ Content Generation Failed! (HTTP $HTTP_CODE)"
  echo "Response:"
  echo "$BODY" | head -c 1000
  echo ""
  echo ""
  exit 1
fi

echo "=================================================================="
echo "✅ COMPLETE FLOW TEST: SUCCESS"
echo "   DataForSEO keywords → Content generation is working!"
echo "=================================================================="

