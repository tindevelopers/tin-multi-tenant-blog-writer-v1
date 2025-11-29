# Vercel Environment Variable Check

## Issue
Vercel is getting 404 errors from Cloud Run endpoints, but direct tests show the endpoints work.

## Root Cause
The `BLOG_WRITER_API_URL` being used in Vercel is likely different from the expected URL.

## Check Vercel Environment Variables

1. Go to Vercel Dashboard
2. Select project: `tin-multi-tenant-blog-writer-v1`
3. Go to Settings → Environment Variables
4. Check if `BLOG_WRITER_API_URL` is set

### If `BLOG_WRITER_API_URL` is set:
- **Remove it** OR
- **Update it to**: `https://blog-writer-api-dev-613248238610.europe-west9.run.app`

### If `BLOG_WRITER_API_URL` is NOT set:
- The code should use branch-based detection
- For `develop` branch, it should use: `https://blog-writer-api-dev-613248238610.europe-west9.run.app`
- Check the `🔧 API URL Configuration` log in Vercel logs to see what URL is actually being used

## Expected Log Output

When a request is made, you should see:
```
🔧 API URL Configuration {
  BLOG_WRITER_API_URL: "https://blog-writer-api-dev-613248238610.europe-west9.run.app",
  NODE_ENV: "production",
  VERCEL_GIT_COMMIT_REF: "develop",
  hasEnvOverride: false
}
```

If `hasEnvOverride: true`, then an environment variable is overriding the branch-based detection.

## Correct Endpoints

The endpoints that work (verified):
- ✅ `https://blog-writer-api-dev-613248238610.europe-west9.run.app/api/v1/keywords/enhanced`
- ✅ `https://blog-writer-api-dev-613248238610.europe-west9.run.app/api/v1/keywords/analyze`

## Fix

1. Remove or correct `BLOG_WRITER_API_URL` in Vercel environment variables
2. Redeploy
3. Check logs for `🔧 API URL Configuration` to verify correct URL

