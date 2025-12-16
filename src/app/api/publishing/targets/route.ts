/**
 * API Route: Get Publishing Targets
 * 
 * GET /api/publishing/targets
 * 
 * Returns all configured publishing targets (Webflow sites, WordPress sites, etc.)
 * grouped by provider with their available collections.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';
import { logger } from '@/utils/logger';
import { PublishingTargetsResponse, PublishingSite, CMSProvider } from '@/types/publishing';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(request);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile?.org_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 404 }
      );
    }

    const orgId = userProfile.org_id;

    // Fetch all integrations for this organization
    const dbAdapter = new EnvironmentIntegrationsDB();
    const integrations = await dbAdapter.getIntegrations(orgId);

    // Filter to active integrations only
    const activeIntegrations = integrations.filter(
      (int) => int.status === 'active'
    );

    // Build providers list (unique)
    const providersSet = new Set<string>();
    activeIntegrations.forEach((int) => {
      if (int.type) {
        providersSet.add(int.type);
      }
    });
    const providers = Array.from(providersSet);

    // Build sites list with collections
    const sites: PublishingSite[] = activeIntegrations.map((int) => {
      // Extract site_id from various locations
      const siteId = 
        int.config?.site_id ||
        int.config?.siteId ||
        (int as any).metadata?.site_id ||
        int.integration_id ||
        (int as any).id ||
        'unknown';

      // Extract site name
      const siteName = 
        int.name ||
        int.config?.site_name ||
        int.config?.siteName ||
        (int as any).metadata?.name ||
        `${int.type} Site (${siteId.substring(0, 8)}...)`;

      // Extract collections - can be in config.collection_id or config.collections
      const collections: string[] = [];
      if (int.config?.collection_id) {
        collections.push(int.config.collection_id as string);
      }
      if (int.config?.collectionId) {
        collections.push(int.config.collectionId as string);
      }
      if (Array.isArray(int.config?.collections)) {
        collections.push(...(int.config.collections as string[]));
      }
      if (Array.isArray((int as any).metadata?.collections)) {
        collections.push(...((int as any).metadata.collections as string[]));
      }

      // Deduplicate collections
      const uniqueCollections = [...new Set(collections)];

      return {
        id: siteId,
        name: siteName,
        provider: int.type as CMSProvider,
        collections: uniqueCollections,
        is_default: (int as any).is_default || false,
        // Include integration_id for reference
        integration_id: int.integration_id || (int as any).id,
      };
    });

    // Find default target
    const defaultSite = sites.find((s) => s.is_default) || sites[0];
    const defaultTarget = defaultSite
      ? {
          cms_provider: defaultSite.provider,
          site_id: defaultSite.id,
          collection_id: defaultSite.collections[0] || undefined,
          site_name: defaultSite.name,
        }
      : null;

    const response: PublishingTargetsResponse = {
      providers,
      sites,
      default: defaultTarget,
    };

    logger.debug('Publishing targets fetched', {
      orgId,
      providerCount: providers.length,
      siteCount: sites.length,
      hasDefault: !!defaultTarget,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching publishing targets', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to fetch publishing targets' },
      { status: 500 }
    );
  }
}
