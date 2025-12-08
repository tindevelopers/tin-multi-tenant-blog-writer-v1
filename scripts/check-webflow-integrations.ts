/**
 * Check for Webflow integrations in the database
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkIntegrations() {
  console.log('\n=== Checking Webflow Integrations ===\n');

  // Check all integrations
  const { data: allIntegrations, error: allError } = await supabase
    .from('integrations')
    .select('integration_id, org_id, type, status, config, metadata, created_at')
    .order('created_at', { ascending: false });

  if (allError) {
    console.error('❌ Error fetching integrations:', allError.message);
    process.exit(1);
  }

  console.log(`Total integrations found: ${allIntegrations?.length || 0}\n`);

  if (allIntegrations && allIntegrations.length > 0) {
    console.log('All integrations:');
    allIntegrations.forEach((int, idx) => {
      console.log(`\n${idx + 1}. ${int.type} (${int.status})`);
      console.log(`   Integration ID: ${int.integration_id}`);
      console.log(`   Org ID: ${int.org_id}`);
      console.log(`   Created: ${int.created_at}`);
      if (int.config) {
        const configKeys = Object.keys(int.config as object);
        console.log(`   Config keys: ${configKeys.join(', ')}`);
        if (int.type === 'webflow') {
          const cfg = int.config as any;
          console.log(`   API Key: ${cfg.api_key ? cfg.api_key.substring(0, 10) + '...' : 'NOT SET'}`);
          console.log(`   Site ID: ${cfg.site_id || cfg.siteId || 'NOT SET'}`);
        }
      }
    });
  } else {
    console.log('No integrations found in database.');
  }

  // Check specifically for Webflow
  const { data: webflowIntegrations, error: webflowError } = await supabase
    .from('integrations')
    .select('integration_id, org_id, type, status, config, metadata')
    .eq('type', 'webflow');

  console.log(`\n=== Webflow Integrations ===`);
  console.log(`Found: ${webflowIntegrations?.length || 0}`);

  if (webflowIntegrations && webflowIntegrations.length > 0) {
    webflowIntegrations.forEach((int, idx) => {
      console.log(`\n${idx + 1}. Status: ${int.status}`);
      console.log(`   Integration ID: ${int.integration_id}`);
      console.log(`   Org ID: ${int.org_id}`);
      const cfg = int.config as any;
      console.log(`   Has API Key: ${!!(cfg?.api_key || cfg?.apiToken || cfg?.token)}`);
      console.log(`   Has Site ID: ${!!(cfg?.site_id || cfg?.siteId || int.metadata?.site_id)}`);
    });
  } else {
    console.log('\n❌ No Webflow integrations found.');
    console.log('   Please configure a Webflow integration via the admin panel.');
  }
}

checkIntegrations().catch(console.error);

