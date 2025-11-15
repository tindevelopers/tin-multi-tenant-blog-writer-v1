#!/usr/bin/env node

/**
 * Test script to verify Blog Writer API returns search volume and CPC data
 */

const BLOG_WRITER_API_URL = process.env.BLOG_WRITER_API_URL || 
  'https://blog-writer-api-dev-613248238610.europe-west1.run.app';

const testKeyword = process.argv[2] || 'best blow dryers for dogs';

async function testKeywordAPI() {
  console.log('🧪 Testing Blog Writer API Keyword Suggestions Endpoint\n');
  console.log(`API URL: ${BLOG_WRITER_API_URL}`);
  console.log(`Test Keyword: "${testKeyword}"\n`);
  console.log('─'.repeat(60));

  const requestBody = {
    keyword: testKeyword,
    limit: 10, // Small limit for testing
    include_search_volume: true,
    include_difficulty: true,
    include_competition: true,
    include_cpc: true,
    location: 'United States'
  };

  console.log('\n📤 Request Body:');
  console.log(JSON.stringify(requestBody, null, 2));
  console.log('\n─'.repeat(60));

  try {
    const startTime = Date.now();
    const response = await fetch(`${BLOG_WRITER_API_URL}/api/v1/keywords/suggest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseTime = Date.now() - startTime;
    console.log(`\n⏱️  Response Time: ${responseTime}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('\n❌ API Error Response:');
      console.error(errorText);
      return;
    }

    const data = await response.json();
    
    console.log('\n✅ API Response Structure:');
    console.log('─'.repeat(60));
    console.log('Top-level keys:', Object.keys(data));
    
    // Check for keyword suggestions - handle both array and object formats
    let suggestions = data.keyword_suggestions || data.suggestions || [];
    
    // If suggestions is an object with numeric keys, convert to array
    if (typeof suggestions === 'object' && !Array.isArray(suggestions)) {
      suggestions = Object.values(suggestions);
    }
    
    console.log(`\n📝 Number of suggestions: ${suggestions.length}`);
    console.log(`📝 Suggestions type: ${Array.isArray(suggestions) ? 'Array' : typeof suggestions}`);
    
    if (suggestions.length > 0) {
      console.log('\n🔍 Analyzing First 3 Suggestions:');
      console.log('─'.repeat(60));
      
      suggestions.slice(0, 3).forEach((suggestion, index) => {
        // Handle string suggestions
        if (typeof suggestion === 'string') {
          console.log(`\n${index + 1}. Keyword: "${suggestion}"`);
          console.log('   ⚠️  WARNING: Suggestion is a string, not an object with metadata!');
          return;
        }
        
        // Handle object suggestions
        if (typeof suggestion === 'object' && suggestion !== null) {
          console.log(`\n${index + 1}. Keyword: "${suggestion.keyword || suggestion.term || suggestion[0] || 'N/A'}"`);
          console.log('   Fields present:', Object.keys(suggestion));
          
          // Check for search volume
          const hasSearchVolume = suggestion.hasOwnProperty('search_volume') || suggestion.hasOwnProperty('volume');
          const searchVolume = suggestion.search_volume !== undefined ? suggestion.search_volume : suggestion.volume;
          console.log(`   ✓ Search Volume: ${hasSearchVolume ? (searchVolume !== null && searchVolume !== undefined ? searchVolume : 'null/undefined') : 'MISSING'}`);
          
          // Check for CPC
          const hasCPC = suggestion.hasOwnProperty('cpc') || suggestion.hasOwnProperty('cost_per_click');
          const cpc = suggestion.cpc !== undefined ? suggestion.cpc : suggestion.cost_per_click;
          console.log(`   ✓ CPC: ${hasCPC ? (cpc !== null && cpc !== undefined ? `$${cpc}` : 'null/undefined') : 'MISSING'}`);
          
          // Check for difficulty
          const hasDifficulty = suggestion.hasOwnProperty('difficulty') || suggestion.hasOwnProperty('keyword_difficulty');
          const difficulty = suggestion.difficulty !== undefined ? suggestion.difficulty : suggestion.keyword_difficulty;
          console.log(`   ✓ Difficulty: ${hasDifficulty ? (difficulty !== null && difficulty !== undefined ? difficulty : 'null/undefined') : 'MISSING'}`);
          
          // Check for competition
          const hasCompetition = suggestion.hasOwnProperty('competition') || suggestion.hasOwnProperty('competition_level');
          const competition = suggestion.competition !== undefined ? suggestion.competition : suggestion.competition_level;
          console.log(`   ✓ Competition: ${hasCompetition ? (competition !== null && competition !== undefined ? competition : 'null/undefined') : 'MISSING'}`);
          
          // Show full object for debugging
          console.log('   Full object:', JSON.stringify(suggestion, null, 2));
        } else {
          console.log(`\n${index + 1}. Unexpected suggestion type: ${typeof suggestion}`);
          console.log('   Value:', suggestion);
        }
      });
      
      // Summary
      console.log('\n📊 Summary:');
      console.log('─'.repeat(60));
      const withSearchVolume = suggestions.filter(s => 
        (s.search_volume !== null && s.search_volume !== undefined) || 
        (s.volume !== null && s.volume !== undefined)
      ).length;
      const withCPC = suggestions.filter(s => 
        (s.cpc !== null && s.cpc !== undefined) || 
        (s.cost_per_click !== null && s.cost_per_click !== undefined)
      ).length;
      const withDifficulty = suggestions.filter(s => 
        (s.difficulty !== null && s.difficulty !== undefined) || 
        (s.keyword_difficulty !== null && s.keyword_difficulty !== undefined)
      ).length;
      const withCompetition = suggestions.filter(s => 
        (s.competition !== null && s.competition !== undefined) || 
        (s.competition_level !== null && s.competition_level !== undefined)
      ).length;
      
      console.log(`   Suggestions with Search Volume: ${withSearchVolume}/${suggestions.length}`);
      console.log(`   Suggestions with CPC: ${withCPC}/${suggestions.length}`);
      console.log(`   Suggestions with Difficulty: ${withDifficulty}/${suggestions.length}`);
      console.log(`   Suggestions with Competition: ${withCompetition}/${suggestions.length}`);
      
      if (withSearchVolume === 0) {
        console.log('\n⚠️  WARNING: No search volume data found in response!');
      }
      if (withCPC === 0) {
        console.log('\n⚠️  WARNING: No CPC data found in response!');
      }
    } else {
      console.log('\n⚠️  No suggestions returned in response');
    }
    
    // Show full response for debugging
    console.log('\n📄 Full API Response (first 2000 chars):');
    console.log('─'.repeat(60));
    const responseStr = JSON.stringify(data, null, 2);
    console.log(responseStr.substring(0, 2000));
    if (responseStr.length > 2000) {
      console.log(`\n... (truncated, total length: ${responseStr.length} chars)`);
    }
    
  } catch (error) {
    console.error('\n❌ Error calling API:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  }
}

testKeywordAPI();

