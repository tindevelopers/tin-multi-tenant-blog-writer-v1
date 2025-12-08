#!/bin/bash

# Test Cloudinary Credentials Directly
# This script tests Cloudinary credentials using the test-direct API endpoint

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Testing Cloudinary Credentials..."
echo ""

# Get the base URL from environment or use default
BASE_URL="${BASE_URL:-http://localhost:3000}"

# Check if we have a session token (you'll need to authenticate first)
if [ -z "$SESSION_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  No SESSION_TOKEN found.${NC}"
  echo "To test with authentication, set SESSION_TOKEN environment variable."
  echo "Or visit: ${BASE_URL}/api/integrations/cloudinary/test-direct"
  echo ""
  echo "You can also test directly in the browser by visiting:"
  echo "  ${BASE_URL}/api/integrations/cloudinary/test-direct"
  exit 0
fi

# Make the API call
echo "Making request to: ${BASE_URL}/api/integrations/cloudinary/test-direct"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Cookie: ${SESSION_TOKEN}" \
  "${BASE_URL}/api/integrations/cloudinary/test-direct")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" -eq 200 ]; then
  echo ""
  echo -e "${GREEN}✅ Test completed successfully!${NC}"
  
  # Check if any method succeeded
  SUCCESS=$(echo "$BODY" | jq -r '.success' 2>/dev/null)
  if [ "$SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ Cloudinary credentials are valid!${NC}"
    METHOD=$(echo "$BODY" | jq -r '.summary.recommendedMethod' 2>/dev/null)
    echo "Recommended method: $METHOD"
  else
    echo -e "${RED}❌ Cloudinary credentials failed all tests${NC}"
  fi
else
  echo ""
  echo -e "${RED}❌ Test failed with HTTP $HTTP_CODE${NC}"
fi

