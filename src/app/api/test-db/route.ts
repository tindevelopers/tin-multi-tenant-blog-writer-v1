import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Test basic connection
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Auth error: ' + authError.message,
        user: null 
      });
    }

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'No user authenticated',
        user: null 
      });
    }

    // Test if keyword research tables exist
    const { data: sessions, error: sessionsError } = await supabase
      .from('keyword_research_sessions')
      .select('*')
      .eq('user_id', user.id)
      .limit(5);

    const { data: keywords, error: keywordsError } = await supabase
      .from('research_keywords')
      .select('*')
      .limit(5);

    // Check table existence by trying to describe them
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info');

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      tables: {
        sessions: {
          exists: !sessionsError,
          error: sessionsError?.message,
          count: sessions?.length || 0,
          data: sessions
        },
        keywords: {
          exists: !keywordsError,
          error: keywordsError?.message,
          count: keywords?.length || 0,
          data: keywords
        }
      },
      tableInfo: tableInfo || 'No table info available'
    });

  } catch (error) {
    logger.error('Database test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      user: null 
    });
  }
}
