# API Routes Verification Guide

## Routes That Should Exist

### 1. `/api/cloud-run/health` (GET)
- **File:** `src/app/api/cloud-run/health/route.ts`
- **Export:** `export async function GET(request: NextRequest)`
- **Purpose:** Proxies Cloud Run health checks to avoid CORS
- **Called from:** `src/hooks/useCloudRunStatus.ts`

### 2. `/api/keywords/analyze` (POST)
- **File:** `src/app/api/keywords/analyze/route.ts`
- **Export:** `export async function POST(request: NextRequest)`
- **Purpose:** Analyzes keywords and proxies to Blog Writer API
- **Called from:** `src/app/admin/workflow/keywords/page.tsx`

## Verification Steps

### Step 1: Check Files Exist
```bash
ls -la src/app/api/cloud-run/health/route.ts
ls -la src/app/api/keywords/analyze/route.ts
```

Both should exist.

### Step 2: Check Exports
```bash
# Cloud Run Health
grep "export.*GET" src/app/api/cloud-run/health/route.ts

# Keywords Analyze
grep "export.*POST" src/app/api/keywords/analyze/route.ts
```

Both should show export statements.

### Step 3: Test Locally
```bash
# Start dev server
npm run dev

# Test health endpoint
curl http://localhost:3000/api/cloud-run/health

# Test keywords endpoint
curl -X POST http://localhost:3000/api/keywords/analyze \
  -H "Content-Type: application/json" \
  -d '{"keywords": ["test"]}'
```

### Step 4: Check Deployment
If deployed to Vercel:
1. Check Vercel build logs
2. Verify routes are included in `.next/server/app/api/` structure
3. Check function logs in Vercel dashboard

## Common Issues

### Issue: 404 Error
**Symptoms:**
- Browser shows 404 HTML page
- Console shows "Failed to load resource: 404"

**Solutions:**
1. **Restart dev server** (if local)
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

2. **Redeploy** (if on Vercel)
   ```bash
   git push origin develop
   ```

3. **Clear Next.js cache**
   ```bash
   rm -rf .next
   npm run dev
   ```

4. **Verify Next.js version**
   ```bash
   npm list next
   ```
   Should be 13.0.0 or higher for App Router support.

### Issue: Route Not Recognized
**Check:**
- File is in correct location: `src/app/api/[route-name]/route.ts`
- Export function matches HTTP method (GET, POST, etc.)
- No syntax errors in route file
- Next.js config doesn't exclude API routes

### Issue: Build Errors
**Check:**
- TypeScript compilation errors
- Missing dependencies
- Import path errors
- Environment variables configured

## Expected Response Formats

### `/api/cloud-run/health` (GET)
**Success:**
```json
{
  "isHealthy": true,
  "isWakingUp": false,
  "lastChecked": "2025-11-16T...",
  "data": {
    "status": "healthy",
    "timestamp": "..."
  }
}
```

**Error:**
```json
{
  "isHealthy": false,
  "isWakingUp": true,
  "lastChecked": "2025-11-16T...",
  "error": "Cloud Run is starting up. Please wait..."
}
```

### `/api/keywords/analyze` (POST)
**Success:**
```json
{
  "enhanced_analysis": {...},
  "clusters": [...],
  "saved_search_id": "..."
}
```

**Error:**
```json
{
  "error": "Error message here"
}
```

## Debugging

### Enable Debug Logging
Check browser console and server logs for:
- Route registration messages
- Request/response logs
- Error stack traces

### Check Network Tab
1. Open browser DevTools → Network tab
2. Filter by "XHR" or "Fetch"
3. Look for requests to `/api/cloud-run/health` and `/api/keywords/analyze`
4. Check response status and body

### Verify Route Structure
Next.js App Router requires:
```
src/app/api/[route-name]/route.ts
```

With export:
```typescript
export async function GET(request: NextRequest) { ... }
// or
export async function POST(request: NextRequest) { ... }
```

## Quick Fix Checklist

- [ ] Route files exist in correct location
- [ ] Export functions are correct (GET/POST)
- [ ] No TypeScript errors
- [ ] Next.js dev server restarted (if local)
- [ ] Vercel deployment successful (if deployed)
- [ ] Routes accessible via curl/test
- [ ] No middleware blocking routes
- [ ] Environment variables set correctly

