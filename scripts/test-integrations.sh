#!/bin/bash

# Automated Integration Testing Script (Bash Version)
# 
# Tests all integration endpoints using cURL
# 
# Usage:
#   ./scripts/test-integrations.sh [options]
# 
# Options:
#   --base-url <url>     Base URL (default: http://localhost:3000)
#   --token <token>      JWT auth token (or set INTEGRATION_TEST_TOKEN env var)
#   --org-id <id>        Organization ID (or set INTEGRATION_TEST_ORG_ID env var)
#   --skip-oauth         Skip OAuth flow tests
#   --verbose            Show detailed output

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${INTEGRATION_TEST_BASE_URL:-http://localhost:3000}"
TOKEN="${INTEGRATION_TEST_TOKEN:-}"
ORG_ID="${INTEGRATION_TEST_ORG_ID:-}"
VERBOSE=false
SKIP_OAUTH=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    --token)
      TOKEN="$2"
      shift 2
      ;;
    --org-id)
      ORG_ID="$2"
      shift 2
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --skip-oauth)
      SKIP_OAUTH=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Test counters
PASSED=0
FAILED=0
SKIPPED=0

# Helper functions
log() {
  echo -e "${1}${2}${NC}"
}

log_info() {
  log "${CYAN}" "ℹ️  $1"
}

log_success() {
  log "${GREEN}" "✅ $1"
  ((PASSED++))
}

log_error() {
  log "${RED}" "❌ $1"
  ((FAILED++))
}

log_skip() {
  log "${YELLOW}" "⏭️  $1"
  ((SKIPPED++))
}

log_verbose() {
  if [ "$VERBOSE" = true ]; then
    log_info "$1"
  fi
}

# Check prerequisites
check_prerequisites() {
  log_info "Checking prerequisites..."
  
  if [ -z "$TOKEN" ]; then
    log_error "JWT token required. Set INTEGRATION_TEST_TOKEN env var or use --token flag"
    exit 1
  fi
  
  log_verbose "Base URL: $BASE_URL"
  log_verbose "Token: ${TOKEN:0:20}..."
  if [ -n "$ORG_ID" ]; then
    log_verbose "Org ID: $ORG_ID"
  fi
  
  # Check if server is running
  if ! curl -s -f "${BASE_URL}/api/health" > /dev/null 2>&1; then
    log_verbose "Health check endpoint not available (this is OK)"
  fi
}

# Make HTTP request
make_request() {
  local method=$1
  local path=$2
  local body=$3
  
  local url="${BASE_URL}${path}"
  local headers=(-H "Content-Type: application/json" -H "Authorization: Bearer ${TOKEN}")
  
  if [ -n "$body" ]; then
    curl -s -w "\n%{http_code}" -X "$method" "${headers[@]}" -d "$body" "$url"
  else
    curl -s -w "\n%{http_code}" -X "$method" "${headers[@]}" "$url"
  fi
}

# Test: Create API Key Integration
test_create_api_key_integration() {
  log_info "Testing: Create API Key Integration"
  
  local timestamp=$(date +%s)
  local body=$(cat <<EOF
{
  "provider": "webflow",
  "connection": {
    "api_token": "wf_test_token_${timestamp}",
    "site_id": "test_site_id_123",
    "collection_id": "test_collection_id_456"
  },
  "test_connection": true
}
EOF
)
  
  local response=$(make_request "POST" "/api/integrations/connect-api-key" "$body")
  local http_code=$(echo "$response" | tail -n1)
  local body_response=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -eq 201 ]; then
    local integration_id=$(echo "$body_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$integration_id" ]; then
      echo "$integration_id" > /tmp/test_integration_id.txt
      log_success "Created API Key Integration (ID: ${integration_id})"
      log_verbose "Connection method: api_key"
      return 0
    fi
  fi
  
  log_error "Failed to create API Key Integration (HTTP $http_code)"
  log_verbose "Response: $body_response"
  return 1
}

# Test: Get Integration
test_get_integration() {
  log_info "Testing: Get Integration Details"
  
  if [ ! -f /tmp/test_integration_id.txt ]; then
    log_error "No integration ID available"
    return 1
  fi
  
  local integration_id=$(cat /tmp/test_integration_id.txt)
  local response=$(make_request "GET" "/api/integrations/${integration_id}")
  local http_code=$(echo "$response" | tail -n1)
  local body_response=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -eq 200 ]; then
    if echo "$body_response" | grep -q '"connection_method":"api_key"'; then
      log_success "Retrieved Integration Details"
      log_verbose "Connection method verified: api_key"
      return 0
    fi
  fi
  
  log_error "Failed to get integration (HTTP $http_code)"
  return 1
}

