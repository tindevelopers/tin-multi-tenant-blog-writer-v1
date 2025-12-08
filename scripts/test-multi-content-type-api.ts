/**
 * Test Multi-Content-Type API Endpoints
 * 
 * This script tests the new API endpoints for:
 * - Sites management
 * - Content type profiles
 * - Field mappings
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green);
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logSection(message: string) {
  console.log('\n' + '='.repeat(60));
  log(message, colors.cyan);
  console.log('='.repeat(60));
}

interface TestResult {
  passed: number;
  failed: number;
}

const results: TestResult = {
  passed: 0,
  failed: 0,
};

// Get integration ID from command line or use a default
const args = process.argv.slice(2);
const integrationIdArg = args.find(arg => arg.startsWith('--integration-id='));
const INTEGRATION_ID = integrationIdArg ? integrationIdArg.split('=')[1] : process.env.TEST_INTEGRATION_ID;

if (!INTEGRATION_ID) {
  logError('Please provide an integration ID:');
  log('  npm run test:api -- --integration-id=YOUR_INTEGRATION_ID', colors.cyan);
  log('  or set TEST_INTEGRATION_ID environment variable', colors.cyan);
  process.exit(1);
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Store created IDs for cleanup
let createdSiteId: string | null = null;
let createdProfileId: string | null = null;

/**
 * Make an API request
 */
async function apiRequest(
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<{ success: boolean; data?: any; error?: string; status: number }> {
  const url = `${API_BASE}${endpoint}`;
  
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    return {
      success: response.ok,
      data: data.data || data,
      error: data.error,
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    };
  }
}

/**
 * Test Sites API
 */
async function testSitesAPI() {
  logSection('Testing Sites API');
  
  // 1. GET sites (should be empty or have migrated data)
  logInfo('GET /api/integrations/[id]/sites');
  const getSites = await apiRequest(`/api/integrations/${INTEGRATION_ID}/sites`);
  
  if (getSites.success) {
    logSuccess(`GET sites successful - found ${getSites.data?.length || 0} sites`);
    results.passed++;
  } else {
    logError(`GET sites failed: ${getSites.error}`);
    results.failed++;
  }
  
  // 2. POST create site
  logInfo('POST /api/integrations/[id]/sites');
  const createSite = await apiRequest(
    `/api/integrations/${INTEGRATION_ID}/sites`,
    'POST',
    {
      site_name: 'Test Site',
      site_id: `test-site-${Date.now()}`,
      site_url: 'https://test.webflow.io',
      is_default: true,
      is_active: true,
    }
  );
  
  if (createSite.success && createSite.data) {
    createdSiteId = createSite.data.id;
    logSuccess(`POST create site successful - ID: ${createdSiteId}`);
    results.passed++;
  } else {
    logError(`POST create site failed: ${createSite.error}`);
    results.failed++;
  }
  
  if (!createdSiteId) {
    logError('Cannot continue testing without a site ID');
    return;
  }
  
  // 3. PUT update site
  logInfo(`PUT /api/integrations/[id]/sites/${createdSiteId}`);
  const updateSite = await apiRequest(
    `/api/integrations/${INTEGRATION_ID}/sites/${createdSiteId}`,
    'PUT',
    {
      site_name: 'Updated Test Site',
      is_active: true,
    }
  );
  
  if (updateSite.success) {
    logSuccess('PUT update site successful');
    results.passed++;
  } else {
    logError(`PUT update site failed: ${updateSite.error}`);
    results.failed++;
  }
  
  // 4. GET sites again (should include our new site)
  logInfo('GET /api/integrations/[id]/sites (verify update)');
  const getSitesAgain = await apiRequest(`/api/integrations/${INTEGRATION_ID}/sites`);
  
  if (getSitesAgain.success) {
    const site = getSitesAgain.data?.find((s: any) => s.id === createdSiteId);
    if (site && site.site_name === 'Updated Test Site') {
      logSuccess('Site was updated correctly');
      results.passed++;
    } else {
      logError('Site update not reflected in GET request');
      results.failed++;
    }
  } else {
    logError(`GET sites (verify) failed: ${getSitesAgain.error}`);
    results.failed++;
  }
}

/**
 * Test Content Type Profiles API
 */
