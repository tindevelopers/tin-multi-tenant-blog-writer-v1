/**
 * GET /api/test/webflow-inspect-collection
 * Inspect a Webflow collection schema to see available fields
 * 
 * Query params:
 *   - collection_id: The Webflow collection ID (required)
 *   - api_key: Webflow API key (optional, uses integration if not provided)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWebflowCollectionById } from '@/lib/integrations/webflow-api';
import { logger } from '@/utils/logger';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      logger.error('Auth error in webflow-inspect-collection:', authError);
      return NextResponse.json({ error: 'Authentication error', details: authError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get('collection_id');
    const apiKey = searchParams.get('api_key');

    if (!collectionId) {
      return NextResponse.json(
        { error: 'collection_id query parameter is required' },
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

    logger.debug('Inspecting Webflow collection', { collectionId, hasApiKey: !!finalApiKey });

    // Fetch collection schema
    let collection;
    try {
      collection = await getWebflowCollectionById(finalApiKey, collectionId);
      logger.debug('Successfully fetched Webflow collection', { 
        collectionId, 
        fieldCount: collection.fields?.length || 0 
      });
    } catch (webflowError: any) {
      logger.error('Error fetching Webflow collection:', webflowError);
      return NextResponse.json(
        {
          error: 'Failed to fetch Webflow collection',
          message: webflowError.message || 'Unknown Webflow API error',
          details: webflowError.toString(),
        },
        { status: 500 }
      );
    }

    // Get sample items to see field data structure
    let sampleItems: any[] = [];
    try {
      const itemsResponse = await fetch(
        `https://api.webflow.com/v2/collections/${collectionId}/items?limit=3`,
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
        sampleItems = itemsData.items || [];
      }
    } catch (error) {
      logger.warn('Could not fetch sample items', { error });
    }

    // Generate field mapping suggestions
    const fieldSlugs = collection.fields.map(f => f.slug);
    const suggestions: Record<string, string[]> = {
      'title': ['name', 'title', 'post-title', 'blog-title', 'headline'],
      'content': ['post-body', 'body', 'content', 'post-content', 'main-content', 'rich-text', 'description'],
      'excerpt': ['excerpt', 'post-summary', 'summary', 'description', 'short-description', 'intro'],
      'slug': ['slug', 'url-slug', 'post-slug', 'url'],
      'featured_image': ['main-image', 'featured-image', 'post-image', 'image', 'thumbnail', 'cover-image', 'hero-image', 'feature-image'],
      'seo_title': ['seo-title', 'meta-title', 'og-title', 'seo-meta-title'],
      'seo_description': ['seo-description', 'meta-description', 'og-description', 'seo-meta-description'],
      'published_at': ['publish-date', 'published-date', 'date', 'published-at', 'post-date', 'publish-date-time'],
    };

    const fieldMappings: Record<string, { suggested: string[]; found: string | null }> = {};
    for (const [blogField, possibleFields] of Object.entries(suggestions)) {
      const matches = possibleFields.filter(f => fieldSlugs.includes(f));
      fieldMappings[blogField] = {
        suggested: possibleFields,
        found: matches.length > 0 ? matches[0] : null,
      };
    }

    return NextResponse.json({
      success: true,
      collection: {
        id: collection.id,
        displayName: collection.displayName,
        singularName: collection.singularName,
        slug: collection.slug,
        fieldCount: collection.fields.length,
      },
      fields: collection.fields.map(f => ({
        id: f.id,
        displayName: f.displayName,
        slug: f.slug,
        type: f.type,
        isRequired: f.isRequired || false,
        isEditable: f.isEditable !== false,
      })),
      fieldMappings,
      sampleItems: sampleItems.map(item => ({
        id: item.id,
        isDraft: item.isDraft,
        fieldData: item.fieldData,
      })),
      recommendations: {
        titleField: fieldMappings.title.found || 'NOT FOUND - Configure field mapping',
        contentField: fieldMappings.content.found || 'NOT FOUND - Configure field mapping',
        imageField: fieldMappings.featured_image.found || 'NOT FOUND - Image may not upload',
      },
    });
  } catch (error: any) {
    logger.error('Error inspecting Webflow collection:', {
      error: error.message || error,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      {
        error: 'Failed to inspect Webflow collection',
        message: error.message || 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