# Test: Test Connection
test_connection() {
  log_info "Testing: Test Connection"
  
  if [ ! -f /tmp/test_integration_id.txt ]; then
    log_error "No integration ID available"
    return 1
  fi
  
  local integration_id=$(cat /tmp/test_integration_id.txt)
  local response=$(make_request "POST" "/api/integrations/${integration_id}/test")
  local http_code=$(echo "$response" | tail -n1)
  local body_response=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -eq 200 ]; then
    if echo "$body_response" | grep -q '"success":true'; then
      log_success "Connection Test Passed"
      return 0
    fi
  fi
  
  log_error "Connection test failed (HTTP $http_code)"
  return 1
}

# Test: List Integrations
test_list_integrations() {
  log_info "Testing: List All Integrations"
  
  local response=$(make_request "GET" "/api/integrations")
  local http_code=$(echo "$response" | tail -n1)
  local body_response=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -eq 200 ]; then
    if echo "$body_response" | grep -q '^\['; then
      local count=$(echo "$body_response" | grep -o '"id"' | wc -l)
      log_success "Listed Integrations (found $count)"
      return 0
    fi
  fi
  
  log_error "Failed to list integrations (HTTP $http_code)"
  return 1
}

# Test: Connect and Get Recommendations
test_connect_and_recommend() {
  log_info "Testing: Connect and Get Recommendations"
  
  local timestamp=$(date +%s)
  local body=$(cat <<EOF
{
  "provider": "webflow",
  "connection": {
    "api_token": "wf_test_token_${timestamp}",
    "site_id": "test_site_id_123",
    "collection_id": "test_collection_id_456"
  },
  "keywords": [
    "webflow cms",
    "content management",
    "website builder"
  ]
}
EOF
)
  
  local response=$(make_request "POST" "/api/integrations/connect-and-recommend" "$body")
  local http_code=$(echo "$response" | tail -n1)
  local body_response=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -eq 200 ]; then
    if echo "$body_response" | grep -q '"recommended_backlinks"'; then
      log_success "Got Recommendations"
      log_verbose "Response includes recommendations"
      return 0
    fi
  fi
  
  log_error "Failed to get recommendations (HTTP $http_code)"
  return 1
}

# Test: Validation - Empty Keywords
test_validation_empty_keywords() {
  log_info "Testing: Validation - Empty Keywords"
  
  local body=$(cat <<EOF
{
  "provider": "webflow",
  "connection": {
    "api_token": "wf_test_token",
    "site_id": "test_site_id",
    "collection_id": "test_collection_id"
  },
  "keywords": []
}
EOF
)
  
  local response=$(make_request "POST" "/api/integrations/connect-and-recommend" "$body")
  local http_code=$(echo "$response" | tail -n1)
  
  if [ "$http_code" -eq 400 ]; then
    log_success "Validation correctly rejected empty keywords"
    return 0
  fi
  
  log_error "Validation should reject empty keywords (HTTP $http_code)"
  return 1
}

# Main test runner
main() {
  echo ""
  echo "============================================================"
  echo "🚀 Integration Implementation Test Suite"
  echo "============================================================"
  echo ""
  
  check_prerequisites
  
  echo ""
  echo "Running tests..."
  echo ""
  
  # Run tests
  test_create_api_key_integration || true
  test_get_integration || true
  test_connection || true
  test_list_integrations || true
  test_connect_and_recommend || true
  test_validation_empty_keywords || true
  
  # OAuth test
  if [ "$SKIP_OAUTH" = false ]; then
    log_skip "OAuth Flow (requires browser for redirect)"
  else
    log_skip "OAuth Flow (skipped)"
  fi
  
  # Summary
  echo ""
  echo "============================================================"
  echo "📊 Test Summary"
  echo "============================================================"
  log_success "Passed: $PASSED"
  log_error "Failed: $FAILED"
  log_skip "Skipped: $SKIPPED"
  echo ""
  
  # Cleanup
  rm -f /tmp/test_integration_id.txt
  
  # Exit with appropriate code
  if [ $FAILED -gt 0 ]; then
    exit 1
  else
    exit 0
  fi
}

# Run main function
main

