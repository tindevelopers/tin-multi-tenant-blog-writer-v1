#!/bin/bash

# GitHub Secrets Setup Script for Vercel Deployment
# This script helps you set up the required GitHub secrets for automated Vercel deployments

set -e

echo "🔧 GitHub Secrets Setup for Vercel Deployment"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Repository information
REPO_OWNER="tindevelopers"
REPO_NAME="tin-multi-tenant-blog-writer-v1"

echo -e "${BLUE}Repository:${NC} $REPO_OWNER/$REPO_NAME"
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed!${NC}"
    echo ""
    echo "Please install GitHub CLI first:"
    echo "  macOS: brew install gh"
    echo "  Linux: https://github.com/cli/cli/blob/trunk/docs/install_linux.md"
    echo "  Windows: https://github.com/cli/cli/releases"
    echo ""
    echo "After installation, run: gh auth login"
    exit 1
fi

# Check if authenticated with GitHub
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  You are not authenticated with GitHub CLI${NC}"
    echo ""
    echo "Please authenticate first:"
    echo "  gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI is installed and authenticated${NC}"
echo ""

# Read Vercel project configuration
if [ -f ".vercel/project.json" ]; then
    PROJECT_ID=$(cat .vercel/project.json | grep -o '"projectId":"[^"]*"' | cut -d'"' -f4)
    ORG_ID=$(cat .vercel/project.json | grep -o '"orgId":"[^"]*"' | cut -d'"' -f4)
    
    echo -e "${GREEN}✅ Found local Vercel configuration:${NC}"
    echo "  Project ID: $PROJECT_ID"
    echo "  Organization ID: $ORG_ID"
    echo ""
else
    echo -e "${RED}❌ .vercel/project.json not found!${NC}"
    echo ""
    echo "Please link your project to Vercel first:"
    echo "  vercel link"
    exit 1
fi

# Prompt for Vercel token
echo -e "${YELLOW}📝 Please provide your Vercel token${NC}"
echo ""
echo "To get your Vercel token:"
echo "  1. Go to: https://vercel.com/account/tokens"
echo "  2. Click 'Create Token'"
echo "  3. Give it a name (e.g., 'GitHub Actions')"
echo "  4. Copy the token"
echo ""
read -sp "Vercel Token: " VERCEL_TOKEN
echo ""
echo ""

if [ -z "$VERCEL_TOKEN" ]; then
    echo -e "${RED}❌ Vercel token is required!${NC}"
    exit 1
fi

# Set GitHub secrets
echo -e "${BLUE}🔐 Setting up GitHub secrets...${NC}"
echo ""

echo "Setting VERCEL_TOKEN..."
echo "$VERCEL_TOKEN" | gh secret set VERCEL_TOKEN --repo "$REPO_OWNER/$REPO_NAME"

echo "Setting VERCEL_ORG_ID..."
echo "$ORG_ID" | gh secret set VERCEL_ORG_ID --repo "$REPO_OWNER/$REPO_NAME"

echo "Setting VERCEL_PROJECT_ID..."
echo "$PROJECT_ID" | gh secret set VERCEL_PROJECT_ID --repo "$REPO_OWNER/$REPO_NAME"

echo ""
echo -e "${GREEN}✅ All secrets have been set successfully!${NC}"
echo ""

# List all secrets
echo -e "${BLUE}📋 Current GitHub secrets:${NC}"
gh secret list --repo "$REPO_OWNER/$REPO_NAME"

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Trigger a new deployment by pushing to main branch"
echo "  2. Monitor the deployment: https://github.com/$REPO_OWNER/$REPO_NAME/actions"
echo "  3. Check Vercel dashboard: https://vercel.com/dashboard"
echo ""

