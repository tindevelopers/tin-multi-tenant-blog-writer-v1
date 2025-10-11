# 🔐 GitHub Secrets Setup Guide

This guide explains how to set up the required secrets for the CI/CD pipeline to work properly.

## 📋 Required Secrets

### Supabase Configuration
| Secret Name | Value | Description |
|-------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://edtxtpqrfpxeogukfunq.supabase.co` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Supabase service role key |

### Application Configuration
| Secret Name | Value | Description |
|-------------|-------|-------------|
| `NEXT_PUBLIC_APP_URL` | `https://tin-multi-tenant-blog-writer-v1.vercel.app` | Production app URL |

### Vercel Configuration (Optional - for deployment)
| Secret Name | Value | Description |
|-------------|-------|-------------|
| `VERCEL_TOKEN` | `vercel_xxx...` | Vercel API token |
| `VERCEL_ORG_ID` | `team_xxx...` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | `prj_xxx...` | Vercel project ID |

## 🚀 Setup Methods

### Method 1: Manual Setup (Recommended)

1. **Go to GitHub Repository Secrets:**
   ```
   https://github.com/tindevelopers/tin-multi-tenant-blog-writer-v1/settings/secrets/actions
   ```

2. **Click "New repository secret"**

3. **Add each secret:**
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://edtxtpqrfpxeogukfunq.supabase.co`
   - Click "Add secret"

4. **Repeat for all required secrets**

### Method 2: GitHub CLI (If authenticated)

```bash
# Run the setup script
./scripts/setup-secrets.sh

# Or set individually
gh secret set NEXT_PUBLIC_SUPABASE_URL --body "https://edtxtpqrfpxeogukfunq.supabase.co"
gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY --body "your-anon-key"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "your-service-role-key"
gh secret set NEXT_PUBLIC_APP_URL --body "https://tin-multi-tenant-blog-writer-v1.vercel.app"
```

## 🔍 Verifying Secrets

After setting up secrets:

1. **Check the Actions tab:**
   ```
   https://github.com/tindevelopers/tin-multi-tenant-blog-writer-v1/actions
   ```

2. **Trigger a workflow:**
   - Make a small change to any file
   - Commit and push to main branch
   - Watch the CI pipeline run

3. **Verify build success:**
   - Type checking should pass
   - Linting should pass
   - Build should complete successfully

## 🚨 Troubleshooting

### Common Issues

**❌ "Bad credentials" error:**
- Ensure you have write access to the repository
- Check that you're authenticated with GitHub CLI

**❌ Build fails with "Environment variable not found":**
- Verify all secrets are set correctly
- Check secret names match exactly (case-sensitive)

**❌ Vercel deployment fails:**
- Set up Vercel secrets separately
- Ensure Vercel project is connected to GitHub

### Getting Vercel Credentials

1. **VERCEL_TOKEN:**
   - Go to: https://vercel.com/account/tokens
   - Create a new token
   - Copy the token value

2. **VERCEL_ORG_ID & VERCEL_PROJECT_ID:**
   - Install Vercel CLI: `npm i -g vercel`
   - Run: `vercel link`
   - Check `.vercel/project.json` for IDs

## 📚 Related Documentation

- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Supabase Environment Variables](https://supabase.com/docs/guides/getting-started/local-development#env-example)

## ✅ Next Steps

After setting up secrets:

1. ✅ **Test CI Pipeline** - Push a change and verify build success
2. ✅ **Connect Vercel** - Import repository and configure environment variables
3. ✅ **Deploy to Production** - Verify signup flow works on production
4. ✅ **Update Supabase** - Add production URLs to Supabase auth settings
