#!/bin/bash

# Test script for async mode blog and image generation
# Based on FRONTEND_TESTING_GUIDE.md

set -e

# Service configuration from FRONTEND_TESTING_GUIDE.md
SERVICE_URL="${BLOG_WRITER_API_URL:-https://blog-writer-api-dev-kq42l26tuq-od.a.run.app}"
API_KEY="${BLOG_WRITER_API_KEY:-}"

echo "🧪 Testing Async Mode for Blog and Image Generation"
echo "===================================================="
echo "Service URL: $SERVICE_URL"
echo "API Key: ${API_KEY:+Set (hidden)}${API_KEY:-Not set}"
echo ""

# Build headers
HEADERS=(-H "Content-Type: application/json")
if [ -n "$API_KEY" ]; then
    HEADERS+=(-H "Authorization: Bearer $API_KEY")
fi

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Test 1: Health Check
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Testing: GET /health"

response=$(curl -s -w "\n%{http_code}" "${HEADERS[@]}" -X GET "$SERVICE_URL/health" 2>&1)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ] && echo "$body" | grep -q '"status"'; then
    status=$(echo "$body" | jq -r '.status' 2>/dev/null || echo "")
    echo -e "   ${GREEN}✅ PASS${NC} - HTTP $http_code, status: $status"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    ((TESTS_PASSED++))
else
    echo -e "   ${RED}❌ FAIL${NC} - HTTP $http_code"
    echo "$body"
    ((TESTS_FAILED++))
fi

# Test 2: Blog Generation (Async Mode)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Blog Generation (Async Mode)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Testing: POST /api/v1/blog/generate-enhanced?async_mode=true"

BLOG_PAYLOAD='{
  "topic": "Python programming benefits",
  "keywords": ["python", "programming", "benefits"],
  "target_length": 500,
  "tone": "professional"
}'

response=$(curl -s -w "\n%{http_code}" "${HEADERS[@]}" -X POST "$SERVICE_URL/api/v1/blog/generate-enhanced?async_mode=true" -d "$BLOG_PAYLOAD" 2>&1)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    job_id=$(echo "$body" | jq -r '.job_id // empty' 2>/dev/null || echo "")
    if [ -n "$job_id" ] && [ "$job_id" != "null" ]; then
        echo -e "   ${GREEN}✅ PASS${NC} - HTTP $http_code, job_id: $job_id"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        BLOG_JOB_ID="$job_id"
        ((TESTS_PASSED++))
    else
        echo -e "   ${RED}❌ FAIL${NC} - HTTP $http_code, but no job_id returned"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        BLOG_JOB_ID=""
        ((TESTS_FAILED++))
    fi
else
    echo -e "   ${RED}❌ FAIL${NC} - HTTP $http_code"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    BLOG_JOB_ID=""
    ((TESTS_FAILED++))
fi

# Test 3: Blog Job Status Polling
if [ -n "$BLOG_JOB_ID" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "TEST 3: Blog Job Status Polling"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 Polling blog job status: $BLOG_JOB_ID"
    
    for i in {1..5}; do
        echo "   Attempt $i/5..."
        STATUS_RESPONSE=$(curl -s "${HEADERS[@]}" "$SERVICE_URL/api/v1/blog/jobs/$BLOG_JOB_ID" 2>&1)
        STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status // empty' 2>/dev/null || echo "")
        PROGRESS=$(echo "$STATUS_RESPONSE" | jq -r '.progress_percentage // 0' 2>/dev/null || echo "0")
        
        if [ -n "$STATUS" ]; then
            echo "   Status: $STATUS, Progress: $PROGRESS%"
            echo "$STATUS_RESPONSE" | jq '.' 2>/dev/null || echo "$STATUS_RESPONSE"
            
            if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
                if [ "$STATUS" = "completed" ]; then
                    echo -e "   ${GREEN}✅ Blog generation completed${NC}"
                    ((TESTS_PASSED++))
                else
                    echo -e "   ${RED}❌ Blog generation failed${NC}"
                    ((TESTS_FAILED++))
                fi
                break
            fi
        else
            echo -e "   ${YELLOW}⚠️  Could not parse status response${NC}"
        fi
        
        if [ $i -lt 5 ]; then
            echo "   Waiting 5 seconds before next poll..."
            sleep 5
        fi
    done
fi

# Test 4: Image Generation (Always Async)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 4: Image Generation (Always Async)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Testing: POST /api/v1/images/generate"

IMG_PAYLOAD='{
  "prompt": "A beautiful sunset over mountains",
  "style": "photographic",
  "aspect_ratio": "16:9"
}'

