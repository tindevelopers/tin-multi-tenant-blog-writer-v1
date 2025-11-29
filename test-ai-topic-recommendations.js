/**
 * Test script for AI-powered topic recommendations
 * Tests the new AI optimization endpoint integration
 */

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testAITopicRecommendations() {
  console.log('🧪 Testing AI-Powered Topic Recommendations\n');
  console.log(`📍 API URL: ${API_URL}\n`);

  const testCase = {
    name: 'Test: AI Optimization for Topic Recommendations',
    payload: {
      industry: 'Pet Grooming',
      objective: 'I want to create blogs that rank for Pet Groomers that are looking for new clients',
      target_audience: 'Pet groomers looking for new clients',
      content_goal: 'seo',
      keywords: ['pet grooming', 'dog grooming'],
      count: 5
    }
  };

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 ${testCase.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log('📤 Request payload:', JSON.stringify(testCase.payload, null, 2));
  console.log('\n⏳ Calling endpoint...\n');

  try {
    const startTime = Date.now();
    
    const response = await fetch(`${API_URL}/api/blog-writer/topics/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCase.payload),
    });

    const duration = Date.now() - startTime;
    const responseText = await response.text();
    
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error(`❌ Error Response:`, responseText);
      try {
        const errorData = JSON.parse(responseText);
        console.error('Error details:', JSON.stringify(errorData, null, 2));
      } catch {
        console.error('Raw error:', responseText);
      }
      return;
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse JSON response:', responseText);
      return;
    }

    console.log('\n✅ Success! Response received:');
    console.log(JSON.stringify(data, null, 2));

    if (data.topics && Array.isArray(data.topics)) {
      console.log(`\n📝 Topics Generated: ${data.topics.length}`);
      const aiOptimizedCount = data.topics.filter(t => t.recommended || t.aiScore).length;
      console.log(`🤖 AI-Optimized Topics: ${aiOptimizedCount}`);
      
      data.topics.forEach((topic, index) => {
        console.log(`\n  Topic ${index + 1}:`);
        console.log(`    Title: ${topic.title || 'N/A'}`);
        console.log(`    Description: ${topic.description || 'N/A'}`);
        console.log(`    Keywords: ${topic.keywords ? topic.keywords.join(', ') : 'N/A'}`);
        console.log(`    Search Volume: ${topic.search_volume || 'N/A'}`);
        console.log(`    Difficulty: ${topic.difficulty || 'N/A'}`);
        console.log(`    Estimated Traffic: ${topic.estimated_traffic || 'N/A'}`);
        if (topic.aiScore !== undefined) {
          console.log(`    ⭐ AI Score: ${topic.aiScore}/100`);
          console.log(`    🤖 AI Search Volume: ${topic.aiSearchVolume || 'N/A'}`);
          console.log(`    📊 Traditional Volume: ${topic.traditionalSearchVolume || 'N/A'}`);
          console.log(`    ✅ Recommended: ${topic.recommended ? 'Yes' : 'No'}`);
        }
      });
    } else {
      console.warn('⚠️  Response does not contain topics array');
    }

  } catch (error) {
    console.error(`❌ Test failed with error:`, error.message);
    console.error('Stack:', error.stack);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('🏁 Testing Complete');
  console.log(`${'='.repeat(60)}\n`);
}

// Run the test
testAITopicRecommendations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

