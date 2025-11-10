# Vercel Deployment Secrets Setup

## 🔐 Required GitHub Secrets

The GitHub Actions workflow requires three secrets to deploy to Vercel:

1. **`VERCEL_TOKEN`** - Your Vercel authentication token
2. **`VERCEL_ORG_ID`** - Your Vercel organization ID
3. **`VERCEL_PROJECT_ID`** - Your Vercel project ID

---

## 📝 Step 1: Get Your Vercel Token

### Option A: Via Vercel Dashboard
1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name it: "GitHub Actions - Blog Writer"
4. Scope: "Full Access" or limit to specific projects
5. Click "Create"
6. **Copy the token** (you won't see it again!)

### Option B: Via Vercel CLI
```bash
vercel login
vercel token create "GitHub Actions"
```

---

## 📝 Step 2: Get Your Vercel Org ID

### Via Vercel CLI
```bash
# Login to Vercel
vercel login

# Link your project (if not already linked)
cd /Users/gene/Projects/tin-multi-tenant-blog-writer-v1
vercel link

# Get project settings (includes org ID and project ID)
vercel project ls
```

### Via Vercel Dashboard
1. Go to https://vercel.com/
2. Click on your project
3. Go to Settings → General
4. Find "Project ID" and "Team ID" (org ID)

---

## 📝 Step 3: Get Your Vercel Project ID

The project ID is shown in the same locations as the Org ID above.

Alternatively, check the `.vercel/project.json` file (if you've linked the project):
```bash
cat .vercel/project.json
```

---

## 📝 Step 4: Add Secrets to GitHub

### Via GitHub Web Interface
1. Go to: https://github.com/tindevelopers/tin-multi-tenant-blog-writer-v1/settings/secrets/actions
2. Click "New repository secret"
3. Add each secret:

**Secret 1:**
- Name: `VERCEL_TOKEN`
- Value: (paste your Vercel token from Step 1)

**Secret 2:**
- Name: `VERCEL_ORG_ID`
- Value: (paste your org ID from Step 2)

**Secret 3:**
- Name: `VERCEL_PROJECT_ID`
- Value: (paste your project ID from Step 3)

### Via GitHub CLI
```bash
# Install GitHub CLI if needed
# brew install gh

# Authenticate
gh auth login

# Add secrets
gh secret set VERCEL_TOKEN --body "your_token_here"
gh secret set VERCEL_ORG_ID --body "your_org_id_here"
gh secret set VERCEL_PROJECT_ID --body "your_project_id_here"
```

---

## 📝 Step 5: Verify Setup

### Check if secrets are set
```bash
gh secret list
```

You should see:
```
VERCEL_TOKEN        Updated YYYY-MM-DD
VERCEL_ORG_ID       Updated YYYY-MM-DD
VERCEL_PROJECT_ID   Updated YYYY-MM-DD
```

---

## 🚀 Step 6: Test Deployment

### Option A: Push to develop
```bash
git push origin develop
```

The GitHub Actions workflow will automatically:
1. Run tests and linting
2. Build the application
3. Deploy to Vercel (develop environment)
4. Comment deployment URL

### Option B: Manual deployment via CLI
```bash
# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

---

## 🔧 Troubleshooting

### Error: "Input required and not supplied: vercel-token"

**Solution**: The `VERCEL_TOKEN` secret is missing or misspelled.
- Check GitHub Settings → Secrets → Actions
- Ensure the secret name is exactly `VERCEL_TOKEN` (case-sensitive)
- Recreate the secret if needed

### Error: "Project not found"

**Solution**: `VERCEL_PROJECT_ID` or `VERCEL_ORG_ID` is incorrect.
- Verify IDs in Vercel dashboard
- Make sure the project is linked to your Vercel account
- Check `.vercel/project.json` for correct IDs

### Error: "Insufficient permissions"

**Solution**: Vercel token doesn't have correct permissions.
- Create a new token with "Full Access"
- Or ensure token has access to the specific project

---

## 📋 Quick Setup Script

Save this as `setup-vercel-secrets.sh` and run it:

```bash
#!/bin/bash

echo "🔐 Vercel Secrets Setup"
echo "======================="
echo ""

read -p "Enter your VERCEL_TOKEN: " VERCEL_TOKEN
read -p "Enter your VERCEL_ORG_ID: " VERCEL_ORG_ID
read -p "Enter your VERCEL_PROJECT_ID: " VERCEL_PROJECT_ID

echo ""
echo "Setting GitHub secrets..."

gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN"
gh secret set VERCEL_ORG_ID --body "$VERCEL_ORG_ID"
gh secret set VERCEL_PROJECT_ID --body "$VERCEL_PROJECT_ID"

echo ""
echo "✅ Secrets configured!"
echo ""
echo "Verify with: gh secret list"
```

Usage:
```bash
chmod +x setup-vercel-secrets.sh
./setup-vercel-secrets.sh
```

---

## 🌐 Deployment Workflow

### When you push to `develop`:
1. GitHub Actions triggers
2. Runs linting and type checks
3. Builds the application
4. Deploys to Vercel (develop environment)
5. Posts deployment URL to commit status

### When you create a PR:
1. GitHub Actions triggers
2. Runs all checks
3. Builds application
4. Deploys preview to Vercel
5. Comments preview URL on PR

---

## 📚 Related Documentation

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Vercel GitHub Integration](https://vercel.com/docs/git/vercel-for-github)

---

## ✅ After Setup

Once secrets are configured:
- Every push to `develop` will auto-deploy
- Pull requests get preview deployments
- No manual deployment needed

**Your Phase 1 implementation will automatically deploy to Vercel!** 🚀

