# Webflow Scan Failure Analysis

## Issue Summary

Scans are failing because they get stuck in "scanning" status and never complete or timeout properly.

## Root Causes Identified

### 1. **Timeout Not Working Properly**
- The `performScan` function has a 5-minute timeout implemented with `Promise.race`
- However, scans are running longer than 5 minutes without timing out
- The timeout promise might not be rejecting correctly

### 2. **Integration Not Found**
- Debug endpoint shows: "Integration not found for this scan"
- This suggests the `integration_id` stored in the scan record doesn't match any integration
- This could cause issues if the scan tries to look up integration details

### 3. **Webflow API Calls Hanging**
- The `discoverWebflowStructure` function makes multiple API calls:
  - Fetch collections
  - Fetch static pages  
  - Fetch CMS items (with pagination)
- If any of these API calls hang (no response, no timeout), the entire scan hangs
- The fetch calls don't have explicit timeouts

### 4. **Asynchronous Execution Without Proper Error Handling**
- `performScan` is called with `.then()` and `.catch()` but errors might not propagate correctly
- The timeout error handling might not be catching all cases

## Evidence

From debug endpoint:
```json
{
  "scan": {
    "status": "failed",
    "error_message": "Scan was stuck in 'scanning' status for more than 5 minutes and was automatically marked as failed",
    "duration_minutes": 6,
    "is_stuck": true
  },
  "warnings": [
    "Integration not found for this scan"
  ]
}
```

## Recommended Fixes

### Fix 1: Add Timeout to Fetch Calls
Add explicit timeouts to all Webflow API fetch calls in `discoverWebflowStructure`:

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

const response = await fetch(url, {
  headers: { ... },
  signal: controller.signal
});

clearTimeout(timeoutId);
```

### Fix 2: Fix Promise.race Timeout
Ensure the timeout promise properly rejects:

```typescript
const timeoutPromise = new Promise<never>((_, reject) => {
  setTimeout(() => {
    reject(new Error('Scan timeout: Operation exceeded 5 minutes'));
  }, timeoutMs);
});
```

### Fix 3: Add Better Error Logging
Add more detailed logging in `performScan` to identify where it's getting stuck:

```typescript
logger.info('Starting Webflow API call', { step: 'collections', scanId });
// ... API call ...
logger.info('Completed Webflow API call', { step: 'collections', scanId });
```

### Fix 4: Fix Integration Lookup
Ensure `integration_id` is correctly stored and can be looked up:

```typescript
// In POST handler, verify integration exists before creating scan
const { data: verifyIntegration } = await supabase
  .from('integrations')
  .select('integration_id')
  .eq('integration_id', integrationId)
  .single();

if (!verifyIntegration) {
  return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
}
```

## Next Steps

1. ✅ Mark stuck scans as failed (done via `/api/integrations/webflow/mark-stuck-scans-failed`)
2. ⏭️ Add timeouts to fetch calls
3. ⏭️ Fix Promise.race timeout implementation
4. ⏭️ Add better error logging
5. ⏭️ Fix integration lookup issue
6. ⏭️ Test scan with fixes applied

