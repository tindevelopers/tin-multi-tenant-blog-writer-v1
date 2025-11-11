# Integration Credentials Architecture: API Keys vs OAuth

## 📋 Overview

This document outlines the architecture for managing organization-level integration credentials, supporting both **API Key** and **OAuth** connection methods. Each organization can choose their preferred authentication method for each integration provider (Webflow, WordPress, Shopify, etc.).

---

## 🎯 Requirements

1. **Flexible Connection Methods**: Organizations can choose between API keys or OAuth for each provider
2. **Secure Storage**: All credentials encrypted at rest in the database
3. **Organization Isolation**: Each organization has isolated credentials (RLS enforced)
4. **Cascade Deletion**: Credentials automatically removed when organization is deleted
5. **Method Switching**: Organizations can switch between API key and OAuth methods
6. **Comprehensive Logging**: All credential operations logged for audit trail

---

## 🗄️ Database Schema Design

### Recommended: Single Record with Flexible Connection Method

```sql
-- integrations_{ENV} table (e.g., integrations_dev, integrations_staging, integrations_prod)
CREATE TABLE integrations_dev (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('webflow', 'wordpress', 'shopify')),
  connection_method TEXT CHECK (connection_method IN ('api_key', 'oauth', NULL)),
  
  -- Flexible JSONB structure for credentials
  connection JSONB NOT NULL DEFAULT '{}',
  /*
    Structure:
    {
      // For API Key method:
      "api_key": "encrypted_value",
      "api_secret": "encrypted_value",  // Optional, provider-dependent
      "site_id": "string",              // Provider-specific IDs
      "collection_id": "string",
      "site_url": "string",             // For WordPress
      "store_name": "string",           // For Shopify
      
      // For OAuth method:
      "access_token": "encrypted_value",
      "refresh_token": "encrypted_value",
      "expires_at": "2025-01-20T10:00:00Z",
      "token_type": "Bearer",
      "scope": "sites:read cms:read cms:write",
      "site_id": "string",
      "collection_id": "string"
    }
  */
  
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'expired', 'error')),
  last_tested_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',  -- Additional provider-specific metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one active integration per provider per organization
  UNIQUE(org_id, provider)
);

-- Indexes for performance
CREATE INDEX idx_integrations_org_id ON integrations_dev(org_id);
CREATE INDEX idx_integrations_provider ON integrations_dev(provider);
CREATE INDEX idx_integrations_status ON integrations_dev(status);
CREATE INDEX idx_integrations_connection_method ON integrations_dev(connection_method);

-- Updated timestamp trigger
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations_dev
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Benefits of This Approach

✅ **Single Record Per Provider**: One record per provider per organization  
✅ **Easy Method Switching**: Change `connection_method` without creating new records  
✅ **Simple Queries**: No complex joins needed  
✅ **Flexible Credential Storage**: JSONB accommodates different provider requirements  
✅ **Status Tracking**: Clear status indicators for connection health  

---

## 🔐 Security Considerations

### Encryption Strategy

**Option 1: Supabase Vault (Recommended)**
```sql
-- Use Supabase Vault for encryption at rest
-- Credentials stored encrypted using pgcrypto
-- Application handles encryption/decryption via Supabase client
```

**Option 2: Application-Level Encryption**
```typescript
// Encrypt before storing, decrypt after retrieval
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.INTEGRATION_ENCRYPTION_KEY!; // 32-byte key
const ALGORITHM = 'aes-256-gcm';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### Access Control

- **View Credentials**: Only `admin`, `manager`, `super_admin`, `system_admin` roles
- **Manage Credentials**: Only `admin`, `manager`, `super_admin`, `system_admin` roles
- **Users**: Can only view connection status (not actual credentials)
- **API Responses**: Never return raw credentials, only masked versions (e.g., `wf_****key123`)

### Security Best Practices

