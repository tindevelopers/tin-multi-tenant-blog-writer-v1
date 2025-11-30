/**
 * API Route: List Media Assets
 * 
 * GET /api/media/list
 * 
 * Lists media assets from the database for the current user's organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser, handleApiError } from '@/lib/api-utils';
import { createClient } from '@/lib/supabase/server';

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

    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('search') || '';
    const filterType = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createClient();

    // Get user's org_id
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile?.org_id) {
      logger.error('User org_id not found:', profileError);
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 404 }
      );
    }

    // Build query
    let query = supabase
      .from('media_assets')
      .select('*')
      .eq('org_id', userProfile.org_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    logger.debug('Querying media assets', {
      orgId: userProfile.org_id,
      userId: user.id,
      filterType,
      searchTerm,
      limit,
      offset,
    });

    // Apply filters
    if (filterType !== 'all') {
      if (filterType === 'image') {
        query = query.like('file_type', 'image/%');
      } else if (filterType === 'video') {
        query = query.like('file_type', 'video/%');
      } else if (filterType === 'audio') {
        query = query.like('file_type', 'audio/%');
      }
    }

    if (searchTerm) {
      query = query.or(`file_name.ilike.%${searchTerm}%,metadata->>tags.ilike.%${searchTerm}%`);
    }

    const { data: assets, error } = await query;

    if (error) {
      logger.error('Error fetching media assets:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        orgId: userProfile.org_id,
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to fetch media assets', details: error.message },
        { status: 500 }
      );
    }

    logger.debug('Media assets query result', {
      orgId: userProfile.org_id,
      count: assets?.length || 0,
      assets: assets?.map(a => ({
        asset_id: a.asset_id,
        file_name: a.file_name,
        file_type: a.file_type,
        file_url: a.file_url ? a.file_url.substring(0, 50) + '...' : 'MISSING',
        has_file_url: !!a.file_url,
        created_at: a.created_at,
      })),
    });
    
    // Check for assets with missing file_url
    const missingUrlCount = assets?.filter(a => !a.file_url).length || 0;
    if (missingUrlCount > 0) {
      logger.warn('Found media assets with missing file_url', {
        count: missingUrlCount,
        orgId: userProfile.org_id,
        asset_ids: assets?.filter(a => !a.file_url).map(a => a.asset_id),
      });
    }

    // Get total count for stats
    let countQuery = supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', userProfile.org_id);

    if (filterType !== 'all') {
      if (filterType === 'image') {
        countQuery = countQuery.like('file_type', 'image/%');
      } else if (filterType === 'video') {
        countQuery = countQuery.like('file_type', 'video/%');
      } else if (filterType === 'audio') {
        countQuery = countQuery.like('file_type', 'audio/%');
      }
    }

    const { count: totalCount } = await countQuery;

    // Calculate stats
    const { count: imageCount } = await supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', userProfile.org_id)
      .like('file_type', 'image/%');

    const { count: videoCount } = await supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', userProfile.org_id)
      .like('file_type', 'video/%');

    // Calculate total storage
    const { data: storageData } = await supabase
      .from('media_assets')
      .select('file_size')
      .eq('org_id', userProfile.org_id);

    const totalStorageBytes = storageData?.reduce((sum, asset) => sum + (asset.file_size || 0), 0) || 0;
    const totalStorageGB = (totalStorageBytes / (1024 * 1024 * 1024)).toFixed(2);

    return NextResponse.json({
      data: assets || [],
      stats: {
        total: totalCount || 0,
        images: imageCount || 0,
        videos: videoCount || 0,
        storageUsed: `${totalStorageGB} GB`,
        storageBytes: totalStorageBytes,
      },
      pagination: {
        limit,
        offset,
        total: totalCount || 0,
      },
    });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'media-list',
    });
    return handleApiError(error);
  }
}

