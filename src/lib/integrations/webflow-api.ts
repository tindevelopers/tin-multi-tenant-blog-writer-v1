import { logger } from '@/utils/logger';
/**
 * Webflow API Client
 * 
 * Utility functions for interacting with Webflow API v2
 * Reference: https://developers.webflow.com/data/v2.0.0/docs
 */

export interface WebflowSite {
  id: string;
  displayName: string;
  shortName: string;
  createdOn: string;
  lastPublished?: string;
  previewUrl?: string;
  timezone?: string;
}

export interface WebflowCollection {
  id: string;
  displayName: string;
  singularName: string;
  slug: string;
  fields: Array<{
    id: string;
    displayName: string;
    slug: string;
    type: string;
    isRequired?: boolean;
  }>;
}

export interface WebflowSitesResponse {
  sites: WebflowSite[];
}

export interface WebflowCollectionsResponse {
  collections: WebflowCollection[];
}

/**
 * Get list of sites accessible with the given API key
 */
export async function getWebflowSites(apiKey: string): Promise<WebflowSite[]> {
  try {
    const response = await fetch('https://api.webflow.com/v2/sites', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webflow API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: WebflowSitesResponse = await response.json();
    return data.sites || [];
  } catch (error: any) {
    logger.error('Error fetching Webflow sites:', error);
    throw new Error(`Failed to fetch Webflow sites: ${error.message}`);
  }
}

/**
 * Get collections for a specific site
 */
export async function getWebflowCollections(
  apiKey: string,
  siteId: string
): Promise<WebflowCollection[]> {
  try {
    const response = await fetch(`https://api.webflow.com/v2/sites/${siteId}/collections`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webflow API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: WebflowCollectionsResponse = await response.json();
    return data.collections || [];
  } catch (error: any) {
    logger.error('Error fetching Webflow collections:', error);
    throw new Error(`Failed to fetch Webflow collections: ${error.message}`);
  }
}

/**
 * Auto-detect Site ID from API key
 * 
 * Strategy:
 * 1. Fetch all sites accessible with the API key
 * 2. If only one site, return it
 * 3. If multiple sites and collectionId provided, find the site that contains the collection
 * 4. Otherwise, return the first site (or null if no sites)
 */
export async function autoDetectWebflowSiteId(
  apiKey: string,
  collectionId?: string
): Promise<string | null> {
  try {
    const sites = await getWebflowSites(apiKey);

    if (sites.length === 0) {
      return null;
    }

    // If only one site, use it
    if (sites.length === 1) {
      return sites[0].id;
    }

    // If collectionId provided, find the site that contains it
    if (collectionId) {
      for (const site of sites) {
        try {
          const collections = await getWebflowCollections(apiKey, site.id);
          const hasCollection = collections.some(c => c.id === collectionId);
          if (hasCollection) {
            return site.id;
          }
        } catch (error) {
          // If we can't fetch collections for this site, skip it
          logger.warn(`Could not fetch collections for site ${site.id}:`, error);
          continue;
        }
      }
    }

    // If no match found or no collectionId provided, return first site
    // (API keys are usually site-specific, so this should be fine)
    return sites[0].id;
  } catch (error: any) {
    logger.error('Error auto-detecting Webflow site ID:', error);
    throw error;
  }
}

/**
 * Test Webflow API connection
 * 
 * Verifies that the API key is valid and can access the specified site/collection
 */
export async function testWebflowConnection(
  apiKey: string,
  siteId?: string,
  collectionId?: string
): Promise<{ success: boolean; message: string; siteId?: string; siteName?: string }> {
  try {
    // Test 1: Verify API key by fetching sites
    const sites = await getWebflowSites(apiKey);
    
    if (sites.length === 0) {
      return {
        success: false,
        message: 'API key is valid but has no accessible sites',
      };
    }

    // Test 2: If siteId provided, verify it exists
    let targetSite: WebflowSite | undefined;
    if (siteId) {
      targetSite = sites.find(s => s.id === siteId);
      if (!targetSite) {
        return {
          success: false,
          message: `Site ID ${siteId} not found or not accessible with this API key`,
        };
      }
    } else {
      // Auto-detect site ID
      const autoSiteId = await autoDetectWebflowSiteId(apiKey, collectionId);
      if (autoSiteId) {
        targetSite = sites.find(s => s.id === autoSiteId);
      }
    }

    // Test 3: If collectionId provided, verify it exists in the site
    if (collectionId && targetSite) {
      const collections = await getWebflowCollections(apiKey, targetSite.id);
      const hasCollection = collections.some(c => c.id === collectionId);
      
      if (!hasCollection) {
        return {
          success: false,
          message: `Collection ID ${collectionId} not found in site "${targetSite.displayName}"`,
          siteId: targetSite.id,
          siteName: targetSite.displayName,
        };
      }
    }

    return {
      success: true,
      message: targetSite
        ? `Successfully connected to site "${targetSite.displayName}"`
        : 'API key is valid',
      siteId: targetSite?.id,
      siteName: targetSite?.displayName,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Connection test failed',
    };
  }
}

