#!/bin/bash

# GitHub Secrets Setup Script for TIN Multi-Tenant Blog Writer
# Run this script to set up repository secrets for CI/CD

echo "🔧 Setting up GitHub repository secrets..."

# Check if gh CLI is installed and authenticated
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first:"
    echo "   brew install gh"
    exit 1
fi

# Check authentication
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI. Please run:"
    echo "   gh auth login"
    exit 1
fi

# Repository name
REPO="tindevelopers/tin-multi-tenant-blog-writer-v1"

echo "📋 Setting up secrets for repository: $REPO"

# Supabase secrets (update these with your actual values)
echo "🔐 Setting Supabase secrets..."

gh secret set NEXT_PUBLIC_SUPABASE_URL \
  --repo "$REPO" \
  --body "https://edtxtpqrfpxeogukfunq.supabase.co"

gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY \
  --repo "$REPO" \
  --body "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdHh0cHFyZnB4ZW9ndWtmdW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMTU5NTcsImV4cCI6MjA3MzY5MTk1N30.viyecHpzThDCp0JivzOsFpYbQCwoRMeVgEjcIgFuHBg"

gh secret set SUPABASE_SERVICE_ROLE_KEY \
  --repo "$REPO" \
  --body "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdHh0cHFyZnB4ZW9ndWtmdW5xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODExNTk1NywiZXhwIjoyMDczNjkxOTU3fQ.QW7ox0NJ6V_1VtNEMFRSr9x44NY6JF1TA_7SnKRP600"

# App URL
echo "🌐 Setting app URL..."

gh secret set NEXT_PUBLIC_APP_URL \
  --repo "$REPO" \
  --body "https://tin-multi-tenant-blog-writer-v1.vercel.app"

# Vercel secrets (these need to be set manually)
echo "⚠️  Vercel secrets need to be set manually:"
echo "   - Go to: https://vercel.com/account/tokens"
echo "   - Create a new token"
echo "   - Set VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID"

echo ""
echo "✅ Supabase secrets have been set successfully!"
echo "🔗 View secrets at: https://github.com/$REPO/settings/secrets/actions"
echo ""
echo "📋 Next steps:"
echo "1. Set up Vercel secrets manually"
echo "2. Connect Vercel to the repository"
echo "3. Push a change to trigger CI/CD"