async function testContentTypeProfilesAPI() {
  logSection('Testing Content Type Profiles API');
  
  if (!createdSiteId) {
    logError('Skipping content type tests - no site ID available');
    return;
  }
  
  // 1. GET profiles (should be empty or have migrated data)
  logInfo('GET /api/integrations/[id]/content-types');
  const getProfiles = await apiRequest(`/api/integrations/${INTEGRATION_ID}/content-types`);
  
  if (getProfiles.success) {
    logSuccess(`GET profiles successful - found ${getProfiles.data?.length || 0} profiles`);
    results.passed++;
  } else {
    logError(`GET profiles failed: ${getProfiles.error}`);
    results.failed++;
  }
  
  // 2. GET profiles filtered by site
  logInfo(`GET /api/integrations/[id]/content-types?site_id=${createdSiteId}`);
  const getProfilesBySite = await apiRequest(
    `/api/integrations/${INTEGRATION_ID}/content-types?site_id=${createdSiteId}`
  );
  
  if (getProfilesBySite.success) {
    logSuccess(`GET profiles by site successful - found ${getProfilesBySite.data?.length || 0} profiles`);
    results.passed++;
  } else {
    logError(`GET profiles by site failed: ${getProfilesBySite.error}`);
    results.failed++;
  }
  
  // 3. POST create profile
  logInfo('POST /api/integrations/[id]/content-types');
  const createProfile = await apiRequest(
    `/api/integrations/${INTEGRATION_ID}/content-types`,
    'POST',
    {
      profile_name: 'Test Article',
      content_type: 'webflow_collection',
      target_collection_id: `test-collection-${Date.now()}`,
      target_collection_name: 'Blog Posts',
      site_id: createdSiteId,
      is_default: true,
      is_active: true,
      description: 'Test article content type',
    }
  );
  
  if (createProfile.success && createProfile.data) {
    createdProfileId = createProfile.data.profile_id;
    logSuccess(`POST create profile successful - ID: ${createdProfileId}`);
    results.passed++;
  } else {
    logError(`POST create profile failed: ${createProfile.error}`);
    results.failed++;
  }
  
  if (!createdProfileId) {
    logError('Cannot continue testing without a profile ID');
    return;
  }
  
  // 4. PUT update profile
  logInfo(`PUT /api/integrations/[id]/content-types/${createdProfileId}`);
  const updateProfile = await apiRequest(
    `/api/integrations/${INTEGRATION_ID}/content-types/${createdProfileId}`,
    'PUT',
    {
      profile_name: 'Updated Test Article',
      description: 'Updated description',
    }
  );
  
  if (updateProfile.success) {
    logSuccess('PUT update profile successful');
    results.passed++;
  } else {
    logError(`PUT update profile failed: ${updateProfile.error}`);
    results.failed++;
  }
  
  // 5. GET profiles again (should include our new profile)
  logInfo('GET /api/integrations/[id]/content-types (verify update)');
  const getProfilesAgain = await apiRequest(`/api/integrations/${INTEGRATION_ID}/content-types`);
  
  if (getProfilesAgain.success) {
    const profile = getProfilesAgain.data?.find((p: any) => p.profile_id === createdProfileId);
    if (profile && profile.profile_name === 'Updated Test Article') {
      logSuccess('Profile was updated correctly');
      results.passed++;
    } else {
      logError('Profile update not reflected in GET request');
      results.failed++;
    }
  } else {
    logError(`GET profiles (verify) failed: ${getProfilesAgain.error}`);
    results.failed++;
  }
}

/**
 * Test Field Mappings API
 */
