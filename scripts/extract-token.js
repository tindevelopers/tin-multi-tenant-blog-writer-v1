#!/usr/bin/env node

/**
 * Extract Access Token from Base64 Encoded Cookie Value
 */

const tokenData = process.argv[2] || 'base64-eyJhY2Nlc3NfdG9rZW4iOiJleUpoYkdjaU9pSklVekkxTmlJc0ltdHBaQ0k2SWtsRWMxSmpaMWRrYW5RNGNrWldVa3NpTENKMGVYQWlPaUpLVjFRaWZRLmV5SnBjM01pT2lKb2RIUndjem92TDJWa2RIaDBjSEZ5Wm5CNFpXOW5kV3RtZFc1eExuTjFjR0ZpWVhObExtTnZMMkYxZEdndmRqRWlMQ0p6ZFdJaU9pSmlPR0ZqTmpGak1pMDFOVFUyTFRRMlpHVXRZbUprT0MwNU1XTXhZV1UyWXpCaE5qUWlMQ0poZFdRaU9pSmhkWFJvWlc1MGFXTmhkR1ZrSWl3aVpYaHdJam94TnpZeU9EVXhOell6TENKcFlYUWlPakUzTmpJNE5EZ3hOak1zSW1WdFlXbHNJam9pYzNsemRHVnRZV1J0YVc1QWRHbHVMbWx1Wm04aUxDSndhRzl1WlNJNklpSXNJbUZ3Y0Y5dFpYUmhaR0YwWVNJNmV5SndjbTkyYVdSbGNpSTZJbVZ0WVdsc0lpd2ljSEp2ZG1sa1pYSnpJanBiSW1WdFlXbHNJbDE5TENKMWMyVnlYMjFsZEdGa1lYUmhJanA3SW1WdFlXbHNJam9pYzNsemRHVnRZV1J0YVc1QWRHbHVMbWx1Wm04aUxDSmxiV0ZwYkY5MlpYSnBabWxsWkNJNmRISjFaU3dpWm5Wc2JGOXVZVzFsSWpvaVUzbHpkR1Z0SUVGa2JXbHVhWE4wY21GMGIzSWlMQ0p2Y21kZmJtRnRaU0k2SWxSSlRpQlVaWE4wYVc1bklpd2ljR2h2Ym1WZmRtVnlhV1pwWldRaU9tWmhiSE5sTENKemRXSWlPaUppT0dGak5qRmpNaTAxTlRVMkxUUTJaR1V0WW1Ka09DMDVNV014WVdVMll6QmhOalFpZlN3aWNtOXNaU0k2SW1GMWRHaGxiblJwWTJGMFpXUWlMQ0poWVd3aU9pSmhZV3d4SWl3aVlXMXlJanBiZXlKdFpYUm9iMlFpT2lKd1lYTnpkMjl5WkNJc0luUnBiV1Z6ZEdGdGNDSTZNVGMyTWpneE5ERXlOSDFkTENKelpYTnphVzl1WDJsa0lqb2lNalk1TW1JeE1qTXRNakkxTmkwME1UZG1MVGt3WldNdE1XSXdZVEV3WXpVMk0yTm1JaXdpYVhOZllXNXZibmx0YjNWeklqcG1ZV3h6WlgwLkxJbVMxMW5QWDBkUk5pVFZUenBqRllEZDBVNlRnWC1oNXdfTzh6VTRmYmciLCJ0b2tlbl90eXBlIjoiYmVhcmVyIiwiZXhwaXJlc19pbiI6MzYwMCwiZXhwaXJlc19hdCI6MTc2Mjg1MTc2MywicmVmcmVzaF90b2tlbiI6Im5oNmt6cGdhenQydiIsInVzZXIiOnsiaWQiOiJiOGFjNjFjMi01NTU2LTQ2ZGUtYmJkOC05MWMxYWU2YzBhNjQiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJlbWFpbCI6InN5c3RlbWFkbWluQHRpbi5pbmZvIiwiZW1haWxfY29uZmlybWVkX2F0IjoiMjAyNS0xMC0xMVQxNDoyMDoxOC4zNjkwNTNaIiwicGhvbmUiOiIiLCJjb25maXJtYXRpb25fc2VudF9hdCI6IjIwMjUtMTAtMTFUMTQ6MTk6NTcuNzE0NjM2WiIsImNvbmZpcm1lZF9hdCI6IjIwMjUtMTAtMTFUMTQ6MjA6MTguMzY5MDUzWiIsImxhc3Rfc2lnbl9pbl9hdCI6IjIwMjUtMTEtMTBUMjI6MzU6MjQuMDQ5Nzk0WiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoic3lzdGVtYWRtaW5AdGluLmluZm8iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZnVsbF9uYW1lIjoiU3lzdGVtIEFkbWluaXN0cmF0b3IiLCJvcmdfbmFtZSI6IlRJTiBUZXN0aW5nIiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiJiOGFjNjFjMi01NTU2LTQ2ZGUtYmJkOC05MWMxYWU2YzBhNjQifSwiaWRlbnRpdGllcyI6W3siaWRlbnRpdHlfaWQiOiI0ZGY3MDcxYS1jY2QyLTQ3Y2MtOWE4OS1lOGY0ZGZkMjA4NTIiLCJpZCI6ImI4YWM2MWMyLTU1NTYtNDZkZS1iYmQ4LTkxYzFhZTZjMGE2NCIsInVzZXJfaWQiOiJiOGFjNjFjMi01NTU2LTQ2ZGUtYmJkOC05MWMxYWU2YzBhNjQiLCJpZGVudGl0eV9kYXRhIjp7ImVtYWlsIjoic3lzdGVtYWRtaW5AdGluLmluZm8iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZnVsbF9uYW1lIjoiU3lzdGVtIEFkbWluaXN0cmF0b3IiLCJvcmdfbmFtZSI6IlRJTiBUZXN0aW5nIiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiJiOGFjNjFjMi01NTU2LTQ2ZGUtYmJkOC05MWMxYWU2YzBhNjQifSwicHJvdmlkZXIiOiJlbWFpbCIsImxhc3Rfc2lnbl9pbl9hdCI6IjIwMjUtMTAtMTFUMTQ6MTk6NTcuNjk2NTkyWiIsImNyZWF0ZWRfYXQiOiIyMDI1LTEwLTExVDE0OjE5OjU3LjY5NjY0NFoiLCJ1cGRhdGVkX2F0IjoiMjAyNS0xMC0xMVQxNDoxOTo1Ny42OTY2NDRaIiwiZW1haWwiOiJzeXN0ZW1hZG1pbkB0aW4uaW5mbyJ9XSwiY3JlYXRlZF9hdCI6IjIwMjUtMTAtMTFUMTQ6MTk6NTcuNjg3NDE4WiIsInVwZGF0ZWRfYXQiOiIyMDI1LTExLTExVDA4OjAyOjQxLjUyMzE1WiIsImlzX2Fub255bW91cyI6ZmFsc2V9fQ';