1. ✅ **Encrypt all credentials** before storing in database
2. ✅ **Use environment variables** for encryption keys (never commit to repo)
3. ✅ **Rotate encryption keys** periodically
4. ✅ **Never log credentials** in application logs
5. ✅ **Use HTTPS** for all API calls
6. ✅ **Implement rate limiting** on credential operations
7. ✅ **Add audit trail** for all credential changes
8. ✅ **Auto-expire OAuth tokens** based on `expires_at`
9. ✅ **Provide token refresh** mechanism for OAuth
10. ✅ **Validate credentials** before storing

---

## 🔄 Connection Method Selection

### UI Flow

1. **Organization admin selects provider** (Webflow, WordPress, Shopify)
2. **Choose connection method**:
   - **API Key**: Manual entry form
   - **OAuth**: Redirect to provider's OAuth flow
3. **Store selection** in `connection_method` field
4. **Store credentials** in `connection` JSONB (encrypted)
5. **Set status** to `'active'` after successful validation

### Method Availability

| Provider | API Key Supported | OAuth Supported | Preferred Method |
|----------|------------------|-----------------|------------------|
| Webflow  | ✅ Yes           | ✅ Yes          | OAuth (recommended) |
| WordPress | ✅ Yes          | ✅ Yes          | Both supported |
| Shopify  | ⚠️ Limited      | ✅ Yes          | OAuth (required) |

### Switching Methods

Organizations can switch between methods:
1. **Disconnect current method** (set `status: 'inactive'`)
2. **Clear old credentials** from `connection` JSONB
3. **Connect with new method** (set new `connection_method` and credentials)
4. **Validate new credentials** before activating

---

## 🗑️ Cascade Deletion

### Current Implementation

```sql
-- integrations_{ENV} table already has:
org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE
```

### Additional Cleanup Required

```sql
-- Ensure all related tables cascade delete
-- integration_connection_logs (already implemented)
org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE

-- oauth_states (should cascade)
org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE
```

### Soft Delete vs Hard Delete

**Recommendation**: Use soft delete for audit trail
- Set `status: 'inactive'` instead of hard delete
- Keep credentials encrypted for potential recovery
- Add `deleted_at` timestamp if needed
- Hard delete after retention period (e.g., 90 days)

---

## 🔧 Credential Management Operations

### 1. Create Connection

**API Endpoint**: `POST /api/integrations`

```typescript
interface CreateIntegrationRequest {
  provider: 'webflow' | 'wordpress' | 'shopify';
  connection_method: 'api_key' | 'oauth';
  connection: {
    // API Key method
    api_key?: string;
    api_secret?: string;
    site_id?: string;
    collection_id?: string;
    site_url?: string;
    
    // OAuth method (usually handled by callback)
    access_token?: string;
    refresh_token?: string;
    expires_at?: string;
  };
}

// Process:
// 1. Validate method availability for provider
// 2. Encrypt credentials before storing
// 3. Test connection (optional but recommended)
// 4. Set status: 'active' if successful
// 5. Log creation in integration_connection_logs
```

### 2. Update Connection

**API Endpoint**: `PATCH /api/integrations/[id]`

```typescript
// Allow updating:
// - Credentials (re-encrypt)
// - Connection method (switch methods)
// - Status
// - Metadata

// Process:
// 1. Validate new credentials
// 2. Encrypt new credentials
// 3. Update connection JSONB
// 4. Test connection if credentials changed
// 5. Log update in integration_connection_logs
```

### 3. Delete/Revoke Connection

**API Endpoint**: `DELETE /api/integrations/[id]`

```typescript
// Process:
// 1. Revoke OAuth tokens if applicable (call provider's revoke endpoint)
// 2. Set status: 'inactive' (soft delete)
// 3. Clear sensitive credentials from connection JSONB
// 4. Log deletion in integration_connection_logs
```

### 4. Test Connection

**API Endpoint**: `POST /api/integrations/[id]/test`

```typescript
// Process:
// 1. Decrypt credentials
// 2. Make test API call to provider
// 3. Update status based on result:
//    - 'active' if successful
//    - 'error' if failed
// 4. Update last_tested_at timestamp
// 5. Store error_message if failed
// 6. Log test result in integration_connection_logs
```

### 5. Refresh OAuth Token

**API Endpoint**: `POST /api/integrations/[id]/refresh`