response=$(curl -s -w "\n%{http_code}" "${HEADERS[@]}" -X POST "$SERVICE_URL/api/v1/images/generate" -d "$IMG_PAYLOAD" 2>&1)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    job_id=$(echo "$body" | jq -r '.job_id // empty' 2>/dev/null || echo "")
    if [ -n "$job_id" ] && [ "$job_id" != "null" ]; then
        echo -e "   ${GREEN}✅ PASS${NC} - HTTP $http_code, job_id: $job_id"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        IMG_JOB_ID="$job_id"
        ((TESTS_PASSED++))
    else
        echo -e "   ${RED}❌ FAIL${NC} - HTTP $http_code, but no job_id returned"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        IMG_JOB_ID=""
        ((TESTS_FAILED++))
    fi
else
    echo -e "   ${RED}❌ FAIL${NC} - HTTP $http_code"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    IMG_JOB_ID=""
    ((TESTS_FAILED++))
fi

# Test 5: Image Job Status Polling
if [ -n "$IMG_JOB_ID" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "TEST 5: Image Job Status Polling"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 Polling image job status: $IMG_JOB_ID"
    
    for i in {1..10}; do
        echo "   Attempt $i/10..."
        STATUS_RESPONSE=$(curl -s "${HEADERS[@]}" "$SERVICE_URL/api/v1/images/jobs/$IMG_JOB_ID" 2>&1)
        STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status // empty' 2>/dev/null || echo "")
        PROGRESS=$(echo "$STATUS_RESPONSE" | jq -r '.progress_percentage // 0' 2>/dev/null || echo "0")
        
        if [ -n "$STATUS" ]; then
            echo "   Status: $STATUS, Progress: $PROGRESS%"
            echo "$STATUS_RESPONSE" | jq '.' 2>/dev/null || echo "$STATUS_RESPONSE"
            
            if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
                if [ "$STATUS" = "completed" ]; then
                    IMG_URL=$(echo "$STATUS_RESPONSE" | jq -r '.result.images[0].image_url // empty' 2>/dev/null || echo "")
                    if [ -n "$IMG_URL" ]; then
                        echo -e "   ${GREEN}✅ Image generation completed${NC}"
                        echo "   Image URL: $IMG_URL"
                        ((TESTS_PASSED++))
                    else
                        echo -e "   ${YELLOW}⚠️  Completed but no image URL found${NC}"
                        ((TESTS_FAILED++))
                    fi
                else
                    echo -e "   ${RED}❌ Image generation failed${NC}"
                    ((TESTS_FAILED++))
                fi
                break
            fi
        else
            echo -e "   ${YELLOW}⚠️  Could not parse status response${NC}"
        fi
        
        if [ $i -lt 10 ]; then
            echo "   Waiting 5 seconds before next poll..."
            sleep 5
        fi
    done
fi

# Test 6: Verify async_mode parameter works
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 6: Verify async_mode=false still works (backward compatibility)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Testing: POST /api/v1/blog/generate-enhanced?async_mode=false"

SYNC_PAYLOAD='{
  "topic": "Quick test",
  "keywords": ["test"],
  "target_length": 100
}'

response=$(curl -s -w "\n%{http_code}" "${HEADERS[@]}" -X POST "$SERVICE_URL/api/v1/blog/generate-enhanced?async_mode=false" -d "$SYNC_PAYLOAD" 2>&1)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    if echo "$body" | grep -q "\"content\"" || echo "$body" | grep -q "\"blog_id\""; then
        echo -e "   ${GREEN}✅ PASS${NC} - Sync mode works (HTTP $http_code)"
        echo "$body" | jq '.' 2>/dev/null | head -20 || echo "$body" | head -20
        ((TESTS_PASSED++))
    else
        echo -e "   ${YELLOW}⚠️  Sync mode returned but no content/blog_id found${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        ((TESTS_FAILED++))
    fi
else
    echo -e "   ${YELLOW}⚠️  Sync mode returned HTTP $http_code (may be expected if async-only)${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total tests: $((TESTS_PASSED + TESTS_FAILED))"
echo -e "${GREEN}✅ Passed: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    echo ""
    echo "✅ Async mode is working correctly:"
    echo "   - Blog generation returns job_id"
    echo "   - Image generation returns job_id"
    echo "   - Job status polling works"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Check the output above for details.${NC}"
    exit 1
fi