// Remove 'base64-' prefix if present
const base64Data = tokenData.replace(/^base64-/, '');

try {
  // Decode base64
  const decoded = Buffer.from(base64Data, 'base64').toString('utf-8');
  
  // Parse JSON
  const json = JSON.parse(decoded);
  
  // Extract access_token
  const accessToken = json.access_token;
  
  if (accessToken) {
    console.log('\n✅ Token extracted successfully!\n');
    console.log('📋 Access Token:');
    console.log(accessToken);
    console.log('\n💡 Use this command to set the token:');
    console.log(`export INTEGRATION_TEST_TOKEN="${accessToken}"`);
    console.log('\n🚀 Or run tests directly:');
    console.log(`INTEGRATION_TEST_TOKEN="${accessToken}" npm run test:integration`);
    console.log('\n📝 Token info:');
    console.log(`   Length: ${accessToken.length} characters`);
    console.log(`   Starts with: ${accessToken.substring(0, 20)}...`);
    
    // Decode JWT to show expiration
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
        if (payload.email) {
          console.log(`   Email: ${payload.email}`);
        }
      }
    } catch (e) {
      // JWT decode failed, that's OK
    }
  } else {
    console.error('❌ No access_token found in decoded data');
    console.log('\n📄 Decoded JSON keys:', Object.keys(json));
  }
} catch (error) {
  console.error('❌ Failed to extract token:', error.message);
  process.exit(1);
}

