/**
 * Test Enhanced Search Endpoint
 * 
 * Comprehensive test of the /api/v1/keywords/enhanced endpoint on Google Cloud Run
 */

import { BLOG_WRITER_API_URL } from '../src/lib/blog-writer-api-url';

const API_KEY = process.env.BLOG_WRITER_API_KEY;

interface EnhancedSearchTest {
  name: string;
  request: Record<string, unknown>;
  expectedFields?: string[];
}

async function testEnhancedSearch(test: EnhancedSearchTest) {
  const url = `${BLOG_WRITER_API_URL}/api/v1/keywords/enhanced`;
  
  console.log(`\n🔍 Testing: ${test.name}`);
  console.log(`   URL: ${url}`);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
      headers['X-API-Key'] = API_KEY;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(test.request),
      signal: AbortSignal.timeout(60000), // 60 second timeout for enhanced search
    });

    const status = response.status;
    let responseData: any;
    
    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      responseData = await response.json();
    } else {
      const text = await response.text();
      responseData = { error: text.substring(0, 500) };
    }

    if (response.ok) {
      console.log(`   ✅ Status: ${status} - SUCCESS`);
      
      // Check response structure
      const responseKeys = Object.keys(responseData);
      console.log(`   📦 Response keys: ${responseKeys.join(', ')}`);
      
      // Check expected fields
      if (test.expectedFields) {
        const missingFields = test.expectedFields.filter(field => !(field in responseData));
        if (missingFields.length > 0) {
          console.log(`   ⚠️  Missing fields: ${missingFields.join(', ')}`);
        } else {
          console.log(`   ✅ All expected fields present`);
        }
      }
      
      // Show data counts
      if (responseData.enhanced_analysis) {
        const analysisKeys = Object.keys(responseData.enhanced_analysis);
        console.log(`   📊 Enhanced analysis keywords: ${analysisKeys.length}`);
      }
      if (responseData.suggested_keywords) {
        console.log(`   💡 Suggested keywords: ${Array.isArray(responseData.suggested_keywords) ? responseData.suggested_keywords.length : 'N/A'}`);
      }
      if (responseData.clusters) {
        console.log(`   🔗 Clusters: ${Array.isArray(responseData.clusters) ? responseData.clusters.length : 'N/A'}`);
      }
      if (responseData.serp_analysis) {
        console.log(`   🔍 SERP analysis: ${responseData.serp_analysis ? 'Present' : 'Missing'}`);
      }
      
      return { success: true, status, data: responseData };
    } else {
      console.log(`   ❌ Status: ${status} - FAILED`);
      console.log(`   Error: ${responseData.error || 'Unknown error'}`);
      return { success: false, status, error: responseData.error };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`   ❌ ERROR: ${errorMessage}`);
    return { success: false, status: 0, error: errorMessage };
  }
}

async function main() {
  console.log('🚀 Testing Enhanced Search Endpoint');
  console.log(`📍 API URL: ${BLOG_WRITER_API_URL}`);
  console.log(`🔑 API Key: ${API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log('='.repeat(60));

  const tests: EnhancedSearchTest[] = [
    {
      name: 'Basic Enhanced Search',
      request: {
        keywords: ['content marketing'],
        location: 'United States',
        language: 'en',
        max_suggestions_per_keyword: 5,
        include_search_volume: true,
      },
      expectedFields: [
        'enhanced_analysis',
        'suggested_keywords',
        'total_keywords',
        'original_keywords',
      ],
    },
    {
      name: 'Enhanced Search with Trends',
      request: {
        keywords: ['content marketing'],
        location: 'United States',
        language: 'en',
        max_suggestions_per_keyword: 5,
        include_search_volume: true,
        include_trends: true,
      },
      expectedFields: [
        'enhanced_analysis',
        'suggested_keywords',
      ],
    },
    {
      name: 'Enhanced Search with Keyword Ideas',
      request: {
        keywords: ['content marketing'],
        location: 'United States',
        language: 'en',
        max_suggestions_per_keyword: 5,
        include_search_volume: true,
        include_keyword_ideas: true,
      },
      expectedFields: [
        'enhanced_analysis',
        'suggested_keywords',
      ],
    },
    {
      name: 'Enhanced Search with SERP Analysis',
      request: {
        keywords: ['content marketing'],
        location: 'United States',
        language: 'en',
        max_suggestions_per_keyword: 5,
        include_search_volume: true,
        include_serp: true,
      },
      expectedFields: [
        'enhanced_analysis',
        'serp_analysis',
      ],
    },
    {
      name: 'Full Enhanced Search (All Features)',
      request: {
        keywords: ['content marketing'],
        location: 'United States',
        language: 'en',
        max_suggestions_per_keyword: 10,
        include_search_volume: true,
        include_trends: true,
        include_keyword_ideas: true,
        include_relevant_pages: true,
        include_serp: true,
        include_serp_ai_summary: true,
      },
      expectedFields: [
        'enhanced_analysis',
        'suggested_keywords',
        'clusters',
        'serp_analysis',
        'discovery',
      ],
    },
  ];

  const results: Array<{
    test: string;
    success: boolean;
    status: number;
    error?: string;
  }> = [];

  for (const test of tests) {
    const result = await testEnhancedSearch(test);
    results.push({
      test: test.name,
      success: result.success,
      status: result.status,
      error: result.error,
    });
    
    // Delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    const statusText = result.status > 0 ? `Status: ${result.status}` : 'No response';
    console.log(`${icon} ${result.test}: ${statusText}${result.error ? ` - ${result.error}` : ''}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${results.length} tests`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(60));

  // Exit with error code if any tests failed
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

