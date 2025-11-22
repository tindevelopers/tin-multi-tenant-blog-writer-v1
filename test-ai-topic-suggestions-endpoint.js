/**
 * Test the new AI Topic Suggestions endpoint directly
 */

const CLOUD_RUN_URL = 'https://blog-writer-api-dev-613248238610.europe-west9.run.app';

async function testAITopicSuggestions() {
  console.log('🧪 Testing AI Topic Suggestions Endpoint\n');
  console.log(`📍 Cloud Run URL: ${CLOUD_RUN_URL}\n`);

  const testPayload = {
    content_objective: 'I want to create blogs that rank for Pet Groomers that are looking for new clients',
    target_audience: 'Pet groomers looking for new clients',
    industry: 'Pet Grooming',
    content_goals: ['SEO & Rankings', 'Engagement'],
    limit: 10,
    include_ai_search_volume: true,
    include_llm_mentions: true,
  };

  console.log('='.repeat(70));
  console.log('Testing AI Topic Suggestions Endpoint');
  console.log('='.repeat(70));
  console.log('📤 Payload:', JSON.stringify(testPayload, null, 2));
  console.log('\n⏳ Calling /api/v1/keywords/ai-topic-suggestions...\n');

  try {
    const startTime = Date.now();
    const response = await fetch(`${CLOUD_RUN_URL}/api/v1/keywords/ai-topic-suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error Response:`, errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ AI Topic Suggestions Response:');
    console.log(JSON.stringify(data, null, 2));

    if (data.topics && Array.isArray(data.topics)) {
      console.log(`\n📝 Topics Returned: ${data.topics.length}\n`);

      data.topics.forEach((topic, index) => {
        console.log(`${'─'.repeat(60)}`);
        console.log(`Topic ${index + 1}: ${topic.topic || topic.title || 'N/A'}`);
        console.log(`${'─'.repeat(60)}`);
        console.log(`Source Keyword: ${topic.source_keyword || 'N/A'}`);
        console.log(`AI Search Volume: ${topic.ai_search_volume ?? 0}`);
        console.log(`Search Volume: ${topic.search_volume ?? 0}`);
        console.log(`Difficulty: ${topic.difficulty ?? 'N/A'}`);
        console.log(`Competition: ${topic.competition ?? 'N/A'}`);
        console.log(`CPC: ${topic.cpc ?? 'N/A'}`);
        console.log(`Ranking Score: ${topic.ranking_score ?? 'N/A'}`);
        console.log(`Opportunity Score: ${topic.opportunity_score ?? 'N/A'}`);
        console.log(`Estimated Traffic: ${topic.estimated_traffic ?? 'N/A'}`);
        console.log(`Reason: ${topic.reason || 'N/A'}`);
        console.log(`Related Keywords: ${topic.related_keywords ? topic.related_keywords.join(', ') : 'N/A'}`);
        console.log(`Source: ${topic.source || 'N/A'}`);
        console.log(`Mentions: ${topic.mentions ?? 0}`);
        console.log('');
      });

      // Analyze scores
      const topicsWithScores = data.topics.filter(t => 
        (t.ranking_score && t.ranking_score > 0) || 
        (t.opportunity_score && t.opportunity_score > 0) ||
        (t.ai_search_volume && t.ai_search_volume > 0)
      );
      const topicsWithZeroScores = data.topics.filter(t => 
        (!t.ranking_score || t.ranking_score === 0) && 
        (!t.opportunity_score || t.opportunity_score === 0) &&
        (!t.ai_search_volume || t.ai_search_volume === 0)
      );

      console.log('='.repeat(70));
      console.log('📊 Analysis:');
      console.log('='.repeat(70));
      console.log(`Total topics: ${data.topics.length}`);
      console.log(`Topics with scores > 0: ${topicsWithScores.length}`);
      console.log(`Topics with scores = 0: ${topicsWithZeroScores.length}`);
      
      if (topicsWithScores.length > 0) {
        console.log(`\n✅ Topics with AI visibility:`);
        topicsWithScores.forEach(t => {
          console.log(`  - "${t.topic || t.title}" (ranking: ${t.ranking_score || 0}, opportunity: ${t.opportunity_score || 0}, AI vol: ${t.ai_search_volume || 0})`);
        });
      }

      if (topicsWithZeroScores.length > 0) {
        console.log(`\n⚠️  Topics without AI visibility:`);
        topicsWithZeroScores.slice(0, 5).forEach(t => {
          console.log(`  - "${t.topic || t.title}" (all scores = 0)`);
        });
        if (topicsWithZeroScores.length > 5) {
          console.log(`  ... and ${topicsWithZeroScores.length - 5} more`);
        }
      }
    } else {
      console.log('\n⚠️  Response does not contain topics array');
      console.log(`Available keys: ${Object.keys(data).join(', ')}`);
    }

  } catch (error) {
    console.error(`❌ Test failed:`, error.message);
    console.error('Stack:', error.stack);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('🏁 Test Complete');
  console.log(`${'='.repeat(70)}\n`);
}

testAITopicSuggestions().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

