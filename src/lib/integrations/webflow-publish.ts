/**
 * Webflow Publishing Functions
 * 
 * Functions to publish blog posts to Webflow CMS collections
 */

import { logger } from '@/utils/logger';
import { getWebflowFieldMappings, applyWebflowFieldMappings, autoDetectFieldMappings, getDefaultWebflowFieldMappings } from './webflow-field-mapping';
import { autoDetectWebflowSiteId, getWebflowCollectionById } from './webflow-api';
import { uploadImageToWebflow, validateImageUrl } from './webflow-assets';

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
    logger.info('✅ Successfully created Webflow CMS item', { 
      itemId: item.id, 
      collectionId,
      isDraft: item.isDraft,
      createdOn: item.createdOn,
      lastUpdated: item.lastUpdated,
      isArchived: item.isArchived,
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
    logger.info('✅ Successfully published Webflow site', { 
      siteId, 
      itemIds,
      result,
    });
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
    featured_image_alt?: string;
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
    
    // Create a map of field types for better handling
    const fieldTypeMap = new Map<string, string>();
    collection.fields.forEach(f => {
      fieldTypeMap.set(f.slug, f.type);
    });
    
    logger.debug('Available Webflow fields', { 
      collectionId, 
      fields: collection.fields.map(f => ({ 
        slug: f.slug, 
        displayName: f.displayName, 
        type: f.type,
        isRequired: f.isRequired || false
      })),
      fieldTypeMap: Object.fromEntries(fieldTypeMap)
    });

    // Get field mappings if orgId is provided
    let fieldData: Record<string, unknown>;
    if (orgId) {
      const mappings = await getWebflowFieldMappings(orgId);
      
      // If no custom mappings found, try auto-detection
      const useAutoDetect = mappings.length === 0 || 
        mappings.every(m => m.targetField === getDefaultWebflowFieldMappings().find(d => d.blogField === m.blogField)?.targetField);
      
      let finalMappings = mappings;
      if (useAutoDetect) {
        logger.debug('No custom mappings found, using auto-detection', { collectionId });
        finalMappings = autoDetectFieldMappings(Array.from(availableFieldSlugs), fieldTypeMap);
        logger.debug('Auto-detected field mappings', { mappings: finalMappings });
      }
      
      const mappedData = applyWebflowFieldMappings(
        {
          title: blogPost.title,
          content: blogPost.content,
          excerpt: blogPost.excerpt || '',
          slug: blogPost.slug,
          featured_image: blogPost.featured_image,
          featured_image_alt: blogPost.featured_image_alt,
          seo_title: blogPost.seo_title,
          seo_description: blogPost.seo_description,
          published_at: blogPost.published_at || new Date().toISOString(),
          tags: blogPost.tags || [],
          categories: blogPost.categories || [],
        },
        finalMappings
      );
      
      // Filter out fields that don't exist in the collection and format them correctly
      fieldData = {};
      const missingFields: string[] = [];
      for (const [fieldSlug, value] of Object.entries(mappedData)) {
        if (availableFieldSlugs.has(fieldSlug)) {
          const fieldType = fieldTypeMap.get(fieldSlug);
          
          // Format ImageRef fields correctly - Webflow expects { url: string }
          if (fieldType === 'ImageRef' && typeof value === 'string') {
            const imageUrl = value;
            // validateImageUrl is async, but we'll proceed anyway and let Webflow validate
            // For now, format the field correctly - Webflow will validate the URL
            fieldData[fieldSlug] = { url: imageUrl };
            logger.debug(`Formatted ImageRef field ${fieldSlug}`, { url: imageUrl });
          } else if (fieldType === 'RichText' && typeof value === 'string') {
            // Webflow RichText fields expect HTML
            fieldData[fieldSlug] = value;
          } else if (fieldType === 'Date' && typeof value === 'string') {
            // Webflow Date fields expect ISO 8601 format
            fieldData[fieldSlug] = new Date(value).toISOString();
          } else {
            // For other field types, use value as-is
            fieldData[fieldSlug] = value;
          }
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
      
      // Image fields - handle image upload/validation
      const imageFields = ['main-image', 'featured-image', 'post-image', 'image', 'thumbnail', 'cover-image', 'hero-image'];
      if (blogPost.featured_image) {
        // Use external URL directly (Webflow supports this for ImageRef fields)
        // Webflow will validate the URL when creating the item
        const imageUrl = blogPost.featured_image;
        
        // Find matching image field
        for (const fieldName of imageFields) {
          if (availableFieldSlugs.has(fieldName)) {
            const fieldType = fieldTypeMap.get(fieldName);
            // Webflow ImageRef fields expect { url: string } format
            if (fieldType === 'ImageRef' || fieldType === 'FileRef') {
              fieldData[fieldName] = { url: imageUrl };
              logger.debug('Mapped featured image to Webflow ImageRef field', { 
                fieldName, 
                imageUrl,
                fieldType,
                formatted: { url: imageUrl }
              });
              break;
            } else if (fieldType === 'Image' || !fieldType) {
              // Fallback for other image types - try URL string format
              fieldData[fieldName] = imageUrl;
              logger.debug('Mapped featured image to Webflow field (string format)', { 
                fieldName, 
                imageUrl,
                fieldType 
              });
              break;
            }
          }
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
    const hasTitleField = fieldData.name || fieldData.title || 
      Array.from(availableFieldSlugs).some(slug => 
        ['name', 'title', 'post-title', 'blog-title'].includes(slug) && fieldData[slug]
      );
    
    if (!hasTitleField) {
      const availableFields = Array.from(availableFieldSlugs).join(', ');
      const mappedFields = Object.keys(fieldData).join(', ');
      logger.error('Missing required title field', {
        availableFields,
        mappedFields,
        fieldData,
        collectionId
      });
      throw new Error(
        `Cannot publish: No title field found in Webflow collection. ` +
        `Available fields: ${availableFields}. ` +
        `Mapped fields: ${mappedFields}. ` +
        `Please configure field mappings in the integration settings.`
      );
    }
    
    // Log final field data for debugging
    logger.info('Final field data prepared for Webflow', {
      collectionId,
      siteId: finalSiteId,
      fieldCount: Object.keys(fieldData).length,
      fields: Object.keys(fieldData),
      fieldData: Object.fromEntries(
        Object.entries(fieldData).map(([key, value]) => [
          key,
          typeof value === 'string' && value.length > 100 
            ? `${value.substring(0, 100)}...` 
            : typeof value === 'object' && value !== null
            ? JSON.stringify(value).substring(0, 100)
            : value
        ])
      ),
      isDraft,
      publishImmediately,
    });
    
    logger.debug('Final field data to publish', { 
      fieldSlugs: Object.keys(fieldData),
      collectionId,
      fieldDataKeys: Object.keys(fieldData),
    });

    // Create the item (published immediately if isDraft is false)
    logger.info('Creating Webflow CMS item', {
      collectionId,
      siteId: finalSiteId,
      isDraft: publishImmediately ? false : isDraft,
      publishImmediately,
      fieldCount: Object.keys(fieldData).length,
    });
    
    const item = await createWebflowItem({
      apiKey,
      collectionId,
      fieldData,
      isDraft: publishImmediately ? false : isDraft, // If publishImmediately, set isDraft to false
    });
    
    logger.info('Webflow CMS item created successfully', {
      itemId: item.id,
      isDraft: item.isDraft,
      collectionId,
      siteId: finalSiteId,
    });

    // In Webflow, even if an item is created with isDraft: false, 
    // the site itself must be published for the item to appear on the live site.
    // We need to publish the site to make the item visible.
    let published = false;
    
    logger.info('Attempting to publish Webflow site', {
      itemId: item.id,
      siteId: finalSiteId,
      itemIsDraft: item.isDraft,
      publishImmediately,
      isDraft,
    });
    
    if (publishImmediately && !isDraft && finalSiteId) {
      try {
        // Publish the site to make the item live
        logger.info('Publishing Webflow site with new item', {
          itemId: item.id,
          siteId: finalSiteId,
          itemIsDraft: item.isDraft,
        });
        
        await publishWebflowSite(apiKey, finalSiteId, [item.id]);
        published = true;
        
        logger.info('✅ Successfully published Webflow site with new item', { 
          itemId: item.id, 
          siteId: finalSiteId,
          itemIsDraft: item.isDraft,
        });
      } catch (publishError: any) {
        logger.error('❌ Failed to publish Webflow site, item may not be visible on live site', {
          itemId: item.id,
          siteId: finalSiteId,
          error: publishError?.message || publishError,
          errorStack: publishError?.stack,
        });
        // Item was created successfully, but site wasn't published
        // The item exists in CMS but won't be visible until site is published manually
        published = false;
      }
    } else if (isDraft) {
      // Item was created as draft
      logger.info('Item created as draft, site publishing skipped', {
        itemId: item.id,
        isDraft,
      });
      published = false;
    } else {
      // Item was created without draft flag, but site still needs to be published
      // Try to publish the site anyway
      if (finalSiteId) {
        try {
          logger.info('Publishing Webflow site after item creation (fallback)', {
            siteId: finalSiteId,
            itemId: item.id,
          });
          
          await publishWebflowSite(apiKey, finalSiteId, [item.id]);
          published = true;
          
          logger.info('✅ Published Webflow site after item creation', {
            itemId: item.id,
            siteId: finalSiteId,
          });
        } catch (publishError: any) {
          logger.error('❌ Failed to publish Webflow site (fallback)', {
            itemId: item.id,
            siteId: finalSiteId,
            error: publishError?.message || publishError,
            errorStack: publishError?.stack,
          });
          published = false;
        }
      } else {
        logger.warn('⚠️ No siteId available, cannot publish site', {
          itemId: item.id,
          itemIsDraft: item.isDraft,
        });
        published = !item.isDraft;
      }
    }

    // Generate URL
    // Webflow URLs follow: https://{site-slug}.webflow.io/{collection-slug}/{item-slug}
    // However, we don't have the site slug or collection slug from the API response
    // So we'll use the site ID pattern as a fallback
    // Note: The actual URL may differ based on Webflow site configuration
    const slug = blogPost.slug || generateSlug(blogPost.title);
    const collectionSlug = collection.slug || 'blog'; // Default to 'blog' if not available
    const url = finalSiteId 
      ? `https://${finalSiteId}.webflow.io/${collectionSlug}/${slug}` 
      : undefined;

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

