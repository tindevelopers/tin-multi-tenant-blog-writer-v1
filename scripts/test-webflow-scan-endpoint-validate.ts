/**
 * Test Webflow Scan Endpoint - Server-Side Validation
 * 
 * This script validates the endpoint code structure and can test it
 * if proper environment variables are set.
 * 
 * Usage:
 *   npx tsx scripts/test-webflow-scan-endpoint-validate.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const ENDPOINT_FILE = resolve(process.cwd(), 'src/app/api/integrations/webflow/scan-structure/route.ts');

interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
}

const results: TestResult[] = [];

function addResult(test: string, status: 'pass' | 'fail' | 'skip', message: string) {
  results.push({ test, status, message });
}

console.log('\n=== Testing Webflow Scan Endpoint ===\n');

try {
  // Test 1: Check endpoint file exists
  console.log('✓ Checking endpoint file...');
  const endpointCode = readFileSync(ENDPOINT_FILE, 'utf-8');
  addResult('Endpoint file exists', 'pass', 'Found route.ts');

  // Test 2: Check POST handler
  console.log('✓ Checking POST handler...');
  if (endpointCode.includes('export async function POST')) {
    addResult('POST handler', 'pass', 'POST handler found');
  } else {
    addResult('POST handler', 'fail', 'POST handler not found');
  }

  // Test 3: Check error handling
  console.log('✓ Checking error handling...');
  const hasTryCatch = endpointCode.includes('try {') && endpointCode.includes('} catch');
  const hasErrorLogging = endpointCode.includes('logger.error');
  if (hasTryCatch && hasErrorLogging) {
    addResult('Error handling', 'pass', 'Proper error handling found');
  } else {
    addResult('Error handling', 'fail', 'Error handling incomplete');
  }

  // Test 4: Check integrationId validation
  console.log('✓ Checking integrationId validation...');
  if (endpointCode.includes('if (!integrationId)')) {
    addResult('Integration ID validation', 'pass', 'Validation check found');
  } else {
    addResult('Integration ID validation', 'fail', 'Validation check missing');
  }

  // Test 5: Check performScan function
  console.log('✓ Checking performScan function...');
  if (endpointCode.includes('async function performScan')) {
    addResult('performScan function', 'pass', 'Function found');
  } else {
    addResult('performScan function', 'fail', 'Function not found');
  }

  // Test 6: Check retry logic
  console.log('✓ Checking retry logic...');
  if (endpointCode.includes('retries') && endpointCode.includes('retries > 0')) {
    addResult('Retry logic', 'pass', 'Retry logic found');
  } else {
    addResult('Retry logic', 'fail', 'Retry logic missing');
  }

  // Test 7: Check service client usage
  console.log('✓ Checking service client usage...');
  if (endpointCode.includes('createServiceClient()')) {
    addResult('Service client usage', 'pass', 'Uses service client');
  } else {
    addResult('Service client usage', 'fail', 'May not use service client');
  }

  // Test 8: Check database update retry
  console.log('✓ Checking database update retry...');
  if (endpointCode.includes('retryError') || endpointCode.includes('Retry database update')) {
    addResult('Database retry', 'pass', 'Database update retry found');
  } else {
    addResult('Database retry', 'skip', 'Database retry may not be needed');
  }

  // Test 9: Check environment variables
  console.log('✓ Checking environment variables...');
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (hasSupabaseUrl && hasServiceKey) {
    addResult('Environment variables', 'pass', 'Required env vars set');
  } else {
    addResult('Environment variables', 'skip', 'Env vars not set (may be in deployment)');
  }

  // Test 10: Check imports
  console.log('✓ Checking imports...');
  const requiredImports = [
    'createClient',
    'createServiceClient',
    'discoverWebflowStructure',
    'logger',
    'EnvironmentIntegrationsDB'
  ];
  
  const missingImports = requiredImports.filter(imp => !endpointCode.includes(imp));
  if (missingImports.length === 0) {
    addResult('Imports', 'pass', 'All required imports found');
  } else {
    addResult('Imports', 'fail', `Missing imports: ${missingImports.join(', ')}`);
  }

  // Summary
  console.log('\n=== Test Results ===\n');
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;

  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${result.test}: ${result.message}`);
  });

  console.log(`\nSummary: ${passed} passed, ${failed} failed, ${skipped} skipped\n`);

  if (failed > 0) {
    console.log('❌ Some tests failed - please review the issues above\n');
    process.exit(1);
  } else {
    console.log('✅ All critical tests passed!\n');
    console.log('📝 Next steps:');
    console.log('   1. Deploy the code to your environment');
    console.log('   2. Test the endpoint via browser console:');
    console.log('      fetch(\'/api/integrations/webflow/scan-structure\', {');
    console.log('        method: \'POST\',');
    console.log('        headers: { \'Content-Type\': \'application/json\' },');
    console.log('        body: JSON.stringify({})');
    console.log('      }).then(r => r.json()).then(console.log);\n');
    process.exit(0);
  }

} catch (error: any) {
  console.error('\n❌ Test error:', error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}

