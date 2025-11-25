#!/usr/bin/env node

/**
 * Debug test to see full API responses
 */

const https = require('https');

const BASE_URL = process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-kq42l26tuq-od.a.run.app';

function makeRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 300000,
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
            rawBody: body,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
            rawBody: body,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testBlogGeneration() {
  console.log('Testing Blog Generation with Tutorial Type...\n');
  
  const request = {
    topic: 'Introduction to Python Programming',
    keywords: ['python', 'programming'],
    blog_type: 'tutorial',
    tone: 'professional',
    length: 'short',
    word_count_target: 300,
    optimize_for_traffic: true,
    use_dataforseo_content_generation: true,
  };

  console.log('Request:', JSON.stringify(request, null, 2));
  console.log('\n---\n');

  try {
    const response = await makeRequest('/api/v1/blog/generate-enhanced', 'POST', request);
    
    console.log('Response Status:', response.status);
    console.log('\nFull Response Body:');
    console.log(JSON.stringify(response.body, null, 2));
    
    console.log('\n---\n');
    console.log('Key Fields:');
    console.log('- title:', response.body.title);
    console.log('- content length:', response.body.content?.length || 0);
    console.log('- content preview:', response.body.content?.substring(0, 100) || '(empty)');
    console.log('- seo_score:', response.body.seo_score);
    console.log('- seo_metadata:', response.body.seo_metadata ? 'present' : 'missing');
    if (response.body.seo_metadata) {
      console.log('  - word_count_range:', response.body.seo_metadata.word_count_range);
      console.log('  - keyword_density:', response.body.seo_metadata.keyword_density);
      console.log('  - seo_factors:', response.body.seo_metadata.seo_factors);
    }
    console.log('- success:', response.body.success);
    console.log('- warnings:', response.body.warnings);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testBlogGeneration();

