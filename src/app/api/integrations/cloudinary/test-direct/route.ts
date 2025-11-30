/**
 * API Route: Direct Cloudinary Credentials Test
 * 
 * GET /api/integrations/cloudinary/test-direct
 * 
 * Tests Cloudinary credentials directly using Admin API
 * Tests both Basic Auth and Signed URL methods
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser } from '@/lib/api-utils';
import { getCloudinaryCredentials } from '@/lib/cloudinary-upload';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    logger.debug('Testing Cloudinary credentials directly', {
      userId: user.id,
      orgId: user.org_id,
    });

    // Get Cloudinary credentials
    const credentials = await getCloudinaryCredentials(user.org_id);
    if (!credentials) {
      return NextResponse.json(
        { 
          error: 'Cloudinary not configured for this organization',
          suggestion: 'Please configure Cloudinary credentials in Settings → Integrations → Cloudinary',
        },
        { status: 400 }
      );
    }

    // Validate credentials are not empty
    if (!credentials.cloud_name || !credentials.api_key || !credentials.api_secret) {
      return NextResponse.json(
        { 
          error: 'Cloudinary credentials are incomplete',
          hasCloudName: !!credentials.cloud_name,
          hasApiKey: !!credentials.api_key,
          hasApiSecret: !!credentials.api_secret,
        },
        { status: 400 }
      );
    }

    const results: {
      method: string;
      success: boolean;
      status?: number;
      error?: string;
      resourceCount?: number;
      details?: any;
    }[] = [];

    // Test 1: Basic Auth Method
    logger.info('Testing Cloudinary with Basic Auth');
    try {
      const authString = Buffer.from(`${credentials.api_key}:${credentials.api_secret}`).toString('base64');
      const testUrl = new URL(`https://api.cloudinary.com/v1_1/${credentials.cloud_name}/resources/image`);
      testUrl.searchParams.append('max_results', '10');
      testUrl.searchParams.append('resource_type', 'image');

      const basicAuthResponse = await fetch(testUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      const basicAuthData = await basicAuthResponse.json();

      if (basicAuthResponse.ok) {
        results.push({
          method: 'Basic Auth',
          success: true,
          status: basicAuthResponse.status,
          resourceCount: basicAuthData.resources?.length || 0,
          details: {
            totalResources: basicAuthData.total_count || 0,
            nextCursor: basicAuthData.next_cursor || null,
          },
        });
      } else {
        results.push({
          method: 'Basic Auth',
          success: false,
          status: basicAuthResponse.status,
          error: basicAuthData.error?.message || JSON.stringify(basicAuthData),
          details: basicAuthData,
        });
      }
    } catch (error) {
      results.push({
        method: 'Basic Auth',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: { error },
      });
    }

    // Test 2: Signed URL Method
    logger.info('Testing Cloudinary with Signed URL');
    try {
      const crypto = await import('crypto');
      const timestamp = Math.round(new Date().getTime() / 1000);

      const params: Record<string, string> = {
        max_results: '10',
        resource_type: 'image',
        timestamp: timestamp.toString(),
      };

      // Sort parameters alphabetically for signature
      const sortedParamKeys = Object.keys(params).sort();
      const sortedParamsString = sortedParamKeys
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');

      // Calculate SHA1 signature: sorted_params_string + api_secret
      const signature = crypto.createHash('sha1')
        .update(sortedParamsString + credentials.api_secret)
        .digest('hex');

      // Build signed URL
      const signedUrl = new URL(`https://api.cloudinary.com/v1_1/${credentials.cloud_name}/resources/image`);
      signedUrl.searchParams.append('api_key', credentials.api_key);
      signedUrl.searchParams.append('max_results', '10');
      signedUrl.searchParams.append('resource_type', 'image');
      signedUrl.searchParams.append('timestamp', timestamp.toString());
      signedUrl.searchParams.append('signature', signature);

      const signedResponse = await fetch(signedUrl.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      const signedData = await signedResponse.json();

      if (signedResponse.ok) {
        results.push({
          method: 'Signed URL',
          success: true,
          status: signedResponse.status,
          resourceCount: signedData.resources?.length || 0,
          details: {
            totalResources: signedData.total_count || 0,
            nextCursor: signedData.next_cursor || null,
            signaturePrefix: signature.substring(0, 8) + '...',
          },
        });
      } else {
        results.push({
          method: 'Signed URL',
          success: false,
          status: signedResponse.status,
          error: signedData.error?.message || JSON.stringify(signedData),
          details: {
            ...signedData,
            signaturePrefix: signature.substring(0, 8) + '...',
          },
        });
      }
    } catch (error) {
      results.push({
        method: 'Signed URL',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: { error },
      });
    }

    // Determine overall success
    const hasSuccess = results.some(r => r.success);
    const allFailed = results.every(r => !r.success);

    return NextResponse.json({
      success: hasSuccess,
      credentials: {
        cloudName: credentials.cloud_name,
        apiKeyPrefix: credentials.api_key.substring(0, 5) + '...',
        hasApiSecret: !!credentials.api_secret,
      },
      tests: results,
      summary: {
        totalTests: results.length,
        passedTests: results.filter(r => r.success).length,
        failedTests: results.filter(r => !r.success).length,
        recommendedMethod: results.find(r => r.success)?.method || 'None - credentials may be invalid',
      },
      message: hasSuccess
        ? `Cloudinary credentials are valid. ${results.find(r => r.success)?.method} method works.`
        : allFailed
        ? 'All authentication methods failed. Please verify your Cloudinary credentials.'
        : 'Some authentication methods failed, but at least one method works.',
    }, {
      status: hasSuccess ? 200 : 401,
    });

  } catch (error) {
    logger.error('Error testing Cloudinary credentials:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test Cloudinary credentials',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