```typescript
// Process:
// 1. Check if expires_at is approaching (< 5 minutes)
// 2. Use refresh_token to get new access_token
// 3. Update connection JSONB with new tokens
// 4. Update expires_at
// 5. Log refresh in integration_connection_logs
```

---

## 🎨 Provider-Specific Considerations

### Webflow

**API Key Method**:
```json
{
  "connection_method": "api_key",
  "connection": {
    "api_token": "encrypted_value",
    "site_id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "collection_id": "64a1b2c3d4e5f6g7h8i9j0k2"
  }
}
```

**OAuth Method**:
```json
{
  "connection_method": "oauth",
  "connection": {
    "access_token": "encrypted_value",
    "refresh_token": "encrypted_value",
    "expires_at": "2025-01-20T10:00:00Z",
    "token_type": "Bearer",
    "scope": "sites:read cms:read cms:write",
    "site_id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "collection_id": "64a1b2c3d4e5f6g7h8i9j0k2"
  }
}
```

### WordPress

**API Key Method**:
```json
{
  "connection_method": "api_key",
  "connection": {
    "api_key": "encrypted_value",
    "site_url": "https://example.com",
    "username": "admin",
    "application_password": "encrypted_value"  // WordPress Application Password
  }
}
```

**OAuth Method**:
```json
{
  "connection_method": "oauth",
  "connection": {
    "access_token": "encrypted_value",
    "refresh_token": "encrypted_value",
    "expires_at": "2025-01-20T10:00:00Z",
    "site_url": "https://example.com"
  }
}
```

### Shopify

**OAuth Method** (Preferred):
```json
{
  "connection_method": "oauth",
  "connection": {
    "access_token": "encrypted_value",
    "shop": "example.myshopify.com",
    "scope": "read_products,write_products",
    "expires_at": null  // Shopify tokens don't expire
  }
}
```

**API Key Method** (Limited - not recommended):
```json
{
  "connection_method": "api_key",
  "connection": {
    "api_key": "encrypted_value",
    "api_secret": "encrypted_value",
    "store_name": "example"
  }
}
```

---

## 🎨 UI/UX Recommendations

### Connection Status Display

**Visual Indicators**:
- 🟢 **Connected** (`status: 'active'`): Green checkmark, "Connected" badge
- 🔴 **Disconnected** (`status: 'inactive'`): Gray icon, "Disconnected" badge
- 🟡 **Expired** (`status: 'expired'`): Yellow warning icon, "Expired" badge
- ⚠️ **Error** (`status: 'error'`): Red X icon, "Error" badge with error message

**Information Display**:
- Connection method badge: "API Key" or "OAuth"
- Last successful test: "Last tested: Jan 15, 2024, 09:30 AM"
- Expiration date: "Expires: Jan 20, 2025" (for OAuth)
- Masked credentials: `wf_****key123` or `oauth_connected`

### Connection Management UI

**Actions Available**:
- **"Connect via API Key"** button → Opens API key input form
- **"Connect via OAuth"** button → Redirects to OAuth flow
- **"Disconnect"** button → Removes credentials, sets status inactive
- **"Test Connection"** button → Validates current credentials
- **"Switch Method"** option → Allows changing from API key to OAuth or vice versa
- **"View Details"** → Shows connection metadata (masked credentials, endpoints, etc.)
- **"Edit"** → Update credentials or connection settings
- **"Delete"** → Remove integration (with confirmation)

### Security Indicators

- 🔒 **Encryption Badge**: Show "Encrypted" indicator
- 👁️ **Masked Credentials**: Never show full credentials, only masked versions
- ⏰ **Last Updated**: Show timestamp of last credential update
- 📊 **Connection Health**: Visual indicator of connection reliability

---

## 📦 Migration Strategy

### For Existing Integrations

**Step 1: Add New Fields**
```sql
-- Add connection_method column if not exists
ALTER TABLE integrations_dev 
ADD COLUMN IF NOT EXISTS connection_method TEXT CHECK (connection_method IN ('api_key', 'oauth', NULL));

-- Add status column if not exists
ALTER TABLE integrations_dev 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'expired', 'error'));

-- Add last_tested_at column if not exists
ALTER TABLE integrations_dev 
ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMPTZ;
```

