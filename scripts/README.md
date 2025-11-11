# Integration Testing Scripts

Automated test scripts for the integration implementation.

## Available Scripts

### 1. Node.js Test Script (Recommended)
**File**: `scripts/test-integrations.js`

**Features**:
- Comprehensive test coverage
- Detailed error messages
- JSON response validation
- Color-coded output
- Verbose mode for debugging

**Usage**:
```bash
# Basic usage
node scripts/test-integrations.js

# With options
node scripts/test-integrations.js \
  --base-url http://localhost:3000 \
  --token YOUR_JWT_TOKEN \
  --org-id YOUR_ORG_ID \
  --verbose

# Skip OAuth tests
node scripts/test-integrations.js --skip-oauth
```

**Environment Variables**:
```bash
export INTEGRATION_TEST_BASE_URL=http://localhost:3000
export INTEGRATION_TEST_TOKEN=your_jwt_token_here
export INTEGRATION_TEST_ORG_ID=your_org_id_here
```

**Requirements**:
- Node.js 14+
- Server running on specified base URL
- Valid JWT token

---

### 2. Bash Test Script (Alternative)
**File**: `scripts/test-integrations.sh`

**Features**:
- No dependencies (just bash and curl)
- Quick and lightweight
- Works on Unix-like systems

**Usage**:
```bash
# Make executable
chmod +x scripts/test-integrations.sh

# Run tests
./scripts/test-integrations.sh

# With options
./scripts/test-integrations.sh \
  --base-url http://localhost:3000 \
  --token YOUR_JWT_TOKEN \
  --org-id YOUR_ORG_ID \
  --verbose \
  --skip-oauth
```

**Requirements**:
- Bash 4+
- curl
- Server running on specified base URL
- Valid JWT token

---

## Getting Your JWT Token

### Method 1: Browser DevTools
1. Log in to your app
2. Open DevTools → Application → Cookies
3. Find `sb-<project-ref>-auth-token`
4. Copy the `access_token` value

### Method 2: Login API
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "yourpassword"}' \
  | jq -r '.access_token'
```

### Method 3: Supabase Client
```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const { data } = await supabase.auth.signInWithPassword({
  email: 'your@email.com',
  password: 'yourpassword'
});
console.log(data.session.access_token);
```

---

## Test Coverage

### ✅ API Key Connection Tests
- Create integration via API key
- Verify `connection_method: 'api_key'`
- Verify credentials encrypted
- Verify status set correctly

### ✅ Integration Management Tests
- Get integration details
- List all integrations
- Test connection endpoint
- Verify credentials decrypted

### ✅ Recommendations Tests
- Connect and get recommendations
- Verify keyword processing
- Verify recommendation structure

### ✅ Validation Tests
- Empty keywords rejection
- Missing provider rejection
- Invalid data handling

### ⏭️ OAuth Tests (Manual)
- OAuth authorization URL (can be tested)
- OAuth callback (requires browser)
- Token storage verification

---

## Expected Output

### Successful Run
```
============================================================
🚀 Integration Implementation Test Suite
============================================================

🧪 Testing: Prerequisites Check
  ✅ PASSED: Prerequisites Check

🧪 Testing: Create API Key Integration
  ✅ PASSED: Create API Key Integration

🧪 Testing: Get Integration Details
  ✅ PASSED: Get Integration Details

...

============================================================
📊 Test Summary
============================================================
✅ Passed: 8
❌ Failed: 0
⏭️  Skipped: 1
📈 Total: 9
============================================================
```

### Failed Run
```
🧪 Testing: Create API Key Integration
  ❌ FAILED: Create API Key Integration
     Error: Expected status 201, got 401

...

============================================================
📊 Test Summary
============================================================
✅ Passed: 5
❌ Failed: 3
⏭️  Skipped: 1
📈 Total: 9

❌ Failed Tests:
   - Create API Key Integration: Expected status 201, got 401
   - Get Integration Details: No integration ID available
   - Test Connection: No integration ID available
============================================================
```

---

## Troubleshooting

### Error: "JWT token required"
**Solution**: Set `INTEGRATION_TEST_TOKEN` environment variable or use `--token` flag

### Error: "Connection refused"
**Solution**: Make sure your Next.js server is running on the specified port

### Error: "Expected status 201, got 401"
**Solution**: Your JWT token is invalid or expired. Get a new token.

### Error: "No integration ID available"
**Solution**: Previous test failed. Check error messages above.

### Tests pass but database shows issues
**Solution**: Run database verification queries from `PRACTICAL_TESTING_GUIDE.md`

---

## Continuous Integration

### GitHub Actions Example
```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - name: Start server
        run: npm start &
      - name: Wait for server
        run: sleep 10
      - name: Run integration tests
        env:
          INTEGRATION_TEST_TOKEN: ${{ secrets.TEST_TOKEN }}
          INTEGRATION_TEST_ORG_ID: ${{ secrets.TEST_ORG_ID }}
        run: node scripts/test-integrations.js --base-url http://localhost:3000
```

---

## Next Steps

After running tests:
1. Review test results
2. Check database state using SQL queries
3. Test OAuth flow manually in browser
4. Update UI components to display connection method
5. Add more edge case tests as needed

