#!/bin/bash

# API Endpoint Testing Script for v1.3.6
# Tests all new features before UI changes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL from documentation
BASE_URL="${BLOG_WRITER_API_URL:-https://blog-writer-api-dev-kq42l26tuq-od.a.run.app}"
API_PREFIX="/api/v1"}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}API v1.3.6 Endpoint Testing${NC}"
echo -e "${BLUE}Base URL: ${BASE_URL}${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Function to run a test
run_test() {
    local test_name="$1"
    local endpoint="$2"
    local method="${3:-GET}"
    local data="${4:-}"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    echo -e "\n${YELLOW}Test ${TESTS_TOTAL}: ${test_name}${NC}"
    echo -e "${BLUE}${method} ${endpoint}${NC}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ PASSED (HTTP ${http_code})${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 0
    else
        echo -e "${RED}✗ FAILED (HTTP ${http_code})${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 1
    fi
}

# Test 1: Root endpoint
run_test "Root Endpoint - API Info" "/"

# Test 2: API Config endpoint
run_test "API Config - Feature Flags" "/api/v1/config"

# Test 3: Health check
run_test "Health Check" "/health"

# Test 4: Basic blog generation (tutorial type)
run_test "Blog Generation - Tutorial Type" "/api/v1/blog/generate-enhanced" "POST" '{
  "topic": "Introduction to Python Programming",
  "keywords": ["python", "programming"],
  "blog_type": "tutorial",
  "tone": "professional",
  "length": "short",
  "word_count_target": 300,
  "optimize_for_traffic": true,
  "use_dataforseo_content_generation": true
}'

# Test 5: FAQ blog type
run_test "Blog Generation - FAQ Type" "/api/v1/blog/generate-enhanced" "POST" '{
  "topic": "Frequently Asked Questions About SEO",
  "keywords": ["seo", "search engine optimization"],
  "blog_type": "faq",
  "tone": "professional",
  "length": "medium",
  "optimize_for_traffic": true
}'

# Test 6: Tips blog type
run_test "Blog Generation - Tips Type" "/api/v1/blog/generate-enhanced" "POST" '{
  "topic": "10 Tips for Better Blog Writing",
  "keywords": ["blog writing", "content creation"],
  "blog_type": "tips",
  "tone": "friendly",
  "length": "short",
  "word_count_target": 500,
  "optimize_for_traffic": true
}'

# Test 7: Case study blog type
run_test "Blog Generation - Case Study Type" "/api/v1/blog/generate-enhanced" "POST" '{
  "topic": "How Company X Increased Revenue by 300%",
  "keywords": ["case study", "revenue growth"],
  "blog_type": "case_study",
  "tone": "professional",
  "length": "medium",
  "optimize_for_traffic": true
}'

# Test 8: Listicle blog type
run_test "Blog Generation - Listicle Type" "/api/v1/blog/generate-enhanced" "POST" '{
  "topic": "Top 10 Python Libraries for Data Science",
  "keywords": ["python", "data science", "libraries"],
  "blog_type": "listicle",
  "tone": "professional",
  "length": "medium",
  "optimize_for_traffic": true
}'

# Test 9: How-to blog type
run_test "Blog Generation - How-To Type" "/api/v1/blog/generate-enhanced" "POST" '{
  "topic": "How to Build a REST API with Python",
  "keywords": ["python", "rest api", "flask"],
  "blog_type": "how_to",
  "tone": "professional",
  "length": "medium",
  "word_count_target": 1500,
  "optimize_for_traffic": true
}'

# Test 10: Word count tolerance test (target 300, should accept 225-375)
run_test "Word Count Tolerance - Target 300" "/api/v1/blog/generate-enhanced" "POST" '{
  "topic": "Understanding Python Basics",
  "keywords": ["python", "programming"],
  "blog_type": "tutorial",
  "word_count_target": 300,
  "optimize_for_traffic": true
}'

# Test 11: SEO optimization disabled
run_test "SEO Optimization Disabled" "/api/v1/blog/generate-enhanced" "POST" '{
  "topic": "Python Programming Overview",
  "keywords": ["python"],
  "blog_type": "custom",
  "optimize_for_traffic": false
}'