**Step 2: Migrate Existing Data**
```sql
-- Determine connection_method from existing connection JSONB
UPDATE integrations_dev
SET connection_method = CASE
  WHEN connection->>'access_token' IS NOT NULL THEN 'oauth'
  WHEN connection->>'api_key' IS NOT NULL OR connection->>'api_token' IS NOT NULL THEN 'api_key'
  ELSE NULL
END,
status = CASE
  WHEN connection->>'access_token' IS NOT NULL OR connection->>'api_key' IS NOT NULL THEN 'active'
  ELSE 'inactive'
END;
```

**Step 3: Encrypt Existing Credentials**
```typescript
// Migration script to encrypt existing plaintext credentials
// Run once to encrypt all existing credentials
// After migration, all new credentials must be encrypted before storing
```

---

## 🚀 Implementation Phases

### Phase 1: Database Schema Updates

**Tasks**:
- [ ] Add `connection_method` column to `integrations_{ENV}` tables
- [ ] Add `status` column with check constraint
- [ ] Add `last_tested_at` column
- [ ] Add indexes for performance
- [ ] Create migration script for existing data
- [ ] Ensure cascade deletes are in place

**Files to Modify**:
- `supabase/migrations/YYYYMMDDHHMMSS_add_connection_method_support.sql`

### Phase 2: Encryption Infrastructure

**Tasks**:
- [ ] Create encryption utility functions
- [ ] Add encryption key to environment variables
- [ ] Implement encrypt/decrypt functions
- [ ] Add encryption key rotation mechanism
- [ ] Create migration script to encrypt existing credentials

**Files to Create**:
- `src/lib/integrations/encryption/credential-encryption.ts`
- `src/lib/integrations/encryption/types.ts`

### Phase 3: API Layer Updates

**Tasks**:
- [ ] Update create integration endpoint to handle both methods
- [ ] Add connection method validation
- [ ] Implement credential encryption before storage
- [ ] Add connection testing endpoint
- [ ] Add OAuth token refresh endpoint
- [ ] Update delete endpoint to handle OAuth revocation
- [ ] Add credential masking in API responses

**Files to Modify**:
- `src/app/api/integrations/route.ts`
- `src/app/api/integrations/[id]/route.ts`
- `src/app/api/integrations/[id]/test/route.ts`
- `src/app/api/integrations/oauth/webflow/callback/route.ts`

### Phase 4: OAuth Flow Updates

**Tasks**:
- [ ] Update OAuth callback to store tokens with `connection_method: 'oauth'`
- [ ] Store OAuth tokens in `connection` JSONB (encrypted)
- [ ] Set `status: 'active'` after successful OAuth
- [ ] Handle OAuth token expiration
- [ ] Implement token refresh mechanism

**Files to Modify**:
- `src/app/api/integrations/oauth/webflow/callback/route.ts`
- `src/lib/integrations/oauth/webflow-oauth.ts`

### Phase 5: API Key Flow Implementation

**Tasks**:
- [ ] Create API key input form component
- [ ] Add API key validation per provider
- [ ] Implement API key connection endpoint
- [ ] Add credential encryption before storage
- [ ] Test connection after API key submission

**Files to Create**:
- `src/components/integrations/ApiKeyConfig.tsx`
- `src/app/api/integrations/connect-api-key/route.ts`

### Phase 6: UI Updates

**Tasks**:
- [ ] Update integration card to show connection method
- [ ] Add connection status indicators
- [ ] Add method selection UI (API Key vs OAuth)
- [ ] Add "Switch Method" functionality
- [ ] Add connection testing UI
- [ ] Add credential masking display
- [ ] Add last tested timestamp display

**Files to Modify**:
- `src/app/admin/panel/integrations/page.tsx`
- `src/app/admin/integrations/blog-writer/page.tsx`
- `src/components/integrations/ConnectAndRecommendForm.tsx`

### Phase 7: Testing & Validation

