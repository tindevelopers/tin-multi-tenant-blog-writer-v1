/**
 * Admin API Route: Set Cloudinary Credentials
 * 
 * POST /api/admin/cloudinary/set-credentials
 * 
 * Allows setting Cloudinary credentials for an organization
 * Requires admin/owner role
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user's role and org_id
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role, org_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Check if user has permission (owner or admin)
    if (!['owner', 'admin'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Only organization owners and admins can configure Cloudinary credentials' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { cloud_name, api_key, api_secret, org_id } = body;

    // Use provided org_id or user's org_id
    const targetOrgId = org_id || userProfile.org_id;

    // Validate credentials
    if (!cloud_name || !api_key || !api_secret) {
      return NextResponse.json(
        { error: 'All Cloudinary credentials are required: cloud_name, api_key, api_secret' },
        { status: 400 }
      );
    }

    // Get current organization settings
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('settings')
      .eq('org_id', targetOrgId)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Update settings with Cloudinary credentials
    const currentSettings = (org.settings as Record<string, unknown>) || {};
    const updatedSettings = {
      ...currentSettings,
      cloudinary: {
        cloud_name: cloud_name.trim(),
        api_key: api_key.trim(),
        api_secret: api_secret.trim(),
      },
    };

    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('org_id', targetOrgId);

    if (updateError) {
      logger.error('Error updating Cloudinary credentials:', updateError);
      return NextResponse.json(
        { error: `Failed to save credentials: ${updateError.message}` },
        { status: 500 }
      );
    }

    logger.info('Cloudinary credentials saved successfully', {
      orgId: targetOrgId,
      cloudName: cloud_name,
    });

    return NextResponse.json({
      success: true,
      message: 'Cloudinary credentials saved successfully',
      org_id: targetOrgId,
    });

  } catch (error) {
    logger.error('Error setting Cloudinary credentials:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

