/**
 * Browser-based test for SSE Keyword Research Endpoint
 * Run this in the browser console while logged in
 */

async function testSSEKeywordResearch() {
  console.log('🧪 Testing SSE Keyword Research Endpoint\n');
  console.log('Endpoint: POST /api/keywords/research/stream\n');

  try {
    const response = await fetch('/api/keywords/research/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keyword: 'pet grooming',
        location: 'United States',
        language: 'en',
        searchType: 'traditional',
        useCache: true,
        autoStore: true,
      }),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error Response:');
      console.error(errorText);
      return;
    }

    if (!response.body) {
      console.error('❌ No response body');
      return;
    }

    console.log('📡 Streaming events:\n');
    console.log('─'.repeat(80));

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let eventCount = 0;
    let finalResult = null;

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('\n─'.repeat(80));
        console.log(`\n✅ Stream completed. Total events: ${eventCount}`);
        if (finalResult) {
          console.log('\n📊 Final Result Summary:');
          console.log(`  Keyword: ${finalResult.keyword}`);
          console.log(`  Source: ${finalResult.source}`);
          console.log(`  Cached: ${finalResult.cached ? 'Yes' : 'No'}`);
          console.log(`  Traditional Data: ${finalResult.traditionalData ? 'Yes' : 'No'}`);
          console.log(`  AI Data: ${finalResult.aiData ? 'Yes' : 'No'}`);
          console.log(`  Related Terms: ${finalResult.relatedTerms?.length || 0}`);
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          eventCount++;
          const data = line.slice(6);
          
          if (data.trim() === '') {
            continue; // Skip heartbeat
          }

          try {
            const event = JSON.parse(data);
            const timestamp = new Date().toLocaleTimeString();
            
            console.log(`\n[${timestamp}] Event #${eventCount}:`);
            console.log(`  Type: ${event.type || 'unknown'}`);
            
            if (event.type === 'progress') {
              console.log(`  Stage: ${event.stage || 'N/A'}`);
              console.log(`  Progress: ${event.progress || 0}%`);
              console.log(`  Message: ${event.message || 'N/A'}`);
            } else if (event.type === 'complete') {
              console.log(`  ✅ Research Complete!`);
              console.log(`  Keyword: ${event.keyword || 'N/A'}`);
              console.log(`  Source: ${event.source || 'N/A'}`);
              console.log(`  Cached: ${event.cached ? 'Yes' : 'No'}`);
              console.log(`  Has Traditional Data: ${!!event.traditionalData}`);
              console.log(`  Has AI Data: ${!!event.aiData}`);
              console.log(`  Related Terms: ${event.relatedTerms?.length || 0}`);
              console.log(`  Matching Terms: ${event.matchingTerms?.length || 0}`);
              
              if (event.traditionalData) {
                console.log(`\n  Traditional Data Details:`);
                console.log(`    Search Volume: ${event.traditionalData.search_volume || 0}`);
                console.log(`    Difficulty: ${event.traditionalData.keyword_difficulty || 0}`);
                console.log(`    Competition: ${event.traditionalData.competition || 0}`);
                console.log(`    CPC: $${event.traditionalData.cpc || 0}`);
              }
              
              finalResult = event;
            } else if (event.type === 'error') {
              console.log(`  ❌ Error: ${event.error || 'Unknown error'}`);
            } else {
              console.log(`  Data:`, JSON.stringify(event, null, 2).substring(0, 300));
            }
          } catch (parseError) {
            console.log(`  ⚠️  Failed to parse: ${data.substring(0, 100)}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(error instanceof Error ? error.message : String(error));
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testSSEKeywordResearch = testSSEKeywordResearch;
  console.log('✅ Test function loaded! Run: testSSEKeywordResearch()');
}

// For Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testSSEKeywordResearch };
}

