/**
 * Environment Detection Utility
 * 
 * Provides utilities for detecting the current environment and generating
 * environment-specific table names for the environment-suffixed schema pattern.
 */

export type Environment = 'dev' | 'staging' | 'prod';

/**
 * Get the current environment based on NODE_ENV and VERCEL_ENV
 */
export function getEnvironment(): Environment {
  const env = process.env.NODE_ENV || 'development';
  const vercelEnv = process.env.VERCEL_ENV;
  const envString = String(env);

  // Vercel environment takes precedence
  if (vercelEnv === 'production') return 'prod';
  if (vercelEnv === 'preview' || envString === 'staging') return 'staging';
  
  // Default to dev for development
  return 'dev';
}

/**
 * Get the table suffix for the current environment
 * @param env Optional environment override
 * @returns Table suffix (e.g., '_dev', '_staging', '_prod')
 */
export function getTableSuffix(env?: Environment): string {
  const environment = env || getEnvironment();
  return `_${environment}`;
}

/**
 * Get the full table name with environment suffix
 * @param baseName Base table name (e.g., 'integrations', 'recommendations')
 * @param env Optional environment override
 * @returns Full table name (e.g., 'integrations_dev', 'integrations_staging')
 */
export function getTableName(baseName: string, env?: Environment): string {
  return `${baseName}${getTableSuffix(env)}`;
}

/**
 * Check if environment-suffixed tables should be used
 * This can be controlled via environment variable for gradual migration
 */
export function useEnvironmentTables(): boolean {
  return process.env.USE_ENVIRONMENT_TABLES !== 'false';
}

/**
 * Get environment display name
 */
export function getEnvironmentDisplayName(env?: Environment): string {
  const environment = env || getEnvironment();
  switch (environment) {
    case 'prod':
      return 'Production';
    case 'staging':
      return 'Staging';
    case 'dev':
    default:
      return 'Development';
  }
}

