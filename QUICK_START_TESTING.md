# Quick Start: Running Integration Tests

## 🚀 Fastest Way to Test

### Step 1: Get Your JWT Token

**Option A: Browser (Easiest)**
1. Log in to your app:
   - **Development**: `http://localhost:3000`
   - **Production**: `https://your-domain.com`
2. Open DevTools (F12) → Application → Cookies
3. Find `sb-<project-ref>-auth-token`
4. Copy the `access_token` value

**Option B: Helper Script**
```bash
# Development
node scripts/get-token.js your@email.com yourpassword

# Production
node scripts/get-token.js your@email.com yourpassword https://your-domain.com
```

**Option C: Command Line**
```bash
# Development
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "yourpassword"}' \
  | jq -r '.access_token'

# Production
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "yourpassword"}' \
  | jq -r '.access_token'
```

### Step 2: Set Environment Variables

```bash
# Required
export INTEGRATION_TEST_TOKEN="your_jwt_token_here"

# Optional (defaults shown)
export INTEGRATION_TEST_ORG_ID="your_org_id_here"  # Optional
export INTEGRATION_TEST_BASE_URL="http://localhost:3000"  # Default: localhost:3000
                                                          # For production: https://your-domain.com
```

### Step 3: Run Tests

**Using npm (Recommended)**:
```bash
# Basic test run (uses INTEGRATION_TEST_BASE_URL or defaults to localhost:3000)
npm run test:integration

# Verbose output (see detailed logs)
npm run test:integration:verbose

# Skip OAuth tests (faster)
npm run test:integration:skip-oauth

# Test against production
INTEGRATION_TEST_BASE_URL=https://your-domain.com npm run test:integration
```

**Using Node.js directly**:
```bash
# Development
node scripts/test-integrations.js \
  --token YOUR_JWT_TOKEN \
  --org-id YOUR_ORG_ID \
  --verbose

# Production
node scripts/test-integrations.js \
  --base-url https://your-domain.com \
  --token YOUR_JWT_TOKEN \
  --org-id YOUR_ORG_ID \
  --verbose
```

**Using Bash script**:
```bash
./scripts/test-integrations.sh \
  --token YOUR_JWT_TOKEN \
  --org-id YOUR_ORG_ID \
  --verbose
```

---

## 📋 Prerequisites Checklist

Before running tests, make sure:

- [ ] **Server is running**: `npm run dev` or `npm start`
- [ ] **Database migrations applied**: Run all 3 migrations in Supabase SQL Editor
- [ ] **Environment variables set**: `INTEGRATION_ENCRYPTION_KEY` in `.env.local`
- [ ] **JWT token obtained**: From browser or login API
- [ ] **Organization ID** (optional): Can be found in Supabase `organizations` table

---

## 🎯 What Gets Tested

### ✅ Automatic Tests
1. **Prerequisites Check** - Validates token and configuration
2. **Create API Key Integration** - Creates integration with API key method
3. **Get Integration Details** - Retrieves and verifies integration
4. **Test Connection** - Tests the integration connection
5. **List Integrations** - Lists all integrations for your org
6. **Connect and Get Recommendations** - Tests recommendation endpoint
7. **Validation Tests** - Tests error handling (empty keywords, missing fields)

### ⏭️ Manual Tests (OAuth)
- OAuth flow requires browser (can't be fully automated)
- See `PRACTICAL_TESTING_GUIDE.md` for browser testing steps

---

## 📊 Understanding Test Output

### ✅ Success Example
```
============================================================
🚀 Integration Implementation Test Suite
============================================================

🧪 Testing: Prerequisites Check
  ✅ PASSED: Prerequisites Check

🧪 Testing: Create API Key Integration
  ✅ PASSED: Create API Key Integration

...

============================================================
📊 Test Summary
============================================================
✅ Passed: 7
❌ Failed: 0
⏭️  Skipped: 1
📈 Total: 8
============================================================
```

### ❌ Failure Example
```
🧪 Testing: Create API Key Integration
  ❌ FAILED: Create API Key Integration
     Error: Expected status 201, got 401

============================================================
📊 Test Summary
============================================================
✅ Passed: 2
❌ Failed: 5
⏭️  Skipped: 1
📈 Total: 8

❌ Failed Tests:
   - Create API Key Integration: Expected status 201, got 401
   ...
```

---

## 🔧 Troubleshooting

### "JWT token required"
**Fix**: Set `INTEGRATION_TEST_TOKEN` or use `--token` flag

### "Connection refused" or "ECONNREFUSED"
**Fix**: Start your server: `npm run dev`

### "Expected status 201, got 401"
**Fix**: Your token is invalid/expired. Get a new one from browser.

### "Expected status 201, got 500"
**Fix**: Check server logs. Likely missing `INTEGRATION_ENCRYPTION_KEY` or database migration not applied.

### Tests pass but want to verify database
**Fix**: Run SQL queries from `PRACTICAL_TESTING_GUIDE.md` section "Database Verification Queries"

---

## 🎓 Next Steps After Tests Pass

1. **Verify Database**: Run SQL queries to check encryption and data
2. **Test OAuth**: Use browser to test OAuth flow manually
3. **Check Logs**: Review `integration_connection_logs` table
4. **Update UI**: Add connection method display to integration list
5. **Production**: Set environment variables in production environment

---

## 💡 Pro Tips

1. **Use verbose mode** for debugging: `npm run test:integration:verbose`
2. **Save token** in `.env.local` for convenience:
   ```bash
   INTEGRATION_TEST_TOKEN=your_token_here
   ```
3. **Run tests after each change** to catch issues early
4. **Check database** after tests to verify encryption worked
5. **Use Postman** for interactive testing (see `PRACTICAL_TESTING_GUIDE.md`)

---

## 📚 More Information

- **Detailed Guide**: `PRACTICAL_TESTING_GUIDE.md`
- **Test Plan**: `test-integration-implementation.md`
- **Test Results**: `TEST_RESULTS.md`
- **Scripts README**: `scripts/README.md`

