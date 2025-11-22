/**
 * Test script for AI-powered topic recommendations endpoint
 * Run with: node test-topic-recommendations-ai.js
 */

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testTopicRecommendationsAI() {
  console.log('🧪 Testing AI-Powered Topic Recommendations Endpoint\n');
  console.log(`📍 API URL: ${API_URL}\n`);

  const testCases = [
    {
      name: 'Test 1: With Industry and Objective',
      payload: {
        industry: 'Pet Grooming',
        objective: 'I want to create blogs that rank for Pet Groomers that are looking for new clients',
        target_audience: 'Pet groomers looking for new clients',
        content_goal: 'seo',
        count: 5
      }
    },
    {
      name: 'Test 2: With Keywords Only',
      payload: {
        keywords: ['dog grooming', 'pet care', 'pet grooming services'],
        count: 5
      }
    },
    {
      name: 'Test 3: With Industry Only',
      payload: {
        industry: 'Digital Marketing',
        target_audience: 'Small business owners',
        count: 5
      }
    },
    {
      name: 'Test 4: With Objective Only',
      payload: {
        objective: 'Create content about plumbers in Miami',
        count: 5
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 ${testCase.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log('📤 Request payload:', JSON.stringify(testCase.payload, null, 2));
    console.log('\n⏳ Calling endpoint...\n');

    try {
      const startTime = Date.now();
      
      const response = await fetch(`${API_URL}/api/blog-writer/topics/recommend-ai`, {
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
        continue;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ Failed to parse JSON response:', responseText);
        continue;
      }

      console.log('\n✅ Success! Response received:');
      console.log(JSON.stringify(data, null, 2));

      if (data.topics && Array.isArray(data.topics)) {
        console.log(`\n📝 Topics Generated: ${data.topics.length}`);
        data.topics.forEach((topic, index) => {
          console.log(`\n  Topic ${index + 1}:`);
          console.log(`    Title: ${topic.title || 'N/A'}`);
          console.log(`    Description: ${topic.description || 'N/A'}`);
          console.log(`    Keywords: ${topic.keywords ? topic.keywords.join(', ') : 'N/A'}`);
          console.log(`    Search Volume: ${topic.search_volume || 'N/A'}`);
          console.log(`    Difficulty: ${topic.difficulty || 'N/A'}`);
          console.log(`    Estimated Traffic: ${topic.estimated_traffic || 'N/A'}`);
        });
      } else {
        console.warn('⚠️  Response does not contain topics array');
      }

    } catch (error) {
      console.error(`❌ Test failed with error:`, error.message);
      console.error('Stack:', error.stack);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('🏁 Testing Complete');
  console.log(`${'='.repeat(60)}\n`);
}

// Run the tests
testTopicRecommendationsAI().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

