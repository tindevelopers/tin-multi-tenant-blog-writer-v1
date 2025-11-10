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
} from '../types';

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
   * Get all integrations for a tenant
   */
  async getIntegrations(tenantId: string): Promise<Integration[]> {
    const tableName = getTableName('integrations', this.env);
    
    const { data, error } = await this.supabase
      .from(tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch integrations: ${error.message}`);
    }

    return (data || []).map((row) => this.mapToIntegration(row));
  }

  /**
   * Get a single integration by ID
   */
  async getIntegration(integrationId: string, tenantId?: string): Promise<Integration | null> {
    const tableName = getTableName('integrations', this.env);
    
    let query = this.supabase
      .from(tableName)
      .select('*')
      .eq('id', integrationId);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
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
    tenantId: string,
    provider: string,
    connection: Record<string, unknown>
  ): Promise<Integration> {
    const tableName = getTableName('integrations', this.env);
    
    const { data, error } = await this.supabase
      .from(tableName)
      .insert({
        tenant_id: tenantId,
        provider,
        connection,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create integration: ${error.message}`);
    }

    return this.mapToIntegration(data);
  }

  /**
   * Update an existing integration
   */
  async updateIntegration(
    integrationId: string,
    updates: {
      connection?: Record<string, unknown>;
      provider?: string;
    },
    tenantId?: string
  ): Promise<Integration> {
    const tableName = getTableName('integrations', this.env);
    
    let query = this.supabase
      .from(tableName)
      .update({
        ...updates,
        connection: updates.connection || undefined,
      })
      .eq('id', integrationId);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.select().single();

    if (error) {
      throw new Error(`Failed to update integration: ${error.message}`);
    }

    return this.mapToIntegration(data);
  }

  /**
   * Delete an integration
   */
  async deleteIntegration(integrationId: string, tenantId?: string): Promise<boolean> {
    const tableName = getTableName('integrations', this.env);
    
    let query = this.supabase
      .from(tableName)
      .delete()
      .eq('id', integrationId);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { error } = await query;

    if (error) {
      throw new Error(`Failed to delete integration: ${error.message}`);
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
   * Map database row to Integration type
   */
  private mapToIntegration(row: any): Integration {
    // Extract field_mappings and other metadata from connection if stored there
    const connection = row.connection || {};
    const {
      field_mappings,
      health_status,
      last_sync,
      ...config
    } = connection;

    return {
      integration_id: row.id,
      org_id: row.tenant_id, // Map tenant_id to org_id for compatibility
      type: row.provider as IntegrationType,
      name: `${row.provider} Integration`,
      status: 'active', // Default status, can be enhanced
      config: config as ConnectionConfig,
      field_mappings: field_mappings || [],
      health_status: health_status || 'unknown',
      last_sync: last_sync || undefined,
      created_at: row.created_at,
      updated_at: row.created_at, // Use created_at if updated_at not available
      created_by: undefined, // Not in environment schema
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

