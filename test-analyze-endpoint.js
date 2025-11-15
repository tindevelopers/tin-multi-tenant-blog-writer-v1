const BLOG_WRITER_API_URL = process.env.BLOG_WRITER_API_URL || 
  'https://blog-writer-api-dev-613248238610.europe-west1.run.app';

async function testAnalyzeEndpoint() {
  console.log('Testing /api/v1/keywords/analyze endpoint...\n');
  
  const requestBody = {
    keywords: ["best blow dryers"],
    location: "United States",
    language: "en",
    include_search_volume: true
  };
  
  console.log('Request:', JSON.stringify(requestBody, null, 2));
  
  try {
    const response = await fetch(`${BLOG_WRITER_API_URL}/api/v1/keywords/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    
    console.log(`\nStatus: ${response.status} ${response.statusText}`);
    const data = await response.json();
    
    console.log('\nResponse keys:', Object.keys(data));
    
    if (data.keyword_analysis || data.enhanced_analysis) {
      const analysis = data.keyword_analysis || data.enhanced_analysis;
      const firstKey = Object.keys(analysis)[0];
      const firstAnalysis = analysis[firstKey];
      
      console.log('\nFirst keyword analysis:');
      console.log('Fields:', Object.keys(firstAnalysis));
      console.log('\nFull object:', JSON.stringify(firstAnalysis, null, 2).substring(0, 800));
    } else {
      console.log('\nFull response:', JSON.stringify(data, null, 2).substring(0, 1000));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAnalyzeEndpoint();
