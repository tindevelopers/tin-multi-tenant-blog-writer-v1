/**
 * Webflow Field Mapping Utility
 * Handles mapping blog post fields to Webflow CMS collection fields
 */

import { createServiceClient } from '@/lib/supabase/service';
import { logger } from '@/utils/logger';
import type { FieldMapping } from './types';

export interface BlogPostData {
  title: string;
  content: string;
  excerpt?: string;
  slug?: string;
  featured_image?: string;
  published_at?: string;
  seo_title?: string;
  seo_description?: string;
  tags?: string[];
  categories?: string[];
  author?: string;
  [key: string]: unknown;
}

/**
 * Get Webflow field mappings for an organization
 * Retrieves mappings from organization settings or uses defaults
 */
export async function getWebflowFieldMappings(orgId: string): Promise<FieldMapping[]> {
  try {
    const supabase = createServiceClient();
    
    // Try to get field mappings from integrations table
    const { data: integration } = await supabase
      .from('integrations')
      .select('field_mappings')
      .eq('org_id', orgId)
      .eq('type', 'webflow')
      .eq('status', 'active')
      .single();

    if (integration?.field_mappings) {
      // Handle both array and object formats
      let mappings: FieldMapping[] = [];
      if (Array.isArray(integration.field_mappings)) {
        mappings = integration.field_mappings as FieldMapping[];
      } else if (typeof integration.field_mappings === 'object') {
        // Convert object format to array if needed
        mappings = Object.entries(integration.field_mappings).map(([blogField, targetField]) => ({
          blogField: blogField as FieldMapping['blogField'],
          targetField: targetField as string,
        }));
      }
      
      if (mappings.length > 0) {
        logger.debug('Using stored Webflow field mappings', { 
          orgId, 
          mappingCount: mappings.length 
        });
        return mappings;
      }
    }

    // Try to get from organization settings
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('org_id', orgId)
      .single();

    if (org?.settings && typeof org.settings === 'object') {
      const settings = org.settings as Record<string, unknown>;
      const webflowSettings = settings.webflow as Record<string, unknown> | undefined;
      
      if (webflowSettings?.field_mappings) {
        let mappings: FieldMapping[] = [];
        if (Array.isArray(webflowSettings.field_mappings)) {
          mappings = webflowSettings.field_mappings as FieldMapping[];
        } else if (typeof webflowSettings.field_mappings === 'object') {
          // Convert object format to array if needed
          mappings = Object.entries(webflowSettings.field_mappings).map(([blogField, targetField]) => ({
            blogField: blogField as FieldMapping['blogField'],
            targetField: targetField as string,
          }));
        }
        
        if (mappings.length > 0) {
          logger.debug('Using Webflow field mappings from org settings', { 
            orgId, 
            mappingCount: mappings.length 
          });
          return mappings;
        }
      }
    }

    // Return default mappings if none found
    logger.debug('Using default Webflow field mappings', { orgId });
    return getDefaultWebflowFieldMappings();
  } catch (error) {
    logger.error('Error retrieving Webflow field mappings:', error);
    // Return defaults on error
    return getDefaultWebflowFieldMappings();
  }
}

/**
 * Get default Webflow field mappings
 * These are common field names used in Webflow CMS collections
 */
export function getDefaultWebflowFieldMappings(): FieldMapping[] {
  return [
    {
      blogField: 'title',
      targetField: 'name', // Webflow uses 'name' for the title field
    },
    {
      blogField: 'content',
      targetField: 'post-body', // Common Webflow field name for blog content
    },
    {
      blogField: 'slug',
      targetField: 'slug',
    },
    {
      blogField: 'excerpt',
      targetField: 'post-summary',
    },
    {
      blogField: 'featured_image',
      targetField: 'post-image',
    },
    {
      blogField: 'published_at',
      targetField: 'publish-date',
      transform: {
        type: 'date-format',
        config: { format: 'ISO8601' },
      },
    },
    {
      blogField: 'seo_title',
      targetField: 'seo-title',
    },
    {
      blogField: 'seo_description',
      targetField: 'seo-description',
    },
  ];
}

