#!/usr/bin/env node

/**
 * Test script for /api/v1/keywords/enhanced endpoint
 */

const BLOG_WRITER_API_URL = process.env.BLOG_WRITER_API_URL || 
  'https://blog-writer-api-dev-613248238610.europe-west1.run.app';

const testKeyword = process.argv[2] || 'best blow dryers';

async function testEnhancedEndpoint() {
  console.log('🧪 Testing Blog Writer API Enhanced Keywords Endpoint\n');
  console.log(`API URL: ${BLOG_WRITER_API_URL}`);
  console.log(`Test Keyword: "${testKeyword}"\n`);
  console.log('─'.repeat(60));

  // Test different request formats
  const testCases = [
    {
      name: 'Test 1: Keywords array with search volume',
      body: {
        keywords: [testKeyword],
        location: 'United States',
        language: 'en',
        include_search_volume: true,
        max_suggestions_per_keyword: 10
      }
    },
    {
      name: 'Test 2: Keywords array without search volume flag',
      body: {
        keywords: [testKeyword],
        location: 'United States',
        language: 'en',
        max_suggestions_per_keyword: 10
      }
    },
    {
      name: 'Test 3: Single keyword string',
      body: {
        keyword: testKeyword,
        location: 'United States',
        language: 'en',
        include_search_volume: true
      }
    },
    {
      name: 'Test 4: Multiple keywords',
      body: {
        keywords: [testKeyword, 'dog grooming tools'],
        location: 'United States',
        language: 'en',
        include_search_volume: true,
        max_suggestions_per_keyword: 5
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`);
    console.log('─'.repeat(60));
    console.log('Request Body:');
    console.log(JSON.stringify(testCase.body, null, 2));
    
    try {
      const startTime = Date.now();
      const response = await fetch(`${BLOG_WRITER_API_URL}/api/v1/keywords/enhanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.body),
      });

      const responseTime = Date.now() - startTime;
      console.log(`\n⏱️  Response Time: ${responseTime}ms`);
      console.log(`📊 Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('\n❌ Error Response:');
        try {
          const errorJson = JSON.parse(errorText);
          console.log(JSON.stringify(errorJson, null, 2));
        } catch {
          console.log(errorText);
        }
        continue;
      }

      const data = await response.json();
      
      console.log('\n✅ Response Structure:');
      console.log('Top-level keys:', Object.keys(data));
      
      // Check for different possible response formats
      if (data.enhanced_analysis) {
        console.log('\n📊 Enhanced Analysis Found:');
        const analysisKeys = Object.keys(data.enhanced_analysis);
        console.log(`   Number of keywords analyzed: ${analysisKeys.length}`);
        
        if (analysisKeys.length > 0) {
          const firstKey = analysisKeys[0];
          const firstAnalysis = data.enhanced_analysis[firstKey];
          console.log(`\n   First keyword analysis (${firstKey}):`);
          console.log('   Fields:', Object.keys(firstAnalysis));
          
          // Check for search volume
          if (firstAnalysis.search_volume !== undefined) {
            console.log(`   ✓ Search Volume: ${firstAnalysis.search_volume}`);
          } else {
            console.log(`   ✗ Search Volume: MISSING`);
          }
          
          // Check for CPC
          if (firstAnalysis.cpc !== undefined || firstAnalysis.cost_per_click !== undefined) {
            console.log(`   ✓ CPC: $${firstAnalysis.cpc || firstAnalysis.cost_per_click}`);
          } else {
            console.log(`   ✗ CPC: MISSING`);
          }
          
          // Check for difficulty
          if (firstAnalysis.difficulty !== undefined || firstAnalysis.keyword_difficulty !== undefined) {
            console.log(`   ✓ Difficulty: ${firstAnalysis.difficulty || firstAnalysis.keyword_difficulty}`);
          } else {
            console.log(`   ✗ Difficulty: MISSING`);
          }
          
          // Check for competition
          if (firstAnalysis.competition !== undefined || firstAnalysis.competition_level !== undefined) {
            console.log(`   ✓ Competition: ${firstAnalysis.competition || firstAnalysis.competition_level}`);
          } else {
            console.log(`   ✗ Competition: MISSING`);
          }
          
          // Show full first analysis object
          console.log('\n   Full analysis object:');
          console.log(JSON.stringify(firstAnalysis, null, 2).substring(0, 500));
        }
      }
      
      if (data.suggested_keywords) {
        console.log(`\n📝 Suggested Keywords: ${data.suggested_keywords.length}`);
        if (data.suggested_keywords.length > 0) {
          console.log('   First 5:', data.suggested_keywords.slice(0, 5));
        }
      }
      
      if (data.clusters) {
        console.log(`\n🔗 Clusters: ${data.clusters.length}`);
        if (data.clusters.length > 0) {
          console.log('   First cluster:', JSON.stringify(data.clusters[0], null, 2).substring(0, 300));
        }
      }
      
      // Show full response (truncated)
      console.log('\n📄 Full Response (first 1500 chars):');
      const responseStr = JSON.stringify(data, null, 2);
      console.log(responseStr.substring(0, 1500));
      if (responseStr.length > 1500) {
        console.log(`\n... (truncated, total length: ${responseStr.length} chars)`);
      }
      
      // If we got a successful response, break (no need to test other formats)
      if (response.ok) {
        console.log('\n✅ SUCCESS! This request format works.');
        break;
      }
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack.split('\n').slice(0, 3).join('\n'));
      }
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

testEnhancedEndpoint();
