/**
 * Mock test to verify AI optimization response parsing
 * Tests our parsing logic with a mock response structure
 */

// Mock response based on documentation
const mockAIOptimizationResponse = {
  ai_optimization_analysis: {
    "pet grooming": {
      ai_search_volume: 1200,
      traditional_search_volume: 201000,
      ai_trend: 15.5,
      ai_monthly_searches: [
        { year: 2024, month: 1, search_volume: 1000 },
        { year: 2024, month: 2, search_volume: 1200 }
      ],
      ai_optimization_score: 75, // This is the key field
      ai_recommended: true,
      ai_reason: "High AI visibility with growing trend",
      comparison: {
        ai_to_traditional_ratio: 0.006,
        ai_growth_trend: "increasing"
      }
    },
    "dog grooming": {
      ai_search_volume: 800,
      traditional_search_volume: 165000,
      ai_trend: 12.3,
      ai_monthly_searches: [],
      ai_optimization_score: 65,
      ai_recommended: true,
      ai_reason: "Moderate AI visibility",
      comparison: {
        ai_to_traditional_ratio: 0.005,
        ai_growth_trend: "stable"
      }
    },
    "pet care": {
      ai_search_volume: 0,
      traditional_search_volume: 45000,
      ai_trend: 0,
      ai_monthly_searches: [],
      ai_optimization_score: 0, // This would show as 0/100
      ai_recommended: false,
      ai_reason: "Low AI visibility - focus on traditional SEO",
      comparison: {
        ai_to_traditional_ratio: 0,
        ai_growth_trend: "stable"
      }
    }
  },
  total_keywords: 3,
  location: "United States",
  language: "en",
  summary: {
    keywords_with_ai_volume: 2,
    average_ai_score: 46.67,
    recommended_keywords: ["pet grooming", "dog grooming"]
  }
};

// Test our parsing logic
function testParsingLogic(mockResponse) {
  console.log('🧪 Testing AI Optimization Response Parsing Logic\n');
  console.log('='.repeat(70));
  
  const aiData = mockResponse;
  
  if (!aiData || !aiData.ai_optimization_analysis) {
    console.error('❌ Response missing ai_optimization_analysis');
    return;
  }
  
  console.log('✅ Response structure valid\n');
  
  // Transform AI optimization response to topic recommendations format
  const topics = Object.entries(aiData.ai_optimization_analysis || {})
    .map(([keyword, analysis]) => {
      // Extract values with fallbacks
      const aiScore = analysis.ai_optimization_score ?? analysis.aiOptimizationScore ?? 0;
      const aiSearchVol = analysis.ai_search_volume ?? analysis.aiSearchVolume ?? 0;
      const traditionalSearchVol = analysis.traditional_search_volume ?? analysis.traditionalSearchVolume ?? 0;
      const isRecommended = analysis.ai_recommended ?? analysis.aiRecommended ?? false;
      const reason = analysis.ai_reason ?? analysis.aiReason ?? 'AI-optimized topic';
      const growthTrend = analysis.comparison?.ai_growth_trend ?? 'stable';

      // Determine difficulty based on AI score
      const difficulty = aiScore >= 70 ? 'easy' :
                        aiScore >= 50 ? 'medium' : 'hard';

      // Create content angle based on AI reason and trend
      const contentAngle = growthTrend === 'increasing' 
        ? `High AI visibility - ${reason}`
        : isRecommended 
          ? `AI-optimized topic - ${reason}`
          : 'General content topic';

      // Format keyword as title (capitalize first letter of each word)
      const title = keyword
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      return {
        title,
        description: `AI-optimized topic about ${keyword}. ${reason}`,
        keywords: [keyword],
        search_volume: traditionalSearchVol || aiSearchVol,
        difficulty,
        content_angle: contentAngle,
        estimated_traffic: Math.floor((aiSearchVol || traditionalSearchVol) * 0.1),
        aiScore: aiScore,
        aiSearchVolume: aiSearchVol,
        traditionalSearchVolume: traditionalSearchVol,
        recommended: isRecommended,
      };
    })
    .sort((a, b) => {
      // Sort by recommended first, then by AI score
      if (a.recommended !== b.recommended) {
        return a.recommended ? -1 : 1;
      }
      return (b.aiScore || 0) - (a.aiScore || 0);
    });

  console.log('📊 Parsed Topics:\n');
  topics.forEach((topic, index) => {
    console.log(`${index + 1}. ${topic.title}`);
    console.log(`   AI Score: ${topic.aiScore}/100 ${topic.aiScore === 0 ? '⚠️ (This is why you see 0/100!)' : '✅'}`);
    console.log(`   AI Search Volume: ${topic.aiSearchVolume}`);
    console.log(`   Traditional Volume: ${topic.traditionalSearchVolume}`);
    console.log(`   Recommended: ${topic.recommended ? 'Yes ⭐' : 'No'}`);
    console.log(`   Reason: ${topic.description.split('. ')[1] || 'N/A'}`);
    console.log('');
  });

  console.log('='.repeat(70));
  console.log('💡 Key Findings:');
  console.log('='.repeat(70));
  console.log('1. If ai_optimization_score is 0 in the response, it will show as 0/100');
  console.log('2. Keywords with 0 AI search volume typically have 0 optimization score');
  console.log('3. The parsing logic correctly extracts ai_optimization_score field');
  console.log('4. Keywords are preserved as phrases (not split)');
  console.log('\n🔍 To fix 0/100 scores:');
  console.log('   - Check if Cloud Run endpoint returns valid ai_optimization_score values');
  console.log('   - Verify keywords have AI search volume > 0');
  console.log('   - Check if response structure matches expected format');
}

// Run the test
testParsingLogic(mockAIOptimizationResponse);

