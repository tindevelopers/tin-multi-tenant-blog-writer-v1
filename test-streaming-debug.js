// Test the streaming keyword analysis endpoint to see actual format
const BLOG_WRITER_API_URL = process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-613248238610.europe-west9.run.app';

const testStreamingEndpoint = async () => {
  const endpoint = `${BLOG_WRITER_API_URL}/api/v1/keywords/enhanced/stream`;
  
  const requestBody = {
    keywords: ['Pet Grooming Miami'],
    location: 'United States',
    language: 'en',
    search_type: 'content_research',
    include_serp: true,
    max_suggestions_per_keyword: 75,
  };

  console.log('🔍 Testing streaming endpoint:', endpoint);
  console.log('📤 Request:', JSON.stringify(requestBody, null, 2));
  console.log('');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) {
      console.error('❌ No response body reader available');
      return;
    }

    let buffer = '';
    let eventCount = 0;
    let lastEvent = null;
    let completedEvent = null;
    let allEvents = [];

    console.log('📡 Reading stream...\n');

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('\n✅ Stream completed');
        console.log(`📊 Total events received: ${eventCount}`);
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
            
            // Track completed event
            if (data.stage === 'completed') {
              completedEvent = data;
              console.log(`\n🎯 FOUND COMPLETED EVENT #${eventCount}:`);
              console.log(JSON.stringify(data, null, 2));
            }
            
            // Log structure of events with progress >= 90
            const progress = data.progress_percentage || data.progress || 0;
            if (progress >= 90 || eventCount <= 3) {
              console.log(`\n📨 Event #${eventCount} (progress: ${progress}%):`);
              console.log('  Stage:', data.stage);
              console.log('  Has data:', !!data.data);
              console.log('  Has data.result:', !!data.data?.result);
              console.log('  Has data.enhanced_analysis:', !!data.data?.enhanced_analysis);
              console.log('  Has enhanced_analysis:', !!data.enhanced_analysis);
              console.log('  Keys:', Object.keys(data));
              if (data.data) {
                console.log('  data keys:', Object.keys(data.data));
                if (data.data.result) {
                  console.log('  data.result keys:', Object.keys(data.data.result));
                }
              }
            }
          } catch (e) {
            console.log(`⚠️ Failed to parse event #${eventCount}:`, dataStr.substring(0, 200));
          }
        }
      }
    }

    console.log('\n\n📋 FINAL ANALYSIS:');
    console.log('='.repeat(60));
    
    if (completedEvent) {
      console.log('\n✅ Completed event found:');
      console.log('  Stage:', completedEvent.stage);
      console.log('  Progress:', completedEvent.progress);
      console.log('  Has data:', !!completedEvent.data);
      console.log('  Has data.result:', !!completedEvent.data?.result);
      console.log('  Has data.enhanced_analysis:', !!completedEvent.data?.enhanced_analysis);
      console.log('  Has enhanced_analysis:', !!completedEvent.enhanced_analysis);
      
      if (completedEvent.data) {
        console.log('\n  data object keys:', Object.keys(completedEvent.data));
        if (completedEvent.data.result) {
          console.log('  ✅ data.result exists!');
          console.log('  data.result keys:', Object.keys(completedEvent.data.result));
          if (completedEvent.data.result.enhanced_analysis) {
            console.log('  ✅ data.result.enhanced_analysis exists!');
            const keywords = Object.keys(completedEvent.data.result.enhanced_analysis);
            console.log('  Keywords found:', keywords.length);
          }
        } else {
          console.log('  ❌ data.result does NOT exist');
        }
      } else {
        console.log('  ❌ data object does NOT exist');
      }
      
      console.log('\n📄 Full completed event structure:');
      console.log(JSON.stringify(completedEvent, null, 2).substring(0, 2000));
    } else {
      console.log('\n❌ No completed event found');
      console.log('Last event structure:');
      if (lastEvent) {
        console.log(JSON.stringify(lastEvent, null, 2).substring(0, 1000));
      }
    }
    
    // Check all events for result data
    const eventsWithResult = allEvents.filter(e => 
      e.data?.result || 
      e.data?.enhanced_analysis || 
      e.enhanced_analysis ||
      e.data?.result?.enhanced_analysis
    );
    
    console.log(`\n📊 Events with result data: ${eventsWithResult.length} out of ${eventCount}`);
    if (eventsWithResult.length > 0) {
      console.log('✅ Found events with result data!');
      eventsWithResult.forEach((e, idx) => {
        console.log(`\n  Event ${idx + 1}:`);
        console.log('    Has data.result:', !!e.data?.result);
        console.log('    Has data.enhanced_analysis:', !!e.data?.enhanced_analysis);
        console.log('    Has enhanced_analysis:', !!e.enhanced_analysis);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
};

testStreamingEndpoint();

