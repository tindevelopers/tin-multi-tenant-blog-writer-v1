/**
 * Test script to simulate the full AI topic recommender flow
 * Tests the complete flow from objective page to AI optimization endpoint
 */

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testTopicRecommenderFlow() {
  console.log('🧪 Testing AI Topic Recommender Flow\n');
  console.log(`📍 API URL: ${API_URL}\n`);

  // Simulate the request that would come from the objective page
  const testPayload = {
    industry: 'Pet Grooming',
    objective: 'I want to create blogs that rank for Pet Groomers that are looking for new clients',
    target_audience: 'Pet groomers looking for new clients',
    content_goal: 'seo',
    keywords: ['pet grooming', 'dog grooming'], // These should be preserved as phrases
    count: 5
  };

  console.log('='.repeat(70));
  console.log('STEP 1: Testing Topic Recommendations Endpoint');
  console.log('='.repeat(70));
  console.log('📤 Request payload:', JSON.stringify(testPayload, null, 2));
  console.log('\n⏳ Calling /api/blog-writer/topics/recommend...\n');

  try {
    const startTime = Date.now();
    
    const response = await fetch(`${API_URL}/api/blog-writer/topics/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error Response:`, errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Topic Recommendations Response:');
    console.log(JSON.stringify(data, null, 2));

    if (data.topics && Array.isArray(data.topics)) {
      console.log(`\n📝 Topics Generated: ${data.topics.length}`);
      
      data.topics.forEach((topic, index) => {
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`Topic ${index + 1}: ${topic.title}`);
        console.log(`${'─'.repeat(60)}`);
        console.log(`Description: ${topic.description || 'N/A'}`);
        console.log(`Keywords: ${topic.keywords ? topic.keywords.join(', ') : 'N/A'}`);
        console.log(`Search Volume: ${topic.search_volume || 'N/A'}`);
        console.log(`Difficulty: ${topic.difficulty || 'N/A'}`);
        console.log(`Estimated Traffic: ${topic.estimated_traffic || 'N/A'}`);
        
        if (topic.aiScore !== undefined) {
          console.log(`\n🤖 AI Optimization Metrics:`);
          console.log(`  AI Score: ${topic.aiScore}/100`);
          console.log(`  AI Search Volume: ${topic.aiSearchVolume || 'N/A'}`);
          console.log(`  Traditional Volume: ${topic.traditionalSearchVolume || 'N/A'}`);
          console.log(`  Recommended: ${topic.recommended ? 'Yes ⭐' : 'No'}`);
        } else {
          console.log(`\n⚠️  No AI optimization data found for this topic`);
        }
      });

      // Check if any topics have AI scores
      const topicsWithAIScores = data.topics.filter(t => t.aiScore !== undefined && t.aiScore > 0);
      const topicsWithZeroScores = data.topics.filter(t => t.aiScore === 0);
      
      console.log(`\n${'='.repeat(70)}`);
      console.log('📊 Summary:');
      console.log(`${'='.repeat(70)}`);
      console.log(`Total topics: ${data.topics.length}`);
      console.log(`Topics with AI scores > 0: ${topicsWithAIScores.length}`);
      console.log(`Topics with AI score = 0: ${topicsWithZeroScores.length}`);
      console.log(`Topics without AI data: ${data.topics.length - topicsWithAIScores.length - topicsWithZeroScores.length}`);
    }

    // Now test the AI optimization endpoint directly
    console.log(`\n\n${'='.repeat(70)}`);
    console.log('STEP 2: Testing AI Optimization Endpoint Directly');
    console.log('='.repeat(70));
    
    const aiOptimizationKeywords = ['pet grooming', 'dog grooming', 'pet care'];
    console.log('📤 Request payload:', JSON.stringify({ keywords: aiOptimizationKeywords }, null, 2));
    console.log('\n⏳ Calling /api/keywords/ai-optimization...\n');

    try {
      const aiStartTime = Date.now();
      const aiResponse = await fetch(`${API_URL}/api/keywords/ai-optimization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: aiOptimizationKeywords,
          location: 'United States',
          language: 'en',
        }),
      });

      const aiDuration = Date.now() - aiStartTime;
      console.log(`⏱️  Response time: ${aiDuration}ms`);
      console.log(`📊 Status: ${aiResponse.status} ${aiResponse.statusText}\n`);

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error(`❌ Error Response:`, errorText);
        console.log('\n💡 This might indicate Cloud Run is unavailable or the endpoint structure is different');
        return;
      }

      const aiData = await aiResponse.json();
      console.log('✅ AI Optimization Raw Response:');
      console.log(JSON.stringify(aiData, null, 2));
      
      console.log(`\n📋 Response Structure Analysis:`);
      console.log(`  Top-level keys: ${Object.keys(aiData).join(', ')}`);
      
      if (aiData.ai_optimization_analysis) {
        const analysisKeys = Object.keys(aiData.ai_optimization_analysis);
        console.log(`  Keywords analyzed: ${analysisKeys.length}`);
        console.log(`  Keywords: ${analysisKeys.join(', ')}`);
        
        if (analysisKeys.length > 0) {
          const firstKey = analysisKeys[0];
          const firstAnalysis = aiData.ai_optimization_analysis[firstKey];
          console.log(`\n  First keyword analysis structure:`);
          console.log(`    Keyword: "${firstKey}"`);
          console.log(`    Analysis keys: ${Object.keys(firstAnalysis).join(', ')}`);
          console.log(`    Full analysis:`, JSON.stringify(firstAnalysis, null, 4));
          
          // Check for score fields
          const scoreFields = Object.keys(firstAnalysis).filter(k => 
            k.toLowerCase().includes('score') || 
            k.toLowerCase().includes('optimization')
          );
          console.log(`\n  Score-related fields: ${scoreFields.join(', ')}`);
          
          if (firstAnalysis.ai_optimization_score !== undefined) {
            console.log(`    ai_optimization_score: ${firstAnalysis.ai_optimization_score}`);
          }
          if (firstAnalysis.aiOptimizationScore !== undefined) {
            console.log(`    aiOptimizationScore: ${firstAnalysis.aiOptimizationScore}`);
          }
          if (firstAnalysis.ai_search_volume !== undefined) {
            console.log(`    ai_search_volume: ${firstAnalysis.ai_search_volume}`);
          }
          if (firstAnalysis.aiSearchVolume !== undefined) {
            console.log(`    aiSearchVolume: ${firstAnalysis.aiSearchVolume}`);
          }
        }
      } else {
        console.log(`\n⚠️  Response does not contain 'ai_optimization_analysis' field`);
        console.log(`  Available fields: ${Object.keys(aiData).join(', ')}`);
      }

    } catch (aiError) {
      console.error(`❌ AI Optimization test failed:`, aiError.message);
    }

  } catch (error) {
    console.error(`❌ Test failed:`, error.message);
    console.error('Stack:', error.stack);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('🏁 Testing Complete');
  console.log(`${'='.repeat(70)}\n`);
}

// Run the test
testTopicRecommenderFlow().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
