#!/bin/bash
# Simple test script for Webflow scan endpoint
# This tests the endpoint via HTTP request

echo ""
echo "=== Testing Webflow Scan Endpoint ==="
echo ""

# Check if dev server is running
if ! lsof -ti:3000 > /dev/null 2>&1; then
    echo "⚠️  Dev server is not running on port 3000"
    echo "   Please start it with: npm run dev"
    echo ""
    exit 1
fi

echo "✅ Dev server is running"
echo ""

# Test the endpoint
echo "Testing: POST /api/integrations/webflow/scan-structure"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  http://localhost:3000/api/integrations/webflow/scan-structure \
  -H "Content-Type: application/json" \
  -d '{}' \
  2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""
echo "Response:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "✅ Endpoint responded successfully!"
    echo ""
    SCAN_ID=$(echo "$BODY" | jq -r '.scan_id' 2>/dev/null)
    if [ -n "$SCAN_ID" ] && [ "$SCAN_ID" != "null" ]; then
        echo "Scan ID: $SCAN_ID"
        echo ""
        echo "💡 To check scan status, run:"
        echo "   curl http://localhost:3000/api/integrations/webflow/scan-structure?scan_id=$SCAN_ID"
    fi
elif [ "$HTTP_CODE" = "401" ]; then
    echo "❌ Unauthorized - Authentication required"
    echo ""
    echo "💡 This endpoint requires authentication."
    echo "   Test it from the browser console instead:"
    echo ""
    echo "   fetch('/api/integrations/webflow/scan-structure', {"
    echo "     method: 'POST',"
    echo "     headers: { 'Content-Type': 'application/json' },"
    echo "     body: JSON.stringify({})"
    echo "   }).then(r => r.json()).then(console.log)"
elif [ "$HTTP_CODE" = "404" ]; then
    echo "❌ Not Found - Endpoint doesn't exist or integration not found"
    echo ""
    echo "💡 Check:"
    echo "   1. Is the route file at: src/app/api/integrations/webflow/scan-structure/route.ts?"
    echo "   2. Do you have an active Webflow integration configured?"
else
    echo "❌ Request failed with status $HTTP_CODE"
fi

echo ""

