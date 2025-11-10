/**
 * Unified Integrations Database Adapter
 * 
 * Provides a unified interface that supports both:
 * 1. Environment-suffixed tables (integrations_dev, integrations_staging, integrations_prod)
 * 2. Unified table (integrations) for backward compatibility
 * 
 * This adapter allows gradual migration from unified to environment-specific tables.
 */

import { EnvironmentIntegrationsDB } from './environment-integrations-db';
import { IntegrationManager } from '../integration-manager';
import { useEnvironmentTables } from '@/lib/environment';
import type { Integration } from '../types';
import type { IntegrationRecommendation } from './environment-integrations-db';

/**
 * Unified adapter that supports both database schemas
 */
export class IntegrationsDBAdapter {
  private useEnvironmentTables: boolean;
  private envDB?: EnvironmentIntegrationsDB;
  private unifiedManager?: IntegrationManager;

  constructor(forceEnvironmentTables?: boolean) {
    // Determine which schema to use
    this.useEnvironmentTables = forceEnvironmentTables ?? useEnvironmentTables();
    
    if (this.useEnvironmentTables) {
      this.envDB = new EnvironmentIntegrationsDB();
    } else {
      this.unifiedManager = new IntegrationManager();
    }
  }

  /**
   * Get all integrations for a tenant/org
   */
  async getIntegrations(tenantId: string): Promise<Integration[]> {
    if (this.useEnvironmentTables && this.envDB) {
      return await this.envDB.getIntegrations(tenantId);
    } else if (this.unifiedManager) {
      // Map tenant_id to org_id for unified schema
      return await this.unifiedManager.getIntegrations(tenantId);
    }
    throw new Error('Database adapter not properly initialized');
  }

  /**
   * Get a single integration by ID
   */
  async getIntegration(
    integrationId: string,
    tenantId?: string
  ): Promise<Integration | null> {
    if (this.useEnvironmentTables && this.envDB) {
      return await this.envDB.getIntegration(integrationId, tenantId);
    } else if (this.unifiedManager) {
      return await this.unifiedManager.getIntegration(integrationId);
    }
    throw new Error('Database adapter not properly initialized');
  }

  /**
   * Create a new integration
   */
  async createIntegration(
    tenantId: string,
    type: string,
    config: Record<string, unknown>
  ): Promise<Integration> {
    if (this.useEnvironmentTables && this.envDB) {
      return await this.envDB.createIntegration(tenantId, type, config);
    } else if (this.unifiedManager) {
      // For unified schema, we need more parameters
      // This is a simplified version - may need enhancement
      throw new Error(
        'Creating integrations via unified schema requires IntegrationManager.createIntegration() with full parameters'
      );
    }
    throw new Error('Database adapter not properly initialized');
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
    if (this.useEnvironmentTables && this.envDB) {
      return await this.envDB.updateIntegration(integrationId, updates, tenantId);
    } else if (this.unifiedManager) {
      // Unified schema update would go through IntegrationManager
      throw new Error(
        'Updating integrations via unified schema requires IntegrationManager.updateIntegration()'
      );
    }
    throw new Error('Database adapter not properly initialized');
  }

  /**
   * Delete an integration
   */
  async deleteIntegration(
    integrationId: string,
    tenantId?: string
  ): Promise<boolean> {
    if (this.useEnvironmentTables && this.envDB) {
      return await this.envDB.deleteIntegration(integrationId, tenantId);
    } else if (this.unifiedManager) {
      // Unified schema deletion would go through IntegrationManager
      throw new Error(
        'Deleting integrations via unified schema requires IntegrationManager.deleteIntegration()'
      );
    }
    throw new Error('Database adapter not properly initialized');
  }

  /**
   * Get recommendations (only available for environment-suffixed tables)
   */
  async getRecommendations(
    tenantId: string,
    provider: string,
    limit?: number
  ): Promise<IntegrationRecommendation[]> {
    if (this.useEnvironmentTables && this.envDB) {
      return await this.envDB.getRecommendations(tenantId, provider, limit);
    }
    // Recommendations are only available in environment-suffixed schema
    throw new Error(
      'Recommendations are only available when using environment-suffixed tables'
    );
  }

  /**
   * Save a recommendation (only available for environment-suffixed tables)
   */
  async saveRecommendation(
    tenantId: string,
    provider: string,
    recommendation: Omit<IntegrationRecommendation, 'id' | 'created_at'>
  ): Promise<IntegrationRecommendation> {
    if (this.useEnvironmentTables && this.envDB) {
      return await this.envDB.saveRecommendation(tenantId, provider, recommendation);
    }
    // Recommendations are only available in environment-suffixed schema
    throw new Error(
      'Recommendations are only available when using environment-suffixed tables'
    );
  }

  /**
   * Get the latest recommendation (only available for environment-suffixed tables)
   */
  async getLatestRecommendation(
    tenantId: string,
    provider: string
  ): Promise<IntegrationRecommendation | null> {
    if (this.useEnvironmentTables && this.envDB) {
      return await this.envDB.getLatestRecommendation(tenantId, provider);
    }
    // Recommendations are only available in environment-suffixed schema
    throw new Error(
      'Recommendations are only available when using environment-suffixed tables'
    );
  }

  /**
   * Check which schema is being used
   */
  isUsingEnvironmentTables(): boolean {
    return this.useEnvironmentTables;
  }

  /**
   * Get the underlying database service (for advanced operations)
   */
  getEnvironmentDB(): EnvironmentIntegrationsDB | undefined {
    return this.envDB;
  }

  /**
   * Get the unified manager (for advanced operations)
   */
  getUnifiedManager(): IntegrationManager | undefined {
    return this.unifiedManager;
  }
}

