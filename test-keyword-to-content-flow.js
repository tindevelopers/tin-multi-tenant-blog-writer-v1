/**
 * Test complete flow: DataForSEO Keywords → Content Generation
 * Tests that keywords from DataForSEO research properly generate content
 */

const fetch = require('node-fetch');

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_KEYWORD = 'dog groomers';
const TEST_LOCATION = 'United States';

async function testKeywordAnalysis() {
  console.log('🔍 Step 1: Testing Keyword Analysis with DataForSEO\n');
  console.log(`Keyword: ${TEST_KEYWORD}`);
  console.log(`Location: ${TEST_LOCATION}\n`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/keywords/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keywords: [TEST_KEYWORD],
        location: TEST_LOCATION,
        language: 'en',
        max_suggestions_per_keyword: 10,
        include_trends: true,
        include_keyword_ideas: true,
        include_relevant_pages: true,
        include_serp_ai_summary: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Keyword Analysis Failed: ${response.status}`);
      console.error(errorText.substring(0, 500));
      return null;
    }

    const data = await response.json();
    console.log('✅ Keyword Analysis Successful!');
    console.log(`   Status: ${response.status}`);
    
    // Extract keywords for content generation
    const keywordAnalysis = data.enhanced_analysis || data.keyword_analysis || {};
    const primaryKeywordData = keywordAnalysis[TEST_KEYWORD.toLowerCase()];
    
    if (primaryKeywordData) {
      console.log(`   Search Volume: ${primaryKeywordData.search_volume || 'N/A'}`);
      console.log(`   Keyword Difficulty: ${primaryKeywordData.keyword_difficulty || 'N/A'}`);
      console.log(`   Competition: ${primaryKeywordData.competition || 'N/A'}`);
      
      // Extract related keywords
      const relatedKeywords = [];
      if (primaryKeywordData.keyword_ideas) {
        relatedKeywords.push(...primaryKeywordData.keyword_ideas.slice(0, 5).map((k: any) => k.keyword));
      }
      
      return {
        primaryKeyword: TEST_KEYWORD,
        relatedKeywords: relatedKeywords.length > 0 ? relatedKeywords : [TEST_KEYWORD],
        keywordData: primaryKeywordData,
        fullAnalysis: data,
      };
    }
    
    return {
      primaryKeyword: TEST_KEYWORD,
      relatedKeywords: [TEST_KEYWORD],
      keywordData: null,
      fullAnalysis: data,
    };
  } catch (error) {
    console.error('❌ Keyword Analysis Error:', error.message);
    return null;
  }
}

async function testContentGeneration(keywords) {
  console.log('\n📝 Step 2: Testing Content Generation from Keywords\n');
  console.log(`Primary Keyword: ${keywords.primaryKeyword}`);
  console.log(`Related Keywords: ${keywords.relatedKeywords.join(', ')}\n`);
  
  const requestBody = {
    topic: `Complete Guide to ${keywords.primaryKeyword}`,
    keywords: [keywords.primaryKeyword, ...keywords.relatedKeywords],
    target_audience: 'pet owners',
    tone: 'professional',
    word_count: 800,
    quality_level: 'standard',
    use_semantic_keywords: true,
    use_enhanced: true,
  };
  
  console.log('Request Parameters:');
  console.log(`   Topic: ${requestBody.topic}`);
  console.log(`   Keywords: ${requestBody.keywords.join(', ')}`);
  console.log(`   Word Count: ${requestBody.word_count}`);
  console.log(`   Quality Level: ${requestBody.quality_level}\n`);
  
  try {
    console.log('Sending generation request...\n');
    const startTime = Date.now();
    
    const response = await fetch(`${BASE_URL}/api/blog-writer/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const duration = Date.now() - startTime;
    console.log(`Response received in ${duration}ms`);
    console.log(`Status: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Content Generation Failed!');
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${errorText.substring(0, 1000)}`);
      return false;
    }

    const data = await response.json();
    console.log('✅ Content Generation Successful!\n');
    
    // Check for content
    const content = data.content || data.blog_post?.content;
    if (content) {
      console.log(`✅ Content Generated: ${content.length} characters`);
      console.log(`\n📄 Content Preview (first 500 chars):`);
      console.log('─'.repeat(60));
      console.log(content.substring(0, 500));
      console.log('─'.repeat(60));
    } else {
      console.log('⚠️ Warning: No content found in response');
      console.log('   Response keys:', Object.keys(data));
    }
    
    // Check for title
    const title = data.title || data.blog_post?.title;
    if (title) {
      console.log(`\n✅ Title: ${title}`);
    }
    
    // Check for meta description
    const metaDescription = data.meta_description || data.blog_post?.meta_description;
    if (metaDescription) {
      console.log(`\n✅ Meta Description: ${metaDescription.substring(0, 150)}...`);
    }
    
    // Check for semantic keywords usage
    if (data.semantic_keywords && data.semantic_keywords.length > 0) {
      console.log(`\n✅ Semantic Keywords Used: ${data.semantic_keywords.length} keywords`);
      console.log(`   ${data.semantic_keywords.slice(0, 10).join(', ')}${data.semantic_keywords.length > 10 ? '...' : ''}`);
    }
    
    // Check for SEO score
    if (data.seo_score !== undefined) {
      console.log(`\n✅ SEO Score: ${data.seo_score}/100`);
    }
    
    // Check for quality scores
    if (data.quality_scores) {
      console.log(`\n✅ Quality Scores:`);
      Object.entries(data.quality_scores).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Generation Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Content Generated: ${content ? 'Yes' : 'No'}`);
    console.log(`✅ Title Generated: ${title ? 'Yes' : 'No'}`);
    console.log(`✅ Meta Description Generated: ${metaDescription ? 'Yes' : 'No'}`);
    console.log(`✅ Keywords Used: ${data.semantic_keywords?.length || 0} semantic keywords`);
    console.log(`✅ SEO Score: ${data.seo_score !== undefined ? data.seo_score : 'N/A'}`);
    console.log(`⏱️  Generation Time: ${duration}ms`);
    console.log('='.repeat(60));
    
    return true;
  } catch (error) {
    console.error('❌ Content Generation Error:', error.message);
    console.error(error.stack);
    return false;
  }
}

async function runFullTest() {
  console.log('🚀 Testing Complete Flow: DataForSEO Keywords → Content Generation\n');
  console.log('='.repeat(60));
  
  // Step 1: Test keyword analysis
  const keywordResults = await testKeywordAnalysis();
  
  if (!keywordResults) {
    console.log('\n❌ Keyword analysis failed, cannot proceed with content generation');
    return;
  }
  
  // Step 2: Test content generation
  const contentSuccess = await testContentGeneration(keywordResults);
  
  console.log('\n' + '='.repeat(60));
  if (contentSuccess) {
    console.log('✅ COMPLETE FLOW TEST: SUCCESS');
    console.log('   DataForSEO keywords → Content generation is working!');
  } else {
    console.log('❌ COMPLETE FLOW TEST: FAILED');
    console.log('   Content generation did not complete successfully');
  }
  console.log('='.repeat(60));
}

// Run the test
runFullTest().catch(console.error);

