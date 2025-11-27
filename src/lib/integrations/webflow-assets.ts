/**
 * Webflow Asset Management
 * Handles uploading and managing images/assets in Webflow
 */

import { logger } from '@/utils/logger';

export interface WebflowAsset {
  id: string;
  displayName: string;
  fileName: string;
  url: string;
  contentType: string;
  fileSize: number;
  uploadedOn: string;
}

/**
 * Upload an image to Webflow assets
 * Note: Webflow API v2 requires a two-step process:
 * 1. Get an upload URL
 * 2. Upload the file to that URL
 * 3. Create the asset in Webflow
 * 
 * However, for simplicity, we can also use external URLs directly in image fields.
 * This function uploads if needed, otherwise returns the URL.
 */
export async function uploadImageToWebflow(
  apiKey: string,
  siteId: string,
  imageUrl: string,
  fileName?: string
): Promise<string> {
  try {
    // If the URL is already a Webflow asset URL, return it
    if (imageUrl.includes('webflow.com') || imageUrl.includes('webflow.io')) {
      logger.debug('Image URL is already a Webflow URL', { imageUrl });
      return imageUrl;
    }

    // For now, we'll use the external URL directly
    // Webflow supports external URLs in image fields
    // If you need to upload to Webflow assets, you would need to:
    // 1. Fetch the image from the URL
    // 2. Get an upload URL from Webflow: POST /v2/sites/{siteId}/assets/upload
    // 3. Upload the file to that URL
    // 4. Create the asset: POST /v2/sites/{siteId}/assets
    
    logger.debug('Using external image URL for Webflow', { imageUrl, fileName });
    return imageUrl;
  } catch (error: any) {
    logger.error('Error uploading image to Webflow:', error);
    // Return original URL as fallback
    return imageUrl;
  }
}

/**
 * Validate that an image URL is accessible and returns proper content type
 */
export async function validateImageUrl(imageUrl: string): Promise<boolean> {
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    const contentType = response.headers.get('content-type');
    return response.ok && contentType?.startsWith('image/') === true;
  } catch (error) {
    logger.warn('Could not validate image URL', { imageUrl, error });
    return false;
  }
}

/**
 * Get Webflow asset upload URL
 * This is step 1 of the upload process
 */
export async function getWebflowUploadUrl(
  apiKey: string,
  siteId: string,
  fileName: string,
  fileSize: number
): Promise<{ uploadUrl: string; assetId: string }> {
  try {
    const response = await fetch(
      `https://api.webflow.com/v2/sites/${siteId}/assets/upload`,
      {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          fileName,
          fileSize,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webflow API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return {
      uploadUrl: data.uploadUrl,
      assetId: data.assetId,
    };
  } catch (error: any) {
    logger.error('Error getting Webflow upload URL:', error);
    throw error;
  }
}

