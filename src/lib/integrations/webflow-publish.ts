/**
 * Webflow Publishing Functions
 * 
 * Functions to publish blog posts to Webflow CMS collections
 */

import { logger } from '@/utils/logger';
import { getWebflowFieldMappings, applyWebflowFieldMappings } from './webflow-field-mapping';
import { autoDetectWebflowSiteId, getWebflowCollectionById } from './webflow-api';

export interface WebflowItem {
  id: string;
  cmsLocaleId: string;
  lastPublished: string | null;
  lastUpdated: string;
  createdOn: string;
  isArchived: boolean;
  isDraft: boolean;
  fieldData: Record<string, unknown>;
}

export interface CreateWebflowItemParams {
  apiKey: string;
  collectionId: string;
  fieldData: Record<string, unknown>;
  isDraft?: boolean;
}

/**
 * Create a new item in a Webflow CMS collection
 * In Webflow API v2, items are published immediately if isDraft is false
 */
export async function createWebflowItem(params: CreateWebflowItemParams): Promise<WebflowItem> {
  const { apiKey, collectionId, fieldData, isDraft = false } = params;

  try {
    const response = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        fieldData,
        isDraft,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Webflow API error creating item:', {
        status: response.status,
        error: errorText,
        collectionId,
      });
      throw new Error(`Webflow API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const item: WebflowItem = await response.json();
    logger.debug('Successfully created Webflow item', { 
      itemId: item.id, 
      collectionId,
      isDraft: item.isDraft 
    });
    return item;
  } catch (error: any) {
    logger.error('Error creating Webflow item:', error);
    throw new Error(`Failed to create Webflow item: ${error.message}`);
  }
}

/**
 * Publish a Webflow site (makes all draft items live)
 * Note: In Webflow API v2, individual items cannot be published separately.
 * Items are published when created with isDraft: false, or by publishing the entire site.
 */
export async function publishWebflowSite(
  apiKey: string,
  siteId: string,
  itemIds?: string[]
): Promise<{ published: boolean }> {
  try {
    const response = await fetch(
      `https://api.webflow.com/v2/sites/${siteId}/publish`,
      {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          // Optionally specify which items to publish
          // If not provided, publishes all draft items
          ...(itemIds && itemIds.length > 0 ? { itemIds } : {}),
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Webflow API error publishing site:', {
        status: response.status,
        error: errorText,
        siteId,
        itemIds,
      });
      throw new Error(`Webflow API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    logger.debug('Successfully published Webflow site', { siteId, itemIds });
    return { published: true };
  } catch (error: any) {
    logger.error('Error publishing Webflow site:', error);
    throw new Error(`Failed to publish Webflow site: ${error.message}`);
  }
}

/**
 * Publish a blog post to Webflow
 */
export async function publishBlogToWebflow(params: {
  apiKey: string;
  collectionId: string;
  siteId: string;
  blogPost: {
    title: string;
    content: string;
    excerpt?: string;
    slug?: string;
    featured_image?: string;
    seo_title?: string;
    seo_description?: string;
    published_at?: string;
    tags?: string[];
    categories?: string[];
  };
  orgId?: string;
  isDraft?: boolean;
  publishImmediately?: boolean;
}): Promise<{ itemId: string; published: boolean; url?: string }> {
  const {
    apiKey,
    collectionId,
    siteId,
    blogPost,
    orgId,
    isDraft = false,
    publishImmediately = true,
  } = params;

  try {
    // Auto-detect siteId if not provided
    let finalSiteId = siteId;
    if (!finalSiteId) {
      logger.debug('Auto-detecting Webflow site ID', { collectionId });
      const detectedSiteId = await autoDetectWebflowSiteId(apiKey, collectionId);
      if (!detectedSiteId) {
        throw new Error('Could not auto-detect Webflow site ID. Please provide siteId in integration config.');
      }
      finalSiteId = detectedSiteId;
      logger.debug('Auto-detected site ID', { siteId: finalSiteId });
    }

    // Fetch collection schema to validate fields
    logger.debug('Fetching Webflow collection schema', { collectionId });
    const collection = await getWebflowCollectionById(apiKey, collectionId);
    const availableFieldSlugs = new Set(collection.fields.map(f => f.slug));
    
    logger.debug('Available Webflow fields', { 
      collectionId, 
      fields: collection.fields.map(f => ({ slug: f.slug, displayName: f.displayName, type: f.type }))
    });

    // Get field mappings if orgId is provided
    let fieldData: Record<string, unknown>;
    if (orgId) {
      const mappings = await getWebflowFieldMappings(orgId);
      const mappedData = applyWebflowFieldMappings(
        {
          title: blogPost.title,
          content: blogPost.content,
          excerpt: blogPost.excerpt || '',
          slug: blogPost.slug,
          featured_image: blogPost.featured_image,
          seo_title: blogPost.seo_title,
          seo_description: blogPost.seo_description,
          published_at: blogPost.published_at || new Date().toISOString(),
          tags: blogPost.tags || [],
          categories: blogPost.categories || [],
        },
        mappings
      );
      
      // Filter out fields that don't exist in the collection
      fieldData = {};
      const missingFields: string[] = [];
      for (const [fieldSlug, value] of Object.entries(mappedData)) {
        if (availableFieldSlugs.has(fieldSlug)) {
          fieldData[fieldSlug] = value;
        } else {
          missingFields.push(fieldSlug);
          logger.warn(`Field "${fieldSlug}" not found in Webflow collection, skipping`, {
            collectionId,
            availableFields: Array.from(availableFieldSlugs),
          });
        }
      }
      
      if (missingFields.length > 0) {
        logger.warn('Some mapped fields were not found in Webflow collection', {
          missingFields,
          availableFields: Array.from(availableFieldSlugs),
        });
      }
    } else {
      // Use default field mapping, but only include fields that exist
      fieldData = {};
      
      // Try common Webflow field names
      if (availableFieldSlugs.has('name')) {
        fieldData.name = blogPost.title;
      } else if (availableFieldSlugs.has('title')) {
        fieldData.title = blogPost.title;
      }
      
      // Try various content field names
      const contentFields = ['post-body', 'body', 'content', 'post-content', 'main-content'];
      for (const fieldName of contentFields) {
        if (availableFieldSlugs.has(fieldName)) {
          fieldData[fieldName] = blogPost.content;
          break;
        }
      }
      
      // Try excerpt/summary fields
      const excerptFields = ['excerpt', 'post-summary', 'summary', 'description'];
      for (const fieldName of excerptFields) {
        if (availableFieldSlugs.has(fieldName) && blogPost.excerpt) {
          fieldData[fieldName] = blogPost.excerpt;
          break;
        }
      }
      
      // Slug field
      if (availableFieldSlugs.has('slug')) {
        fieldData.slug = blogPost.slug || generateSlug(blogPost.title);
      }
      
      // Image fields
      const imageFields = ['main-image', 'featured-image', 'post-image', 'image', 'thumbnail'];
      for (const fieldName of imageFields) {
        if (availableFieldSlugs.has(fieldName) && blogPost.featured_image) {
          fieldData[fieldName] = blogPost.featured_image;
          break;
        }
      }
      
      // SEO fields
      if (availableFieldSlugs.has('seo-title') && blogPost.seo_title) {
        fieldData['seo-title'] = blogPost.seo_title;
      }
      if (availableFieldSlugs.has('seo-description') && blogPost.seo_description) {
        fieldData['seo-description'] = blogPost.seo_description;
      }
      
      // Date fields
      const dateFields = ['publish-date', 'published-date', 'date', 'published-at'];
      for (const fieldName of dateFields) {
        if (availableFieldSlugs.has(fieldName)) {
          fieldData[fieldName] = blogPost.published_at || new Date().toISOString();
          break;
        }
      }
    }
    
    // Validate that we have at least the name/title field
    if (!fieldData.name && !fieldData.title) {
      const availableFields = Array.from(availableFieldSlugs).join(', ');
      throw new Error(
        `Cannot publish: No title field found in Webflow collection. ` +
        `Available fields: ${availableFields}. ` +
        `Please configure field mappings in the integration settings.`
      );
    }
    
    logger.debug('Final field data to publish', { 
      fieldSlugs: Object.keys(fieldData),
      collectionId 
    });

    // Create the item (published immediately if isDraft is false)
    const item = await createWebflowItem({
      apiKey,
      collectionId,
      fieldData,
      isDraft: publishImmediately ? false : isDraft, // If publishImmediately, set isDraft to false
    });

    // In Webflow API v2, items are published when created with isDraft: false
    // If we created as draft but want to publish, we need to publish the site
    let published = false;
    if (publishImmediately && !isDraft) {
      // Item is already published if isDraft was false
      published = !item.isDraft;
      
      // If item was created as draft but we want to publish immediately,
      // we need to publish the site (which publishes all draft items)
      if (item.isDraft && finalSiteId) {
        try {
          await publishWebflowSite(apiKey, finalSiteId, [item.id]);
          published = true;
          logger.debug('Published Webflow item via site publish', { itemId: item.id, siteId: finalSiteId });
        } catch (publishError) {
          logger.warn('Failed to publish site, item created as draft', {
            itemId: item.id,
            siteId: finalSiteId,
            error: publishError,
          });
          // Item was created successfully, just not published yet
          published = false;
        }
      }
    } else {
      published = !item.isDraft;
    }

    // Generate URL (Webflow pattern: https://{siteId}.webflow.io/{slug})
    const slug = blogPost.slug || generateSlug(blogPost.title);
    const url = finalSiteId ? `https://${finalSiteId}.webflow.io/${slug}` : undefined;

    return {
      itemId: item.id,
      published,
      url: published ? url : undefined,
    };
  } catch (error: any) {
    logger.error('Error publishing blog to Webflow:', error);
    throw error;
  }
}

/**
 * Generate a URL-friendly slug from a title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

