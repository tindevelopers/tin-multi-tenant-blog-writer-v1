# Vercel Token Setup

## ✅ Secrets Added via GitHub CLI

I've added the following secrets to your GitHub repository:

- ✅ **VERCEL_ORG_ID**: `team_3Y0hANzD4PovKmUwUyc2WVpb`
- ✅ **VERCEL_PROJECT_ID**: `prj_01DmJydV6xWIs088QMzsSRkIWnvR`

## ⚠️ Missing: VERCEL_TOKEN

The `VERCEL_TOKEN` needs to be created in the Vercel dashboard and then added to GitHub.

### Step 1: Create Vercel Token

1. **Go to Vercel Tokens**:
   https://vercel.com/account/tokens

2. **Create New Token**:
   - Click "Create Token"
   - Give it a name (e.g., "GitHub Actions Deployment")
   - Set expiration (or leave as "No expiration")
   - Click "Create"

3. **Copy the Token**:
   - ⚠️ **Important**: Copy it immediately - you won't be able to see it again!

### Step 2: Add Token to GitHub

Once you have the token, add it using GitHub CLI:

```bash
gh secret set VERCEL_TOKEN --body "your-token-here" --repo tindevelopers/tin-multi-tenant-blog-writer-v1
```

Or add it manually:
1. Go to: https://github.com/tindevelopers/tin-multi-tenant-blog-writer-v1/settings/secrets/actions
2. Click "New repository secret"
3. Name: `VERCEL_TOKEN`
4. Value: Paste your token
5. Click "Add secret"

### Step 3: Re-run Workflow

After adding the token:
1. Go to: https://github.com/tindevelopers/tin-multi-tenant-blog-writer-v1/actions
2. Find the failed workflow run
3. Click "Re-run all jobs"

---

## Verify Secrets

Check that all secrets are set:

```bash
gh secret list --repo tindevelopers/tin-multi-tenant-blog-writer-v1
```

You should see:
- ✅ VERCEL_ORG_ID
- ✅ VERCEL_PROJECT_ID
- ⏳ VERCEL_TOKEN (needs to be added)

---

## After Adding Token

Once all three secrets are configured, the GitHub Actions workflow will automatically deploy to Vercel on every push to the `develop` branch.

