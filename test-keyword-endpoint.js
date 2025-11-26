/**
 * Test script to check keyword analysis endpoint
 * Run with: node test-keyword-endpoint.js
 */

const testKeywordAnalysis = async () => {
  const testData = {
    keywords: ["dog grooming suppliers"],
    include_search_volume: true,
    location: "United States",
    language: "en",
    max_suggestions_per_keyword: 5
  };

  console.log('🧪 Testing keyword analysis endpoint...');
  console.log('Request:', testData);

  try {
    const response = await fetch('http://localhost:3000/api/keywords/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log('\n📊 Response Status:', response.status, response.statusText);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.log('\n❌ Error Response:', errorText.substring(0, 500));
      return;
    }

    const data = await response.json();
    
    console.log('\n✅ Response received!');
    console.log('\n📋 Response Structure:');
    console.log('- Has enhanced_analysis:', !!data.enhanced_analysis);
    console.log('- Has keyword_analysis:', !!data.keyword_analysis);
    console.log('- Total keywords:', Object.keys(data.enhanced_analysis || data.keyword_analysis || {}).length);
    
    // Check search volume for primary keyword
    const analysis = data.enhanced_analysis || data.keyword_analysis || {};
    const primaryKeyword = 'dog grooming suppliers';
    const keywordData = analysis[primaryKeyword.toLowerCase()] || analysis[primaryKeyword];
    
    if (keywordData) {
      console.log('\n🔍 Primary Keyword Analysis:');
      console.log('- Keyword:', primaryKeyword);
      console.log('- Search Volume:', keywordData.search_volume !== undefined ? keywordData.search_volume : 'NOT FOUND');
      console.log('- Has search_volume field:', 'search_volume' in keywordData);
      console.log('- Keyword Data Keys:', Object.keys(keywordData));
      console.log('- Full Keyword Data:', JSON.stringify(keywordData, null, 2));
    } else {
      console.log('\n⚠️ Primary keyword not found in analysis');
      console.log('Available keywords:', Object.keys(analysis).slice(0, 10));
    }

    // Check first few keywords for search volume
    console.log('\n📊 Sample Keywords with Search Volume:');
    const sampleKeywords = Object.entries(analysis).slice(0, 5);
    sampleKeywords.forEach(([kw, data]) => {
      const searchVolume = data?.search_volume ?? 'NOT FOUND';
      console.log(`- "${kw}": search_volume = ${searchVolume}`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
};

testKeywordAnalysis();

