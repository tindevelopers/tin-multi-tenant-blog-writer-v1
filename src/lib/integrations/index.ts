/**
 * Integration Abstraction Layer - Public API
 * 
 * Central export point for the integration system
 */

// Types
export * from './types';

// Base Provider
export { BaseIntegrationProvider } from './base-provider';

// Registry
export { 
  integrationRegistry, 
  getIntegrationProvider, 
  registerProvider 
} from './registry';

// Manager
export { integrationManager, IntegrationManager } from './integration-manager';