# Test 12: Custom instructions
run_test "Custom Instructions" "/api/v1/blog/generate-enhanced" "POST" '{
  "topic": "Python for Beginners",
  "keywords": ["python", "beginner"],
  "blog_type": "getting_started",
  "custom_instructions": "Focus on practical examples and include code snippets",
  "optimize_for_traffic": true
}'

# Test 13: Target audience
run_test "Target Audience" "/api/v1/blog/generate-enhanced" "POST" '{
  "topic": "Advanced Python Techniques",
  "keywords": ["python", "advanced"],
  "blog_type": "advanced",
  "target_audience": "experienced developers",
  "optimize_for_traffic": true
}'

# Test 14: Different tones
run_test "Casual Tone" "/api/v1/blog/generate-enhanced" "POST" '{
  "topic": "Fun Python Projects",
  "keywords": ["python", "projects"],
  "blog_type": "tutorial",
  "tone": "casual",
  "length": "short",
  "optimize_for_traffic": true
}'

# Test 15: Different lengths
run_test "Long Length Content" "/api/v1/blog/generate-enhanced" "POST" '{
  "topic": "Complete Guide to Python Programming",
  "keywords": ["python", "programming", "guide"],
  "blog_type": "guide",
  "tone": "professional",
  "length": "long",
  "optimize_for_traffic": true
}'

# Test 16: Brand type with brand_name
run_test "Brand Type with Brand Name" "/api/v1/blog/generate-enhanced" "POST" '{
  "topic": "Company Overview",
  "keywords": ["company", "overview"],
  "blog_type": "brand",
  "brand_name": "TechCorp",
  "optimize_for_traffic": true
}'

# Test 17: Product review type
run_test "Product Review Type" "/api/v1/blog/generate-enhanced" "POST" '{
  "topic": "Product Review",
  "keywords": ["review", "product"],
  "blog_type": "product_review",
  "product_name": "Python IDE Pro",
  "optimize_for_traffic": true
}'

# Test 18: Comparison type
run_test "Comparison Type" "/api/v1/blog/generate-enhanced" "POST" '{
  "topic": "Python vs JavaScript",
  "keywords": ["python", "javascript", "comparison"],
  "blog_type": "comparison",
  "comparison_items": ["Python", "JavaScript"],
  "optimize_for_traffic": true
}'

# Test 19: Top 10 type with category
run_test "Top 10 Type with Category" "/api/v1/blog/generate-enhanced" "POST" '{
  "topic": "Top 10 Python Libraries",
  "keywords": ["python", "libraries"],
  "blog_type": "top_10",
  "category": "Data Science",
  "optimize_for_traffic": true
}'

# Test 20: Definition type
run_test "Definition Type" "/api/v1/blog/generate-enhanced" "POST" '{
  "topic": "What is Python?",
  "keywords": ["python", "programming language"],
  "blog_type": "definition",
  "tone": "professional",
  "optimize_for_traffic": true
}'

# Test 21: Checklist type
run_test "Checklist Type" "/api/v1/blog/generate-enhanced" "POST" '{
  "topic": "Python Development Checklist",
  "keywords": ["python", "checklist"],
  "blog_type": "checklist",
  "optimize_for_traffic": true
}'

# Test 22: Troubleshooting type
run_test "Troubleshooting Type" "/api/v1/blog/generate-enhanced" "POST" '{
  "topic": "Common Python Errors and Solutions",
  "keywords": ["python", "errors", "troubleshooting"],
  "blog_type": "troubleshooting",
  "optimize_for_traffic": true
}'

# Test 23: Best practices type
run_test "Best Practices Type" "/api/v1/blog/generate-enhanced" "POST" '{
  "topic": "Python Best Practices",
  "keywords": ["python", "best practices"],
  "blog_type": "best_practices",
  "optimize_for_traffic": true
}'

# Test 24: Statistics type
run_test "Statistics Type" "/api/v1/blog/generate-enhanced" "POST" '{
  "topic": "Python Usage Statistics",
  "keywords": ["python", "statistics"],
  "blog_type": "statistics",
  "optimize_for_traffic": true
}'

# Test 25: Trend analysis type
run_test "Trend Analysis Type" "/api/v1/blog/generate-enhanced" "POST" '{
  "topic": "Python Programming Trends 2025",
  "keywords": ["python", "trends"],
  "blog_type": "trend_analysis",
  "optimize_for_traffic": true
}'

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total Tests: ${TESTS_TOTAL}"
echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed${NC}"
    exit 1
fi

