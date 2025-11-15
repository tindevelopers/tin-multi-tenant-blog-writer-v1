/**
 * Connect Integration and Discover Structure
 * 
 * Main function to connect an integration and discover its structure
 * Based on FRONTEND_INTERLINKING_IMPLEMENTATION_GUIDE.md
 */

import { createClient } from '@/lib/supabase/server';
import { discoverWebflowStructure } from './webflow-structure-discovery';
import { discoverWordPressStructure } from './wordpress-structure-discovery';
import { discoverMediumStructure } from './medium-structure-discovery';
import { saveIntegrationStructure } from './save-integration-structure';
import type { IntegrationStructure } from './save-integration-structure';

export interface IntegrationConnection {
  api_token?: string;
  site_id?: string;
  base_url?: string;
  username?: string;
  password?: string;
  access_token?: string;
  user_id?: string;
  shop_domain?: string;
  [key: string]: unknown;
}

/**
 * Connect integration and discover structure
 */
export async function connectIntegration(
  orgId: string,
  provider: 'webflow' | 'wordpress' | 'shopify' | 'medium',
  connection: IntegrationConnection
): Promise<{
  integration_id: string;
  structure_saved: boolean;
}> {
  const supabase = await createClient();
  
  // 1. Discover structure based on provider
  let structure: IntegrationStructure;
  
  switch (provider) {
    case 'webflow':
      if (!connection.api_token || !connection.site_id) {
        throw new Error('Webflow requires api_token and site_id');
      }
      const webflowStructure = await discoverWebflowStructure(
        connection.api_token,
        connection.site_id
      );
      structure = {
        collections: webflowStructure.collections,
        existing_content: webflowStructure.existing_content
      };
      break;
      
    case 'wordpress':
      if (!connection.base_url || !connection.username || !connection.password) {
        throw new Error('WordPress requires base_url, username, and password');
      }
      const wpStructure = await discoverWordPressStructure(
        connection.base_url,
        connection.username,
        connection.password
      );
      structure = {
        post_types: wpStructure.post_types,
        existing_content: wpStructure.existing_content
      };
      break;
      
    case 'medium':
      if (!connection.access_token || !connection.user_id) {
        throw new Error('Medium requires access_token and user_id');
      }
      const mediumStructure = await discoverMediumStructure(
        connection.access_token,
        connection.user_id
      );
      structure = {
        publications: mediumStructure.publications,
        existing_content: mediumStructure.existing_content
      };
      break;
      
    case 'shopify':
      // TODO: Implement Shopify structure discovery
      throw new Error('Shopify structure discovery not yet implemented');
      
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
  
  // 2. Create or update integration record
  const { data: existingIntegration } = await supabase
    .from('integrations')
    .select('integration_id')
    .eq('org_id', orgId)
    .eq('type', provider)
    .maybeSingle();
  
  let integrationId: string;
  
  if (existingIntegration) {
    // Update existing integration
    integrationId = existingIntegration.integration_id;
    
    const { error: updateError } = await supabase
      .from('integrations')
      .update({
        config: connection, // Store credentials
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('integration_id', integrationId);
    
    if (updateError) {
      throw new Error(`Failed to update integration: ${updateError.message}`);
    }
  } else {
    // Create new integration
    const { data: newIntegration, error: insertError } = await supabase
      .from('integrations')
      .insert({
        org_id: orgId,
        type: provider,
        name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Integration`,
        config: connection,
        status: 'active'
      })
      .select('integration_id')
      .single();
    
    if (insertError) {
      throw new Error(`Failed to create integration: ${insertError.message}`);
    }
    
    integrationId = newIntegration.integration_id;
  }
  
  // 3. Save structure to metadata
  await saveIntegrationStructure(integrationId, orgId, structure);
  
  return {
    integration_id: integrationId,
    structure_saved: true
  };
}

