#!/usr/bin/env node

/**
 * Get JWT Token Script
 * 
 * Logs in via API and extracts the access token
 * 
 * Usage:
 *   node scripts/get-token.js <email> <password>
 *   node scripts/get-token.js your@email.com yourpassword
 */

const http = require('http');
const https = require('https');

const email = process.argv[2];
const password = process.argv[3];
const baseUrl = process.argv[4] || process.env.INTEGRATION_TEST_BASE_URL || 'http://localhost:3000';

if (!email || !password) {
  console.error('❌ Usage: node scripts/get-token.js <email> <password> [base-url]');
  console.error('   Example (dev): node scripts/get-token.js your@email.com yourpassword');
  console.error('   Example (prod): node scripts/get-token.js your@email.com yourpassword https://your-domain.com');
  console.error('\n   Or set INTEGRATION_TEST_BASE_URL environment variable');
  process.exit(1);
}

const url = new URL(`${baseUrl}/api/auth/login`);
const data = JSON.stringify({ email, password });

const options = {
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const client = url.protocol === 'https:' ? https : http;

console.log(`🔐 Logging in as ${email}...`);
console.log(`📡 Connecting to ${baseUrl}...\n`);

const req = client.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error(`❌ Login failed (HTTP ${res.statusCode})`);
      try {
        const error = JSON.parse(responseData);
        console.error(`   Error: ${error.error || error.message || responseData}`);
      } catch (e) {
        console.error(`   Response: ${responseData}`);
      }
      process.exit(1);
      return;
    }
    
    try {
      const json = JSON.parse(responseData);
      
      // Check for access_token in various possible locations
      let accessToken = null;
      
      if (json.access_token) {
        accessToken = json.access_token;
      } else if (json.data && json.data.access_token) {
        accessToken = json.data.access_token;
      } else if (json.session && json.session.access_token) {
        accessToken = json.session.access_token;
      } else if (json.token) {
        accessToken = json.token;
      }
      
      if (accessToken) {
        console.log('✅ Login successful!\n');
        console.log('📋 Access Token:');
        console.log(accessToken);
        console.log('\n💡 Use this command to set the token:');
        console.log(`export INTEGRATION_TEST_TOKEN="${accessToken}"`);
        console.log('\n🚀 Or run tests directly:');
        console.log(`INTEGRATION_TEST_TOKEN="${accessToken}" npm run test:integration`);
        console.log('\n📝 Token info:');
        console.log(`   Length: ${accessToken.length} characters`);
        console.log(`   Starts with: ${accessToken.substring(0, 20)}...`);
        
        // Try to decode JWT to show expiration (if possible)
        try {
          const parts = accessToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            if (payload.exp) {
              const expiresAt = new Date(payload.exp * 1000);
              const now = new Date();
              const minutesUntilExpiry = Math.floor((expiresAt - now) / 1000 / 60);
              console.log(`   Expires: ${expiresAt.toLocaleString()} (${minutesUntilExpiry} minutes)`);
            }
          }
        } catch (e) {
          // JWT decode failed, that's OK
        }
      } else {
        console.error('❌ No access token found in response');
        console.log('\n📄 Full response:');
        console.log(JSON.stringify(json, null, 2));
        console.log('\n💡 Tip: Check if your login endpoint returns the token in a different format');
        process.exit(1);
      }
    } catch (e) {
      console.error('❌ Failed to parse response:', e.message);
      console.log('\n📄 Raw response:');
      console.log(responseData);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.error('\n💡 Make sure:');
  console.error('   1. Your server is running (npm run dev)');
  console.error(`   2. The server is accessible at ${baseUrl}`);
  console.error('   3. The /api/auth/login endpoint exists');
  process.exit(1);
});

req.write(data);
req.end();

