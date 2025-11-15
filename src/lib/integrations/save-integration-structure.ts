/**
 * Save Integration Structure to Supabase
 * 
 * Stores discovered structure in integrations.metadata
 * Based on FRONTEND_INTERLINKING_IMPLEMENTATION_GUIDE.md
 */

import { createClient } from '@/lib/supabase/server';

export interface IntegrationStructure {
  collections?: Array<{
    id: string;
    name: string;
    slug: string;
    fields?: Array<{
      id: string;
      name: string;
      type: string;
      slug: string;
    }>;
  }>;
  post_types?: Array<{
    name: string;
    label: string;
  }>;
  publications?: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  blogs?: Array<{
    id: string;
    handle: string;
    title: string;
  }>;
  existing_content: Array<{
    id: string;
    title: string;
    url: string;
    slug: string;
    keywords: string[];
    categories?: string[];
    published_at: string;
    excerpt?: string;
  }>;
}

/**
 * Save integration structure to Supabase
 */
export async function saveIntegrationStructure(
  integrationId: string,
  orgId: string,
  structure: IntegrationStructure
): Promise<void> {
  const supabase = await createClient();
  
  // Get current integration
  const { data: integration, error: fetchError } = await supabase
    .from('integrations')
    .select('metadata')
    .eq('integration_id', integrationId)
    .eq('org_id', orgId)
    .single();
  
  if (fetchError) {
    throw new Error(`Failed to fetch integration: ${fetchError.message}`);
  }
  
  // Update metadata with structure
  const updatedMetadata = {
    ...(integration.metadata || {}),
    structure: structure,
    sync_settings: {
      ...(integration.metadata?.sync_settings || {}),
      last_synced: new Date().toISOString()
    }
  };
  
  const { error: updateError } = await supabase
    .from('integrations')
    .update({
      metadata: updatedMetadata,
      updated_at: new Date().toISOString()
    })
    .eq('integration_id', integrationId)
    .eq('org_id', orgId);
  
  if (updateError) {
    throw new Error(`Failed to save structure: ${updateError.message}`);
  }
}

