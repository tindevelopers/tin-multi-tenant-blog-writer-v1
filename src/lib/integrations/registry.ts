/**
 * Integration Provider Registry
 * 
 * Central registry for managing and instantiating integration providers.
 * Uses factory pattern to create provider instances.
 */

import type { IIntegrationProvider, IntegrationType } from './types';
import { BaseIntegrationProvider } from './base-provider';

class IntegrationRegistry {
  private providers: Map<IntegrationType, new () => IIntegrationProvider> = new Map();
  private instances: Map<IntegrationType, IIntegrationProvider> = new Map();

  /**
   * Register a provider class
   */
  register(type: IntegrationType, providerClass: new () => IIntegrationProvider): void {
    if (this.providers.has(type)) {
      console.warn(`Provider ${type} is already registered. Overwriting...`);
    }
    this.providers.set(type, providerClass);
  }

  /**
   * Get a provider instance (singleton pattern)
   */
  getProvider(type: IntegrationType): IIntegrationProvider | null {
    // Return cached instance if available
    if (this.instances.has(type)) {
      return this.instances.get(type)!;
    }

    // Create new instance if provider is registered
    const ProviderClass = this.providers.get(type);
    if (!ProviderClass) {
      console.error(`Provider ${type} is not registered`);
      return null;
    }

    try {
      const instance = new ProviderClass();
      this.instances.set(type, instance);
      return instance;
    } catch (error) {
      console.error(`Failed to instantiate provider ${type}:`, error);
      return null;
    }
  }

  /**
   * Check if a provider is registered
   */
  isRegistered(type: IntegrationType): boolean {
    return this.providers.has(type);
  }

  /**
   * Get all registered provider types
   */
  getRegisteredTypes(): IntegrationType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get provider metadata for all registered providers
   */
  getAllProviders(): Array<{
    type: IntegrationType;
    displayName: string;
    description: string;
    icon?: string;
  }> {
    return Array.from(this.providers.keys()).map(type => {
      const provider = this.getProvider(type);
      if (!provider) {
        return {
          type,
          displayName: type,
          description: '',
        };
      }
      return {
        type: provider.type,
        displayName: provider.displayName,
        description: provider.description,
        icon: provider.icon,
      };
    });
  }

  /**
   * Clear cached instances (useful for testing)
   */
  clearInstances(): void {
    this.instances.clear();
  }

  /**
   * Unregister a provider
   */
  unregister(type: IntegrationType): void {
    this.providers.delete(type);
    this.instances.delete(type);
  }
}

// Export singleton instance
export const integrationRegistry = new IntegrationRegistry();

// Export factory function
export function getIntegrationProvider(type: IntegrationType): IIntegrationProvider | null {
  return integrationRegistry.getProvider(type);
}

// Export registration helper
export function registerProvider(
  type: IntegrationType,
  providerClass: new () => IIntegrationProvider
): void {
  integrationRegistry.register(type, providerClass);
}

