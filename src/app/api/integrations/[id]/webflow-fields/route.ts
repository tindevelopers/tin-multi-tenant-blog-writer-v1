import { NextRequest, NextResponse } from 'next/server';
import { getWebflowCollections } from '@/lib/integrations/webflow-api';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser } from '@/lib/api-utils';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';

/**
 * GET /api/integrations/[id]/webflow-fields
 * Fetch Webflow CMS collection fields for field mapping
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the integration using the database adapter (handles environment-suffixed tables)
    const dbAdapter = new EnvironmentIntegrationsDB();
    const integration = await dbAdapter.getIntegration(id, user.org_id);

    if (!integration) {
      logger.error('Integration not found', { integrationId: id, orgId: user.org_id });
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    if (integration.type !== 'webflow') {
      return NextResponse.json({ error: 'This endpoint is only for Webflow integrations' }, { status: 400 });
    }

    const config = integration.config as Record<string, unknown>;
    const apiKey = config.api_key as string | undefined;
    const siteId = config.site_id as string | undefined;
    const collectionId = config.collection_id as string | undefined;

    if (!apiKey || !siteId || !collectionId) {
      return NextResponse.json(
        { error: 'Webflow integration is not fully configured. Please ensure API key, Site ID, and Collection ID are set.' },
        { status: 400 }
      );
    }

    // Fetch collections for the site
    const collections = await getWebflowCollections(apiKey, siteId);
    
    // Find the specific collection
    const collection = collections.find(c => c.id === collectionId);
    
    if (!collection) {
      return NextResponse.json(
        { error: `Collection ${collectionId} not found in site ${siteId}` },
        { status: 404 }
      );
    }

    // Return collection fields
    return NextResponse.json({
      success: true,
      collection: {
        id: collection.id,
        displayName: collection.displayName,
        singularName: collection.singularName,
        slug: collection.slug,
        fields: collection.fields.map(field => ({
          id: field.id,
          displayName: field.displayName,
          slug: field.slug,
          type: field.type,
          isRequired: field.isRequired || false,
        })),
      },
    });
  } catch (error) {
    logger.error('Error fetching Webflow collection fields:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch collection fields' },
      { status: 500 }
    );
  }
}

