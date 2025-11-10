#!/bin/bash

echo "🔐 Vercel Token Setup for GitHub Actions"
echo "=========================================="
echo ""
echo "✅ Already configured:"
echo "  - VERCEL_ORG_ID: team_3Y0hANzD4PovKmUwUyc2WVpb"
echo "  - VERCEL_PROJECT_ID: prj_01DmJydV6xWIs088QMzsSRkIWnvR"
echo ""
echo "⚠️  Still needed: VERCEL_TOKEN"
echo ""
echo "📝 To get your Vercel token:"
echo "   1. Visit: https://vercel.com/account/tokens"
echo "   2. Click 'Create Token'"
echo "   3. Name: 'GitHub Actions - Blog Writer'"
echo "   4. Expiration: No expiration (or your preference)"
echo "   5. Scope: Full Account or limit to team_3Y0hANzD4PovKmUwUyc2WVpb"
echo "   6. Click 'Create'"
echo "   7. Copy the token (you'll only see it once!)"
echo ""
echo "Opening Vercel tokens page in browser..."
open "https://vercel.com/account/tokens" 2>/dev/null || echo "Please visit: https://vercel.com/account/tokens"
echo ""
echo "Paste your Vercel token below (it will be hidden):"
read -s VERCEL_TOKEN

if [ -z "$VERCEL_TOKEN" ]; then
  echo ""
  echo "❌ No token provided. Exiting."
  exit 1
fi

echo ""
echo "Setting VERCEL_TOKEN in GitHub..."
gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ All Vercel secrets configured successfully!"
  echo ""
  echo "Verifying secrets..."
  gh secret list | grep VERCEL
  echo ""
  echo "🚀 GitHub Actions will now automatically deploy to Vercel!"
  echo ""
  echo "Next push to 'develop' branch will trigger deployment."
else
  echo ""
  echo "❌ Failed to set secret. Please check your GitHub CLI authentication."
  exit 1
fi

