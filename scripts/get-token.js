#!/usr/bin/env node

/**
 * Get JWT Token Script
 * 
 * Logs in via Supabase client directly (no API route needed)
 * 
 * Usage:
 *   node scripts/get-token.js <email> <password>
 *   node scripts/get-token.js your@email.com yourpassword
 */

// Try to use Supabase client if available (better method)
let useSupabaseClient = false;
try {
  require.resolve('@supabase/supabase-js');
  useSupabaseClient = true;
} catch (e) {
  // Supabase not available, will use HTTP method
}

const email = process.argv[2];
const password = process.argv[3];
const baseUrl = process.argv[4] || process.env.INTEGRATION_TEST_BASE_URL || 'http://localhost:3000';

if (!email || !password) {
  console.error('❌ Usage: node scripts/get-token.js <email> <password> [base-url]');
  console.error('   Example (dev): node scripts/get-token.js your@email.com yourpassword');
  console.error('   Example (prod): node scripts/get-token.js your@email.com yourpassword https://your-domain.com');
  console.error('\n   Or set INTEGRATION_TEST_BASE_URL environment variable');
  console.error('\n   Note: This script uses Supabase client directly (no API route needed)');
  process.exit(1);
}

// Method 1: Use Supabase client directly (preferred)
if (useSupabaseClient) {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://edtxtpqrfpxeogukfunq.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdHh0cHFyZnB4ZW9ndWtmdW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMTU5NTcsImV4cCI6MjA3MzY5MTk1N30.viyecHpzThDCp0JivzOsFpYbQCwoRMeVgEjcIgFuHBg';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log(`🔐 Logging in as ${email}...`);
  console.log(`📡 Using Supabase directly...\n`);
  
  (async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error(`❌ Login failed: ${error.message}`);
        process.exit(1);
        return;
      }
      
      if (data.session?.access_token) {
        const accessToken = data.session.access_token;
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
        
        process.exit(0);
      } else {
        console.error('❌ No access token in response');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  })();
  
  // Keep process alive for async operation
  setTimeout(() => {
    console.error('❌ Timeout: Login took too long');
    process.exit(1);
  }, 10000);
} else {
  console.error('❌ @supabase/supabase-js not found. Please install: npm install @supabase/supabase-js');
  process.exit(1);
}
