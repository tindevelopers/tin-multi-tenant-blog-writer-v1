# How to Get Your JWT Token

## 🎯 Which Token Do You Need?

You need the **Supabase Access Token** (JWT) that authenticates your API requests. This is the token stored in your browser cookies after logging in.

## 🌐 Development vs Production

**✅ Yes, you can get tokens from both:**
- **Development**: `http://localhost:3000` (local testing)
- **Production**: `https://your-domain.com` (live site)

The process is the same for both! Just use the appropriate URL.

**Token Format**: A long string that looks like:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzM3MjM0NTY3LCJzdWIiOiIxMjM0NTY3OC05MGFiLWNkZWYtMTIzNC01Njc4OTBhYmNkZWYiLCJlbWFpbCI6InlvdXJAZW1haWwuY29tIiwiZmVhdHVyZXMiOnt9LCJhcHBfbWV0YWRhdGEiOnsiZW1haWwiOiJ5b3VyQGVtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZSI6IiIsInBob25lX3ZlcmlmaWVkIjpmYWxzZX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJ5b3VyQGVtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZSI6IiIsInBob25lX3ZlcmlmaWVkIjpmYWxzZX19.abc123def456ghi789...
```

---

## Method 1: Browser DevTools (Easiest) ✅

### Step-by-Step Instructions

1. **Start your development server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Open your app in browser**:
   - **Development**: `http://localhost:3000`
   - **Production**: `https://your-domain.com` (your live site URL)

3. **Log in** to your application with your credentials

4. **Open Browser DevTools**:
   - **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
   - **Firefox**: Press `F12` or `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
   - **Safari**: Press `Cmd+Option+I` (enable Developer menu first)

5. **Navigate to Cookies**:
   - **Chrome/Edge**: 
     - Click **Application** tab (top menu)
     - In left sidebar, expand **Cookies**
     - Click on your domain (`http://localhost:3000` for dev or `https://your-domain.com` for production)
   - **Firefox**:
     - Click **Storage** tab
     - Expand **Cookies**
     - Click on your domain
   - **Safari**:
     - Click **Storage** tab
     - Expand **Cookies**
     - Click on your domain

6. **Find the Supabase auth token cookie**:
   Look for a cookie named one of these:
   - `sb-<project-ref>-auth-token` (most common)
   - `sb-auth-token`
   - `supabase-auth-token`
   
   The `<project-ref>` is your Supabase project reference ID (found in Supabase dashboard URL)

7. **Get the access token**:
   - Click on the cookie
   - Look at the **Value** field
   - The value is a JSON object like:
     ```json
     {
       "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
       "refresh_token": "...",
       "expires_at": 1737234567,
       "expires_in": 3600,
       "token_type": "bearer",
       "user": {...}
     }
     ```
   - **Copy the `access_token` value** (the long string starting with `eyJ...`)

8. **Use the token**:
   ```bash
   export INTEGRATION_TEST_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```

---

## Method 2: Browser Console (Quick Alternative) 🚀

### Step-by-Step Instructions

1. **Log in** to your app at `http://localhost:3000`

