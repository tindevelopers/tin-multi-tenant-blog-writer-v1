/**
 * Direct test of Google Cloud Run API endpoints
 * Tests the actual endpoints we're using to see response structure
 */

const CLOUD_RUN_URL = 'https://blog-writer-api-dev-613248238610.europe-west9.run.app';
const API_KEY = process.env.BLOG_WRITER_API_KEY;

async function testCloudRunEndpoints() {
  console.log('🧪 Testing Google Cloud Run API Directly\n');
  console.log(`📍 Cloud Run URL: ${CLOUD_RUN_URL}\n`);
  console.log(`🔑 API Key: ${API_KEY ? 'Set ✅' : 'NOT SET ❌'}\n`);

  // Test 1: Health Check
  console.log('='.repeat(70));
  console.log('TEST 1: Health Check');
  console.log('='.repeat(70));
  try {
    const healthResponse = await fetch(`${CLOUD_RUN_URL}/health`);
    const healthData = await healthResponse.json();
    console.log(`✅ Status: ${healthResponse.status}`);
    console.log('Response:', JSON.stringify(healthData, null, 2));
  } catch (error) {
    console.error(`❌ Health check failed:`, error.message);
  }

  // Test 2: AI Optimization Endpoint
  console.log(`\n\n${'='.repeat(70)}`);
  console.log('TEST 2: AI Optimization Endpoint');
  console.log('='.repeat(70));
  console.log('📤 Endpoint: /api/v1/keywords/ai-optimization');
  console.log('📤 Payload:', JSON.stringify({
    keywords: ['pet grooming', 'dog grooming', 'pet care'],
    location: 'United States',
    language: 'en'
  }, null, 2));

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
      headers['X-API-Key'] = API_KEY;
    }

    const aiOptStart = Date.now();
    const aiOptResponse = await fetch(`${CLOUD_RUN_URL}/api/v1/keywords/ai-optimization`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        keywords: ['pet grooming', 'dog grooming', 'pet care'],
        location: 'United States',
        language: 'en'
      }),
    });

    const aiOptDuration = Date.now() - aiOptStart;
    console.log(`\n⏱️  Response time: ${aiOptDuration}ms`);
    console.log(`📊 Status: ${aiOptResponse.status} ${aiOptResponse.statusText}`);

    if (!aiOptResponse.ok) {
      const errorText = await aiOptResponse.text();
      console.error(`❌ Error Response:`, errorText);
    } else {
      const aiOptData = await aiOptResponse.json();
      console.log('\n✅ AI Optimization Response Structure:');
      console.log(JSON.stringify(aiOptData, null, 2));

      // Analyze response structure
      console.log(`\n📋 Response Analysis:`);
      console.log(`  Top-level keys: ${Object.keys(aiOptData).join(', ')}`);

      if (aiOptData.ai_optimization_analysis) {
        const keywords = Object.keys(aiOptData.ai_optimization_analysis);
        console.log(`  Keywords analyzed: ${keywords.length}`);
        console.log(`  Keywords: ${keywords.join(', ')}`);

        if (keywords.length > 0) {
          const firstKey = keywords[0];
          const firstAnalysis = aiOptData.ai_optimization_analysis[firstKey];
          console.log(`\n  First keyword analysis ("${firstKey}"):`);
          console.log(`    Analysis keys: ${Object.keys(firstAnalysis).join(', ')}`);
          console.log(`    Full structure:`, JSON.stringify(firstAnalysis, null, 4));

          // Check for score fields
          console.log(`\n  🔍 Score Field Detection:`);
          if (firstAnalysis.ai_optimization_score !== undefined) {
            console.log(`    ✅ ai_optimization_score: ${firstAnalysis.ai_optimization_score}`);
          } else {
            console.log(`    ❌ ai_optimization_score: NOT FOUND`);
          }
          if (firstAnalysis.aiOptimizationScore !== undefined) {
            console.log(`    ✅ aiOptimizationScore: ${firstAnalysis.aiOptimizationScore}`);
          }
          if (firstAnalysis.ai_search_volume !== undefined) {
            console.log(`    ✅ ai_search_volume: ${firstAnalysis.ai_search_volume}`);
          }
          if (firstAnalysis.aiSearchVolume !== undefined) {
            console.log(`    ✅ aiSearchVolume: ${firstAnalysis.aiSearchVolume}`);
          }
          if (firstAnalysis.ai_recommended !== undefined) {
            console.log(`    ✅ ai_recommended: ${firstAnalysis.ai_recommended}`);
          }
          if (firstAnalysis.aiRecommended !== undefined) {
            console.log(`    ✅ aiRecommended: ${firstAnalysis.aiRecommended}`);
          }

          // Check all keywords for scores
          console.log(`\n  📊 Scores for all keywords:`);
          keywords.forEach(keyword => {
            const analysis = aiOptData.ai_optimization_analysis[keyword];
            const score = analysis.ai_optimization_score ?? analysis.aiOptimizationScore ?? 'NOT FOUND';
            const aiVol = analysis.ai_search_volume ?? analysis.aiSearchVolume ?? 0;
            const recommended = analysis.ai_recommended ?? analysis.aiRecommended ?? false;
            console.log(`    "${keyword}": score=${score}, ai_volume=${aiVol}, recommended=${recommended}`);
          });
        }
      } else {
        console.log(`\n  ⚠️  Response does not contain 'ai_optimization_analysis' field`);
        console.log(`  Available fields: ${Object.keys(aiOptData).join(', ')}`);
      }
    }
  } catch (error) {
    console.error(`❌ AI Optimization test failed:`, error.message);
    console.error('Stack:', error.stack);
  }

  // Test 3: Topic Recommendations Endpoint
  console.log(`\n\n${'='.repeat(70)}`);
  console.log('TEST 3: Topic Recommendations Endpoint');
  console.log('='.repeat(70));
  console.log('📤 Endpoint: /api/v1/topics/recommend');
  console.log('📤 Payload:', JSON.stringify({
    seed_keywords: ['pet grooming', 'dog grooming'],
    industry: 'Pet Grooming',
    count: 5
  }, null, 2));

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
      headers['X-API-Key'] = API_KEY;
    }

    const topicStart = Date.now();
    const topicResponse = await fetch(`${CLOUD_RUN_URL}/api/v1/topics/recommend`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        seed_keywords: ['pet grooming', 'dog grooming'],
        industry: 'Pet Grooming',
        count: 5
      }),
    });

    const topicDuration = Date.now() - topicStart;
    console.log(`\n⏱️  Response time: ${topicDuration}ms`);
    console.log(`📊 Status: ${topicResponse.status} ${topicResponse.statusText}`);

    if (!topicResponse.ok) {
      const errorText = await topicResponse.text();
      console.error(`❌ Error Response:`, errorText);
    } else {
      const topicData = await topicResponse.json();
      console.log('\n✅ Topic Recommendations Response:');
      console.log(JSON.stringify(topicData, null, 2));

      if (topicData.topics && Array.isArray(topicData.topics)) {
        console.log(`\n📝 Topics returned: ${topicData.topics.length}`);
        topicData.topics.forEach((topic, index) => {
          console.log(`\n  Topic ${index + 1}:`);
          console.log(`    Title: ${topic.title || 'N/A'}`);
          console.log(`    Keywords: ${topic.keywords ? topic.keywords.join(', ') : 'N/A'}`);
          console.log(`    Search Volume: ${topic.search_volume || 'N/A'}`);
        });
      }
    }
  } catch (error) {
    console.error(`❌ Topic Recommendations test failed:`, error.message);
  }

  // Test 4: LLM Research Endpoint (used as fallback)
  console.log(`\n\n${'='.repeat(70)}`);
  console.log('TEST 4: LLM Research Endpoint (Fallback)');
  console.log('='.repeat(70));
  console.log('📤 Endpoint: /api/v1/keywords/llm-research');

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
      headers['X-API-Key'] = API_KEY;
    }

    const prompt = `Generate blog topic recommendations for a pet grooming business targeting pet groomers looking for new clients. Focus on SEO-optimized topics.`;

    const llmStart = Date.now();
    const llmResponse = await fetch(`${CLOUD_RUN_URL}/api/v1/keywords/llm-research`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt,
        location: 'United States',
        language: 'en',
        max_results: 5
      }),
    });

    const llmDuration = Date.now() - llmStart;
    console.log(`\n⏱️  Response time: ${llmDuration}ms`);
    console.log(`📊 Status: ${llmResponse.status} ${llmResponse.statusText}`);

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error(`❌ Error Response:`, errorText);
    } else {
      const llmData = await llmResponse.json();
      console.log('\n✅ LLM Research Response:');
      console.log(JSON.stringify(llmData, null, 2));
    }
  } catch (error) {
    console.error(`❌ LLM Research test failed:`, error.message);
  }

  console.log(`\n\n${'='.repeat(70)}`);
  console.log('🏁 Testing Complete');
  console.log(`${'='.repeat(70)}\n`);
}

// Run the test
testCloudRunEndpoints().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

