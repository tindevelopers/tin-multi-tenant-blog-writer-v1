import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';

/**
 * Test Cloudinary connection
 * POST /api/integrations/cloudinary/test
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { org_id, credentials } = body;

    if (!org_id || !credentials) {
      return NextResponse.json(
        { error: 'org_id and credentials are required' },
        { status: 400 }
      );
    }

    const { cloud_name, api_key, api_secret } = credentials;

    if (!cloud_name || !api_key || !api_secret) {
      return NextResponse.json(
        { error: 'All Cloudinary credentials are required' },
        { status: 400 }
      );
    }

    // Verify user has permission (owner or admin)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role, org_id')
      .eq('user_id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (userData.org_id !== org_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Only organization owners and admins can test Cloudinary connection' },
        { status: 403 }
      );
    }

    // Test Cloudinary connection by uploading a tiny test image
    // This is the most reliable way to verify credentials work
    try {
      const crypto = await import('crypto');
      
      // Create a tiny 1x1 transparent PNG as base64
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      // Use Cloudinary upload API with signed upload
      const timestamp = Math.round(new Date().getTime() / 1000);
      const publicId = `test_connection_${timestamp}`;
      
      // Create signature for upload
      const paramsToSign = `folder=test_connections&overwrite=true&public_id=${publicId}&timestamp=${timestamp}`;
      const signature = crypto.createHash('sha1')
        .update(paramsToSign + api_secret)
        .digest('hex');
      
      // Create multipart/form-data body manually
      const boundary = `----WebKitFormBoundary${crypto.randomBytes(16).toString('hex')}`;
      const formDataParts: string[] = [];
      
      const appendField = (name: string, value: string) => {
        formDataParts.push(`--${boundary}\r\n`);
        formDataParts.push(`Content-Disposition: form-data; name="${name}"\r\n\r\n`);
        formDataParts.push(`${value}\r\n`);
      };
      
      appendField('api_key', api_key);
      appendField('timestamp', timestamp.toString());
      appendField('signature', signature);
      appendField('public_id', publicId);
      appendField('folder', 'test_connections');
      appendField('overwrite', 'true');
      // Cloudinary accepts base64 data as data URI in the file field
      appendField('file', `data:image/png;base64,${testImageBase64}`);
      formDataParts.push(`--${boundary}--\r\n`);
      
      const formDataBody = Buffer.from(formDataParts.join(''), 'utf-8');
      
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`;
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': formDataBody.length.toString(),
        },
        body: formDataBody,
      });

      const responseData = await response.json();

      if (response.ok && responseData.public_id) {
        // Successfully uploaded - now delete the test image
        try {
          const deleteTimestamp = Math.round(new Date().getTime() / 1000);
          const deleteParams = `public_id=${responseData.public_id}&timestamp=${deleteTimestamp}`;
          const deleteSignature = crypto.createHash('sha1')
            .update(deleteParams + api_secret)
            .digest('hex');
          
          const deleteFormData = new URLSearchParams();
          deleteFormData.append('public_id', responseData.public_id);
          deleteFormData.append('timestamp', deleteTimestamp.toString());
          deleteFormData.append('signature', deleteSignature);
          deleteFormData.append('api_key', api_key);
          
          await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/destroy`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: deleteFormData.toString(),
          });
        } catch (deleteError) {
          // Non-critical - test image deletion failed but upload succeeded
          logger.warn('Failed to delete test image:', deleteError);
        }
        
        return NextResponse.json({
          success: true,
          message: 'Cloudinary connection test successful',
        });
      } else {
        const errorMessage = responseData.error?.message || responseData.error || response.statusText;
        return NextResponse.json(
          { 
            error: `Cloudinary connection test failed: ${errorMessage}`,
            details: responseData.error?.message || 'Invalid credentials or API error'
          },
          { status: 400 }
        );
      }
    } catch (testError) {
      logger.error('Cloudinary test error:', testError);
      return NextResponse.json(
        { 
          error: 'Failed to connect to Cloudinary',
          details: testError instanceof Error ? testError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error testing Cloudinary:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