async function testFieldMappingsAPI() {
  logSection('Testing Field Mappings API');
  
  if (!createdProfileId) {
    logError('Skipping field mapping tests - no profile ID available');
    return;
  }
  
  // 1. GET field mappings (should be empty)
  logInfo(`GET /api/integrations/[id]/content-types/${createdProfileId}/fields`);
  const getMappings = await apiRequest(
    `/api/integrations/${INTEGRATION_ID}/content-types/${createdProfileId}/fields`
  );
  
  if (getMappings.success) {
    logSuccess(`GET field mappings successful - found ${getMappings.data?.length || 0} mappings`);
    results.passed++;
  } else {
    logError(`GET field mappings failed: ${getMappings.error}`);
    results.failed++;
  }
  
  // 2. POST save field mappings
  logInfo(`POST /api/integrations/[id]/content-types/${createdProfileId}/fields`);
  const saveMappings = await apiRequest(
    `/api/integrations/${INTEGRATION_ID}/content-types/${createdProfileId}/fields`,
    'POST',
    {
      mappings: [
        {
          blog_field: 'title',
          target_field: 'post-title',
          is_required: true,
          display_order: 0,
        },
        {
          blog_field: 'content',
          target_field: 'post-body',
          is_required: true,
          display_order: 1,
        },
        {
          blog_field: 'author',
          target_field: 'author-name',
          is_required: false,
          display_order: 2,
        },
        {
          blog_field: 'slug',
          target_field: 'post-slug',
          is_required: true,
          display_order: 3,
        },
      ],
      replace_all: true,
    }
  );
  
  if (saveMappings.success) {
    logSuccess(`POST save field mappings successful - saved ${saveMappings.data?.length || 0} mappings`);
    results.passed++;
  } else {
    logError(`POST save field mappings failed: ${saveMappings.error}`);
    results.failed++;
  }
  
  // 3. GET field mappings again (should include our new mappings)
  logInfo(`GET /api/integrations/[id]/content-types/${createdProfileId}/fields (verify save)`);
  const getMappingsAgain = await apiRequest(
    `/api/integrations/${INTEGRATION_ID}/content-types/${createdProfileId}/fields`
  );
  
  if (getMappingsAgain.success) {
    if (getMappingsAgain.data?.length === 4) {
      logSuccess('Field mappings were saved correctly (4 mappings)');
      results.passed++;
      
      // Verify the mappings are correct
      const titleMapping = getMappingsAgain.data.find((m: any) => m.blog_field === 'title');
      if (titleMapping && titleMapping.target_field === 'post-title' && titleMapping.is_required) {
        logSuccess('Title mapping is correct');
        results.passed++;
      } else {
        logError('Title mapping is incorrect');
        results.failed++;
      }
    } else {
      logError(`Expected 4 mappings, found ${getMappingsAgain.data?.length || 0}`);
      results.failed++;
    }
  } else {
    logError(`GET field mappings (verify) failed: ${getMappingsAgain.error}`);
    results.failed++;
  }
  
  // 4. POST update field mappings (add one more)
  logInfo(`POST /api/integrations/[id]/content-types/${createdProfileId}/fields (update)`);
  const updateMappings = await apiRequest(
    `/api/integrations/${INTEGRATION_ID}/content-types/${createdProfileId}/fields`,
    'POST',
    {
      mappings: [
        {
          blog_field: 'title',
          target_field: 'post-title',
          is_required: true,
          display_order: 0,
        },
        {
          blog_field: 'content',
          target_field: 'post-body',
          is_required: true,
          display_order: 1,
        },
        {
          blog_field: 'author',
          target_field: 'author-name',
          is_required: false,
          display_order: 2,
        },
        {
          blog_field: 'slug',
          target_field: 'post-slug',
          is_required: true,
          display_order: 3,
        },
        {
          blog_field: 'excerpt',
          target_field: 'post-excerpt',
          is_required: false,
          display_order: 4,
        },
      ],
      replace_all: true,
    }
  );
  
  if (updateMappings.success) {
    logSuccess('POST update field mappings successful');
    results.passed++;
    
    // Verify the update
    const verifyUpdate = await apiRequest(
      `/api/integrations/${INTEGRATION_ID}/content-types/${createdProfileId}/fields`
    );
    
    if (verifyUpdate.success && verifyUpdate.data?.length === 5) {
      logSuccess('Field mappings updated correctly (5 mappings)');
      results.passed++;
    } else {
      logError(`Expected 5 mappings after update, found ${verifyUpdate.data?.length || 0}`);
      results.failed++;
    }
  } else {
    logError(`POST update field mappings failed: ${updateMappings.error}`);
    results.failed++;
  }
}

/**
 * Cleanup test data
 */
async function cleanup() {
  logSection('Cleanup');
  
  // Delete profile (this should cascade to field mappings)
  if (createdProfileId) {
    logInfo(`Deleting test profile: ${createdProfileId}`);
    const deleteProfile = await apiRequest(
      `/api/integrations/${INTEGRATION_ID}/content-types/${createdProfileId}`,
      'DELETE'
    );
    
    if (deleteProfile.success) {
      logSuccess('Test profile deleted successfully');
    } else {
      logError(`Failed to delete test profile: ${deleteProfile.error}`);
    }
  }
  
  // Delete site
  if (createdSiteId) {
    logInfo(`Deleting test site: ${createdSiteId}`);
    const deleteSite = await apiRequest(
      `/api/integrations/${INTEGRATION_ID}/sites/${createdSiteId}`,
      'DELETE'
    );
    
    if (deleteSite.success) {
      logSuccess('Test site deleted successfully');
    } else {
      logError(`Failed to delete test site: ${deleteSite.error}`);
    }
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n🧪 Multi-Content-Type API Test Suite\n', colors.cyan);
  logInfo(`Testing integration: ${INTEGRATION_ID}`);
  logInfo(`API Base URL: ${API_BASE}`);
  
  try {
    await testSitesAPI();
    await testContentTypeProfilesAPI();
    await testFieldMappingsAPI();
    
    // Cleanup
    await cleanup();
    
    // Print summary
    logSection('Test Summary');
    logSuccess(`Passed: ${results.passed}`);
    if (results.failed > 0) {
      logError(`Failed: ${results.failed}`);
    }
    
    log('\nTotal Tests:', colors.cyan);
    log(`  ✅ Passed: ${results.passed}`, colors.green);
    if (results.failed > 0) {
      log(`  ❌ Failed: ${results.failed}`, colors.red);
    }
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (error) {
    logError(`Test suite failed with error: ${error}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
runTests();

