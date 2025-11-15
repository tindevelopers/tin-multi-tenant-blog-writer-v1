# Practical Testing Guide for Integration Implementation

## 🎯 Testing Strategy

**Recommendation**: Use a **hybrid approach**:
- **Postman/Insomnia** for API endpoint testing (API key connections, testing endpoints)
- **Browser** for OAuth flow testing (requires redirects)
- **Supabase SQL Editor** for database verification

---

## 📋 Prerequisites

### 1. Environment Setup
```bash
# Generate encryption key
openssl rand -hex 32

# Add to .env.local:
INTEGRATION_ENCRYPTION_KEY=<generated_key>
WEBFLOW_CLIENT_ID=<your_client_id>
WEBFLOW_CLIENT_SECRET=<your_client_secret>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Run Database Migrations
In Supabase SQL Editor, run in order:
1. `20250118000000_add_connection_method_support.sql`
2. `20250118000001_fix_oauth_state_type.sql`
3. `20250118000002_update_log_status_constraint.sql`

### 3. Get Authentication Token
You'll need a JWT token from your Next.js app for API testing.

**Option A: Browser DevTools**
1. Log in to your app at `http://localhost:3000`
2. Open DevTools → Application → Cookies
3. Find `sb-<project-ref>-auth-token`
4. Copy the `access_token` value

**Option B: API Login**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "yourpassword"}'
```

---

## 🧪 Testing Methods

### Method 1: Postman/Insomnia (Recommended for API Testing)

#### Setup Postman Collection

**1. Create Environment Variables**
- `base_url`: `http://localhost:3000`
- `auth_token`: `<your_jwt_token>`
- `org_id`: `<your_organization_id>`
- `test_integration_id`: `<will_be_set_after_creation>`

**2. Create Collection: "Integration Tests"**

#### Test 1: Connect via API Key

**Request**: `POST {{base_url}}/api/integrations/connect-api-key`

**Headers**:
```
Authorization: Bearer {{auth_token}}
Content-Type: application/json
```

**Body** (JSON):
```json
{
  "provider": "webflow",
  "connection": {
    "api_token": "wf_test_token_12345",
    "site_id": "test_site_id_123",
    "collection_id": "test_collection_id_456"
  },
  "test_connection": true
}
```

**Expected Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "org_id": "your-org-id",
    "provider": "webflow",
    "connection_method": "api_key",
    "status": "active",
    "last_tested_at": "2025-01-18T...",
    "created_at": "2025-01-18T...",
    "updated_at": "2025-01-18T..."
  }
}
```

**Postman Test Script**:
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Response has success flag", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});

pm.test("Connection method is api_key", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.connection_method).to.eql("api_key");
});

// Save integration ID for next tests
if (pm.response.code === 201) {
    var jsonData = pm.response.json();
    pm.environment.set("test_integration_id", jsonData.data.id);
}
```

---

#### Test 2: Get Integration Details

**Request**: `GET {{base_url}}/api/integrations/{{test_integration_id}}`

**Headers**:
```
Authorization: Bearer {{auth_token}}
```

**Expected Response** (200 OK):
```json
{
  "id": "uuid-here",
  "org_id": "your-org-id",
  "provider": "webflow",
  "connection_method": "api_key",
  "status": "active",
  "connection": {
    "api_token": "wf_test_token_12345",
    "site_id": "test_site_id_123",
    "collection_id": "test_collection_id_456"
  },
  "last_tested_at": "2025-01-18T...",
  "created_at": "2025-01-18T...",
  "updated_at": "2025-01-18T..."
}
```

**Postman Test Script**:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Credentials are decrypted", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.connection.api_token).to.not.include(":");
    pm.expect(jsonData.connection.api_token).to.not.be.empty;
});
```

---

#### Test 3: Test Connection

**Request**: `POST {{base_url}}/api/integrations/{{test_integration_id}}/test`

**Headers**:
```
Authorization: Bearer {{auth_token}}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "status": "active",
    "last_tested_at": "2025-01-18T...",
    "message": "Connection test successful"
  }
}
```

**Postman Test Script**:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Connection test successful", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.status).to.eql("active");
});
```

