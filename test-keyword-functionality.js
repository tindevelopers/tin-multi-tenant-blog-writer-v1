/**
 * Test Keyword Functionality
 * Tests the keyword research endpoints integrated with v1.3.4 API
 */

// Use deployed Vercel URL for testing
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://tin-multi-tenant-blog-writer-v1-nigx9nw67-tindeveloper.vercel.app';
const BACKEND_API_URL = process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-613248238610.europe-west9.run.app';

async function testKeywordEndpoints() {
  console.log('🧪 Testing Keyword Functionality\n');
  console.log('Frontend API:', API_BASE_URL);
  console.log('Backend API:', BACKEND_API_URL);
  console.log('─'.repeat(60));

  const testKeyword = 'digital marketing';
  
  // Test 1: Keyword Suggestions
  console.log('\n📋 Test 1: Keyword Suggestions');
  console.log('─'.repeat(60));
  try {
    const suggestResponse = await fetch(`${API_BASE_URL}/api/keywords/suggest?keyword=${encodeURIComponent(testKeyword)}&limit=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Status:', suggestResponse.status);
    
    if (suggestResponse.ok) {
      const data = await suggestResponse.json();
      console.log('✅ Success!');
      console.log('Response keys:', Object.keys(data));
      console.log('Suggestions count:', Array.isArray(data.suggestions) ? data.suggestions.length : 'N/A');
      
      if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        console.log('\nSample suggestion:');
        console.log(JSON.stringify(data.suggestions[0], null, 2));
      }
    } else {
      const errorText = await suggestResponse.text();
      console.log('❌ Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Exception:', error.message);
  }

  // Test 2: Keyword Analysis (Enhanced)
  console.log('\n\n🔍 Test 2: Keyword Analysis (Enhanced)');
  console.log('─'.repeat(60));
  try {
    const analyzeResponse = await fetch(`${API_BASE_URL}/api/keywords/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keywords: [testKeyword],
        location: 'United States',
        language: 'en',
        search_type: 'quick_analysis',
        serp_depth: 10,
        related_keywords_limit: 10,
        keyword_ideas_limit: 10,
      }),
    });

    console.log('Status:', analyzeResponse.status);
    
    if (analyzeResponse.ok) {
      const data = await analyzeResponse.json();
      console.log('✅ Success!');
      console.log('Response keys:', Object.keys(data));
      
      if (data.keywords && Array.isArray(data.keywords) && data.keywords.length > 0) {
        const keyword = data.keywords[0];
        console.log('\nSample keyword analysis:');
        console.log('Keyword:', keyword.keyword);
        console.log('Search Volume:', keyword.search_volume);
        console.log('Global Search Volume:', keyword.global_search_volume);
        console.log('Trend Score:', keyword.trend_score);
        console.log('Competition:', keyword.competition);
        console.log('CPC:', keyword.cpc);
        console.log('Has Related Keywords:', !!keyword.related_keywords_enhanced);
        console.log('Has Questions:', !!keyword.questions);
        console.log('Has Topics:', !!keyword.topics);
        
        if (keyword.related_keywords_enhanced && keyword.related_keywords_enhanced.length > 0) {
          console.log('\nSample related keyword:');
          console.log(JSON.stringify(keyword.related_keywords_enhanced[0], null, 2));
        }
      } else {
        console.log('Response data:', JSON.stringify(data, null, 2));
      }
    } else {
      const errorText = await analyzeResponse.text();
      console.log('❌ Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Exception:', error.message);
  }

  // Test 3: Backend Health Check
  console.log('\n\n🏥 Test 3: Backend Health Check');
  console.log('─'.repeat(60));
  try {
    const healthResponse = await fetch(`${BACKEND_API_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log('Status:', healthResponse.status);
    
    if (healthResponse.ok) {
      const data = await healthResponse.json();
      console.log('✅ Backend is healthy!');
      console.log('Version:', data.version || 'N/A');
      console.log('Status:', data.status || 'N/A');
    } else {
      const errorText = await healthResponse.text();
      console.log('⚠️ Backend health check failed:', errorText);
    }
  } catch (error) {
    console.log('❌ Exception:', error.message);
    console.log('⚠️ Backend may be cold-starting or unavailable');
  }

  console.log('\n' + '─'.repeat(60));
  console.log('✅ Testing complete!');
}

// Run tests
testKeywordEndpoints().catch(console.error);

