# Post-Migration Checklist

## ✅ Migrations Complete!

All database migrations have been run. Now let's verify everything is set up correctly.

---

## 🔍 Step 1: Verify Database Schema

Run these queries in Supabase SQL Editor to verify migrations were successful:

### Check integrations_dev table structure:
```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'integrations_dev' 
AND column_name IN ('connection_method', 'status', 'org_id', 'last_tested_at', 'updated_at')
ORDER BY column_name;
```

**Expected**: Should see all columns with correct types.

### Check constraints:
```sql
SELECT 
  constraint_name, 
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'integrations_dev' 
AND constraint_name LIKE '%unique%' OR constraint_name LIKE '%key%';
```

**Expected**: Should see `integrations_dev_org_id_provider_key` UNIQUE constraint.

### Check oauth_states table:
```sql
SELECT 
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'oauth_states' 
AND column_name = 'state_value';
```

**Expected**: `state_value` should be `text` (not `uuid`).

### Check integration_connection_logs status constraint:
```sql
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'integration_connection_logs_status_check';
```

**Expected**: Should include all status values including `connection_test_initiated`, `oauth_redirected`, etc.

---

## 🔐 Step 2: Set Environment Variables in Vercel

### Required: INTEGRATION_ENCRYPTION_KEY

1. **Generate encryption key**:
   ```bash
   openssl rand -hex 32
   ```

2. **Add to Vercel**:
   - Go to: https://vercel.com/dashboard
   - Select your project: `tin-multi-tenant-blog-writer-v1`
   - Settings → Environment Variables
   - Add new variable:
     - **Name**: `INTEGRATION_ENCRYPTION_KEY`
     - **Value**: `<generated_key_from_step_1>`
     - **Environment**: Production (and Preview if needed)
   - Click "Save"

3. **Redeploy** (if already deployed):
   - Go to Deployments tab
   - Click "Redeploy" on latest deployment
   - Or push a new commit to trigger redeploy

### Verify Other Environment Variables:
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [ ] `NEXT_PUBLIC_APP_URL` is set to `https://tin-multi-tenant-blog-writer-v1.vercel.app`
- [ ] `BLOG_WRITER_API_URL` is set (if using external API)
- [ ] `BLOG_WRITER_API_KEY` is set (if using external API)

---

## 🧪 Step 3: Test the Implementation

### Option A: Automated Test Script (Recommended)

1. **Get fresh token** (your current one expires soon):
   ```bash
   node scripts/get-token.js systemadmin@tin.info <password> https://tin-multi-tenant-blog-writer-v1.vercel.app
   ```

2. **Run tests**:
   ```bash
   INTEGRATION_TEST_BASE_URL="https://tin-multi-tenant-blog-writer-v1.vercel.app" \
   INTEGRATION_TEST_TOKEN="<fresh_token>" \
   node scripts/test-integrations.js --skip-oauth --verbose
   ```

### Option B: Manual Testing via Browser

1. **Navigate to integrations page**:
   ```
   https://tin-multi-tenant-blog-writer-v1.vercel.app/admin/integrations/blog-writer?provider=webflow
   ```

2. **Test API Key Connection**:
   - Select "Connect via API Key"
   - Enter test credentials
   - Submit and verify success

3. **Test OAuth Connection**:
   - Click "Connect via OAuth"
   - Complete OAuth flow
   - Verify redirect back

---

## 📊 Step 4: Verify Database After Testing

After running tests, verify data was stored correctly:

### Check Integration Created:
```sql
SELECT 
  id,
  org_id,
  provider,
  connection_method,
  status,
  last_tested_at,
  created_at,
  updated_at
FROM integrations_dev
WHERE org_id IN (
  SELECT org_id FROM users 
  WHERE email = 'systemadmin@tin.info'
)
ORDER BY created_at DESC
LIMIT 5;
```

**Expected**: Should see integration with `connection_method: 'api_key'` or `'oauth'`.

