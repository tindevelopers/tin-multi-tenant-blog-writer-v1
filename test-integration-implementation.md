# Integration Implementation Test Plan

## ✅ Completed Implementation

### Phase 1: Database Schema ✅
- Migration file: `supabase/migrations/20250118000000_add_connection_method_support.sql`
- Status: **RUN** (confirmed by user)
- Tables updated: `integrations_dev`, `integrations_staging`, `integrations_prod`
- New columns added:
  - `connection_method` (api_key, oauth, NULL)
  - `status` (active, inactive, expired, error)
  - `last_tested_at`, `last_sync_at`, `error_message`, `metadata`, `updated_at`
  - `org_id` (with foreign key and CASCADE delete)

### Phase 2: Encryption ✅
- File: `src/lib/integrations/encryption/credential-encryption.ts`
- Algorithm: AES-256-GCM
- Functions: `encryptCredential()`, `decryptCredential()`, `encryptConnectionConfig()`, `decryptConnectionConfig()`
- **⚠️ REQUIRES**: `INTEGRATION_ENCRYPTION_KEY` environment variable (64 hex chars)

### Phase 3: TypeScript Types ✅
- Updated: `src/lib/integrations/types.ts`
- Added: `ConnectionMethod`, `EnvironmentIntegration` interface
- Extended: `ConnectionConfig` with API key and OAuth fields

### Phase 4: Database Adapter ✅
- Updated: `src/lib/integrations/database/environment-integrations-db.ts`
- Methods updated: `getIntegrations()`, `createIntegration()`, `updateIntegration()`, `deleteIntegration()`
- Encryption/decryption integrated

### Phase 5: API Routes ✅
- Created: `POST /api/integrations/connect-api-key`
- Updated: `GET /api/integrations/oauth/webflow/callback` (saves with `connection_method: 'oauth'`)
- Updated: `POST /api/integrations/[id]/test` (uses new schema)
- Updated: `POST /api/integrations/connect-and-recommend` (detects connection_method)

---

## 🧪 Testing Checklist

### 1. Environment Variables
- [ ] `INTEGRATION_ENCRYPTION_KEY` is set (generate with: `openssl rand -hex 32`)
- [ ] `WEBFLOW_CLIENT_ID` is set (for OAuth)
- [ ] `WEBFLOW_CLIENT_SECRET` is set (for OAuth)
- [ ] `NEXT_PUBLIC_APP_URL` is set (for OAuth redirect)

### 2. Database Verification
```sql
-- Check if migration was applied
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'integrations_dev' 
AND column_name IN ('connection_method', 'status', 'org_id', 'last_tested_at');

-- Check if trigger exists
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name = 'update_integrations_dev_updated_at';

-- Check if constraints exist
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'integrations_dev' 
AND constraint_name LIKE '%unique%';
```

### 3. API Endpoint Tests

#### Test 1: Connect via API Key
```bash
POST /api/integrations/connect-api-key
Headers: { Authorization: Bearer <token> }
Body: {
  "provider": "webflow",
  "connection": {
    "api_token": "test_token_123",
    "site_id": "test_site_id",
    "collection_id": "test_collection_id"
  },
  "test_connection": true
}

Expected: 201 Created
Response: {
  "success": true,
  "data": {
    "id": "...",
    "connection_method": "api_key",
    "status": "active",
    ...
  }
}
```

#### Test 2: Connect via OAuth
```bash
GET /api/integrations/oauth/webflow/authorize
Headers: { Authorization: Bearer <token> }

Expected: 302 Redirect to Webflow OAuth page
```

#### Test 3: Test Connection
```bash
POST /api/integrations/[id]/test
Headers: { Authorization: Bearer <token> }

Expected: 200 OK
Response: {
  "success": true,
  "data": {
    "status": "active",
    "last_tested_at": "..."
  }
}
```

### 4. Database Verification After Tests

```sql
-- Check integration was created with correct fields
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
WHERE org_id = '<your_org_id>'
ORDER BY created_at DESC
LIMIT 1;

-- Verify credentials are encrypted (should not be plaintext)
SELECT 
  id,
  provider,
  connection_method,
  connection->>'api_token' as api_token_sample,
  connection->>'access_token' as access_token_sample
FROM integrations_dev
WHERE org_id = '<your_org_id>'
LIMIT 1;
-- Expected: api_token and access_token should be encrypted (format: "iv:authTag:encryptedData")
```

### 5. Encryption Test

