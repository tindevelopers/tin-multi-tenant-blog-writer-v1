/**
 * Webflow CMS Operations
 * 
 * Functions to update, unpublish, and delete Webflow CMS items
 */

import { logger } from '@/utils/logger';
import { WebflowItem } from './webflow-publish';

/**
 * Get a single Webflow CMS item by ID
 */
export async function getWebflowItem(
  apiKey: string,
  collectionId: string,
  itemId: string
): Promise<WebflowItem | null> {
  try {
    const response = await fetch(
      `https://api.webflow.com/v2/collections/${collectionId}/items/${itemId}`,
      {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        logger.warn('Webflow item not found', { itemId, collectionId });
        return null;
      }
      const errorText = await response.text();
      throw new Error(`Webflow API error: ${response.status} - ${errorText}`);
    }

    const item: WebflowItem = await response.json();
    return item;
  } catch (error: any) {
    logger.error('Error fetching Webflow item:', error);
    throw error;
  }
}

/**
 * Update an existing Webflow CMS item
 */
export async function updateWebflowItem(params: {
  apiKey: string;
  collectionId: string;
  itemId: string;
  fieldData: Record<string, unknown>;
  isDraft?: boolean;
}): Promise<WebflowItem> {
  const { apiKey, collectionId, itemId, fieldData, isDraft } = params;

  try {
    const body: Record<string, unknown> = {
      fieldData,
    };
    
    // Only include isDraft if explicitly set
    if (isDraft !== undefined) {
      body.isDraft = isDraft;
    }

    const response = await fetch(
      `https://api.webflow.com/v2/collections/${collectionId}/items/${itemId}`,
      {
        method: 'PATCH',
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Webflow API error updating item:', {
        status: response.status,
        error: errorText,
        itemId,
        collectionId,
      });
      throw new Error(`Webflow API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const item: WebflowItem = await response.json();
    logger.info('✅ Successfully updated Webflow CMS item', {
      itemId: item.id,
      collectionId,
      isDraft: item.isDraft,
      lastUpdated: item.lastUpdated,
    });
    return item;
  } catch (error: any) {
    logger.error('Error updating Webflow item:', error);
    throw new Error(`Failed to update Webflow item: ${error.message}`);
  }
}

/**
 * Unpublish a Webflow CMS item (set to draft)
 * Note: After calling this, you should publish the site to reflect the change
 */
export async function unpublishWebflowItem(params: {
  apiKey: string;
  collectionId: string;
  itemId: string;
}): Promise<WebflowItem> {
  const { apiKey, collectionId, itemId } = params;

  try {
    // Get current item to preserve field data
    const currentItem = await getWebflowItem(apiKey, collectionId, itemId);
    if (!currentItem) {
      throw new Error('Item not found');
    }

    // Update item with isDraft: true
    const response = await fetch(
      `https://api.webflow.com/v2/collections/${collectionId}/items/${itemId}`,
      {
        method: 'PATCH',
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          isDraft: true,
          // Preserve existing field data
          fieldData: currentItem.fieldData,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Webflow API error unpublishing item:', {
        status: response.status,
        error: errorText,
        itemId,
        collectionId,
      });
      throw new Error(`Webflow API error: ${response.status} - ${errorText}`);
    }

    const item: WebflowItem = await response.json();
    logger.info('✅ Successfully unpublished Webflow CMS item (set to draft)', {
      itemId: item.id,
      collectionId,
      isDraft: item.isDraft,
    });
    return item;
  } catch (error: any) {
    logger.error('Error unpublishing Webflow item:', error);
    throw new Error(`Failed to unpublish Webflow item: ${error.message}`);
  }
}

/**
 * Delete a Webflow CMS item
 * Note: After calling this, you should publish the site to reflect the deletion
 */
export async function deleteWebflowItem(params: {
  apiKey: string;
  collectionId: string;
  itemId: string;
}): Promise<{ deleted: boolean; itemId: string }> {
  const { apiKey, collectionId, itemId } = params;

  try {
    const response = await fetch(
      `https://api.webflow.com/v2/collections/${collectionId}/items/${itemId}`,
      {
        method: 'DELETE',
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Webflow API error deleting item:', {
        status: response.status,
        error: errorText,
        itemId,
        collectionId,
      });
      throw new Error(`Webflow API error: ${response.status} - ${errorText}`);
    }

    logger.info('✅ Successfully deleted Webflow CMS item', {
      itemId,
      collectionId,
    });
    return { deleted: true, itemId };
  } catch (error: any) {
    logger.error('Error deleting Webflow item:', error);
    throw new Error(`Failed to delete Webflow item: ${error.message}`);
  }
}

