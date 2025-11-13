/**
 * API Route: Image Upload
 * 
 * POST /api/images/upload
 * 
 * Uploads images to Cloudinary via Blog Writer API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const API_BASE_URL = process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-613248238610.europe-west1.run.app';
const API_KEY = process.env.BLOG_WRITER_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData || !userData.org_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    // Upload via Blog Writer API
    const uploadResponse = await fetch(`${API_BASE_URL}/api/v1/media/upload/cloudinary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
      },
      body: JSON.stringify({
        image_data: dataUri,
        file_name: file.name,
        folder: `blog-images/${userData.org_id}`,
        // Note: Blog Writer API will fetch Cloudinary credentials from organization settings
      }),
      signal: AbortSignal.timeout(60000), // 60 second timeout
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Blog Writer API upload error:', errorText);
      return NextResponse.json(
        { error: `Upload failed: ${uploadResponse.statusText}` },
        { status: uploadResponse.status }
      );
    }

    const result = await uploadResponse.json();

    // Save to media_assets table
    const { data: assetData, error: assetError } = await supabase
      .from('media_assets')
      .insert({
        org_id: userData.org_id,
        uploaded_by: user.id,
        file_name: file.name,
        file_url: result.secure_url || result.url,
        file_type: result.format || file.type.split('/')[1],
        file_size: result.bytes || file.size,
        provider: 'cloudinary',
        metadata: {
          public_id: result.public_id,
          width: result.width,
          height: result.height,
          resource_type: result.resource_type || 'image',
        },
      })
      .select('asset_id')
      .single();

    if (assetError) {
      console.error('Error saving media asset:', assetError);
      // Still return success if upload worked, even if saving to DB failed
    }

    return NextResponse.json({
      url: result.secure_url || result.url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      asset_id: assetData?.asset_id,
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

