import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Test Cloudinary connection by making a simple API call
    // We'll use the Blog Writer API's Cloudinary test endpoint if available
    // Otherwise, we can test directly with Cloudinary API
    try {
      const testUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/resources/image/upload/max_results=1`;
      
      // Create basic auth header
      const authString = Buffer.from(`${api_key}:${api_secret}`).toString('base64');
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
        },
      });

      if (response.ok || response.status === 200) {
        return NextResponse.json({
          success: true,
          message: 'Cloudinary connection test successful',
        });
      } else {
        const errorText = await response.text();
        return NextResponse.json(
          { 
            error: `Cloudinary connection test failed: ${response.statusText}`,
            details: errorText.substring(0, 200)
          },
          { status: 400 }
        );
      }
    } catch (testError) {
      console.error('Cloudinary test error:', testError);
      return NextResponse.json(
        { 
          error: 'Failed to connect to Cloudinary',
          details: testError instanceof Error ? testError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error testing Cloudinary:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

