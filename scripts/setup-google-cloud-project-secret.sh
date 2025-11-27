#!/bin/bash

# Script to Store Google Cloud Project ID in Secrets Manager and Configure Cloud Run
# This script stores the GOOGLE_CLOUD_PROJECT secret and configures Cloud Run to use it

set -e

PROJECT_ID="api-ai-blog-writer"
SECRET_NAME="google-cloud-project-id"
CLOUD_RUN_SERVICE="blog-writer-api-dev"
REGION="europe-west9"

echo "🔧 Setting up Google Cloud Project ID in Secrets Manager..."

# Check if gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK (gcloud) is not installed."
    echo "   Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo "❌ Not authenticated with gcloud. Please run:"
    echo "   gcloud auth login"
    exit 1
fi

# Set the project
echo "📋 Setting GCP project to: $PROJECT_ID"
gcloud config set project "$PROJECT_ID"

# Create secret in Secret Manager (if it doesn't exist)
echo "🔐 Creating secret in Secret Manager..."
if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &> /dev/null; then
    echo "⚠️  Secret '$SECRET_NAME' already exists. Updating it..."
    echo -n "$PROJECT_ID" | gcloud secrets versions add "$SECRET_NAME" \
        --project="$PROJECT_ID" \
        --data-file=-
else
    echo "✅ Creating new secret '$SECRET_NAME'..."
    echo -n "$PROJECT_ID" | gcloud secrets create "$SECRET_NAME" \
        --project="$PROJECT_ID" \
        --data-file=-
fi

# Grant Cloud Run service account access to the secret
echo "🔑 Granting Cloud Run service account access to secret..."
SERVICE_ACCOUNT=$(gcloud run services describe "$CLOUD_RUN_SERVICE" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format="value(spec.template.spec.serviceAccountName)" 2>/dev/null || echo "")

if [ -z "$SERVICE_ACCOUNT" ]; then
    # Use default compute service account
    SERVICE_ACCOUNT="${PROJECT_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
    echo "⚠️  Could not find service account, using default: $SERVICE_ACCOUNT"
fi

echo "   Granting access to: $SERVICE_ACCOUNT"
gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
    --project="$PROJECT_ID" \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor"

echo ""
echo "✅ Secret created/updated successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Update Cloud Run service to mount this secret as GOOGLE_CLOUD_PROJECT"
echo "   2. Run the following command to update Cloud Run:"
echo ""
echo "   gcloud run services update $CLOUD_RUN_SERVICE \\"
echo "     --region=$REGION \\"
echo "     --project=$PROJECT_ID \\"
echo "     --update-secrets=GOOGLE_CLOUD_PROJECT=$SECRET_NAME:latest"
echo ""
echo "   Or configure it via Cloud Console:"
echo "   - Go to Cloud Run → $CLOUD_RUN_SERVICE → Edit & Deploy New Revision"
echo "   - Variables & Secrets → Reference a secret"
echo "   - Secret: $SECRET_NAME"
echo "   - Environment variable name: GOOGLE_CLOUD_PROJECT"
echo "   - Version: latest"
echo ""

