/**
 * Test Script: Image Generation and Cloudinary Upload
 * 
 * Tests the full flow:
 * 1. Generate image via Blog Writer API (async job)
 * 2. Poll for job completion
 * 3. Upload to Cloudinary via Blog Writer API
 * 4. Verify the image is accessible
 * 
 * IMPORTANT FINDINGS:
 * - Backend API expects RAW base64 (without 'data:image/png;base64,' prefix)
 * - If data URI prefix is included, upload fails with "Incorrect padding" error
 * - Image generation returns raw base64 in image_data field (no prefix)
 * - Cloudinary returns URL in result.url (not top-level url)
 * 
 * Usage: node test-image-cloudinary.js
 */

const BLOG_WRITER_API_URL = 'https://blog-writer-api-dev-613248238610.europe-west9.run.app';

async function pollForJobCompletion(jobId, maxAttempts = 30) {
  console.log(`   Polling for job ${jobId}...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    const statusResponse = await fetch(`${BLOG_WRITER_API_URL}/api/v1/images/jobs/${jobId}`);
    
    if (!statusResponse.ok) {
      console.log(`   Attempt ${attempt}: Status check failed (${statusResponse.status})`);
      continue;
    }
    
    const statusResult = await statusResponse.json();
    console.log(`   Attempt ${attempt}: Status = ${statusResult.status}`);
    
    if (statusResult.status === 'completed') {
      return statusResult;
    } else if (statusResult.status === 'failed') {
      throw new Error(statusResult.error_message || 'Image generation failed');
    }
  }
  
  throw new Error('Job polling timed out');
}

async function testImageGeneration() {
  console.log('🧪 Testing Image Generation + Cloudinary Upload\n');
  console.log('=' .repeat(60));
  
  // Step 1: Generate an image (async job)
  console.log('\n📸 Step 1: Submitting image generation job...');
  
  const generateResponse = await fetch(`${BLOG_WRITER_API_URL}/api/v1/images/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: 'A professional business blog header image featuring modern technology and innovation, clean design, blue and white color scheme',
      provider: 'stability_ai',
      style: 'photographic',
      aspect_ratio: '16:9',
      quality: 'standard',
      width: 1200,
      height: 675,
      negative_prompt: 'blurry, low quality, watermark, text overlay, logo',
    }),
  });

  console.log(`   Status: ${generateResponse.status} ${generateResponse.statusText}`);
  
  if (!generateResponse.ok) {
    const errorText = await generateResponse.text();
    console.error('❌ Image generation failed:', errorText);
    return;
  }

  const generateResult = await generateResponse.json();
  
  // Handle async job response
  let image;
  let base64Image;
  let rawBase64;
  
  if (generateResult.job_id) {
    console.log(`✅ Job queued: ${generateResult.job_id}`);
    console.log(`   Estimated time: ${generateResult.estimated_completion_time}s`);
    
    console.log('\n⏳ Step 2: Polling for job completion...');
    const completedResult = await pollForJobCompletion(generateResult.job_id);
    
    if (completedResult.result?.images?.[0]) {
      image = completedResult.result.images[0];
    } else if (completedResult.image_url) {
      image = { image_url: completedResult.image_url };
    }
    
    console.log('✅ Image generation completed!');
  } else if (generateResult.images && generateResult.images.length > 0) {
    // Synchronous response
    image = generateResult.images[0];
    console.log('✅ Image generated (sync)!');
  }
  
  if (image) {
    console.log(`   - Dimensions: ${image.width || 'N/A'}x${image.height || 'N/A'}`);
    console.log(`   - Format: ${image.format || 'N/A'}`);
    console.log(`   - Has base64 data: ${!!image.image_data}`);
    console.log(`   - Has URL: ${!!image.image_url}`);
    
    // Get base64 image data
    if (image.image_data) {
      // API returned base64 directly - fix padding if needed
      rawBase64 = image.image_data;
      
      console.log(`   - Raw image_data starts with: ${rawBase64.substring(0, 30)}...`);
      console.log(`   - Raw image_data length: ${rawBase64.length}`);
      
      // Remove data URI prefix if present to work with raw base64
      if (rawBase64.startsWith('data:')) {
        rawBase64 = rawBase64.split(',')[1] || rawBase64;
        console.log(`   - After removing prefix, length: ${rawBase64.length}`);
      }
      
      // Fix base64 padding - length must be multiple of 4
      const remainder = rawBase64.length % 4;
      console.log(`   - Length % 4 = ${remainder}`);
      if (remainder !== 0) {
        const paddingNeeded = 4 - remainder;
        rawBase64 = rawBase64 + '='.repeat(paddingNeeded);
        console.log(`   - Fixed base64 padding: added ${paddingNeeded} '=' characters`);
      }
      
      base64Image = `data:image/png;base64,${rawBase64}`;
      console.log(`   - Final base64 size: ${(base64Image.length / 1024).toFixed(2)} KB`);
      console.log(`   - Final data length after prefix: ${rawBase64.length} (% 4 = ${rawBase64.length % 4})`);
    } else if (image.image_url) {
      // Fetch from URL
      console.log('   Fetching image from URL to convert to base64...');
      const imageResponse = await fetch(image.image_url);
      if (!imageResponse.ok) {
        console.error('❌ Failed to fetch generated image');
        return;
      }
      const imageBuffer = await imageResponse.arrayBuffer();
      base64Image = `data:image/png;base64,${Buffer.from(imageBuffer).toString('base64')}`;
    } else {
      console.error('❌ No image data or URL in response');
      return;
    }
    
    // Step 3: Upload to Cloudinary - try with raw base64 (no data URI prefix)
    console.log('\n☁️ Step 3: Uploading to Cloudinary via Blog Writer API...');
    console.log('   Trying with raw base64 (no data URI prefix)...');
    
    // Try with raw base64 first
    let uploadResponse = await fetch(`${BLOG_WRITER_API_URL}/api/v1/media/upload/cloudinary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        media_data: rawBase64,  // Try raw base64 without prefix
        filename: `test-image-${Date.now()}.png`,
        folder: 'blog-images/test',
        alt_text: 'Test image for blog post',
        metadata: {
          source: 'test_script',
          test_timestamp: new Date().toISOString(),
        },
      }),
    });
    
    // If raw base64 fails, try with data URI prefix
    if (!uploadResponse.ok) {
      const errorText1 = await uploadResponse.text();
      console.log(`   Raw base64 failed: ${errorText1.substring(0, 200)}`);
      console.log('   Trying with data URI prefix...');
      
      uploadResponse = await fetch(`${BLOG_WRITER_API_URL}/api/v1/media/upload/cloudinary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          media_data: base64Image,  // Try with data URI prefix
          filename: `test-image-${Date.now()}.png`,
          folder: 'blog-images/test',
          alt_text: 'Test image for blog post',
          metadata: {
            source: 'test_script',
            test_timestamp: new Date().toISOString(),
          },
        }),
      });
    }

    console.log(`   Status: ${uploadResponse.status} ${uploadResponse.statusText}`);
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ Cloudinary upload failed:', errorText);
      console.log('\n⚠️ Cloudinary upload failed, but image was generated successfully.');
      console.log('   Original image URL still works:', image.image_url);
      return;
    }

    const uploadResult = await uploadResponse.json();
    console.log('✅ Cloudinary upload successful!');
    
    // Handle different response formats - backend returns { success, result: { url, id, ... } }
    const result = uploadResult.result || uploadResult;
    const cloudinaryUrl = result.url || result.secure_url || uploadResult.secure_url || uploadResult.url;
    const publicId = result.id || result.public_id || uploadResult.public_id;
    const format = result.format || uploadResult.format || 'png';
    const bytes = result.size || result.bytes || uploadResult.bytes || 0;
    const transformUrl = result.transformation_url;
    
    console.log(`   - Public ID: ${publicId}`);
    console.log(`   - Cloudinary URL: ${cloudinaryUrl}`);
    console.log(`   - Transform URL: ${transformUrl || 'N/A'}`);
    console.log(`   - Format: ${format}`);
    console.log(`   - Dimensions: ${result.width}x${result.height}`);
    console.log(`   - Size: ${(bytes / 1024).toFixed(2)} KB`);
    
    // Step 4: Verify the Cloudinary URL works
    if (cloudinaryUrl) {
      console.log('\n🔍 Step 4: Verifying Cloudinary URL is accessible...');
      const verifyResponse = await fetch(cloudinaryUrl, { method: 'HEAD' });
      
      if (verifyResponse.ok) {
        console.log('✅ Cloudinary URL is accessible!');
        console.log(`   Final URL: ${cloudinaryUrl}`);
      } else {
        console.error('❌ Cloudinary URL is not accessible:', verifyResponse.status);
      }
    } else {
      console.log('\n⚠️ No Cloudinary URL in response - cannot verify');
    }
    
  } else {
    console.error('❌ No images in response');
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🧪 Test completed\n');
}

// Run the test
testImageGeneration().catch(err => {
  console.error('❌ Test error:', err);
  process.exit(1);
});

