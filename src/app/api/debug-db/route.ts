import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Test auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Not authenticated',
        authError: authError?.message 
      });
    }

    // Test table existence and permissions
    const tests = {
      // Test 1: Check if tables exist
      tableExists: {},
      
      // Test 2: Try to read from tables
      tableRead: {},
      
      // Test 3: Try to insert into keyword_research_sessions
      sessionInsert: {},
      
      // Test 4: Check RLS policies
      rlsPolicies: {}
    };

    // Test 1: Check table existence
    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('keyword_research_sessions')
        .select('count(*)')
        .limit(1);
      
      tests.tableExists.sessions = {
        exists: !sessionsError,
        error: sessionsError?.message,
        data: sessionsData
      };
    } catch (e) {
      tests.tableExists.sessions = {
        exists: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    try {
      const { data: keywordsData, error: keywordsError } = await supabase
        .from('research_keywords')
        .select('count(*)')
        .limit(1);
      
      tests.tableExists.keywords = {
        exists: !keywordsError,
        error: keywordsError?.message,
        data: keywordsData
      };
    } catch (e) {
      tests.tableExists.keywords = {
        exists: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    // Test 2: Try to read from tables
    try {
      const { data: sessionsRead, error: sessionsReadError } = await supabase
        .from('keyword_research_sessions')
        .select('*')
        .eq('user_id', user.id)
        .limit(5);
      
      tests.tableRead.sessions = {
        success: !sessionsReadError,
        error: sessionsReadError?.message,
        count: sessionsRead?.length || 0
      };
    } catch (e) {
      tests.tableRead.sessions = {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    // Test 3: Try to insert into keyword_research_sessions
    try {
      const testSessionData = {
        user_id: user.id,
        org_id: user.id,
        primary_keyword: 'test-keyword-debug',
        location_targeting: 'United States',
        language_code: 'en',
        total_keywords: 1,
        created_at: new Date().toISOString(),
      };

      const { data: sessionInsertData, error: sessionInsertError } = await supabase
        .from('keyword_research_sessions')
        .insert(testSessionData)
        .select()
        .single();

      tests.sessionInsert = {
        success: !sessionInsertError,
        error: sessionInsertError?.message,
        errorDetails: sessionInsertError,
        data: sessionInsertData
      };

      // If successful, clean up the test data
      if (sessionInsertData?.id) {
        await supabase
          .from('keyword_research_sessions')
          .delete()
          .eq('id', sessionInsertData.id);
      }
    } catch (e) {
      tests.sessionInsert = {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      tests
    });

  } catch (error) {
    console.error('Database debug error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