**Tasks**:
- [ ] Test API key connection for each provider
- [ ] Test OAuth connection for each provider
- [ ] Test method switching
- [ ] Test credential encryption/decryption
- [ ] Test cascade deletion
- [ ] Test connection testing endpoint
- [ ] Test OAuth token refresh
- [ ] Validate security (no credentials in logs/responses)

---

## 📝 API Endpoints Summary

### Integration Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/integrations` | List all integrations for organization |
| `POST` | `/api/integrations` | Create new integration (API key or OAuth) |
| `GET` | `/api/integrations/[id]` | Get integration details (masked credentials) |
| `PATCH` | `/api/integrations/[id]` | Update integration (credentials, method, status) |
| `DELETE` | `/api/integrations/[id]` | Delete/revoke integration |
| `POST` | `/api/integrations/[id]/test` | Test connection |
| `POST` | `/api/integrations/[id]/refresh` | Refresh OAuth token |

### OAuth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/integrations/oauth/[provider]/authorize` | Initiate OAuth flow |
| `GET` | `/api/integrations/oauth/[provider]/callback` | Handle OAuth callback |

### API Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/integrations/connect-api-key` | Connect via API key |

---

## 🔍 Example Implementation Flow

### Connecting via API Key

1. User selects provider (e.g., Webflow)
2. User clicks "Connect via API Key"
3. Form displays with fields: `api_token`, `site_id`, `collection_id`
4. User enters credentials
5. Frontend validates required fields
6. Frontend calls `POST /api/integrations/connect-api-key`
7. Backend encrypts credentials
8. Backend stores in `integrations_dev` table:
   ```json
   {
     "connection_method": "api_key",
     "connection": {
       "api_token": "encrypted_value",
       "site_id": "...",
       "collection_id": "..."
     },
     "status": "active"
   }
   ```
9. Backend tests connection (optional)
10. Backend returns success with masked credentials
11. Frontend updates UI to show "Connected" status

### Connecting via OAuth

1. User selects provider (e.g., Webflow)
2. User clicks "Connect via OAuth"
3. Frontend redirects to `/api/integrations/oauth/webflow/authorize`
4. Backend generates OAuth state and stores in `oauth_states` table
5. Backend redirects to Webflow OAuth authorization page
6. User authorizes application
7. Webflow redirects to `/api/integrations/oauth/webflow/callback` with code
8. Backend exchanges code for tokens
9. Backend encrypts tokens
10. Backend stores in `integrations_dev` table:
    ```json
    {
      "connection_method": "oauth",
      "connection": {
        "access_token": "encrypted_value",
        "refresh_token": "encrypted_value",
        "expires_at": "2025-01-20T10:00:00Z",
        "site_id": "...",
        "collection_id": "..."
      },
      "status": "active"
    }
    ```
11. Backend redirects to success page
12. Frontend shows "Connected via OAuth" status

---

## ✅ Success Criteria

- [ ] Organizations can connect via API key OR OAuth
- [ ] All credentials encrypted at rest
- [ ] Organizations can switch between methods
- [ ] Credentials automatically deleted on org deletion
- [ ] Connection status clearly displayed
- [ ] OAuth tokens auto-refresh before expiration
- [ ] Comprehensive audit logging
- [ ] No credentials exposed in API responses or logs
- [ ] Connection testing works for both methods
- [ ] UI clearly indicates connection method and status

---

## 📚 References

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [OAuth 2.0 Best Practices](https://oauth.net/2/)
- [Webflow OAuth Documentation](https://developers.webflow.com/oauth)
- [WordPress REST API Authentication](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/)
- [Shopify OAuth Documentation](https://shopify.dev/docs/apps/auth/oauth)

---

## 🔄 Version History

- **v1.0** (2025-01-17): Initial architecture document
  - Database schema design
  - Security considerations
  - Implementation phases
  - Provider-specific requirements

---

## 📝 Notes

- This architecture supports gradual migration from current implementation
- Encryption keys should be rotated every 90 days
- Consider adding webhook support for OAuth token expiration notifications
- Future enhancement: Support for multiple credentials per provider (e.g., multiple Webflow sites)

