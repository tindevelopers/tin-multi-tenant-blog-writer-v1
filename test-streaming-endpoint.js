// Test the streaming keyword analysis endpoint directly
const BLOG_WRITER_API_URL = process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-613248238610.europe-west9.run.app';

const testStreamingEndpoint = async () => {
  const endpoint = `${BLOG_WRITER_API_URL}/api/v1/keywords/enhanced/stream`;
  
  const requestBody = {
    keywords: ['peticures grooming'],
    location: 'United States',
    language: 'en',
    search_type: 'content_research',
    include_serp: true,
    max_suggestions_per_keyword: 75,
  };

  console.log('🔍 Testing streaming endpoint:', endpoint);
  console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
  console.log('');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      return;
    }

    // Check if response is streaming
    const contentType = response.headers.get('content-type');
    console.log('📋 Content-Type:', contentType);
    console.log('');

    if (!contentType?.includes('text/event-stream') && !contentType?.includes('text/plain')) {
      console.warn('⚠️ Response is not SSE format. Content-Type:', contentType);
      const text = await response.text();
      console.log('📄 Response body:', text.substring(0, 500));
      return;
    }

    // Read the stream
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) {
      console.error('❌ No response body reader available');
      return;
    }

    let buffer = '';
    let eventCount = 0;
    let hasResult = false;
    let hasError = false;
    let lastEvent = null;
    let allEvents = [];

    console.log('📡 Reading stream...\n');

    const startTime = Date.now();
    const maxWaitTime = 120000; // 2 minutes max

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('\n✅ Stream completed');
        console.log(`📊 Total events received: ${eventCount}`);
        console.log(`📊 Has result: ${hasResult}`);
        console.log(`📊 Has error: ${hasError}`);
        console.log(`⏱️  Total time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
        
        if (lastEvent) {
          console.log('\n📋 Last event received:');
          console.log(JSON.stringify(lastEvent, null, 2));
        }
        
        if (!hasResult && !hasError) {
          console.log('\n❌ Stream completed without result or error');
          console.log('💡 Checking if any event contains result data...');
          
          const eventsWithData = allEvents.filter(e => e.enhanced_analysis || e.keyword_analysis || e.result);
          if (eventsWithData.length > 0) {
            console.log(`✅ Found ${eventsWithData.length} events with data`);
            console.log('📋 Sample event with data:', JSON.stringify(eventsWithData[0], null, 2).substring(0, 500));
          } else {
            console.log('❌ No events contain enhanced_analysis, keyword_analysis, or result');
          }
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        
        if (line.startsWith('data: ')) {
          eventCount++;
          const dataStr = line.slice(6);
          
          try {
            const data = JSON.parse(dataStr);
            lastEvent = data;
            allEvents.push(data);
            
            const eventInfo = {
              type: data.type,
              stage: data.stage,
              progress: data.progress_percentage || data.progress,
              hasEnhancedAnalysis: !!data.enhanced_analysis,
              hasKeywordAnalysis: !!data.keyword_analysis,
              hasResult: !!data.result,
              keys: Object.keys(data),
            };
            
            // Only log first few and last few events to avoid spam
            if (eventCount <= 5 || eventCount % 10 === 0) {
              console.log(`\n📨 Event #${eventCount}:`, eventInfo);
            }

            if (data.type === 'result' || data.type === 'complete') {
              hasResult = true;
              console.log(`\n✅ Found result event at #${eventCount}`);
              console.log('📋 Result data keys:', Object.keys(data));
            }
            
            if (data.enhanced_analysis || data.keyword_analysis) {
              hasResult = true;
              console.log(`\n✅ Found analysis data at event #${eventCount}`);
              const analysisKeys = Object.keys(data.enhanced_analysis || data.keyword_analysis || {});
              console.log(`📋 Analysis contains ${analysisKeys.length} keywords`);
            }
            
            if (data.type === 'error') {
              hasError = true;
              console.error(`\n❌ Error event at #${eventCount}:`, data.error);
            }
            
            // Check if progress is 100% - might indicate completion
            if ((data.progress_percentage || data.progress) >= 100) {
              console.log(`\n📊 Progress reached 100% at event #${eventCount}`);
              if (!hasResult) {
                console.log('⚠️ Progress is 100% but no result data found');
                console.log('📋 Event data:', JSON.stringify(data, null, 2).substring(0, 500));
              }
            }
          } catch (e) {
            console.log(`⚠️ Failed to parse event #${eventCount}:`, dataStr.substring(0, 100));
          }
        } else if (line.startsWith('event: ')) {
          console.log(`📌 Event type: ${line.slice(7)}`);
        } else if (line.startsWith('id: ')) {
          console.log(`🆔 Event ID: ${line.slice(4)}`);
        } else {
          console.log(`📝 Raw line: ${line.substring(0, 100)}`);
        }
      }
    }

    if (!hasResult && !hasError) {
      console.error('\n❌ Stream completed without result or error');
      console.log('💡 This indicates the backend API is not sending a final result message');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
};

testStreamingEndpoint();

