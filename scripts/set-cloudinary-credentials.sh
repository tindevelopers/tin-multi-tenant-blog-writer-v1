#!/bin/bash

# Script to set Cloudinary credentials for an organization
# Usage: ./scripts/set-cloudinary-credentials.sh <cloud_name> <api_key> <api_secret> [org_id]

set -e

CLOUD_NAME=$1
API_KEY=$2
API_SECRET=$3
ORG_ID=$4

if [ -z "$CLOUD_NAME" ] || [ -z "$API_KEY" ] || [ -z "$API_SECRET" ]; then
  echo "Usage: $0 <cloud_name> <api_key> <api_secret> [org_id]"
  echo ""
  echo "Example:"
  echo "  $0 my-cloud-name 123456789012345 abcdefghijklmnopqrstuvwxyz1234567890"
  echo ""
  echo "Note: If org_id is not provided, credentials will be set for your organization."
  exit 1
fi

# Get the API URL from environment or use default
API_URL=${NEXT_PUBLIC_APP_URL:-http://localhost:3000}

echo "🔧 Setting Cloudinary credentials..."
echo "   Cloud Name: $CLOUD_NAME"
echo "   API Key: ${API_KEY:0:10}..."
echo "   API Secret: ${API_SECRET:0:10}..."

# Make API call
if [ -z "$ORG_ID" ]; then
  echo "   Note: org_id not provided, will use your organization"
fi

# Note: This requires authentication. You'll need to:
# 1. Log in to get a session token, or
# 2. Use the UI at /admin/panel/integrations instead

echo ""
echo "✅ To set Cloudinary credentials, please use one of these methods:"
echo ""
echo "Method 1: Use the UI (Recommended)"
echo "  1. Go to: ${API_URL}/admin/panel/integrations"
echo "  2.3. Click 'Configure Cloudinary' button"
echo "  3. Enter your credentials and click 'Save Credentials'"
echo ""
echo "Method 2: Use the API endpoint"
echo "  POST ${API_URL}/api/admin/cloudinary/set-credentials"
echo "  Body: {"
echo "    \"cloud_name\": \"$CLOUD_NAME\","
echo "    \"api_key\": \"$API_KEY\","
echo "    \"api_secret\": \"$API_SECRET\""
if [ -n "$ORG_ID" ]; then
  echo "    \"org_id\": \"$ORG_ID\""
fi
echo "  }"
echo ""
echo "Method 3: Direct database update (Advanced)"
echo "  Update organizations.settings.cloudinary in Supabase"
echo ""

