/**
 * Research Script: Blog Writer API Integrations Endpoint
 * 
 * This script helps research and test the Blog Writer API integrations endpoint.
 * Run with: npx tsx scripts/research-blog-writer-integrations.ts
 */

const API_BASE_URL = process.env.BLOG_WRITER_API_URL || 
  'https://blog-writer-api-dev-613248238610.europe-west1.run.app';
const API_KEY = process.env.BLOG_WRITER_API_KEY;

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  [key: string]: unknown;
}

async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` }),
    ...options.headers,
  };

  console.log(`\n🌐 Requesting: ${url}`);
  console.log(`📤 Method: ${options.method || 'GET'}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log(`📡 Status: ${response.status} ${response.statusText}`);

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      console.log(`📥 Response:`, JSON.stringify(data, null, 2));
      return data as T;
    } else {
      const text = await response.text();
      console.log(`📥 Response (text):`, text);
      return text as unknown as T;
    }
  } catch (error: any) {
    console.error(`❌ Error:`, error.message);
    throw error;
  }
}

async function researchIntegrationsEndpoint() {
  console.log('🔍 Researching Blog Writer API Integrations Endpoint');
  console.log('=' .repeat(60));
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`API Key: ${API_KEY ? 'Set' : 'Not set'}`);
  console.log('=' .repeat(60));

  const results: Record<string, unknown> = {};

  // 1. Check API health
  console.log('\n1️⃣ Checking API Health...');
  try {
    const health = await makeRequest<ApiResponse<unknown>>('/health');
    results.health = health;
  } catch (error: any) {
    console.warn(`⚠️ Health check failed: ${error.message}`);
  }

  // 2. List available integrations
  console.log('\n2️⃣ Listing Available Integrations...');
  try {
    const integrations = await makeRequest<ApiResponse<unknown>>('/api/v1/integrations');
    results.integrations = integrations;
  } catch (error: any) {
    console.warn(`⚠️ Failed to list integrations: ${error.message}`);
    console.log('💡 Trying alternative endpoints...');
    
    // Try alternative endpoints
    const alternatives = [
      '/integrations',
      '/api/integrations',
      '/v1/integrations',
    ];
    
    for (const alt of alternatives) {
      try {
        console.log(`\n   Trying: ${alt}`);
        const result = await makeRequest<ApiResponse<unknown>>(alt);
        results[`integrations_${alt}`] = result;
        break;
      } catch (e: any) {
        console.log(`   ❌ ${alt}: ${e.message}`);
      }
    }
  }

  // 3. Get Webflow integration details (if available)
  console.log('\n3️⃣ Getting Webflow Integration Details...');
  try {
    const webflow = await makeRequest<ApiResponse<unknown>>('/api/v1/integrations/webflow');
    results.webflow = webflow;
  } catch (error: any) {
    console.warn(`⚠️ Failed to get Webflow details: ${error.message}`);
  }

  // 4. Check for OpenAPI/Swagger documentation
  console.log('\n4️⃣ Checking for API Documentation...');
  const docEndpoints = [
    '/docs',
    '/swagger',
    '/openapi.json',
    '/api-docs',
    '/api/v1/docs',
  ];
  
  for (const docEndpoint of docEndpoints) {
    try {
      console.log(`\n   Checking: ${docEndpoint}`);
      const doc = await makeRequest<unknown>(docEndpoint);
      results[`docs_${docEndpoint.replace(/\//g, '_')}`] = doc;
      console.log(`   ✅ Found documentation at: ${docEndpoint}`);
    } catch (e: any) {
      console.log(`   ❌ ${docEndpoint}: ${e.message}`);
    }
  }

  // 5. Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Research Summary');
  console.log('='.repeat(60));
  console.log(JSON.stringify(results, null, 2));

  // 6. Generate integration plan based on findings
  console.log('\n' + '='.repeat(60));
  console.log('💡 Next Steps');
  console.log('='.repeat(60));
  console.log('1. Review the API responses above');
  console.log('2. Document the actual endpoint structure');
  console.log('3. Update BLOG_WRITER_API_INTEGRATIONS_PLAN.md with findings');
  console.log('4. Implement API client methods based on actual endpoints');
  console.log('5. Create BlogWriterAPIProvider implementation');
}

// Run the research
if (require.main === module) {
  researchIntegrationsEndpoint()
    .then(() => {
      console.log('\n✅ Research complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Research failed:', error);
      process.exit(1);
    });
}

export { researchIntegrationsEndpoint };