2. **Open Browser Console**:
   - Press `F12` or `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
   - Click **Console** tab

3. **Run this JavaScript code**:
   ```javascript
   // Get all cookies
   document.cookie.split(';').forEach(cookie => {
     const [name, value] = cookie.trim().split('=');
     if (name.includes('auth-token') || name.includes('sb-')) {
       console.log(`Cookie: ${name}`);
       try {
         const parsed = JSON.parse(decodeURIComponent(value));
         if (parsed.access_token) {
           console.log('\n✅ Access Token Found:');
           console.log(parsed.access_token);
           console.log('\n📋 Copy this token for testing:');
           console.log(`export INTEGRATION_TEST_TOKEN="${parsed.access_token}"`);
         }
       } catch (e) {
         console.log('Value:', value.substring(0, 100) + '...');
       }
     }
   });
   ```

4. **Copy the token** from the console output

---

## Method 3: API Login (Programmatic) 💻

### Step-by-Step Instructions

1. **Create a login script** (`scripts/get-token.js`):
   ```javascript
   const http = require('http');
   
   const email = process.argv[2] || 'your@email.com';
   const password = process.argv[3] || 'yourpassword';
   
   const data = JSON.stringify({ email, password });
   
   const options = {
     hostname: 'localhost',
     port: 3000,
     path: '/api/auth/login',
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Content-Length': data.length
     }
   };
   
   const req = http.request(options, (res) => {
     let responseData = '';
     
     res.on('data', (chunk) => {
       responseData += chunk;
     });
     
     res.on('end', () => {
       try {
         const json = JSON.parse(responseData);
         if (json.access_token) {
           console.log('\n✅ Login successful!');
           console.log('\n📋 Access Token:');
           console.log(json.access_token);
           console.log('\n💡 Use this command:');
           console.log(`export INTEGRATION_TEST_TOKEN="${json.access_token}"`);
         } else {
           console.error('❌ No access token in response');
           console.log('Response:', json);
         }
       } catch (e) {
         console.error('❌ Failed to parse response:', e.message);
         console.log('Response:', responseData);
       }
     });
   });
   
   req.on('error', (error) => {
     console.error('❌ Request failed:', error.message);
   });
   
   req.write(data);
   req.end();
   ```

2. **Run the script**:
   ```bash
   node scripts/get-token.js your@email.com yourpassword
   ```

3. **Copy the token** from the output

---

## Method 4: Using cURL (Command Line) 🔧

### Step-by-Step Instructions

1. **Login via API**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "your@email.com", "password": "yourpassword"}' \
     -s | jq -r '.access_token'
   ```

   **Note**: Requires `jq` for JSON parsing. If you don't have `jq`:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "your@email.com", "password": "yourpassword"}' \
     -s | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4
   ```

2. **Save directly to environment variable**:
   ```bash
   export INTEGRATION_TEST_TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "your@email.com", "password": "yourpassword"}' \
     -s | jq -r '.access_token')
   
   echo "Token set: ${INTEGRATION_TEST_TOKEN:0:50}..."
   ```

---

## Method 5: Supabase Client (If Using Supabase Directly) 🔐

If you have direct access to Supabase:

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function getToken() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'your@email.com',
    password: 'yourpassword'
  });
  
  if (error) {
    console.error('❌ Login failed:', error.message);
    return;
  }
  
  console.log('\n✅ Login successful!');
  console.log('\n📋 Access Token:');
  console.log(data.session.access_token);
  console.log('\n💡 Use this command:');
  console.log(`export INTEGRATION_TEST_TOKEN="${data.session.access_token}"`);
}

getToken();
```

---

## ✅ Verify Your Token Works

After getting your token, verify it works:

```bash
# Set the token
export INTEGRATION_TEST_TOKEN="your_token_here"

# Test it
curl -X GET http://localhost:3000/api/integrations \
  -H "Authorization: Bearer $INTEGRATION_TEST_TOKEN" \
  -H "Content-Type: application/json"

# Should return: [] or a list of integrations (not 401 Unauthorized)
```

---

## 🔍 Troubleshooting

### "Cookie not found"
**Solutions**:
- Make sure you're logged in
- Check if cookies are enabled
- Try clearing cookies and logging in again
- Check if you're looking at the right domain (`localhost:3000`)

### "Token expired" or "401 Unauthorized"
**Solutions**:
- Get a fresh token (tokens expire after 1 hour)
- Make sure you copied the entire token (they're very long)
- Check if token starts with `eyJ` (valid JWT format)

### "Cannot find cookie name"
**Solutions**:
- Look for cookies containing `auth` or `sb-`
- Check Application/Storage tab in DevTools
- Try Method 2 (Browser Console) instead

### "API login returns error"
**Solutions**:
- Make sure server is running (`npm run dev`)
- Check email/password are correct
- Verify `/api/auth/login` endpoint exists
- Check server logs for errors

---

## 💡 Pro Tips

1. **Token Expiration**: Tokens expire after 1 hour. Get a fresh one if tests fail with 401.

2. **Save Token Temporarily**: Add to `.env.local` for convenience:
   ```bash
   INTEGRATION_TEST_TOKEN=your_token_here
   ```
   **⚠️ Never commit this to git!**

3. **Quick Token Check**: Decode JWT to see expiration:
   ```bash
   # Install jwt-cli: npm install -g @tsndr/cloudflare-worker-jwt
   echo "your_token" | jwt decode
   ```

4. **Use Browser Method**: It's the most reliable and shows you exactly what's stored.

5. **Token Format**: Valid JWT tokens have 3 parts separated by dots:
   ```
   header.payload.signature
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOi...abc123
   ```

---

## 📋 Quick Reference

**What you need**: `access_token` from Supabase auth cookie

**Where to find it**: 
- Browser: DevTools → Application → Cookies → `sb-*-auth-token` → `access_token`
- API: Login endpoint response → `access_token` field

**How to use**:
```bash
export INTEGRATION_TEST_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
npm run test:integration
```

---

## 🎯 Recommended Method

**For most users**: **Method 1 (Browser DevTools)** is the easiest and most reliable.

**For automation**: **Method 3 (API Login)** or **Method 4 (cURL)** works best.