```typescript
// Test encryption/decryption
import { encryptCredential, decryptCredential } from '@/lib/integrations/encryption/credential-encryption';

const plaintext = 'test_api_key_12345';
const encrypted = encryptCredential(plaintext);
console.log('Encrypted:', encrypted); // Should be "iv:authTag:encryptedData" format

const decrypted = decryptCredential(encrypted);
console.log('Decrypted:', decrypted); // Should match plaintext
console.log('Match:', plaintext === decrypted); // Should be true
```

---

## 🐛 Known Issues to Fix

### Issue 1: OAuth State Type Mismatch
**Problem**: `oauth_states.state_value` is `UUID` but `WebflowOAuth.generateState()` returns hex string (64 chars)

**Location**: 
- `supabase/migrations/20250117000000_add_integration_logs.sql` line 110
- `src/lib/integrations/oauth/webflow-oauth.ts` line 113

**Fix Options**:
1. Change `state_value` column to `TEXT` (recommended)
2. Or change `generateState()` to return UUID format

**Recommended Fix**:
```sql
-- Migration to fix state_value type
ALTER TABLE oauth_states 
ALTER COLUMN state_value TYPE TEXT;
```

### Issue 2: Missing Integration Lookup Method
**Problem**: `connect-api-key/route.ts` tries to find existing integration but `getIntegration()` requires an ID

**Location**: `src/app/api/integrations/connect-api-key/route.ts` line 164

**Status**: ✅ Already fixed - uses `getIntegrations()` and filters

---

## 📝 Manual Testing Steps

1. **Set Environment Variable**:
   ```bash
   # Generate encryption key
   openssl rand -hex 32
   # Add to .env.local:
   INTEGRATION_ENCRYPTION_KEY=<generated_key>
   ```

2. **Test API Key Connection**:
   - Navigate to `/admin/integrations/blog-writer`
   - Select "Webflow"
   - Choose "Connect via API Key"
   - Enter API token, site ID, collection ID
   - Submit
   - Verify: Integration created with `connection_method: 'api_key'`
   - Verify: Credentials encrypted in database

3. **Test OAuth Connection**:
   - Navigate to `/admin/integrations/blog-writer`
   - Select "Webflow"
   - Click "Connect via OAuth"
   - Complete OAuth flow
   - Verify: Integration created/updated with `connection_method: 'oauth'`
   - Verify: Tokens encrypted in database

4. **Test Connection Status**:
   - View integration list
   - Verify: Connection method displayed (API Key or OAuth)
   - Verify: Status indicator shows (active, inactive, error)
   - Click "Test Connection"
   - Verify: Status updates and `last_tested_at` timestamp set

5. **Test Credential Masking**:
   - View integration details
   - Verify: Credentials are masked (e.g., `wf_****key123`)
   - Verify: Full credentials NOT visible in UI

---

## 🔍 Verification Queries

### Check Integration Structure
```sql
SELECT 
  id,
  org_id,
  provider,
  connection_method,
  status,
  last_tested_at,
  last_sync_at,
  error_message,
  created_at,
  updated_at
FROM integrations_dev
WHERE org_id = '<your_org_id>';
```

### Check Encryption
```sql
-- Credentials should be encrypted (not plaintext)
SELECT 
  id,
  provider,
  connection_method,
  CASE 
    WHEN connection->>'api_token' LIKE '%:%:%' THEN 'encrypted'
    ELSE 'plaintext'
  END as encryption_status
FROM integrations_dev
WHERE org_id = '<your_org_id>';
```

### Check Logs
```sql
SELECT 
  log_id,
  provider,
  status,
  connection_metadata->>'connection_method' as method,
  created_at
FROM integration_connection_logs
WHERE org_id = '<your_org_id>'
ORDER BY created_at DESC
LIMIT 10;
```

---

## ✅ Success Criteria

- [ ] API key connection creates integration with `connection_method: 'api_key'`
- [ ] OAuth connection creates integration with `connection_method: 'oauth'`
- [ ] Credentials are encrypted in database
- [ ] Credentials are decrypted when retrieved
- [ ] Connection test updates `status` and `last_tested_at`
- [ ] Integration deletion (soft delete) clears credentials
- [ ] Cascade delete works when organization is deleted
- [ ] UI displays connection method and status
- [ ] Credentials are masked in API responses

---

## 🚨 Critical Fixes Needed

1. **OAuth State Type**: Fix `state_value` column type mismatch
2. **Environment Variable**: Ensure `INTEGRATION_ENCRYPTION_KEY` is set
3. **Test Provider-Specific Connection**: Implement actual API calls for connection testing

