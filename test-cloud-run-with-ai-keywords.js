/**
 * Test Cloud Run API with keywords that might have AI search volume
 */

const CLOUD_RUN_URL = 'https://blog-writer-api-dev-613248238610.europe-west9.run.app';

async function testWithAIKeywords() {
  console.log('🧪 Testing Cloud Run with AI-focused Keywords\n');
  console.log(`📍 Cloud Run URL: ${CLOUD_RUN_URL}\n`);

  // Test with keywords that are more likely to have AI search volume
  const testKeywords = [
    'artificial intelligence',
    'machine learning',
    'chatgpt',
    'ai tools',
    'python programming',
    'data science',
    'neural networks',
    'deep learning'
  ];

  console.log('='.repeat(70));
  console.log('Testing AI Optimization with AI-focused Keywords');
  console.log('='.repeat(70));
  console.log('📤 Keywords:', testKeywords.join(', '));
  console.log('\n⏳ Calling /api/v1/keywords/ai-optimization...\n');

  try {
    const startTime = Date.now();
    const response = await fetch(`${CLOUD_RUN_URL}/api/v1/keywords/ai-optimization`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keywords: testKeywords,
        location: 'United States',
        language: 'en'
      }),
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error:`, errorText);
      return;
    }

    const data = await response.json();
    
    console.log('✅ Response Summary:');
    console.log(`  Total keywords: ${data.total_keywords}`);
    console.log(`  Keywords with AI volume: ${data.summary?.keywords_with_ai_volume || 0}`);
    console.log(`  Average AI score: ${data.summary?.average_ai_score || 0}`);
    console.log(`  Recommended keywords: ${data.summary?.recommended_keywords?.length || 0}`);

    console.log(`\n📊 Detailed Analysis:\n`);
    
    if (data.ai_optimization_analysis) {
      const entries = Object.entries(data.ai_optimization_analysis);
      
      // Sort by AI score (highest first)
      entries.sort((a, b) => {
        const scoreA = a[1].ai_optimization_score || 0;
        const scoreB = b[1].ai_optimization_score || 0;
        return scoreB - scoreA;
      });

      entries.forEach(([keyword, analysis]) => {
        const score = analysis.ai_optimization_score || 0;
        const aiVol = analysis.ai_search_volume || 0;
        const tradVol = analysis.traditional_search_volume || 0;
        const recommended = analysis.ai_recommended || false;
        const reason = analysis.ai_reason || 'N/A';

        const scoreIcon = score > 0 ? '✅' : '❌';
        const recIcon = recommended ? '⭐' : '';

        console.log(`${scoreIcon} "${keyword}"`);
        console.log(`   AI Score: ${score}/100 ${recIcon}`);
        console.log(`   AI Search Volume: ${aiVol.toLocaleString()}`);
        console.log(`   Traditional Volume: ${tradVol.toLocaleString()}`);
        console.log(`   Recommended: ${recommended}`);
        console.log(`   Reason: ${reason}`);
        console.log('');
      });

      // Summary statistics
      const keywordsWithScore = entries.filter(([_, analysis]) => (analysis.ai_optimization_score || 0) > 0);
      const keywordsWithZero = entries.filter(([_, analysis]) => (analysis.ai_optimization_score || 0) === 0);
      const avgScore = entries.reduce((sum, [_, analysis]) => sum + (analysis.ai_optimization_score || 0), 0) / entries.length;

      console.log('='.repeat(70));
      console.log('📈 Summary Statistics:');
      console.log('='.repeat(70));
      console.log(`Total keywords tested: ${entries.length}`);
      console.log(`Keywords with AI score > 0: ${keywordsWithScore.length} (${((keywordsWithScore.length / entries.length) * 100).toFixed(1)}%)`);
      console.log(`Keywords with AI score = 0: ${keywordsWithZero.length} (${((keywordsWithZero.length / entries.length) * 100).toFixed(1)}%)`);
      console.log(`Average AI score: ${avgScore.toFixed(2)}/100`);
      console.log(`Highest score: ${Math.max(...entries.map(([_, a]) => a.ai_optimization_score || 0))}/100`);
      console.log(`Lowest score: ${Math.min(...entries.map(([_, a]) => a.ai_optimization_score || 0))}/100`);

      if (keywordsWithScore.length > 0) {
        console.log(`\n✅ Keywords with AI visibility:`);
        keywordsWithScore.forEach(([keyword, analysis]) => {
          console.log(`   - "${keyword}" (score: ${analysis.ai_optimization_score}/100)`);
        });
      }

      if (keywordsWithZero.length > 0) {
        console.log(`\n❌ Keywords without AI visibility:`);
        keywordsWithZero.slice(0, 5).forEach(([keyword]) => {
          console.log(`   - "${keyword}"`);
        });
        if (keywordsWithZero.length > 5) {
          console.log(`   ... and ${keywordsWithZero.length - 5} more`);
        }
      }
    }

  } catch (error) {
    console.error(`❌ Test failed:`, error.message);
    console.error('Stack:', error.stack);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('🏁 Test Complete');
  console.log(`${'='.repeat(70)}\n`);
}

testWithAIKeywords().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

