#!/bin/bash

# Test script for Enhanced Blog Writer Endpoint using cURL
# Usage: ./test-enhanced-curl.sh [local|production] [session-cookie]

ENVIRONMENT=${1:-local}
SESSION_COOKIE=${2:-""}

if [ "$ENVIRONMENT" = "local" ]; then
  BASE_URL="http://localhost:3000"
else
  BASE_URL="https://your-production-url.vercel.app"
fi

ENDPOINT="${BASE_URL}/api/blog-writer/generate"
JSON_FILE="test-enhanced-endpoint.json"

echo "🧪 Testing Enhanced Blog Writer Endpoint"
echo "=========================================="
echo "Environment: $ENVIRONMENT"
echo "Endpoint: $ENDPOINT"
echo ""

if [ ! -f "$JSON_FILE" ]; then
  echo "❌ Error: $JSON_FILE not found"
  exit 1
fi

if [ -z "$SESSION_COOKIE" ] && [ "$ENVIRONMENT" = "local" ]; then
  echo "⚠️  Warning: No session cookie provided"
  echo "   You need to be logged in to test the endpoint"
  echo "   Get your cookie from browser DevTools → Application → Cookies"
  echo "   Usage: ./test-enhanced-curl.sh local 'sb-xxx-auth-token=YOUR_TOKEN'"
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Build curl command
CURL_CMD="curl -X POST '$ENDPOINT' \
  -H 'Content-Type: application/json' \
  -d @$JSON_FILE \
  -w '\n\nHTTP Status: %{http_code}\nTime: %{time_total}s\n' \
  -s -S"

# Add cookie if provided
if [ -n "$SESSION_COOKIE" ]; then
  CURL_CMD="$CURL_CMD -H 'Cookie: $SESSION_COOKIE'"
fi

echo "📤 Sending request..."
echo ""

# Execute curl and save output
RESPONSE=$(eval $CURL_CMD)
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP Status:" | awk '{print $3}')
BODY=$(echo "$RESPONSE" | sed '/HTTP Status:/d' | sed '/Time:/d')

echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

echo ""
echo "=========================================="

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Success! HTTP $HTTP_CODE"
  echo ""
  
  # Extract key fields using jq if available
  if command -v jq &> /dev/null; then
    echo "📊 Response Summary:"
    echo "  Title: $(echo "$BODY" | jq -r '.title // "N/A"')"
    echo "  Word Count: $(echo "$BODY" | jq -r '.word_count // "N/A"')"
    echo "  SEO Score: $(echo "$BODY" | jq -r '.seo_score // "N/A"')"
    echo "  Readability: $(echo "$BODY" | jq -r '.readability_score // "N/A"')"
    echo "  Total Cost: \$$(echo "$BODY" | jq -r '.total_cost // 0')"
    echo "  Progress Updates: $(echo "$BODY" | jq -r '.progress_updates | length // 0') stages"
    echo "  Citations: $(echo "$BODY" | jq -r '.citations | length // 0')"
    echo "  Semantic Keywords: $(echo "$BODY" | jq -r '.semantic_keywords | length // 0')"
    
    # Save full response
    echo "$BODY" | jq '.' > "test-enhanced-endpoint-result.json"
    echo ""
    echo "💾 Full response saved to: test-enhanced-endpoint-result.json"
  fi
else
  echo "❌ Error! HTTP $HTTP_CODE"
  echo ""
  echo "Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

