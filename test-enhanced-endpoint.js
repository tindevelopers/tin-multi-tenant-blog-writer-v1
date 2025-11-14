#!/usr/bin/env node

/**
 * Test script for the enhanced blog writer endpoint
 * Usage: node test-enhanced-endpoint.js [local|production]
 */

const fs = require('fs');
const path = require('path');

// Read the test JSON file
const testDataPath = path.join(__dirname, 'test-enhanced-endpoint.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

// Determine environment
const environment = process.argv[2] || 'local';
const baseUrl = environment === 'production' 
  ? 'https://your-production-url.vercel.app'
  : 'http://localhost:3000';

const endpoint = `${baseUrl}/api/blog-writer/generate`;

console.log('🧪 Testing Enhanced Blog Writer Endpoint');
console.log('==========================================');
console.log(`Environment: ${environment}`);
console.log(`Endpoint: ${endpoint}`);
console.log(`Topic: ${testData.topic}`);
console.log(`Keywords: ${testData.keywords.join(', ')}`);
console.log(`Quality Level: ${testData.quality_level}`);
console.log('');

// Note: This requires authentication
// You'll need to provide a valid session token
async function testEndpoint() {
  try {
    console.log('📤 Sending request...');
    console.log('Request payload:');
    console.log(JSON.stringify(testData, null, 2));
    console.log('');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real scenario, you'd need to include authentication
        // 'Authorization': 'Bearer YOUR_TOKEN',
        // 'Cookie': 'your-session-cookie'
      },
      body: JSON.stringify(testData),
    });

    console.log(`📥 Response Status: ${response.status} ${response.statusText}`);
    console.log('');

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error Response:');
      console.log(errorText);
      return;
    }

    const result = await response.json();
    
    console.log('✅ Success Response:');
    console.log('===================');
    console.log(`Title: ${result.title || 'N/A'}`);
    console.log(`Word Count: ${result.word_count || 'N/A'}`);
    console.log(`SEO Score: ${result.seo_score || 'N/A'}`);
    console.log(`Readability Score: ${result.readability_score || 'N/A'}`);
    console.log(`Total Cost: $${result.total_cost || 0}`);
    console.log(`Total Tokens: ${result.total_tokens || 0}`);
    console.log(`Generation Time: ${result.generation_time || 0}s`);
    console.log('');

    if (result.progress_updates && result.progress_updates.length > 0) {
      console.log('📊 Progress Updates:');
      result.progress_updates.forEach((update, idx) => {
        console.log(`  ${idx + 1}. ${update.stage} (${update.progress_percentage}%)`);
        if (update.details) {
          console.log(`     ${update.details}`);
        }
      });
      console.log('');
    }

    if (result.citations && result.citations.length > 0) {
      console.log(`📚 Citations: ${result.citations.length} found`);
      result.citations.slice(0, 3).forEach((citation, idx) => {
        console.log(`  ${idx + 1}. ${citation.title || citation.url}`);
      });
      console.log('');
    }

    if (result.semantic_keywords && result.semantic_keywords.length > 0) {
      console.log(`🔑 Semantic Keywords: ${result.semantic_keywords.length} found`);
      console.log(`  ${result.semantic_keywords.slice(0, 5).join(', ')}`);
      console.log('');
    }

    if (result.warnings && result.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      result.warnings.forEach((warning, idx) => {
        console.log(`  ${idx + 1}. ${warning}`);
      });
      console.log('');
    }

    // Save full response to file
    const outputPath = path.join(__dirname, 'test-enhanced-endpoint-result.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`💾 Full response saved to: ${outputPath}`);

    // Save content preview
    if (result.content) {
      const contentPreview = result.content.substring(0, 500);
      console.log('');
      console.log('📝 Content Preview (first 500 chars):');
      console.log('=====================================');
      console.log(contentPreview);
      console.log('...');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testEndpoint();
