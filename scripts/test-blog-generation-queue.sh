#!/bin/bash

# Test script to trigger multiple blog generation requests and verify queue_id is returned
# This tests the queue system by making requests directly to the Google Cloud Run backend

set -e

# Configuration
API_URL="${BLOG_WRITER_API_URL:-https://blog-writer-api-dev-613248238610.europe-west9.run.app}"
ENDPOINT="/api/v1/blog/generate-enhanced"
NUM_REQUESTS=100
CONCURRENT_REQUESTS=10

echo "🧪 Testing Blog Generation Queue System"
echo "========================================"
echo "API URL: $API_URL$ENDPOINT"
echo "Number of requests: $NUM_REQUESTS"
echo "Concurrent requests: $CONCURRENT_REQUESTS"
echo ""

# Test payload
PAYLOAD='{
  "topic": "Test Blog Post",
  "keywords": ["test", "blog", "generation"],
  "target_audience": "developers",
  "tone": "professional",
  "word_count": 500,
  "async_mode": true
}'

# Create results directory
RESULTS_DIR="test-results-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo "📊 Starting test..."
echo ""

# Function to make a single request
make_request() {
    local request_num=$1
    local output_file="$RESULTS_DIR/request-$request_num.json"
    
    echo "Request $request_num..." >&2
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL$ENDPOINT?async_mode=true" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${BLOG_WRITER_API_KEY:-}" \
        -d "$PAYLOAD" 2>&1)
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    # Save response
    echo "$body" > "$output_file"
    
    # Check for queue_id or job_id
    if echo "$body" | grep -q '"queue_id"\|"job_id"'; then
        queue_id=$(echo "$body" | grep -o '"queue_id":"[^"]*"\|"job_id":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo "✅ Request $request_num: SUCCESS - Queue ID: $queue_id (HTTP $http_code)" >&2
        echo "SUCCESS|$request_num|$http_code|$queue_id"
    elif echo "$body" | grep -q '"error"'; then
        error=$(echo "$body" | grep -o '"error":"[^"]*"\|"message":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo "❌ Request $request_num: ERROR - $error (HTTP $http_code)" >&2
        echo "ERROR|$request_num|$http_code|$error"
    else
        echo "⚠️  Request $request_num: UNKNOWN - HTTP $http_code" >&2
        echo "UNKNOWN|$request_num|$http_code|No queue_id or error found"
    fi
}

export -f make_request
export API_URL ENDPOINT PAYLOAD RESULTS_DIR BLOG_WRITER_API_KEY

# Run requests in parallel batches
success_count=0
error_count=0
unknown_count=0
queue_ids=()

for i in $(seq 1 $NUM_REQUESTS); do
    # Run in batches of CONCURRENT_REQUESTS
    if (( i % CONCURRENT_REQUESTS == 0 )); then
        wait
    fi
    
    result=$(make_request $i)
    status=$(echo "$result" | cut -d'|' -f1)
    
    case "$status" in
        SUCCESS)
            ((success_count++))
            queue_id=$(echo "$result" | cut -d'|' -f4)
            queue_ids+=("$queue_id")
            ;;
        ERROR)
            ((error_count++))
            ;;
        *)
            ((unknown_count++))
            ;;
    esac
    
    # Background the request
    make_request $i &
done

# Wait for all remaining requests
wait

echo ""
echo "📊 Test Results Summary"
echo "======================="
echo "Total requests: $NUM_REQUESTS"
echo "✅ Success (with queue_id): $success_count"
echo "❌ Errors: $error_count"
echo "⚠️  Unknown: $unknown_count"
echo ""

# Analyze errors
if [ $error_count -gt 0 ]; then
    echo "🔍 Error Analysis:"
    echo "------------------"
    grep -h "ERROR" "$RESULTS_DIR"/*.json 2>/dev/null | head -10
    echo ""
fi

# Check for common errors
echo "🔍 Common Error Patterns:"
echo "-------------------------"
grep -h "GOOGLE_CLOUD_PROJECT\|Queue does not exist\|queue_id\|job_id" "$RESULTS_DIR"/*.json 2>/dev/null | sort | uniq -c | head -10
echo ""

# Show sample successful responses
if [ $success_count -gt 0 ]; then
    echo "✅ Sample Successful Responses (first 5):"
    echo "----------------------------------------"
    for file in "$RESULTS_DIR"/request-*.json; do
        if grep -q "queue_id\|job_id" "$file" 2>/dev/null; then
            echo "File: $(basename $file)"
            cat "$file" | jq '.' 2>/dev/null || cat "$file"
            echo ""
            if [ $((++shown)) -ge 5 ]; then
                break
            fi
        fi
    done
fi

echo "📁 Full results saved in: $RESULTS_DIR"
echo ""

