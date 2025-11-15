/**
 * Get Interlinking Recommendations
 * 
 * Retrieves structure from Supabase and sends to backend API
 * Based on FRONTEND_INTERLINKING_IMPLEMENTATION_GUIDE.md
 */

import { createClient } from '@/lib/supabase/server';
import { blogWriterAPI } from '@/lib/blog-writer-api';

export interface InterlinkingRecommendation {
  recommended_interlinks: number;
  per_keyword: Array<{
    keyword: string;
    suggested_interlinks: number;
    interlink_opportunities: Array<{
      target_url: string;
      target_title: string;
      anchor_text: string;
      relevance_score: number;
    }>;
  }>;
}

/**
 * Get interlinking recommendations for keywords
 */
export async function getInterlinkingRecommendations(
  orgId: string,
  integrationId: string,
  keywords: string[]
): Promise<InterlinkingRecommendation> {
  const supabase = await createClient();
  
  // 1. Retrieve integration with structure
  const { data: integration, error } = await supabase
    .from('integrations')
    .select('type, config, metadata')
    .eq('integration_id', integrationId)
    .eq('org_id', orgId)
    .single();
  
  if (error || !integration) {
    throw new Error(`Integration not found: ${error?.message || 'Unknown error'}`);
  }
  
  // 2. Extract structure from metadata
  const structure = integration.metadata?.structure;
  
  if (!structure) {
    throw new Error('Integration structure not found. Please sync the integration first.');
  }
  
  // 3. Prepare connection object with structure
  const connection = {
    ...integration.config, // Credentials
    structure: structure   // Include structure
  };
  
  // 4. Call backend API
  const recommendations = await blogWriterAPI.connectAndRecommend({
    tenant_id: orgId,
    provider: integration.type as 'webflow' | 'wordpress' | 'shopify',
    connection: connection,
    keywords: keywords
  });
  
  return {
    recommended_interlinks: recommendations.recommended_interlinks,
    per_keyword: recommendations.per_keyword.map(kw => ({
      keyword: kw.keyword,
      suggested_interlinks: kw.suggested_interlinks,
      // Backend should return interlink_opportunities in the response
      // If not present, it will be an empty array
      interlink_opportunities: (kw as any).interlink_opportunities || []
    }))
  };
}

