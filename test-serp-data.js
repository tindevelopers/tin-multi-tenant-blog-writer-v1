// Test to see what SERP data is in the response
const BLOG_WRITER_API_URL = process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-613248238610.europe-west9.run.app';

const testSerpData = async () => {
  const endpoint = `${BLOG_WRITER_API_URL}/api/v1/keywords/enhanced/stream`;
  
  const requestBody = {
    keywords: ['Pet Grooming Miami'],
    location: 'United States',
    language: 'en',
    search_type: 'content_research',
    include_serp: true,
    max_suggestions_per_keyword: 75,
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) {
      console.error('❌ No response body reader available');
      return;
    }

    let buffer = '';
    let completedEvent = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.stage === 'completed' && data.data?.result) {
              completedEvent = data.data.result;
            }
          } catch (e) {
            // Skip parse errors
          }
        }
      }
    }

    if (completedEvent) {
      console.log('\n📊 RESPONSE STRUCTURE:');
      console.log('='.repeat(60));
      console.log('\nTop-level keys:', Object.keys(completedEvent));
      
      if (completedEvent.serp_analysis) {
        console.log('\n✅ SERP Analysis found!');
        console.log('Keys:', Object.keys(completedEvent.serp_analysis));
        
        // Check first keyword's SERP data
        const firstKeyword = Object.keys(completedEvent.enhanced_analysis || {})[0];
        if (firstKeyword && completedEvent.serp_analysis[firstKeyword]) {
          const serpData = completedEvent.serp_analysis[firstKeyword];
          console.log('\n📋 SERP Data for "' + firstKeyword + '":');
          console.log('Keys:', Object.keys(serpData));
          console.log('\nFull SERP data structure:');
          console.log(JSON.stringify(serpData, null, 2).substring(0, 2000));
        }
      } else {
        console.log('\n❌ No serp_analysis found');
      }
      
      if (completedEvent.discovery) {
        console.log('\n✅ Discovery found!');
        console.log('Keys:', Object.keys(completedEvent.discovery));
        console.log('\nDiscovery structure:');
        console.log(JSON.stringify(completedEvent.discovery, null, 2).substring(0, 1000));
      } else {
        console.log('\n❌ No discovery found');
      }
      
      // Check enhanced_analysis for SERP data
      const firstKeyword = Object.keys(completedEvent.enhanced_analysis || {})[0];
      if (firstKeyword) {
        const kwData = completedEvent.enhanced_analysis[firstKeyword];
        console.log('\n📋 Enhanced Analysis for "' + firstKeyword + '":');
        console.log('Keys:', Object.keys(kwData));
        
        if (kwData.serp_features) {
          console.log('\n✅ SERP Features:', kwData.serp_features);
        }
        if (kwData.people_also_ask) {
          console.log('\n✅ People Also Ask:', kwData.people_also_ask);
        }
        if (kwData.questions) {
          console.log('\n✅ Questions:', kwData.questions?.length || 0);
        }
        if (kwData.topics) {
          console.log('\n✅ Topics:', kwData.topics?.length || 0);
        }
        if (kwData.long_tail_keywords) {
          console.log('\n✅ Long Tail Keywords:', kwData.long_tail_keywords?.length || 0);
        }
      }
    } else {
      console.log('❌ No completed event found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
};

testSerpData();