### Verify Encryption:
```sql
SELECT 
  id,
  provider,
  connection_method,
  CASE 
    WHEN connection->>'api_token' LIKE '%:%:%' THEN '✅ encrypted'
    WHEN connection->>'access_token' LIKE '%:%:%' THEN '✅ encrypted'
    ELSE '❌ plaintext'
  END as encryption_status,
  status
FROM integrations_dev
WHERE org_id IN (
  SELECT org_id FROM users 
  WHERE email = 'systemadmin@tin.info'
)
LIMIT 5;
```

**Expected**: Credentials should show `✅ encrypted` (format: `iv:authTag:encryptedData`).

### Check Logs:
```sql
SELECT 
  log_id,
  provider,
  status,
  connection_metadata->>'connection_method' as method,
  error_message,
  created_at
FROM integration_connection_logs
WHERE org_id IN (
  SELECT org_id FROM users 
  WHERE email = 'systemadmin@tin.info'
)
ORDER BY created_at DESC
LIMIT 10;
```

**Expected**: Should see log entries with various statuses.

---

## ✅ Step 5: Success Criteria

### Database ✅
- [ ] `connection_method` column exists in `integrations_dev`
- [ ] `status` column exists with correct constraint
- [ ] `org_id` foreign key exists with CASCADE delete
- [ ] UNIQUE constraint on `(org_id, provider)` exists
- [ ] `oauth_states.state_value` is TEXT type
- [ ] Log status constraint includes all status values

### Environment Variables ✅
- [ ] `INTEGRATION_ENCRYPTION_KEY` is set in Vercel
- [ ] All other required env vars are set
- [ ] Deployment completed successfully

### API Endpoints ✅
- [ ] `POST /api/integrations/connect-api-key` returns 201
- [ ] `GET /api/integrations` returns 200
- [ ] `GET /api/integrations/[id]` returns 200
- [ ] `POST /api/integrations/[id]/test` returns 200
- [ ] `POST /api/integrations/connect-and-recommend` returns 200

### Data Integrity ✅
- [ ] Credentials are encrypted in database
- [ ] Credentials are decrypted when retrieved
- [ ] Connection method is stored correctly
- [ ] Status updates correctly
- [ ] Logs are created for all operations

---

## 🐛 Troubleshooting

### If tests still fail with 404:
- **Check**: Deployment completed in Vercel
- **Check**: Routes exist in `src/app/api/integrations/`
- **Fix**: Redeploy or check build logs

### If tests fail with 500:
- **Check**: `INTEGRATION_ENCRYPTION_KEY` is set
- **Check**: Database migrations were run
- **Check**: Server logs in Vercel dashboard
- **Fix**: Set missing env vars, verify migrations

### If credentials are not encrypted:
- **Check**: `INTEGRATION_ENCRYPTION_KEY` is set correctly (64 hex chars)
- **Check**: Encryption utility is being called
- **Fix**: Verify env var, check server logs

### If connection_method is NULL:
- **Check**: API routes are detecting connection method correctly
- **Check**: Database column allows NULL (it should)
- **Fix**: Verify API route logic

---

## 🎯 Next Steps After Verification

Once everything is verified:

1. **Update UI Components** (Pending):
   - Display `connection_method` in integration list
   - Show status indicators
   - Add connection method selector

2. **Add More Tests**:
   - Test OAuth flow manually
   - Test error scenarios
   - Test edge cases

3. **Documentation**:
   - Update API documentation
   - Create user guide for integrations
   - Document encryption process

4. **Production Hardening**:
   - Review security practices
   - Set up monitoring
   - Add rate limiting if needed

---

## 📝 Quick Verification Commands

```bash
# 1. Get fresh token
node scripts/get-token.js systemadmin@tin.info <password> https://tin-multi-tenant-blog-writer-v1.vercel.app

# 2. Run tests
INTEGRATION_TEST_BASE_URL="https://tin-multi-tenant-blog-writer-v1.vercel.app" \
INTEGRATION_TEST_TOKEN="<token>" \
node scripts/test-integrations.js --skip-oauth --verbose

# 3. Check deployment status
curl -I https://tin-multi-tenant-blog-writer-v1.vercel.app/api/integrations
```

---

**Status**: Ready for testing! 🚀