---

#### Test 4: List All Integrations

**Request**: `GET {{base_url}}/api/integrations`

**Headers**:
```
Authorization: Bearer {{auth_token}}
```

**Expected Response** (200 OK):
```json
[
  {
    "id": "uuid-here",
    "org_id": "your-org-id",
    "provider": "webflow",
    "connection_method": "api_key",
    "status": "active",
    ...
  }
]
```

---

#### Test 5: Connect and Get Recommendations

**Request**: `POST {{base_url}}/api/integrations/connect-and-recommend`

**Headers**:
```
Authorization: Bearer {{auth_token}}
Content-Type: application/json
```

**Body** (JSON):
```json
{
  "provider": "webflow",
  "connection": {
    "api_token": "wf_test_token_12345",
    "site_id": "test_site_id_123",
    "collection_id": "test_collection_id_456"
  },
  "keywords": [
    "webflow cms",
    "content management",
    "website builder"
  ]
}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "provider": "webflow",
    "saved_integration": true,
    "recommended_backlinks": 10,
    "recommended_interlinks": 5,
    "per_keyword": [
      {
        "keyword": "webflow cms",
        "difficulty": 45,
        "suggested_backlinks": 3,
        "suggested_interlinks": 2
      }
    ]
  }
}
```

---

### Method 2: Browser Testing (Required for OAuth)

#### Test OAuth Flow

**1. Navigate to OAuth Authorization**
```
http://localhost:3000/api/integrations/oauth/webflow/authorize
```

**Expected**: Redirects to Webflow OAuth page

**2. Authorize Application**
- Log in to Webflow
- Grant permissions
- Should redirect back to: `http://localhost:3000/api/integrations/oauth/webflow/callback?code=...&state=...`

**3. Verify Redirect**
- Should redirect to: `http://localhost:3000/admin/integrations/blog-writer?provider=webflow&oauth_success=true`

**4. Check Database**
```sql
SELECT 
  id,
  provider,
  connection_method,
  status,
  connection->>'access_token' IS NOT NULL as has_access_token,
  created_at
FROM integrations_dev
WHERE org_id = '<your_org_id>'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected**: `connection_method = 'oauth'`, `status = 'active'`, `has_access_token = true`

---

### Method 3: cURL Commands (Quick Testing)

#### Test API Key Connection
```bash
curl -X POST http://localhost:3000/api/integrations/connect-api-key \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "webflow",
    "connection": {
      "api_token": "wf_test_token_12345",
      "site_id": "test_site_id_123",
      "collection_id": "test_collection_id_456"
    },
    "test_connection": true
  }'
```

#### Test Connection
```bash
curl -X POST http://localhost:3000/api/integrations/INTEGRATION_ID/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Integration
```bash
curl http://localhost:3000/api/integrations/INTEGRATION_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔍 Database Verification Queries

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
WHERE org_id = '<your_org_id>'
ORDER BY created_at DESC;
```

### Verify Encryption
```sql
-- Credentials should be encrypted (format: "iv:authTag:encryptedData")
SELECT 
  id,
  provider,
  connection_method,
  CASE 
    WHEN connection->>'api_token' LIKE '%:%:%' THEN '✅ encrypted'
    WHEN connection->>'api_token' IS NOT NULL THEN '❌ plaintext'
    ELSE 'no token'
  END as encryption_status,
  status
FROM integrations_dev
WHERE org_id = '<your_org_id>'
LIMIT 5;
```

### Check Logs
```sql
SELECT 
  log_id,
  provider,
  status,
  connection_metadata->>'connection_method' as method,
  error_message,
  created_at
FROM integration_connection_logs
WHERE org_id = '<your_org_id>'
ORDER BY created_at DESC
LIMIT 10;
```

