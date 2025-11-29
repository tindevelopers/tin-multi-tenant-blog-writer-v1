/**
 * GET /api/test/webflow-check-item
 * Check if a Webflow CMS item exists and get its details
 * Useful for debugging why items don't appear
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('item_id');
    const collectionId = searchParams.get('collection_id');
    const apiKey = searchParams.get('api_key');

    if (!itemId || !collectionId) {
      return NextResponse.json(
        { error: 'item_id and collection_id query parameters are required' },
        { status: 400 }
      );
    }

    // Get user's org_id
    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile?.org_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get API key from integration if not provided
    let finalApiKey = apiKey;
    if (!finalApiKey) {
      const dbAdapter = new EnvironmentIntegrationsDB();
      const integrations = await dbAdapter.getIntegrations(userProfile.org_id);
      const webflowIntegration = integrations.find(i => i.type === 'webflow' && i.status === 'active');

      if (!webflowIntegration) {
        return NextResponse.json(
          { error: 'Webflow integration not found. Please provide api_key or configure integration.' },
          { status: 404 }
        );
      }

      const config = webflowIntegration.config as Record<string, unknown>;
      finalApiKey = config.api_key as string;

      if (!finalApiKey) {
        return NextResponse.json(
          { error: 'Webflow API key not found in integration config' },
          { status: 400 }
        );
      }
    }

    logger.debug('Checking Webflow item', { itemId, collectionId, orgId: userProfile.org_id });

    // Fetch the item from Webflow
    const response = await fetch(
      `https://api.webflow.com/v2/collections/${collectionId}/items/${itemId}`,
      {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${finalApiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Webflow API error fetching item:', {
        status: response.status,
        error: errorText,
        itemId,
        collectionId,
      });
      return NextResponse.json(
        {
          error: 'Failed to fetch Webflow item',
          message: errorText,
          status: response.status,
        },
        { status: response.status }
      );
    }

    const item = await response.json();

    // Also check if we can list items from the collection
    let collectionItems: any[] = [];
    try {
      const itemsResponse = await fetch(
        `https://api.webflow.com/v2/collections/${collectionId}/items?limit=10`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'authorization': `Bearer ${finalApiKey}`,
          },
        }
      );

      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        collectionItems = itemsData.items || [];
      }
    } catch (error) {
      logger.warn('Could not fetch collection items list', { error });
    }

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        isDraft: item.isDraft,
        isArchived: item.isArchived,
        createdOn: item.createdOn,
        lastUpdated: item.lastUpdated,
        lastPublished: item.lastPublished,
        fieldData: item.fieldData,
      },
      collectionInfo: {
        totalItems: collectionItems.length,
        itemIds: collectionItems.map(i => i.id),
        itemTitles: collectionItems.map(i => i.fieldData?.name || i.fieldData?.title || 'No title'),
      },
      diagnostics: {
        itemExists: true,
        isDraft: item.isDraft,
        isArchived: item.isArchived,
        isPublished: !item.isDraft && !item.isArchived,
        lastPublished: item.lastPublished,
        visibleOnSite: !item.isDraft && !item.isArchived && !!item.lastPublished,
      },
    });
  } catch (error: any) {
    logger.error('Error checking Webflow item:', error);
    return NextResponse.json(
      {
        error: 'Failed to check Webflow item',
        message: error.message || 'Unknown error',
        details: error.stack,
      },
      { status: 500 }
    );
  }
}

