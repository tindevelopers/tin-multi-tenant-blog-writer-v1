#!/bin/bash

# Test script to trigger multiple blog generation requests and verify queue_id is returned
# This tests the queue system by making requests through our Next.js API route

set -e

# Configuration
# Test directly against Google Cloud Run backend endpoint
API_BASE_URL="${BLOG_WRITER_API_URL:-https://blog-writer-api-dev-613248238610.europe-west9.run.app}"
API_URL="${API_BASE_URL}/api/v1/blog/generate-enhanced"
NUM_REQUESTS="${NUM_REQUESTS:-100}"  # Default to 100, can override with env var
CONCURRENT_REQUESTS="${CONCURRENT_REQUESTS:-10}"  # Default to 10 concurrent
API_KEY="${BLOG_WRITER_API_KEY:-}"

echo "🧪 Testing Blog Generation Queue System (Google Cloud Run Backend)"
echo "=================================================================="
echo "API URL: $API_URL"
echo "Number of requests: $NUM_REQUESTS"
echo "Concurrent requests: $CONCURRENT_REQUESTS"
echo "API Key: ${API_KEY:+Set (hidden)}${API_KEY:-Not set}"
echo ""
echo "⚠️  Note: This tests directly against Google Cloud Run backend"
echo "    The backend returns 'job_id' for async jobs (Cloud Tasks)"
echo "    Set BLOG_WRITER_API_KEY if authentication is required"
echo ""

# Test payload
PAYLOAD='{
  "topic": "Test Blog Post",
  "keywords": ["test", "blog", "generation"],
  "target_audience": "developers",
  "tone": "professional",
  "word_count": 500
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
    
    # Build headers
    headers=(-H "Content-Type: application/json")
    if [ -n "$API_KEY" ]; then
        headers+=(-H "Authorization: Bearer $API_KEY")
    fi
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL?async_mode=true" \
        "${headers[@]}" \
        -d "$PAYLOAD" 2>&1)
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    # Save response
    echo "$body" > "$output_file"
    
    # Check for job_id (Google Cloud Run returns job_id for async jobs)
    if echo "$body" | grep -q '"job_id"'; then
        job_id=$(echo "$body" | grep -o '"job_id":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo "✅ Request $request_num: SUCCESS - Job ID: $job_id (HTTP $http_code)" >&2
        echo "SUCCESS|$request_num|$http_code|$job_id"
    elif echo "$body" | grep -q '"queue_id"'; then
        # Also check for queue_id (in case backend returns it)
        queue_id=$(echo "$body" | grep -o '"queue_id":"[^"]*"' | head -1 | cut -d'"' -f4)
        if echo "$body" | grep -q '"error"'; then
            error=$(echo "$body" | grep -o '"error":"[^"]*"' | head -1 | cut -d'"' -f4)
            echo "⚠️  Request $request_num: ERROR but queue_id received - Queue ID: $queue_id, Error: $error (HTTP $http_code)" >&2
            echo "ERROR_WITH_QUEUE|$request_num|$http_code|$queue_id|$error"
        else
            echo "✅ Request $request_num: SUCCESS - Queue ID: $queue_id (HTTP $http_code)" >&2
            echo "SUCCESS|$request_num|$http_code|$queue_id"
        fi
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
export API_URL PAYLOAD RESULTS_DIR API_KEY

# Run requests in parallel batches
success_count=0
error_count=0
error_with_queue_count=0
unknown_count=0
queue_ids=()

echo "Making $NUM_REQUESTS requests..."
for i in $(seq 1 $NUM_REQUESTS); do
    # Run in batches
    if (( (i - 1) % CONCURRENT_REQUESTS == 0 && i > 1 )); then
        wait
        echo "Completed batch of $CONCURRENT_REQUESTS requests..."
    fi
    
    result=$(make_request $i)
    status=$(echo "$result" | cut -d'|' -f1)
    
    case "$status" in
        SUCCESS)
            ((success_count++))
            queue_id=$(echo "$result" | cut -d'|' -f4)
            queue_ids+=("$queue_id")
            ;;
        ERROR_WITH_QUEUE)
            ((error_with_queue_count++))
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
echo "✅ Success (with job_id/queue_id): $success_count"
echo "⚠️  Error but queue_id received: $error_with_queue_count"
echo "❌ Errors (no job_id/queue_id): $error_count"
echo "⚠️  Unknown: $unknown_count"
echo ""

# Calculate success rate for job_id/queue_id extraction
total_with_id=$((success_count + error_with_queue_count))
if [ $NUM_REQUESTS -gt 0 ]; then
    id_extraction_rate=$((total_with_id * 100 / NUM_REQUESTS))
    echo "📈 Job/Queue ID extraction rate: $id_extraction_rate% ($total_with_id/$NUM_REQUESTS)"
    echo "   (Google Cloud Run should return 'job_id' for async jobs)"
fi
echo ""

# Analyze errors
if [ $error_count -gt 0 ]; then
    echo "🔍 Error Analysis (requests without job_id/queue_id):"
    echo "-----------------------------------------------------"
    shown=0
    for file in "$RESULTS_DIR"/request-*.json; do
        if ! grep -q "queue_id\|job_id" "$file" 2>/dev/null; then
            echo "File: $(basename $file)"
            cat "$file" | jq '.' 2>/dev/null || cat "$file"
            echo ""
            if [ $((++shown)) -ge 5 ]; then
                break
            fi
        fi
    done
    echo ""
fi

# Check for common errors
if [ -f "$RESULTS_DIR/request-1.json" ]; then
    echo "🔍 Common Error Patterns:"
    echo "-------------------------"
    grep -h "GOOGLE_CLOUD_PROJECT\|Queue does not exist\|queue_id\|job_id\|error\|message" "$RESULTS_DIR"/*.json 2>/dev/null | sort | uniq -c | head -10
    echo ""
fi

# Show sample successful responses
if [ $success_count -gt 0 ] || [ $error_with_queue_count -gt 0 ]; then
    echo "✅ Sample Responses with Job/Queue ID (first 3):"
    echo "-----------------------------------------------"
    shown=0
    for file in "$RESULTS_DIR"/request-*.json; do
        if grep -q "queue_id\|job_id" "$file" 2>/dev/null; then
            echo "File: $(basename $file)"
            cat "$file" | jq '.' 2>/dev/null || cat "$file"
            echo ""
            if [ $((++shown)) -ge 3 ]; then
                break
            fi
        fi
    done
fi

echo "📁 Full results saved in: $RESULTS_DIR"
echo ""
echo "💡 To test with more requests, set NUM_REQUESTS environment variable:"
echo "   NUM_REQUESTS=100 ./scripts/test-blog-generation-queue.sh"
echo ""
