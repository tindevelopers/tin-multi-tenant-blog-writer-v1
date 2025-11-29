/**
 * Test script to check AI optimization endpoint response structure
 */

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testAIOptimizationResponse() {
  console.log('🧪 Testing AI Optimization Response Structure\n');
  console.log(`📍 API URL: ${API_URL}\n`);

  const testKeywords = ['pet grooming', 'dog grooming', 'pet care'];

  console.log(`📤 Request payload:`, JSON.stringify({ keywords: testKeywords }, null, 2));
  console.log('\n⏳ Calling endpoint...\n');

  try {
    const response = await fetch(`${API_URL}/api/keywords/ai-optimization`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keywords: testKeywords,
        location: 'United States',
        language: 'en',
      }),
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error Response:`, errorText);
      return;
    }

    const data = await response.json();
    console.log('\n✅ Response Structure:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n📋 Response Keys:', Object.keys(data));
    
    if (data.ai_optimization_analysis) {
      console.log('\n🔍 AI Optimization Analysis Structure:');
      const firstKey = Object.keys(data.ai_optimization_analysis)[0];
      if (firstKey) {
        console.log(`First keyword: ${firstKey}`);
        console.log('Analysis structure:', JSON.stringify(data.ai_optimization_analysis[firstKey], null, 2));
      }
    } else {
      console.log('\n⚠️  No ai_optimization_analysis field found');
      console.log('Available fields:', Object.keys(data));
    }

  } catch (error) {
    console.error(`❌ Test failed:`, error.message);
  }
}

testAIOptimizationResponse().catch(console.error);

