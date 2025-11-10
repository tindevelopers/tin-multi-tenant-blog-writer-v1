# ⚡ Quick Vercel Setup - Final Step

## ✅ Already Configured

I've successfully set up 2 out of 3 required secrets in GitHub:

- ✅ **VERCEL_ORG_ID**: `team_3Y0hANzD4PovKmUwUyc2WVpb`
- ✅ **VERCEL_PROJECT_ID**: `prj_01DmJydV6xWIs088QMzsSRkIWnvR`

---

## ⚠️ One Secret Remaining

You need to create a **VERCEL_TOKEN** manually:

---

## 🚀 Quick 2-Minute Setup

### Step 1: Create Vercel Token (1 minute)

**Open this URL**: https://vercel.com/account/tokens

Then:
1. Click **"Create Token"**
2. Name: **"GitHub Actions - Blog Writer"**
3. Expiration: **"No Expiration"** (or your preference)
4. Scope: **"Full Account"** (recommended) or limit to your team
5. Click **"Create"**
6. **Copy the token** immediately (shown only once!)

---

### Step 2: Set GitHub Secret (30 seconds)

**Option A: Via Web Interface** (Easiest)

1. Visit: https://github.com/tindevelopers/tin-multi-tenant-blog-writer-v1/settings/secrets/actions
2. Click **"New repository secret"**
3. Name: `VERCEL_TOKEN`
4. Value: (paste your token from Step 1)
5. Click **"Add secret"**

**Option B: Via Command Line**

```bash
# Paste your token when prompted
gh secret set VERCEL_TOKEN

# Then paste the token and press Enter
```

---

## ✅ Verification

### Check all secrets are set:

```bash
gh secret list
```

You should see:
```
VERCEL_ORG_ID       Updated 2025-10-14
VERCEL_PROJECT_ID   Updated 2025-10-14
VERCEL_TOKEN        Updated 2025-10-14  ← This one you just added
```

---

## 🎯 Test Deployment

Once the token is set, test it:

```bash
# Make a small change and push
git add .
git commit -m "test: Verify Vercel deployment"
git push origin develop
```

GitHub Actions will automatically:
1. ✅ Run linting and type checks
2. ✅ Build the application
3. ✅ Deploy to Vercel
4. ✅ Comment deployment URL on commit

---

## 📊 Deployment Status

After pushing, check deployment status:

**GitHub Actions**:
https://github.com/tindevelopers/tin-multi-tenant-blog-writer-v1/actions

**Vercel Dashboard**:
https://vercel.com/tindeveloper/tin-multi-tenant-blog-writer-v1

---

## 🔧 Alternative: Manual Deployment

If you prefer manual deployment (no GitHub Actions):

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

---

## ✅ Summary

**Already Done**:
- ✅ Phase 1 code complete and pushed to GitHub
- ✅ Vercel project linked
- ✅ VERCEL_ORG_ID secret set
- ✅ VERCEL_PROJECT_ID secret set

**You Need To Do** (2 minutes):
1. Create token at https://vercel.com/account/tokens
2. Add as `VERCEL_TOKEN` secret in GitHub
3. Done! Auto-deployment will work

---

**After setup, every push to `develop` will automatically deploy to Vercel!** 🚀

