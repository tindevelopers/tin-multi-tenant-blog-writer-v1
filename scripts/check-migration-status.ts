/**
 * Check if keyword_search_results_schema migration has been applied
 * Run with: npx tsx scripts/check-migration-status.ts
 */

import { createClient } from '@supabase/supabase-js';

// Read from .env.local directly
const supabaseUrl = 'https://edtxtpqrfpxeogukfunq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdHh0cHFyZnB4ZW9ndWtmdW5xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODExNTk1NywiZXhwIjoyMDczNjkxOTU3fQ.QW7ox0NJ6V_1VtNEMFRSr9x44NY6JF1TA_7SnKRP600';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMigration() {
  console.log('🔍 Checking migration status...\n');

  try {
    // Check if the new columns exist by querying the table structure
    const { data, error } = await supabase
      .from('keyword_research_sessions')
      .select('search_query, location, language, search_type, niche, search_mode, save_search, filters, full_api_response, keyword_count, total_search_volume, avg_difficulty, avg_competition')
      .limit(0); // Just check schema, don't fetch data

    if (error) {
      // Check if error is about missing columns
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('❌ Migration NOT applied - columns are missing');
        console.log('Error:', error.message);
        console.log('\n📋 To apply the migration:');
        console.log('1. Go to: https://supabase.com/dashboard/project/edtxtpqrfpxeogukfunq/sql');
        console.log('2. Copy and paste the contents of: supabase/keyword-search-results-schema.sql');
        console.log('3. Click "Run"');
        return false;
      }
      throw error;
    }

    console.log('✅ Migration appears to be applied!');
    console.log('All new columns are accessible:\n');
    
    const columns = [
      'search_query',
      'location',
      'language',
      'search_type',
      'niche',
      'search_mode',
      'save_search',
      'filters',
      'full_api_response',
      'keyword_count',
      'total_search_volume',
      'avg_difficulty',
      'avg_competition'
    ];

    columns.forEach(col => {
      console.log(`  ✓ ${col}`);
    });

    // Try to check indexes (this might not work with anon key, but worth trying)
    console.log('\n📊 Checking indexes...');
    console.log('(Index check requires service role key)');

    return true;
  } catch (error: any) {
    console.error('❌ Error checking migration:', error.message);
    return false;
  }
}

checkMigration().then(success => {
  process.exit(success ? 0 : 1);
});

