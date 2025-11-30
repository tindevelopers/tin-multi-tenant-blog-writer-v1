/**
 * API Route: Check Cloudinary Root Directory Access
 * 
 * GET /api/integrations/cloudinary/check-root
 * 
 * Checks if we can access Cloudinary root directory and lists all folders/images
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser } from '@/lib/api-utils';
import { getCloudinaryCredentials } from '@/lib/cloudinary-upload';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    logger.debug('Checking Cloudinary root directory access', {
      userId: user.id,
      orgId: user.org_id,
    });

    // Get Cloudinary credentials
    const credentials = await getCloudinaryCredentials(user.org_id);
    if (!credentials) {
      return NextResponse.json(
        { error: 'Cloudinary not configured for this organization' },
        { status: 400 }
      );
    }

    // Validate credentials
    if (!credentials.cloud_name || !credentials.api_key || !credentials.api_secret) {
      return NextResponse.json(
        { error: 'Cloudinary credentials are incomplete' },
        { status: 400 }
      );
    }

    const results: {
      location: string;
      success: boolean;
      resourceCount?: number;
      resources?: any[];
      folders?: string[];
      error?: string;
    }[] = [];

    // Test 1: Root directory (no prefix)
    logger.info('Checking Cloudinary root directory');
    try {
      const authString = Buffer.from(`${credentials.api_key}:${credentials.api_secret}`).toString('base64');
      const rootUrl = new URL(`https://api.cloudinary.com/v1_1/${credentials.cloud_name}/resources/image`);
      rootUrl.searchParams.append('type', 'upload');
      rootUrl.searchParams.append('max_results', '100');
      rootUrl.searchParams.append('resource_type', 'image');
      // No prefix = root directory

      const rootResponse = await fetch(rootUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      const rootData = await rootResponse.json();

      if (rootResponse.ok) {
        const resources = rootData.resources || [];
        // Extract unique folders from resources
        const folders = new Set<string>();
        resources.forEach((resource: any) => {
          if (resource.folder) {
            folders.add(resource.folder);
          }
        });

        results.push({
          location: 'Root (no prefix)',
          success: true,
          resourceCount: resources.length,
          resources: resources.slice(0, 10), // First 10 for preview
          folders: Array.from(folders).sort(),
        });
      } else {
        results.push({
          location: 'Root (no prefix)',
          success: false,
          error: rootData.error?.message || JSON.stringify(rootData),
        });
      }
    } catch (error) {
      results.push({
        location: 'Root (no prefix)',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 2: Check org-specific folder
    const orgFolder = `blog-images/${user.org_id}`;
    logger.info(`Checking Cloudinary folder: ${orgFolder}`);
    try {
      const authString = Buffer.from(`${credentials.api_key}:${credentials.api_secret}`).toString('base64');
      const folderUrl = new URL(`https://api.cloudinary.com/v1_1/${credentials.cloud_name}/resources/image`);
      folderUrl.searchParams.append('type', 'upload');
      folderUrl.searchParams.append('max_results', '100');
      folderUrl.searchParams.append('prefix', orgFolder);
      folderUrl.searchParams.append('resource_type', 'image');

      const folderResponse = await fetch(folderUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      const folderData = await folderResponse.json();

      if (folderResponse.ok) {
        const resources = folderData.resources || [];
        results.push({
          location: `Folder: ${orgFolder}`,
          success: true,
          resourceCount: resources.length,
          resources: resources.slice(0, 10), // First 10 for preview
        });
      } else {
        results.push({
          location: `Folder: ${orgFolder}`,
          success: false,
          error: folderData.error?.message || JSON.stringify(folderData),
        });
      }
    } catch (error) {
      results.push({
        location: `Folder: ${orgFolder}`,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 3: Check blog-images folder (parent folder)
    logger.info('Checking Cloudinary folder: blog-images');
    try {
      const authString = Buffer.from(`${credentials.api_key}:${credentials.api_secret}`).toString('base64');
      const blogImagesUrl = new URL(`https://api.cloudinary.com/v1_1/${credentials.cloud_name}/resources/image`);
      blogImagesUrl.searchParams.append('type', 'upload');
      blogImagesUrl.searchParams.append('max_results', '100');
      blogImagesUrl.searchParams.append('prefix', 'blog-images');
      blogImagesUrl.searchParams.append('resource_type', 'image');

      const blogImagesResponse = await fetch(blogImagesUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      const blogImagesData = await blogImagesResponse.json();

      if (blogImagesResponse.ok) {
        const resources = blogImagesData.resources || [];
        // Extract unique subfolders
        const subfolders = new Set<string>();
        resources.forEach((resource: any) => {
          if (resource.folder && resource.folder.startsWith('blog-images/')) {
            const parts = resource.folder.split('/');
            if (parts.length > 1) {
              subfolders.add(parts[1]); // Get org_id part
            }
          }
        });

        results.push({
          location: 'Folder: blog-images',
          success: true,
          resourceCount: resources.length,
          folders: Array.from(subfolders).sort(),
        });
      } else {
        results.push({
          location: 'Folder: blog-images',
          success: false,
          error: blogImagesData.error?.message || JSON.stringify(blogImagesData),
        });
      }
    } catch (error) {
      results.push({
        location: 'Folder: blog-images',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    const hasRootAccess = results.find(r => r.location === 'Root (no prefix)')?.success || false;

    return NextResponse.json({
      success: hasRootAccess,
      credentials: {
        cloudName: credentials.cloud_name,
        apiKeyPrefix: credentials.api_key.substring(0, 5) + '...',
      },
      checks: results,
      summary: {
        rootAccess: hasRootAccess,
        totalLocationsChecked: results.length,
        successfulChecks: results.filter(r => r.success).length,
        totalResourcesFound: results.reduce((sum, r) => sum + (r.resourceCount || 0), 0),
      },
      message: hasRootAccess
        ? 'Root directory access confirmed. You can sync all images from Cloudinary.'
        : 'Root directory access failed. Check credentials and permissions.',
    });

  } catch (error) {
    logger.error('Error checking Cloudinary root access:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check Cloudinary root access',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

