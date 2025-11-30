/**
 * Validate Webflow Scan Endpoint
 * 
 * This script validates the endpoint code structure and logic
 * without requiring authentication or making actual API calls.
 * 
 * Usage:
 *   npx tsx scripts/validate-webflow-scan-endpoint.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ENDPOINT_FILE = resolve(process.cwd(), 'src/app/api/integrations/webflow/scan-structure/route.ts');
const DISCOVERY_FILE = resolve(process.cwd(), 'src/lib/integrations/webflow-structure-discovery.ts');

interface ValidationResult {
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

const results: ValidationResult[] = [];

function addResult(check: string, status: 'pass' | 'fail' | 'warning', message: string) {
  results.push({ check, status, message });
}

console.log('\n=== Validating Webflow Scan Endpoint ===\n');

try {
  // Check 1: Endpoint file exists
  console.log('✓ Checking endpoint file exists...');
  const endpointCode = readFileSync(ENDPOINT_FILE, 'utf-8');
  addResult('Endpoint file exists', 'pass', 'Found route.ts');

  // Check 2: Discovery file exists
  console.log('✓ Checking discovery file exists...');
  const discoveryCode = readFileSync(DISCOVERY_FILE, 'utf-8');
  addResult('Discovery file exists', 'pass', 'Found webflow-structure-discovery.ts');

  // Check 3: POST handler exists
  console.log('✓ Checking POST handler...');
  if (endpointCode.includes('export async function POST')) {
    addResult('POST handler', 'pass', 'POST handler found');
  } else {
    addResult('POST handler', 'fail', 'POST handler not found');
  }

  // Check 4: GET handler exists
  console.log('✓ Checking GET handler...');
  if (endpointCode.includes('export async function GET')) {
    addResult('GET handler', 'pass', 'GET handler found');
  } else {
    addResult('GET handler', 'fail', 'GET handler not found');
  }

  // Check 5: performScan function exists
  console.log('✓ Checking performScan function...');
  if (endpointCode.includes('async function performScan')) {
    addResult('performScan function', 'pass', 'performScan function found');
  } else {
    addResult('performScan function', 'fail', 'performScan function not found');
  }

  // Check 6: discoverWebflowStructure import
  console.log('✓ Checking imports...');
  if (endpointCode.includes('discoverWebflowStructure')) {
    addResult('discoverWebflowStructure import', 'pass', 'Function imported');
  } else {
    addResult('discoverWebflowStructure import', 'fail', 'Function not imported');
  }

  // Check 7: Error handling in POST
  console.log('✓ Checking error handling...');
  const hasTryCatch = endpointCode.includes('try {') && endpointCode.includes('} catch');
  const hasErrorLogging = endpointCode.includes('logger.error');
  if (hasTryCatch && hasErrorLogging) {
    addResult('Error handling', 'pass', 'Proper error handling found');
  } else {
    addResult('Error handling', 'warning', 'Error handling may be incomplete');
  }

  // Check 8: Database operations use service client
  console.log('✓ Checking database operations...');
  if (endpointCode.includes('createServiceClient')) {
    addResult('Service client usage', 'pass', 'Uses service client for DB operations');
  } else {
    addResult('Service client usage', 'warning', 'May not use service client for all DB operations');
  }

  // Check 9: discoverWebflowStructure function exists
  console.log('✓ Checking discovery function...');
  if (discoveryCode.includes('export async function discoverWebflowStructure')) {
    addResult('discoverWebflowStructure function', 'pass', 'Function exported');
  } else {
    addResult('discoverWebflowStructure function', 'fail', 'Function not found');
  }

  // Check 10: Type safety - check for proper type guards
  console.log('✓ Checking type safety...');
  const hasTypeGuards = discoveryCode.includes('typeof') && discoveryCode.includes('=== \'string\'');
  if (hasTypeGuards) {
    addResult('Type safety', 'pass', 'Type guards found for string operations');
  } else {
    addResult('Type safety', 'warning', 'May need more type guards');
  }

  // Check 11: Pagination support
  console.log('✓ Checking pagination...');
  if (discoveryCode.includes('offset') && discoveryCode.includes('limit')) {
    addResult('Pagination support', 'pass', 'Pagination logic found');
  } else {
    addResult('Pagination support', 'warning', 'Pagination may not be implemented');
  }

  // Check 12: Both CMS and static pages
  console.log('✓ Checking content types...');
  const hasCMS = discoveryCode.includes('type: \'cms\'');
  const hasStatic = discoveryCode.includes('type: \'static\'');
  if (hasCMS && hasStatic) {
    addResult('Content types', 'pass', 'Both CMS and static pages supported');
  } else {
    addResult('Content types', 'warning', 'May not support both types');
  }

  // Check 13: Response format handling
  console.log('✓ Checking API response handling...');
  const hasResponseHandling = discoveryCode.includes('data.items') || discoveryCode.includes('Array.isArray');
  if (hasResponseHandling) {
    addResult('Response handling', 'pass', 'Multiple response formats handled');
  } else {
    addResult('Response handling', 'warning', 'Response format handling may be limited');
  }

  // Summary
  console.log('\n=== Validation Results ===\n');
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warning').length;

  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${result.check}: ${result.message}`);
  });

  console.log(`\nSummary: ${passed} passed, ${failed} failed, ${warnings} warnings\n`);

  if (failed > 0) {
    console.log('❌ Validation failed - please fix the issues above\n');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('⚠️  Validation passed with warnings - review the warnings above\n');
    process.exit(0);
  } else {
    console.log('✅ All validations passed!\n');
    process.exit(0);
  }

} catch (error: any) {
  console.error('\n❌ Validation error:', error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}

