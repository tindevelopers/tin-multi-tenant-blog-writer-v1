# Endpoint Verification: Remote Cloud Run vs Local

## Current Configuration

### Frontend Calls (Relative URLs)
The frontend makes requests to:
- `/api/cloud-run/health` - Relative URL (goes to Next.js server)
- `/api/keywords/analyze` - Relative URL (goes to Next.js server)

These are **NOT** direct calls to Cloud Run - they go through Next.js API routes.

### Next.js API Routes (Proxies to Remote)
The Next.js API routes then proxy to the **remote Cloud Run endpoint**:

#### 1. `/api/cloud-run/health` Route
**File:** `src/app/api/cloud-run/health/route.ts`

**Configuration:**
```typescript
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

const CLOUD_RUN_URL = BLOG_WRITER_API_URL;

// Proxies to: ${CLOUD_RUN_URL}/health
const response = await fetch(`${CLOUD_RUN_URL}/health`, {
  method: 'GET',
  headers: {
    'Accept': 'application/json',
  },
  signal: controller.signal,
});
```

**Remote Endpoint:** `${BLOG_WRITER_API_URL}/health`

#### 2. `/api/keywords/analyze` Route
**File:** `src/app/api/keywords/analyze/route.ts`

**Configuration:**
```typescript
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

// Proxies to: ${BLOG_WRITER_API_URL}/api/v1/keywords/analyze
const endpoint = `${BLOG_WRITER_API_URL}/api/v1/keywords/analyze`;

const response = await fetchWithRetry(
  endpoint,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(limitedRequestBody),
  }
);
```

**Remote Endpoint:** `${BLOG_WRITER_API_URL}/api/v1/keywords/analyze`

### BLOG_WRITER_API_URL Configuration
**File:** `src/lib/blog-writer-api-url.ts`

**Branch-Based Routing:**
- **Develop branch:** `https://blog-writer-api-dev-613248238610.europe-west9.run.app`
- **Staging branch:** `https://blog-writer-api-staging-613248238610.europe-west9.run.app`
- **Main/Prod branch:** `https://blog-writer-api-prod-613248238610.us-east1.run.app`

**Priority:**
1. `BLOG_WRITER_API_URL` environment variable (if explicitly set)
2. Branch detection from `VERCEL_GIT_COMMIT_REF`
3. Defaults to dev endpoint

## Verification

### ✅ Confirmed: Using Remote Endpoints
1. **No localhost references** - All routes use `BLOG_WRITER_API_URL`
2. **Remote Cloud Run URLs** - All point to `*.run.app` domains
3. **Branch-based routing** - Automatically selects correct endpoint based on deployment branch

### ❌ 404 Error Cause
The 404 errors are **NOT** because it's calling local endpoints. The issue is:

1. **Next.js API routes not found** - The routes `/api/cloud-run/health` and `/api/keywords/analyze` are returning 404
2. **Routes not deployed** - The API route files may not be included in the Vercel build
3. **Server not recognizing routes** - Next.js server needs restart or routes need to be rebuilt

### How to Verify Remote Endpoint is Used

#### Check 1: Environment Variable
```bash
# In Vercel dashboard or .env.local
echo $BLOG_WRITER_API_URL
# Should show: https://blog-writer-api-dev-613248238610.europe-west9.run.app (or staging/prod)
```

#### Check 2: Runtime Logs
When the API routes execute, they log:
- Cloud Run Health: `Proxying Cloud Run health check`
- Keywords Analyze: Logs show the endpoint being called

#### Check 3: Network Tab
1. Open browser DevTools → Network tab
2. Look for requests to `/api/cloud-run/health` and `/api/keywords/analyze`
3. These should return JSON (not 404 HTML)
4. The Next.js server then makes requests to the remote Cloud Run endpoint

#### Check 4: Server-Side Logs
Check Vercel function logs to see:
```
Proxying Cloud Run health check
Fetching: https://blog-writer-api-dev-613248238610.europe-west9.run.app/health
```

## Summary

✅ **Confirmed:** The application is configured to use **remote Cloud Run endpoints**, not local endpoints.

❌ **Issue:** The Next.js API routes are returning 404, which means:
- Routes aren't being recognized by Next.js
- Routes aren't deployed to Vercel
- Server needs restart/redeploy

**Next Steps:**
1. Verify routes are deployed in Vercel
2. Check Vercel build logs for route compilation
3. Restart/redeploy to ensure routes are recognized

