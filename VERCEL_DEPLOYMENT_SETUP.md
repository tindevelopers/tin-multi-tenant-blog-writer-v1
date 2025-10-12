# Vercel Deployment Setup Guide

## 🚨 Current Issue

The GitHub Actions deployment is failing with:
```
Error: Input required and not supplied: vercel-token
```

This means the required Vercel secrets are not configured in the GitHub repository.

## ✅ What's Working

- ✅ **All code quality checks pass** (ESLint, TypeScript)
- ✅ **Build process succeeds** (Next.js builds successfully)
- ✅ **Tests pass** (Node.js 18.x and 20.x)
- ⚠️ **Deployment blocked** (missing Vercel configuration)

## 🔧 Required Setup

### Step 1: Get Vercel Credentials

1. **Log in to Vercel Dashboard**: https://vercel.com/dashboard
2. **Navigate to Settings** → **Tokens**
3. **Create a new token** with appropriate permissions
4. **Copy the token** (you'll need it for GitHub secrets)

### Step 2: Get Vercel Project IDs

✅ **Already configured locally!** Your project is linked to Vercel with:

- **Project ID**: `prj_01DmJydV6xWIs088QMzsSRkIWnvR`
- **Organization ID**: `team_3Y0hANzD4PovKmUwUyc2WVpb`
- **Project Name**: `tin-multi-tenant-blog-writer-v1`

These values are already in `.vercel/project.json`.

### Step 3: Configure GitHub Secrets

1. **Go to your GitHub repository**:
   - https://github.com/tindevelopers/tin-multi-tenant-blog-writer-v1
2. **Navigate to**: Settings → Secrets and variables → Actions
3. **Add the following secrets**:

   | Secret Name | Description | Example |
   |-------------|-------------|---------|
   | `VERCEL_TOKEN` | Your Vercel authentication token | `abc123...` |
   | `VERCEL_ORG_ID` | Your Vercel organization ID | `team_abc123...` |
   | `VERCEL_PROJECT_ID` | Your Vercel project ID | `prj_abc123...` |

### Step 4: Required Environment Variables

The following secrets should also be configured (if not already):

| Secret Name | Description |
|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |

## 🔄 Alternative Deployment Method

If you prefer to deploy manually without GitHub Actions:

### Option 1: Vercel CLI Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### Option 2: Vercel Git Integration

1. **Connect your repository** directly to Vercel
2. **Vercel will automatically deploy** on every push to main
3. **No GitHub Actions needed** - Vercel handles everything

To set this up:
1. Go to: https://vercel.com/new
2. Import your GitHub repository
3. Configure environment variables in Vercel dashboard
4. Deploy!

## 📋 Workflow Files

The deployment is configured in:
- `.github/workflows/ci.yml` - Main CI/CD pipeline with Vercel deployment

## 🎯 Next Steps

### To Enable Automated Deployments:
1. ✅ Add the three required Vercel secrets to GitHub
2. ✅ Re-run the failed GitHub Action workflow
3. ✅ Monitor the deployment in GitHub Actions

### To Deploy Manually:
1. ✅ Use Vercel CLI or connect repository to Vercel directly
2. ✅ Set environment variables in Vercel dashboard

## 🔍 Troubleshooting

### Deployment Still Failing?

**Check the following:**
- ✅ Vercel token is valid and not expired
- ✅ Organization ID and Project ID are correct
- ✅ All environment variables are set in Vercel project settings
- ✅ Your Vercel account has sufficient permissions

### Need to Debug?

You can test the deployment locally:
```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Actions with Vercel](https://github.com/amondnet/vercel-action)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

## ✨ Summary

Your application code is **production-ready**! The only remaining step is to configure the Vercel secrets in your GitHub repository to enable automated deployments.

Once the secrets are configured, every push to the `main` branch will automatically:
1. ✅ Run tests and linting
2. ✅ Check TypeScript types
3. ✅ Build the application
4. ✅ Deploy to Vercel production

---

**Created**: 2025-10-12  
**Status**: Deployment configuration pending Vercel secrets

