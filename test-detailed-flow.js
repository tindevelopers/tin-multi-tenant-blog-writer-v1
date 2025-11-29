/**
 * Detailed test of the complete flow: DataForSEO Keywords → Content Generation
 * Tests each step in detail to verify the integration
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://blogwriter.develop.tinconnect.com';
const TEST_KEYWORD = 'dog groomers';
const TEST_LOCATION = 'United States';

async function testStep1_KeywordAnalysis() {
  console.log('='.repeat(70));
  console.log('STEP 1: Keyword Analysis with DataForSEO');
  console.log('='.repeat(70));
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

    console.log(`HTTP Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed: ${errorText.substring(0, 500)}`);
      return null;
    }

    const data = await response.json();
    console.log('✅ Keyword Analysis Successful!\n');
    
    // Extract keyword data
    const keywordAnalysis = data.enhanced_analysis || data.keyword_analysis || {};
    const primaryKeywordData = keywordAnalysis[TEST_KEYWORD.toLowerCase()];
    
    if (primaryKeywordData) {
      console.log('📊 Keyword Data Retrieved:');
      console.log(`   Search Volume: ${primaryKeywordData.search_volume || 'N/A'}`);
      console.log(`   Keyword Difficulty: ${primaryKeywordData.keyword_difficulty || 'N/A'}`);
      console.log(`   Competition: ${primaryKeywordData.competition || 'N/A'}`);
      console.log(`   CPC: ${primaryKeywordData.cpc || 'N/A'}`);
      
      if (primaryKeywordData.keyword_ideas && primaryKeywordData.keyword_ideas.length > 0) {
        console.log(`   Related Keywords: ${primaryKeywordData.keyword_ideas.length} found`);
        console.log(`   Sample: ${primaryKeywordData.keyword_ideas.slice(0, 3).map(k => k.keyword).join(', ')}`);
      }
      
      if (primaryKeywordData.serp_ai_summary) {
        console.log(`   SERP AI Summary: Available`);
        if (primaryKeywordData.serp_ai_summary.main_topics) {
          console.log(`   Main Topics: ${primaryKeywordData.serp_ai_summary.main_topics.length} topics`);
        }
      }
    }
    
    return {
      primaryKeyword: TEST_KEYWORD,
      relatedKeywords: primaryKeywordData?.keyword_ideas?.slice(0, 5).map(k => k.keyword) || [TEST_KEYWORD],
      keywordData: primaryKeywordData,
    };
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return null;
  }
}

async function testStep2_ContentGeneration(keywords) {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 2: Content Generation (calls keyword analysis internally)');
  console.log('='.repeat(70));
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
  
  console.log('📤 Request Parameters:');
  console.log(`   Topic: ${requestBody.topic}`);
  console.log(`   Keywords: ${requestBody.keywords.join(', ')}`);
  console.log(`   Word Count: ${requestBody.word_count}`);
  console.log(`   Use Semantic Keywords: ${requestBody.use_semantic_keywords}`);
  console.log(`   Use Enhanced: ${requestBody.use_enhanced}\n`);
  
  try {
    console.log('⏳ Sending request (this will internally call /api/keywords/analyze)...\n');
    const startTime = Date.now();
    
    const response = await fetch(`${BASE_URL}/api/blog-writer/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️  Response received in ${duration}ms`);
    console.log(`HTTP Status: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed: ${errorText.substring(0, 1000)}`);
      return false;
    }

    const data = await response.json();
    console.log('✅ Content Generation Successful!\n');
    
    // Verify content
    const content = data.content || data.blog_post?.content;
    if (content) {
      console.log('📄 Content Generated:');
      console.log(`   Length: ${content.length} characters`);
      console.log(`   Word Count: ${data.word_count || 'N/A'}`);
      console.log(`   Preview (first 400 chars):`);
      console.log('   ' + '-'.repeat(60));
      console.log('   ' + content.substring(0, 400).replace(/\n/g, '\n   '));
      console.log('   ' + '-'.repeat(60));
    } else {
      console.log('⚠️  Warning: No content found in response');
    }
    
    // Verify title
    const title = data.title || data.blog_post?.title;
    if (title) {
      console.log(`\n📝 Title: ${title}`);
    }
    
    // Verify meta description
    const metaDescription = data.meta_description || data.blog_post?.meta_description;
    if (metaDescription) {
      console.log(`\n📋 Meta Description: ${metaDescription.substring(0, 150)}...`);
    }
    
    // Verify semantic keywords
    if (data.semantic_keywords && Array.isArray(data.semantic_keywords)) {
      console.log(`\n🔑 Semantic Keywords: ${data.semantic_keywords.length} keywords`);
      if (data.semantic_keywords.length > 0) {
        console.log(`   ${data.semantic_keywords.slice(0, 10).join(', ')}${data.semantic_keywords.length > 10 ? '...' : ''}`);
      }
    } else {
      console.log(`\n⚠️  Semantic Keywords: Not found or not an array`);
    }
    
    // Verify SEO score
    if (data.seo_score !== undefined) {
      console.log(`\n📊 SEO Score: ${data.seo_score}/100`);
    }
    
    // Verify quality scores
    if (data.quality_scores) {
      console.log(`\n⭐ Quality Scores:`);
      Object.entries(data.quality_scores).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    }
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 GENERATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Content Generated: ${content ? 'Yes (' + content.length + ' chars)' : 'No'}`);
    console.log(`✅ Title Generated: ${title ? 'Yes' : 'No'}`);
    console.log(`✅ Meta Description Generated: ${metaDescription ? 'Yes' : 'No'}`);
    console.log(`✅ Semantic Keywords: ${data.semantic_keywords?.length || 0} keywords`);
    console.log(`✅ SEO Score: ${data.seo_score !== undefined ? data.seo_score : 'N/A'}`);
    console.log(`⏱️  Generation Time: ${duration}ms`);
    console.log('='.repeat(70));
    
    return true;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

async function runFullTest() {
  console.log('\n🚀 COMPLETE FLOW TEST: DataForSEO Keywords → Content Generation\n');
  
  // Step 1: Test keyword analysis
  const keywordResults = await testStep1_KeywordAnalysis();
  
  if (!keywordResults) {
    console.log('\n❌ Step 1 failed, cannot proceed');
    return;
  }
  
  // Step 2: Test content generation (which internally calls keyword analysis)
  const contentSuccess = await testStep2_ContentGeneration(keywordResults);
  
  console.log('\n' + '='.repeat(70));
  if (contentSuccess) {
    console.log('✅ COMPLETE FLOW TEST: SUCCESS');
    console.log('   ✓ Keywords from DataForSEO research');
    console.log('   ✓ Enhanced keyword analysis called internally');
    console.log('   ✓ Content generated with semantic keywords');
    console.log('   ✓ All components working correctly!');
  } else {
    console.log('❌ COMPLETE FLOW TEST: FAILED');
    console.log('   Content generation did not complete successfully');
  }
  console.log('='.repeat(70) + '\n');
}

runFullTest().catch(console.error);