/**
 * Apply field mappings to transform blog post data for Webflow
 */
export function applyWebflowFieldMappings(
  blogPost: BlogPostData,
  mappings: FieldMapping[]
): Record<string, unknown> {
  const transformed: Record<string, unknown> = {};

  for (const mapping of mappings) {
    const value = getBlogFieldValue(blogPost, mapping.blogField);
    
    if (value !== undefined && value !== null) {
      let transformedValue = value;
      
      // Apply transformation if specified
      if (mapping.transform) {
        transformedValue = applyTransform(value, mapping.transform);
      }
      
      transformed[mapping.targetField] = transformedValue;
    }
  }

  return transformed;
}

/**
 * Get value from blog post for a specific field
 */
function getBlogFieldValue(blogPost: BlogPostData, field: string): unknown {
  switch (field) {
    case 'title':
      return blogPost.title;
    case 'content':
      return blogPost.content;
    case 'excerpt':
      return blogPost.excerpt;
    case 'slug':
      return blogPost.slug || generateSlug(blogPost.title);
    case 'featured_image':
      return blogPost.featured_image;
    case 'published_at':
      return blogPost.published_at || new Date().toISOString();
    case 'seo_title':
      return blogPost.seo_title || blogPost.title;
    case 'seo_description':
      return blogPost.seo_description || blogPost.excerpt;
    case 'tags':
      return blogPost.tags || [];
    case 'categories':
      return blogPost.categories || [];
    case 'author':
      return blogPost.author;
    default:
      return blogPost[field];
  }
}

/**
 * Apply field transformation
 */
function applyTransform(value: unknown, transform: { type: string; config?: Record<string, unknown> }): unknown {
  switch (transform.type) {
    case 'date-format':
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === 'string') {
        return new Date(value).toISOString();
      }
      return value;
    
    case 'html-to-markdown':
      // Basic HTML to markdown conversion (can be enhanced)
      if (typeof value === 'string') {
        return value
          .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n')
          .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n')
          .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n')
          .replace(/<p>(.*?)<\/p>/gi, '$1\n')
          .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
          .replace(/<em>(.*?)<\/em>/gi, '*$1*')
          .replace(/<a href="(.*?)">(.*?)<\/a>/gi, '[$2]($1)')
          .replace(/<img[^>]+src="([^"]+)"[^>]*>/gi, '![image]($1)');
      }
      return value;
    
    case 'markdown-to-html':
      // Markdown to HTML conversion (can be enhanced with a proper markdown parser)
      if (typeof value === 'string') {
        return value; // For now, assume content is already HTML
      }
      return value;
    
    case 'none':
    default:
      return value;
  }
}

/**
 * Generate URL-friendly slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Save Webflow field mappings for an organization
 */
export async function saveWebflowFieldMappings(
  orgId: string,
  mappings: FieldMapping[]
): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    
    // Try to update existing integration
    const { data: existingIntegration } = await supabase
      .from('integrations')
      .select('integration_id')
      .eq('org_id', orgId)
      .eq('type', 'webflow')
      .single();

    if (existingIntegration) {
      const { error } = await supabase
        .from('integrations')
        .update({ field_mappings: mappings })
        .eq('integration_id', existingIntegration.integration_id);

      if (error) throw error;
      logger.debug('Updated Webflow field mappings in integrations table', { orgId });
      return true;
    }

    // If no integration exists, store in organization settings
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('org_id', orgId)
      .single();

    if (org) {
      const settings = (org.settings || {}) as Record<string, unknown>;
      const updatedSettings = {
        ...settings,
        webflow: {
          ...(settings.webflow as Record<string, unknown> || {}),
          field_mappings: mappings,
        },
      };

      const { error } = await supabase
        .from('organizations')
        .update({ settings: updatedSettings })
        .eq('org_id', orgId);

      if (error) throw error;
      logger.debug('Saved Webflow field mappings to org settings', { orgId });
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Error saving Webflow field mappings:', error);
    return false;
  }
}

