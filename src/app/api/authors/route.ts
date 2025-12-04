import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';

export interface Author {
  id: string;
  name: string;
  email?: string;
  bio?: string;
  image_url?: string;
  role?: string;
}

/**
 * GET /api/authors
 * Fetch authors for the current user's organization
 * Authors are stored in organization settings
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's org_id
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 404 });
    }

    // Get organization settings with authors
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('settings')
      .eq('org_id', userProfile.org_id)
      .single();

    if (orgError) {
      logger.error('Error fetching organization:', orgError);
      return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 });
    }

    const settings = org?.settings as Record<string, unknown> || {};
    const authors = (settings.authors as Author[]) || [];
    const defaultAuthorId = settings.default_author_id as string || null;

    // Also include org users as potential authors
    const { data: orgUsers } = await supabase
      .from('users')
      .select('user_id, email, full_name, role, bio')
      .eq('org_id', userProfile.org_id);

    const userAuthors: Author[] = (orgUsers || []).map(u => ({
      id: `user_${u.user_id}`,
      name: u.full_name || u.email,
      email: u.email,
      bio: u.bio || '',
      role: u.role || 'Team Member',
      image_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || u.email)}&background=6366f1&color=fff`,
    }));

    // Combine custom authors with user authors
    const allAuthors = [...authors, ...userAuthors];

    return NextResponse.json({
      authors: allAuthors,
      defaultAuthorId,
    });
  } catch (error) {
    logger.error('Error in GET /api/authors:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/authors
 * Add a new author to the organization
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's org_id
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 404 });
    }

    // Only admins can add authors
    if (!['admin', 'owner'].includes(userProfile.role || '')) {
      return NextResponse.json({ error: 'Only admins can add authors' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, bio, image_url, role } = body;

    if (!name) {
      return NextResponse.json({ error: 'Author name is required' }, { status: 400 });
    }

    // Get current organization settings
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('settings')
      .eq('org_id', userProfile.org_id)
      .single();

    if (orgError) {
      return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 });
    }

    const settings = org?.settings as Record<string, unknown> || {};
    const authors = (settings.authors as Author[]) || [];

    // Create new author
    const newAuthor: Author = {
      id: `author_${Date.now()}`,
      name,
      email: email || undefined,
      bio: bio || undefined,
      image_url: image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`,
      role: role || 'Author',
    };

    // Update settings with new author
    const updatedSettings = {
      ...settings,
      authors: [...authors, newAuthor],
    };

    const { error: updateError } = await supabase
      .from('organizations')
      .update({ settings: updatedSettings })
      .eq('org_id', userProfile.org_id);

    if (updateError) {
      logger.error('Error updating organization settings:', updateError);
      return NextResponse.json({ error: 'Failed to add author' }, { status: 500 });
    }

    return NextResponse.json({ author: newAuthor });
  } catch (error) {
    logger.error('Error in POST /api/authors:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

