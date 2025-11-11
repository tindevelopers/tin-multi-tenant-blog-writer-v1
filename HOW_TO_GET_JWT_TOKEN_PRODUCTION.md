# Getting JWT Token from Production/Live Site

## ✅ Yes, You Can Get Tokens from Production!

The process is **exactly the same** as development, just use your production URL instead of `localhost:3000`.

---

## 🚀 Quick Start for Production

### Method 1: Browser DevTools (Easiest for Production)

1. **Go to your live site**:
   ```
   https://your-domain.com
   ```

2. **Log in** with your credentials

3. **Open DevTools**: Press `F12` or `Cmd+Option+I` (Mac)

4. **Go to Cookies**:
   - **Chrome/Edge**: Application tab → Cookies → `https://your-domain.com`
   - **Firefox**: Storage tab → Cookies → `https://your-domain.com`

5. **Find the auth token cookie**:
   - Look for: `sb-<project-ref>-auth-token`
   - Or any cookie containing `auth-token` or `sb-`

6. **Copy the `access_token`** from the cookie value (JSON)

7. **Use it**:
   ```bash
   export INTEGRATION_TEST_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```

---

### Method 2: Helper Script (Production)

```bash
# Get token from production site
node scripts/get-token.js your@email.com yourpassword https://your-domain.com

# Or set environment variable first
export INTEGRATION_TEST_BASE_URL=https://your-domain.com
node scripts/get-token.js your@email.com yourpassword
```

**Example**:
```bash
node scripts/get-token.js admin@example.com mypassword https://blogwriter.example.com
```

---

### Method 3: cURL (Production)

```bash
# Login to production
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "yourpassword"}' \
  -s | jq -r '.access_token'

# Save directly to variable
export INTEGRATION_TEST_TOKEN=$(curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "yourpassword"}' \
  -s | jq -r '.access_token')
```

---

## 🧪 Testing Against Production

Once you have the token, you can test against production:

```bash
# Set production URL and token
export INTEGRATION_TEST_BASE_URL=https://your-domain.com
export INTEGRATION_TEST_TOKEN="your_production_token"

# Run tests against production
npm run test:integration

# Or specify URL directly
node scripts/test-integrations.js \
  --base-url https://your-domain.com \
  --token YOUR_PRODUCTION_TOKEN
```

---

## ⚠️ Important Considerations for Production

### 1. **Security**
- **Never commit production tokens** to git
- Tokens expire after 1 hour (get fresh ones as needed)
- Use production tokens only for testing, not in code

### 2. **Rate Limiting**
- Production sites may have rate limiting
- Don't run tests too frequently
- Consider using a staging environment for testing

### 3. **Data Safety**
- Tests create real data in production database
- Consider using a test organization/user
- Clean up test data after testing

### 4. **CORS & Network**
- Make sure your production API allows requests from your IP
- Check if CORS is configured correctly
- Some production sites block direct API access

---

## 🔍 Finding Your Production URL

### Vercel
- Check your Vercel dashboard
- URL format: `https://your-app.vercel.app`
- Or your custom domain

### Other Hosting
- Check your hosting provider dashboard
- Look for "Domain" or "URL" settings
- Check DNS records for your domain

### Environment Variables
```bash
# Check if you have production URL set
echo $NEXT_PUBLIC_APP_URL
echo $VERCEL_URL
```

---

## 📋 Production Testing Checklist

- [ ] Production site is accessible
- [ ] You have valid login credentials
- [ ] API endpoints are accessible (not blocked)
- [ ] CORS allows your requests
- [ ] You're using a test organization/user (recommended)
- [ ] You understand tests will create real data
- [ ] You have a plan to clean up test data

---

## 🎯 Recommended Approach

### For Testing: Use Staging/Preview Environment
If available, use a staging/preview environment instead of production:

```bash
# Staging URL (example)
export INTEGRATION_TEST_BASE_URL=https://staging.your-domain.com
node scripts/get-token.js your@email.com yourpassword
```

### For Production: Manual Browser Method
For production, the **browser DevTools method is safest**:
- No risk of exposing credentials in command history
- Can verify you're on the right site
- Easy to see all cookies and tokens

---

## 🔐 Security Best Practices

1. **Use Test Accounts**: Create separate test users for production testing
2. **Rotate Tokens**: Get fresh tokens for each test session
3. **Clean Up**: Delete test integrations after testing
4. **Monitor**: Check production logs for unexpected activity
5. **Limit Access**: Only test with accounts that have appropriate permissions

---

## 💡 Pro Tips

1. **Save Production URL**: Add to `.env.local`:
   ```bash
   INTEGRATION_TEST_BASE_URL=https://your-domain.com
   ```

2. **Use Different Tokens**: Keep dev and prod tokens separate:
   ```bash
   # Dev token
   export INTEGRATION_TEST_TOKEN_DEV="..."
   
   # Prod token  
   export INTEGRATION_TEST_TOKEN_PROD="..."
   ```

3. **Test Staging First**: Always test on staging before production

4. **Browser Method is Safest**: For production, prefer browser DevTools over scripts

5. **Check Token Expiry**: Production tokens expire in 1 hour, get fresh ones as needed

---

## 🐛 Troubleshooting Production

### "Connection refused" or "ECONNREFUSED"
- Check if production URL is correct
- Verify site is accessible in browser
- Check if API endpoints are public

### "401 Unauthorized"
- Token expired (get a fresh one)
- Token copied incorrectly
- Wrong user/organization permissions

### "CORS error"
- Production API may block direct requests
- Use browser method instead
- Check CORS configuration

### "Cookie not found"
- Make sure you're logged into production site
- Check if cookies are enabled
- Try incognito/private window

---

## 📚 Related Documentation

- **Full Guide**: `HOW_TO_GET_JWT_TOKEN.md` (covers all methods)
- **Testing Guide**: `QUICK_START_TESTING.md`
- **Practical Guide**: `PRACTICAL_TESTING_GUIDE.md`