### Verify OAuth State
```sql
SELECT 
  state_id,
  state_value,
  provider,
  used,
  expires_at,
  created_at
FROM oauth_states
WHERE org_id = '<your_org_id>'
ORDER BY created_at DESC
LIMIT 5;
```

---

## 📊 Testing Checklist

### API Key Connection
- [ ] Create integration via API key
- [ ] Verify `connection_method = 'api_key'`
- [ ] Verify credentials encrypted in database
- [ ] Verify status set correctly
- [ ] Test connection endpoint
- [ ] Verify `last_tested_at` updated
- [ ] Get integration details
- [ ] Verify credentials decrypted correctly

### OAuth Connection
- [ ] Initiate OAuth flow
- [ ] Complete authorization
- [ ] Verify callback handled correctly
- [ ] Verify `connection_method = 'oauth'`
- [ ] Verify tokens encrypted in database
- [ ] Verify status set correctly
- [ ] Test connection endpoint
- [ ] Verify refresh token stored

### Connection Testing
- [ ] Test active integration
- [ ] Test inactive integration
- [ ] Test expired integration
- [ ] Test integration with error
- [ ] Verify error messages logged

### Data Integrity
- [ ] Verify UNIQUE constraint (try creating duplicate)
- [ ] Verify CASCADE delete (delete organization, check integrations)
- [ ] Verify encryption/decryption works
- [ ] Verify credentials masked in logs

---

## 🐛 Troubleshooting

### Issue: "Invalid or expired OAuth state"
**Solution**: Check `oauth_states` table - state might have expired (10 minutes) or been used

### Issue: "Failed to decrypt credential"
**Solution**: Verify `INTEGRATION_ENCRYPTION_KEY` is set correctly (64 hex characters)

### Issue: "UNIQUE constraint violation"
**Solution**: Delete existing integration first, or update it instead of creating new

### Issue: "Connection test fails"
**Solution**: Check if provider-specific connection testing is implemented (currently placeholder)

---

## 💡 Recommended Testing Flow

1. **Setup** (5 min)
   - Set environment variables
   - Run migrations
   - Get auth token

2. **API Key Testing** (10 min)
   - Create integration via Postman
   - Test connection
   - Verify database
   - Get integration details

3. **OAuth Testing** (10 min)
   - Initiate OAuth in browser
   - Complete flow
   - Verify database
   - Test connection

4. **Database Verification** (5 min)
   - Run verification queries
   - Check encryption
   - Review logs

5. **Edge Cases** (10 min)
   - Test duplicate creation
   - Test invalid credentials
   - Test expired tokens
   - Test error handling

**Total Time**: ~40 minutes

---

## 🎯 Quick Start Script

Save this as `test-integrations.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
AUTH_TOKEN="YOUR_JWT_TOKEN"
ORG_ID="YOUR_ORG_ID"

echo "🧪 Testing Integration API..."

# Test 1: Create API Key Integration
echo "1. Creating API key integration..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/integrations/connect-api-key" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "webflow",
    "connection": {
      "api_token": "wf_test_token_12345",
      "site_id": "test_site_id_123",
      "collection_id": "test_collection_id_456"
    },
    "test_connection": true
  }')

INTEGRATION_ID=$(echo $RESPONSE | jq -r '.data.id')
echo "✅ Created integration: $INTEGRATION_ID"

# Test 2: Get Integration
echo "2. Getting integration details..."
curl -s "$BASE_URL/api/integrations/$INTEGRATION_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'

# Test 3: Test Connection
echo "3. Testing connection..."
curl -s -X POST "$BASE_URL/api/integrations/$INTEGRATION_ID/test" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'

echo "✅ Testing complete!"
```

**Usage**:
```bash
chmod +x test-integrations.sh
./test-integrations.sh
```

---

## 📝 Postman Collection Export

Would you like me to create a Postman collection JSON file that you can import directly? It would include:
- All API endpoints
- Pre-configured headers
- Test scripts
- Environment variables template

Let me know if you'd like me to generate that!

