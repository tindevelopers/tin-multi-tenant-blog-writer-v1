/**
 * Environment-Aware Integrations Database Service
 * 
 * Handles CRUD operations for environment-suffixed integration tables
 * (integrations_dev, integrations_staging, integrations_prod)
 */

import { createServiceClient } from '@/lib/supabase/service';
import { getTableName, type Environment } from '@/lib/environment';
import type {
  Integration,
  IntegrationType,
  ConnectionConfig,
  EnvironmentIntegration,
  ConnectionMethod,
} from '../types';
import {
  encryptConnectionConfig,
  decryptConnectionConfig,
} from '../encryption/credential-encryption';

/**
 * Integration Recommendation from Blog Writer API
 */
export interface IntegrationRecommendation {
  id: string;
  tenant_id: string;
  provider: string;
  keywords: string[];
  recommended_backlinks: number;
  recommended_interlinks: number;
  per_keyword: Array<{
    keyword: string;
    difficulty?: number;
    suggested_backlinks: number;
    suggested_interlinks: number;
  }>;
  notes?: string | null;
  created_at: string;
}

/**
 * Database service for environment-suffixed integration tables
 */
export class EnvironmentIntegrationsDB {
  private supabase = createServiceClient();
  private env: Environment;

  constructor(env?: Environment) {
    // Use provided environment or detect from current context
    if (env) {
      this.env = env;
    } else {
      const nodeEnv = String(process.env.NODE_ENV || 'development');
      const vercelEnv = process.env.VERCEL_ENV;
      
      if (vercelEnv === 'production' || nodeEnv === 'production') {
        this.env = 'prod';
      } else if (vercelEnv === 'preview' || nodeEnv === 'staging') {
        this.env = 'staging';
      } else {
        this.env = 'dev';
      }
    }
  }

