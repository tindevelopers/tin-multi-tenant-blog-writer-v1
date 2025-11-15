/**
 * Integration Manager Service
 * 
 * High-level service for managing integrations.
 * Handles CRUD operations, connection management, and publishing coordination.
 */

import { createClient } from '@/lib/supabase/client';
import { createServiceClient } from '@/lib/supabase/service';
import type {
  Integration,
  IntegrationType,
  ConnectionConfig,
  FieldMapping,
  PublishRequest,
  BlogPostData,
} from './types';
import { getIntegrationProvider } from './registry';

export class IntegrationManager {
  /**
   * Get all integrations for an organization
   */
  async getIntegrations(orgId: string): Promise<Integration[]> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch integrations: ${error.message}`);
    }

    return (data || []).map(this.mapToIntegration);
  }

  /**
   * Get a single integration by ID
   */
  async getIntegration(integrationId: string): Promise<Integration | null> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('integration_id', integrationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch integration: ${error.message}`);
    }

    return data ? this.mapToIntegration(data) : null;
  }

  /**
   * Create a new integration connection
   */
  async createIntegration(
    orgId: string,
    type: IntegrationType,
    name: string,
    config: ConnectionConfig,
    fieldMappings?: FieldMapping[],
    createdBy?: string
  ): Promise<Integration> {
    const supabase = createServiceClient();

    // Get provider to validate config
    const provider = getIntegrationProvider(type);
    if (!provider) {
      throw new Error(`Integration provider ${type} is not available`);
    }

    // Validate configuration
    const validation = provider.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${Object.values(validation.errors || {}).join(', ')}`);
    }

    // Test connection
    const healthCheck = await provider.testConnection(config);
    if (healthCheck.status === 'error') {
      throw new Error(`Connection test failed: ${healthCheck.message}`);
    }

    // Insert integration
    const { data, error } = await supabase
      .from('integrations')
      .insert({
        org_id: orgId,
        type,
        name,
        status: 'active',
        config: config as Record<string, unknown>,
        field_mappings: fieldMappings || [],
        health_status: healthCheck.status,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create integration: ${error.message}`);
    }

    return this.mapToIntegration(data);
  }

  /**
   * Update an integration
   */
  async updateIntegration(
    integrationId: string,
    updates: {
      name?: string;
      config?: ConnectionConfig;
      field_mappings?: FieldMapping[];
      status?: 'active' | 'inactive' | 'error';
    }
  ): Promise<Integration> {
    const supabase = createServiceClient();

    // Get existing integration
    const existing = await this.getIntegration(integrationId);
    if (!existing) {
      throw new Error('Integration not found');
    }

    // Validate config if provided
    if (updates.config) {
      const provider = getIntegrationProvider(existing.type);
      if (provider) {
        const validation = provider.validateConfig(updates.config);
        if (!validation.valid) {
          throw new Error(`Invalid configuration: ${Object.values(validation.errors || {}).join(', ')}`);
        }
      }
    }

    // Update integration
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.config !== undefined) updateData.config = updates.config;
    if (updates.field_mappings !== undefined) updateData.field_mappings = updates.field_mappings;
    if (updates.status !== undefined) updateData.status = updates.status;

    const { data, error } = await supabase
      .from('integrations')
      .update(updateData)
      .eq('integration_id', integrationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update integration: ${error.message}`);
    }

    return this.mapToIntegration(data);
  }

  /**
   * Delete an integration
   */
  async deleteIntegration(integrationId: string): Promise<void> {
    const supabase = createServiceClient();

    // Get integration to call disconnect
    const integration = await this.getIntegration(integrationId);
    if (integration) {
      const provider = getIntegrationProvider(integration.type);
      if (provider) {
        await provider.disconnect(integrationId);
      }
    }

    // Delete integration
    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('integration_id', integrationId);

    if (error) {
      throw new Error(`Failed to delete integration: ${error.message}`);
    }
  }

  /**
   * Test an integration connection
   */
  async testIntegration(integrationId: string): Promise<{
    status: 'healthy' | 'warning' | 'error' | 'unknown';
    message?: string;
  }> {
    const integration = await this.getIntegration(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    const provider = getIntegrationProvider(integration.type);
    if (!provider) {
      throw new Error(`Provider ${integration.type} not available`);
    }

    const healthCheck = await provider.testConnection(integration.config);

    // Update health status in database
    const supabase = createServiceClient();
    await supabase
      .from('integrations')
      .update({ health_status: healthCheck.status })
      .eq('integration_id', integrationId);

    return {
      status: healthCheck.status,
      message: healthCheck.message,
    };
  }

  /**
   * Publish a blog post to an integration
   */
  async publishPost(
    postId: string,
    integrationId: string,
    blogPost: BlogPostData,
    options?: {
      siteId?: string;
      collectionId?: string;
      publishImmediately?: boolean;
    }
  ): Promise<{
    success: boolean;
    itemId?: string;
    externalUrl?: string;
    error?: string;
  }> {
    const supabase = createServiceClient();

    // Get integration
    const integration = await this.getIntegration(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    if (integration.status !== 'active') {
      throw new Error(`Integration is not active (status: ${integration.status})`);
    }

    // Get provider
    const provider = getIntegrationProvider(integration.type);
    if (!provider) {
      throw new Error(`Provider ${integration.type} not available`);
    }

    // Check if post already published
    const { data: existingLog } = await supabase
      .from('integration_publish_logs')
      .select('*')
      .eq('post_id', postId)
      .eq('integration_id', integrationId)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Create publish request
    const request: PublishRequest = {
      postId,
      integrationId,
      siteId: options?.siteId || integration.config.siteId as string,
      collectionId: options?.collectionId || integration.config.collectionId as string,
      fieldMappings: integration.field_mappings as FieldMapping[],
      publishImmediately: options?.publishImmediately ?? true,
    };

    // Log publish attempt
    const { data: logEntry } = await supabase
      .from('integration_publish_logs')
      .insert({
        org_id: integration.org_id,
        post_id: postId,
        integration_id: integrationId,
        status: 'pending',
      })
      .select()
      .single();

    try {
      // Publish or update
      const result = existingLog?.external_id
        ? await provider.update(request, blogPost, existingLog.external_id)
        : await provider.publish(request, blogPost);

      // Update log entry
      await supabase
        .from('integration_publish_logs')
        .update({
          status: result.success ? 'success' : 'failed',
          external_id: result.itemId,
          external_url: result.externalUrl,
          error_message: result.error,
          error_code: result.errorCode,
          response_metadata: result.metadata,
        })
        .eq('log_id', logEntry.log_id);

      // Update blog post metadata if successful
      if (result.success && result.itemId) {
        await supabase
          .from('blog_posts')
          .update({
            metadata: {
              ...(blogPost.metadata || {}),
              [integration.type]: {
                item_id: result.itemId,
                published_url: result.externalUrl,
                published_at: new Date().toISOString(),
                integration_id: integrationId,
              },
            },
          })
          .eq('post_id', postId);
      }

      return {
        success: result.success,
        itemId: result.itemId,
        externalUrl: result.externalUrl,
        error: result.error,
      };
    } catch (error) {
      // Update log entry with error
      await supabase
        .from('integration_publish_logs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('log_id', logEntry.log_id);

      throw error;
    }
  }

  /**
   * Get publishing history for a post
   */
  async getPublishHistory(postId: string): Promise<Array<{
    log_id: string;
    integration_id: string;
    integration_name: string;
    integration_type: string;
    status: string;
    external_url?: string;
    error_message?: string;
    created_at: string;
  }>> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('integration_publish_logs')
      .select(`
        log_id,
        integration_id,
        status,
        external_url,
        error_message,
        created_at,
        integrations!inner(name, type)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch publish history: ${error.message}`);
    }

    return (data || []).map((log: any) => ({
      log_id: log.log_id,
      integration_id: log.integration_id,
      integration_name: log.integrations?.name || 'Unknown',
      integration_type: log.integrations?.type || 'unknown',
      status: log.status,
      external_url: log.external_url,
      error_message: log.error_message,
      created_at: log.created_at,
    }));
  }

  /**
   * Map database row to Integration type
   */
  private mapToIntegration(row: any): Integration {
    return {
      integration_id: row.integration_id,
      org_id: row.org_id,
      type: row.type as IntegrationType,
      name: row.name,
      status: row.status as 'active' | 'inactive' | 'error' | 'pending',
      config: row.config as ConnectionConfig,
      field_mappings: (row.field_mappings || []) as FieldMapping[],
      health_status: row.health_status as 'healthy' | 'warning' | 'error' | 'unknown',
      last_sync: row.last_sync,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
    };
  }
}

// Export singleton instance
export const integrationManager = new IntegrationManager();

