#!/bin/bash

# Update Cloud Run Service to use GOOGLE_CLOUD_PROJECT from Secrets Manager
# This script configures the Cloud Run service to mount the secret as an environment variable

set -e

PROJECT_ID="api-ai-blog-writer"
SECRET_NAME="google-cloud-project-id"
CLOUD_RUN_SERVICE="blog-writer-api-dev"
REGION="europe-west9"  # Update this to match your actual region

echo "🚀 Updating Cloud Run service to use GOOGLE_CLOUD_PROJECT from Secrets Manager..."

# Check if gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK (gcloud) is not installed."
    echo "   Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set the project
gcloud config set project "$PROJECT_ID"

# Verify secret exists
if ! gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &> /dev/null; then
    echo "❌ Secret '$SECRET_NAME' does not exist!"
    echo "   Please run: ./scripts/setup-google-cloud-project-secret.sh first"
    exit 1
fi

# Update Cloud Run service to mount the secret
echo "📦 Updating Cloud Run service: $CLOUD_RUN_SERVICE"
echo "   Region: $REGION"
echo "   Secret: $SECRET_NAME"
echo "   Environment variable: GOOGLE_CLOUD_PROJECT"
echo ""

gcloud run services update "$CLOUD_RUN_SERVICE" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --update-secrets="GOOGLE_CLOUD_PROJECT=$SECRET_NAME:latest" \
    --quiet

echo ""
echo "✅ Cloud Run service updated successfully!"
echo ""
echo "🔄 The service will be redeployed with the new secret configuration."
echo "   This may take a few minutes..."
echo ""
echo "📊 Check deployment status:"
echo "   gcloud run services describe $CLOUD_RUN_SERVICE --region=$REGION --project=$PROJECT_ID"
echo ""

