#!/bin/bash

# Test Image Generation from Google Cloud Run Endpoint
# This script tests the image generation API directly

set -e

# Configuration
SERVICE_URL="${BLOG_WRITER_API_URL:-https://blog-writer-api-dev-613248238610.europe-west9.run.app}"
API_KEY="${BLOG_WRITER_API_KEY:-}"

echo "🧪 Testing Image Generation from Google Cloud Run"
echo "=================================================="
echo "Service URL: $SERVICE_URL"
echo ""

# Test prompt
PROMPT="A picture of a small dog"
echo "📝 Test Prompt: $PROMPT"
echo ""

# Test image generation endpoint
echo "🖼️  Calling image generation endpoint..."
echo "POST ${SERVICE_URL}/api/v1/images/generate"
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  "${SERVICE_URL}/api/v1/images/generate" \
  -H "Content-Type: application/json" \
  ${API_KEY:+-H "Authorization: Bearer $API_KEY"} \
  -d "{
    \"prompt\": \"$PROMPT\",
    \"provider\": \"stability_ai\",
    \"style\": \"photographic\",
    \"aspect_ratio\": \"16:9\",
    \"quality\": \"high\",
    \"negative_prompt\": \"blurry, low quality, watermark, text overlay\",
    \"width\": 1920,
    \"height\": 1080
  }")

# Extract HTTP status and body
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "📊 Response Status: $HTTP_STATUS"
echo ""
echo "📦 Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_STATUS" != "200" ]; then
  echo "❌ Request failed with status $HTTP_STATUS"
  exit 1
fi

# Check if response contains job_id (async mode)
JOB_ID=$(echo "$BODY" | jq -r '.job_id // empty' 2>/dev/null)

if [ -n "$JOB_ID" ] && [ "$JOB_ID" != "null" ]; then
  echo "🔄 Async mode detected - Job ID: $JOB_ID"
  echo "⏳ Polling job status..."
  echo ""
  
  MAX_ATTEMPTS=30
  ATTEMPT=0
  IMAGE_URL=""
  
  while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    echo "   Attempt $ATTEMPT/$MAX_ATTEMPTS..."
    
    sleep 2
    
    JOB_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
      -X GET \
      "${SERVICE_URL}/api/v1/images/jobs/${JOB_ID}" \
      ${API_KEY:+-H "Authorization: Bearer $API_KEY"})
    
    JOB_HTTP_STATUS=$(echo "$JOB_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
    JOB_BODY=$(echo "$JOB_RESPONSE" | sed '/HTTP_STATUS/d')
    
    if [ "$JOB_HTTP_STATUS" != "200" ]; then
      echo "   ⚠️  Job status check failed: $JOB_HTTP_STATUS"
      continue
    fi
    
    JOB_STATUS=$(echo "$JOB_BODY" | jq -r '.status // empty' 2>/dev/null)
    PROGRESS=$(echo "$JOB_BODY" | jq -r '.progress_percentage // 0' 2>/dev/null)
    
    echo "   Status: $JOB_STATUS (${PROGRESS}%)"
    
    if [ "$JOB_STATUS" = "completed" ]; then
      # Extract image URL from completed job
      IMAGE_URL=$(echo "$JOB_BODY" | jq -r '.result.images[0].image_url // .result.images[0].image_data // empty' 2>/dev/null)
      
      if [ -n "$IMAGE_URL" ] && [ "$IMAGE_URL" != "null" ]; then
        echo ""
        echo "✅ Image generation completed!"
        break
      fi
    elif [ "$JOB_STATUS" = "failed" ]; then
      ERROR_MSG=$(echo "$JOB_BODY" | jq -r '.error_message // .error // "Unknown error"' 2>/dev/null)
      echo ""
      echo "❌ Image generation failed: $ERROR_MSG"
      exit 1
    fi
  done
  
  if [ -z "$IMAGE_URL" ] || [ "$IMAGE_URL" = "null" ]; then
    echo ""
    echo "❌ No image URL found after polling"
    echo "Final job status:"
    echo "$JOB_BODY" | jq '.' 2>/dev/null || echo "$JOB_BODY"
    exit 1
  fi
else
  # Synchronous mode - extract image URL directly
  IMAGE_URL=$(echo "$BODY" | jq -r '.images[0].image_url // .images[0].image_data // .image.image_url // .image_url // empty' 2>/dev/null)
  
  if [ -z "$IMAGE_URL" ] || [ "$IMAGE_URL" = "null" ]; then
    echo "❌ No image URL found in response"
    echo ""
    echo "Response structure:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    exit 1
  fi
fi

echo "✅ Image URL extracted successfully!"
echo "🖼️  Image URL: ${IMAGE_URL:0:100}..." 
echo ""

# Check if it's a valid URL or base64 data
if [[ "$IMAGE_URL" == http* ]]; then
  echo "✅ Valid HTTP URL detected"
  echo "🔗 URL Length: ${#IMAGE_URL} characters"
elif [[ "$IMAGE_URL" == data:image/* ]]; then
  echo "✅ Valid data URL detected"
  echo "📏 Data URL Length: ${#IMAGE_URL} characters"
else
  echo "⚠️  Unknown URL format (might be base64)"
  echo "📏 Length: ${#IMAGE_URL} characters"
fi

echo ""
echo "✅ Image generation test completed successfully!"

