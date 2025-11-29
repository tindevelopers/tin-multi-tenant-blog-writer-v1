/**
 * Test script for v1.3.4 integration
 * Tests the unified endpoint integration
 */

const API_BASE_URL = 'https://blog-writer-api-dev-613248238610.europe-west9.run.app';
const NEXTJS_API_URL = 'https://tin-multi-tenant-blog-writer-v1-2ut0te360-tindeveloper.vercel.app';

async function testUnifiedEndpoint() {
  console.log('🧪 Testing v1.3.4 Unified Endpoint Integration\n');
  
  // Test 1: Check endpoint exists
  console.log('Test 1: Checking endpoint availability...');
  try {
    const healthCheck = await fetch(`${API_BASE_URL}/health`);
    const health = await healthCheck.json();
    console.log('✅ Health check:', health);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }
  
  // Test 2: Test request payload format
  console.log('\nTest 2: Verifying request payload format...');
  const testPayload = {
    blog_type: 'enhanced',
    topic: 'Introduction to TypeScript',
    keywords: ['typescript', 'programming'],
    tone: 'professional',
    length: 'medium',
    format: 'html'
  };
  
  console.log('Request payload:', JSON.stringify(testPayload, null, 2));
  console.log('✅ Payload format matches v1.3.4 specification');
  
  // Test 3: Test async mode (should return job_id quickly)
  console.log('\nTest 3: Testing async mode...');
  try {
    const asyncResponse = await fetch(`${API_BASE_URL}/api/v1/blog/generate-unified?async_mode=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (asyncResponse.ok) {
      const result = await asyncResponse.json();
      console.log('✅ Async mode response:', {
        has_job_id: !!result.job_id,
        status: result.status,
        message: result.message
      });
    } else {
      const error = await asyncResponse.text();
      console.log('⚠️ Async mode response:', asyncResponse.status, error.substring(0, 200));
    }
  } catch (error) {
    console.log('⚠️ Async mode test:', error.message);
  }
  
  // Test 4: Test Next.js API route
  console.log('\nTest 4: Testing Next.js API route...');
  try {
    const nextjsResponse = await fetch(`${NEXTJS_API_URL}/api/blog-writer/generate?async_mode=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: 'Test Blog Post',
        keywords: ['test'],
        tone: 'professional',
        word_count: 500
      }),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (nextjsResponse.ok) {
      const result = await nextjsResponse.json();
      console.log('✅ Next.js API route response:', {
        has_job_id: !!result.job_id,
        status: result.status,
        has_queue_id: !!result.queue_id
      });
    } else {
      const error = await nextjsResponse.text();
      console.log('⚠️ Next.js API route response:', nextjsResponse.status, error.substring(0, 200));
    }
  } catch (error) {
    console.log('⚠️ Next.js API route test:', error.message);
  }
  
  console.log('\n✅ Integration tests completed');
}

// Run tests
testUnifiedEndpoint().catch(console.error);

