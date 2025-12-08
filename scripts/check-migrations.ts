#!/usr/bin/env node
/**
 * Check Supabase migrations to see what has been applied
 * and identify any problematic migrations
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkMigrations() {
  try {
    console.log('🔍 Checking applied migrations...\n');

    // Query the migrations table
    const { data: migrations, error } = await supabase
      .from('supabase_migrations.schema_migrations')
      .select('version, name, inserted_at')
      .order('inserted_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('❌ Error querying migrations:', error);
      
      // Try alternative query
      const { data: altData, error: altError } = await supabase.rpc('exec_sql', {
        sql: "SELECT version, name, inserted_at FROM supabase_migrations.schema_migrations ORDER BY inserted_at DESC LIMIT 50;"
      });
      
      if (altError) {
        console.error('❌ Alternative query also failed:', altError);
        console.log('\n💡 Try running this SQL directly in Supabase SQL Editor:');
        console.log('   SELECT version, name, inserted_at FROM supabase_migrations.schema_migrations ORDER BY inserted_at DESC LIMIT 50;');
        process.exit(1);
      }
      
      return altData;
    }

    if (!migrations || migrations.length === 0) {
      console.log('⚠️  No migrations found in database');
      return;
    }

    console.log(`✅ Found ${migrations.length} migrations:\n`);
    
    // Check for problematic migrations
    const problematicMigrations: any[] = [];
    
    migrations.forEach((migration: any) => {
      const version = migration.version || '';
      const name = migration.name || '';
      
      // Check for tenant-based migrations (wrong schema)
      if (name.toLowerCase().includes('tenant') || 
          version.includes('tenant')) {
        problematicMigrations.push({ ...migration, reason: 'References tenant schema' });
      }
      
      // Check for webflow_site_scans (wrong table name)
      if (name.toLowerCase().includes('webflow_site_scans') && 
          !name.toLowerCase().includes('webflow_structure_scans')) {
        problematicMigrations.push({ ...migration, reason: 'Wrong table name (webflow_site_scans instead of webflow_structure_scans)' });
      }
    });

    // Display all migrations
    console.log('📋 All Migrations:');
    console.log('─'.repeat(80));
    migrations.forEach((migration: any, index: number) => {
      const date = migration.inserted_at 
        ? new Date(migration.inserted_at).toLocaleString()
        : 'Unknown';
      console.log(`${index + 1}. ${migration.version || 'N/A'}`);
      console.log(`   Name: ${migration.name || 'N/A'}`);
      console.log(`   Applied: ${date}`);
      console.log('');
    });

    // Report problematic migrations
    if (problematicMigrations.length > 0) {
      console.log('\n⚠️  PROBLEMATIC MIGRATIONS FOUND:');
      console.log('═'.repeat(80));
      problematicMigrations.forEach((migration: any) => {
        console.log(`❌ Version: ${migration.version}`);
        console.log(`   Name: ${migration.name}`);
        console.log(`   Reason: ${migration.reason}`);
        console.log(`   Applied: ${migration.inserted_at ? new Date(migration.inserted_at).toLocaleString() : 'Unknown'}`);
        console.log('');
      });
      
      console.log('\n💡 These migrations reference non-existent tables (tenants, user_tenants)');
      console.log('   or use incorrect table names. They need to be rolled back.\n');
    } else {
      console.log('\n✅ No problematic migrations found!');
    }

    // Check for tables that shouldn't exist
    console.log('\n🔍 Checking for problematic tables...\n');
    
    let tables: any = null;
    let tablesError: any = null;
    try {
      const result = await supabase.rpc('exec_sql', {
        sql: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('tenants', 'user_tenants', 'webflow_site_scans')
          ORDER BY table_name;
        `
      });
      tables = result.data;
      tablesError = result.error;
    } catch (error) {
      tablesError = error;
    }

    if (!tablesError && tables) {
      if (tables.length > 0) {
        console.log('⚠️  Found problematic tables:');
        tables.forEach((table: any) => {
          console.log(`   - ${table.table_name}`);
        });
        console.log('\n💡 These tables should not exist. They will need to be dropped.\n');
      } else {
        console.log('✅ No problematic tables found');
      }
    } else {
      // Try direct query
      const problematicTables = ['tenants', 'user_tenants', 'webflow_site_scans'];
      console.log('💡 Check manually if these tables exist:');
      problematicTables.forEach(table => {
        console.log(`   - ${table}`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkMigrations();

