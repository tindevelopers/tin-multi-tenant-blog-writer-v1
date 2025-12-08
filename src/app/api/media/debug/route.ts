/**
 * Debug endpoint to check media assets in database
 * GET /api/media/debug
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser, handleApiError } from '@/lib/api-utils';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const supabaseService = createServiceClient();

    // Get user's org_id
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile?.org_id) {
      return NextResponse.json(
        { error: 'User organization not found', details: profileError },
        { status: 404 }
      );
    }

    // Query with user client (respects RLS)
    const { data: userClientData, error: userClientError } = await supabase
      .from('media_assets')
      .select('*')
      .eq('org_id', userProfile.org_id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Query with service client (bypasses RLS)
    const { data: serviceClientData, error: serviceClientError } = await supabaseService
      .from('media_assets')
      .select('*')
      .eq('org_id', userProfile.org_id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get total counts
    const { count: userClientCount } = await supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', userProfile.org_id);

    const { count: serviceClientCount } = await supabaseService
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', userProfile.org_id);

      // Check file_url values
      const userClientWithUrls = (userClientData || []).filter((a: any) => a.file_url);
      const userClientWithoutUrls = (userClientData || []).filter((a: any) => !a.file_url);
      const serviceClientWithUrls = (serviceClientData || []).filter((a: any) => a.file_url);
      const serviceClientWithoutUrls = (serviceClientData || []).filter((a: any) => !a.file_url);

      return NextResponse.json({
        user: {
          id: user.id,
          orgId: userProfile.org_id,
        },
        userClient: {
          count: userClientCount || 0,
          withFileUrl: userClientWithUrls.length,
          withoutFileUrl: userClientWithoutUrls.length,
          data: userClientData || [],
          missingUrls: userClientWithoutUrls.map((a: any) => ({
            asset_id: a.asset_id,
            file_name: a.file_name,
            file_type: a.file_type,
            metadata: a.metadata,
          })),
          error: userClientError ? {
            message: userClientError.message,
            code: userClientError.code,
            details: userClientError.details,
            hint: userClientError.hint,
          } : null,
        },
        serviceClient: {
          count: serviceClientCount || 0,
          withFileUrl: serviceClientWithUrls.length,
          withoutFileUrl: serviceClientWithoutUrls.length,
          data: serviceClientData || [],
          missingUrls: serviceClientWithoutUrls.map((a: any) => ({
            asset_id: a.asset_id,
            file_name: a.file_name,
            file_type: a.file_type,
            metadata: a.metadata,
          })),
          error: serviceClientError ? {
            message: serviceClientError.message,
            code: serviceClientError.code,
            details: serviceClientError.details,
            hint: serviceClientError.hint,
          } : null,
        },
        rlsIssue: (serviceClientCount || 0) > (userClientCount || 0),
        fileUrlIssue: userClientWithoutUrls.length > 0,
        summary: {
          assetsInDb: serviceClientCount || 0,
          assetsVisibleToUser: userClientCount || 0,
          rlsBlocking: (serviceClientCount || 0) > (userClientCount || 0),
          fileUrlMissing: userClientWithoutUrls.length,
        },
      });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'media-debug',
    });
    return handleApiError(error);
  }
}