  /**
   * Get all integrations for an organization
   */
  async getIntegrations(orgId: string): Promise<Integration[]> {
    const tableName = getTableName('integrations', this.env);
    
    const { data, error } = await this.supabase
      .from(tableName)
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch integrations: ${error.message}`);
    }

    return (data || []).map((row) => this.mapToIntegration(row));
  }

  /**
   * Get a single integration by ID
   */
  async getIntegration(integrationId: string, orgId?: string): Promise<Integration | null> {
    const tableName = getTableName('integrations', this.env);
    
    let query = this.supabase
      .from(tableName)
      .select('*')
      .eq('id', integrationId);

    if (orgId) {
      query = query.eq('org_id', orgId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch integration: ${error.message}`);
    }

    return data ? this.mapToIntegration(data) : null;
  }

  /**
   * Create a new integration
   */
  async createIntegration(
    orgId: string,
    provider: IntegrationType,
    connection: ConnectionConfig,
    connectionMethod: ConnectionMethod,
    status: 'active' | 'inactive' | 'expired' | 'error' = 'inactive'
  ): Promise<EnvironmentIntegration> {
    const tableName = getTableName('integrations', this.env);
    
    // Encrypt sensitive credentials before storing
    const encryptedConnection = encryptConnectionConfig(connection as Record<string, unknown>);
    
    const { data, error } = await this.supabase
      .from(tableName)
      .insert({
        org_id: orgId,
        provider,
        connection_method: connectionMethod,
        connection: encryptedConnection,
        status,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create integration: ${error.message}`);
    }

    return this.mapToEnvironmentIntegration(data);
  }

  /**
   * Update an existing integration
   */
  async updateIntegration(
    integrationId: string,
    updates: {
      connection?: ConnectionConfig;
      connection_method?: ConnectionMethod;
      status?: 'active' | 'inactive' | 'expired' | 'error';
      last_tested_at?: string;
      last_sync_at?: string;
      error_message?: string;
      metadata?: Record<string, unknown>;
    },
    orgId?: string
  ): Promise<EnvironmentIntegration> {
    const tableName = getTableName('integrations', this.env);
    
    const updateData: Record<string, unknown> = {};
    
    if (updates.connection) {
      // Encrypt credentials before storing
      updateData.connection = encryptConnectionConfig(updates.connection as Record<string, unknown>);
    }
    
    if (updates.connection_method !== undefined) {
      updateData.connection_method = updates.connection_method;
    }
    
    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }
    
    if (updates.last_tested_at !== undefined) {
      updateData.last_tested_at = updates.last_tested_at;
    }
    
    if (updates.last_sync_at !== undefined) {
      updateData.last_sync_at = updates.last_sync_at;
    }
    
    if (updates.error_message !== undefined) {
      updateData.error_message = updates.error_message;
    }
    
    if (updates.metadata !== undefined) {
      updateData.metadata = updates.metadata;
    }
    
    let query = this.supabase
      .from(tableName)
      .update(updateData)
      .eq('id', integrationId);

    if (orgId) {
      query = query.eq('org_id', orgId);
    }

    const { data, error } = await query.select().single();

    if (error) {
      throw new Error(`Failed to update integration: ${error.message}`);
    }

    return this.mapToEnvironmentIntegration(data);
  }

  /**
   * Delete an integration (soft delete by setting status to inactive)
   */
  async deleteIntegration(integrationId: string, orgId?: string, hardDelete: boolean = false): Promise<boolean> {
    const tableName = getTableName('integrations', this.env);
    
    if (hardDelete) {
      // Hard delete - remove from database
      let query = this.supabase
        .from(tableName)
        .delete()
        .eq('id', integrationId);

      if (orgId) {
        query = query.eq('org_id', orgId);
      }

      const { error } = await query;

      if (error) {
        throw new Error(`Failed to delete integration: ${error.message}`);
      }
    } else {
      // Soft delete - set status to inactive and clear sensitive credentials
      let query = this.supabase
        .from(tableName)
        .update({
          status: 'inactive',
          connection: {}, // Clear credentials
          error_message: 'Integration disconnected',
        })
        .eq('id', integrationId);

      if (orgId) {
        query = query.eq('org_id', orgId);
      }

      const { error } = await query;

      if (error) {
        throw new Error(`Failed to delete integration: ${error.message}`);
      }
    }

    return true;
  }

  /**
   * Get recommendations for a tenant and provider
   */
  async getRecommendations(
    tenantId: string,
    provider: string,
    limit: number = 10
  ): Promise<IntegrationRecommendation[]> {
    const tableName = getTableName('recommendations', this.env);
    
    const { data, error } = await this.supabase
      .from(tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider', provider)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch recommendations: ${error.message}`);
    }

    return (data || []).map((row) => this.mapToRecommendation(row));
  }

  /**
   * Save a recommendation
   */
  async saveRecommendation(
    tenantId: string,
    provider: string,
    recommendation: Omit<IntegrationRecommendation, 'id' | 'created_at'>
  ): Promise<IntegrationRecommendation> {
    const tableName = getTableName('recommendations', this.env);
    
    const { data, error } = await this.supabase
      .from(tableName)
      .insert({
        tenant_id: tenantId,
        provider,
        keywords: recommendation.keywords,
        recommended_backlinks: recommendation.recommended_backlinks,
        recommended_interlinks: recommendation.recommended_interlinks,
        per_keyword: recommendation.per_keyword,
        notes: recommendation.notes,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save recommendation: ${error.message}`);
    }

    return this.mapToRecommendation(data);
  }

  /**
   * Get the latest recommendation for a tenant and provider
   */
  async getLatestRecommendation(
    tenantId: string,
    provider: string
  ): Promise<IntegrationRecommendation | null> {
    const recommendations = await this.getRecommendations(tenantId, provider, 1);
    return recommendations.length > 0 ? recommendations[0] : null;
  }

  /**
   * Map database row to Integration type (for backward compatibility)
   */
  private mapToIntegration(row: any): Integration {
    // Decrypt credentials before returning
    const connection = decryptConnectionConfig(row.connection || {});
    
    // Extract field_mappings and other metadata from connection if stored there
    const {
      field_mappings,
      health_status,
      last_sync,
      ...config
    } = connection;

    return {
      integration_id: row.id,
      org_id: row.org_id || row.tenant_id, // Use org_id if available, fallback to tenant_id
      type: row.provider as IntegrationType,
      name: `${row.provider} Integration`,
      status: (row.status || 'inactive') as IntegrationStatus,
      config: config as ConnectionConfig,
      field_mappings: field_mappings || [],
      health_status: health_status || 'unknown',
      last_sync: row.last_sync_at || last_sync || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
      created_by: undefined, // Not in environment schema
    };
  }

  /**
   * Map database row to EnvironmentIntegration type (new schema)
   */
  private mapToEnvironmentIntegration(row: any): EnvironmentIntegration {
    // Decrypt credentials before returning
    const connection = decryptConnectionConfig(row.connection || {});
    
    return {
      id: row.id,
      org_id: row.org_id || row.tenant_id,
      tenant_id: row.tenant_id, // Keep for backward compatibility
      provider: row.provider as IntegrationType,
      connection_method: row.connection_method as ConnectionMethod,
      connection: connection as ConnectionConfig,
      status: row.status || 'inactive',
      last_tested_at: row.last_tested_at,
      last_sync_at: row.last_sync_at,
      error_message: row.error_message,
      metadata: row.metadata || {},
      created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
    };
  }

  /**
   * Map database row to IntegrationRecommendation type
   */
  private mapToRecommendation(row: any): IntegrationRecommendation {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      provider: row.provider,
      keywords: row.keywords || [],
      recommended_backlinks: row.recommended_backlinks,
      recommended_interlinks: row.recommended_interlinks,
      per_keyword: row.per_keyword || [],
      notes: row.notes,
      created_at: row.created_at,
    };
  }

  /**
   * Get the current environment
   */
  getEnvironment(): Environment {
    return this.env;
  }
}