/**
 * Archive a Webflow CMS item (set isArchived: true)
 * Archived items are hidden but can be restored
 */
export async function archiveWebflowItem(params: {
  apiKey: string;
  collectionId: string;
  itemId: string;
}): Promise<WebflowItem> {
  const { apiKey, collectionId, itemId } = params;

  try {
    // Get current item to preserve field data
    const currentItem = await getWebflowItem(apiKey, collectionId, itemId);
    if (!currentItem) {
      throw new Error('Item not found');
    }

    // Webflow API v2 uses isArchived field for archival
    const response = await fetch(
      `https://api.webflow.com/v2/collections/${collectionId}/items/${itemId}`,
      {
        method: 'PATCH',
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          isArchived: true,
          fieldData: currentItem.fieldData,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webflow API error: ${response.status} - ${errorText}`);
    }

    const item: WebflowItem = await response.json();
    logger.info('✅ Successfully archived Webflow CMS item', {
      itemId: item.id,
      collectionId,
      isArchived: item.isArchived,
    });
    return item;
  } catch (error: any) {
    logger.error('Error archiving Webflow item:', error);
    throw new Error(`Failed to archive Webflow item: ${error.message}`);
  }
}

/**
 * Restore an archived Webflow CMS item
 */
export async function restoreWebflowItem(params: {
  apiKey: string;
  collectionId: string;
  itemId: string;
}): Promise<WebflowItem> {
  const { apiKey, collectionId, itemId } = params;

  try {
    const currentItem = await getWebflowItem(apiKey, collectionId, itemId);
    if (!currentItem) {
      throw new Error('Item not found');
    }

    const response = await fetch(
      `https://api.webflow.com/v2/collections/${collectionId}/items/${itemId}`,
      {
        method: 'PATCH',
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          isArchived: false,
          fieldData: currentItem.fieldData,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webflow API error: ${response.status} - ${errorText}`);
    }

    const item: WebflowItem = await response.json();
    logger.info('✅ Successfully restored Webflow CMS item', {
      itemId: item.id,
      collectionId,
      isArchived: item.isArchived,
    });
    return item;
  } catch (error: any) {
    logger.error('Error restoring Webflow item:', error);
    throw new Error(`Failed to restore Webflow item: ${error.message}`);
  }
}

export interface SyncCheckResult {
  inSync: boolean;
  localVersion: {
    title: string;
    content: string;
    updatedAt: string;
  };
  webflowVersion: {
    title: string;
    lastUpdated: string;
    isDraft: boolean;
    isArchived: boolean;
    lastPublished: string | null;
  } | null;
  differences?: string[];
}

/**
 * Check if local content is in sync with Webflow
 */
export async function checkWebflowSync(params: {
  apiKey: string;
  collectionId: string;
  itemId: string;
  localTitle: string;
  localContent: string;
  localUpdatedAt: string;
}): Promise<SyncCheckResult> {
  const { apiKey, collectionId, itemId, localTitle, localContent, localUpdatedAt } = params;

  try {
    const webflowItem = await getWebflowItem(apiKey, collectionId, itemId);

    if (!webflowItem) {
      return {
        inSync: false,
        localVersion: { title: localTitle, content: localContent, updatedAt: localUpdatedAt },
        webflowVersion: null,
        differences: ['Webflow item not found - may have been deleted'],
      };
    }

    const differences: string[] = [];
    const webflowTitle = (webflowItem.fieldData.name || webflowItem.fieldData.title) as string;
    
    if (webflowTitle !== localTitle) {
      differences.push('Title differs');
    }

    // Check if local was updated after Webflow
    const localDate = new Date(localUpdatedAt);
    const webflowDate = new Date(webflowItem.lastUpdated);
    
    if (localDate > webflowDate) {
      differences.push('Local version is newer than Webflow');
    }

    return {
      inSync: differences.length === 0,
      localVersion: { title: localTitle, content: localContent, updatedAt: localUpdatedAt },
      webflowVersion: {
        title: webflowTitle,
        lastUpdated: webflowItem.lastUpdated,
        isDraft: webflowItem.isDraft,
        isArchived: webflowItem.isArchived,
        lastPublished: webflowItem.lastPublished,
      },
      differences: differences.length > 0 ? differences : undefined,
    };
  } catch (error: any) {
    logger.error('Error checking Webflow sync:', error);
    return {
      inSync: false,
      localVersion: { title: localTitle, content: localContent, updatedAt: localUpdatedAt },
      webflowVersion: null,
      differences: [`Error checking sync: ${error.message}`],
    };
  }
}

