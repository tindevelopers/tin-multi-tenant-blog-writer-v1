/**
 * Blog Writer API URL Configuration
 * Automatically selects the correct API endpoint based on branch/environment
 */

/**
 * Determines the Blog Writer API URL based on branch/environment
 * 
 * Priority:
 * 1. BLOG_WRITER_API_URL environment variable (if explicitly set)
 * 2. Branch name detection (main → prod, staging → staging, else → dev)
 * 
 * Branch Mapping:
 * - main/master/prod/production → blog-writer-api-prod
 * - staging/stage → blog-writer-api-staging
 * - develop/feature branches → blog-writer-api-dev (default)
 */
export function getBlogWriterApiUrl(): string {
  // If explicitly set via environment variable, use that (highest priority)
  if (process.env.BLOG_WRITER_API_URL) {
    return process.env.BLOG_WRITER_API_URL;
  }
  
  // Get branch name from Vercel environment variables
  // VERCEL_GIT_COMMIT_REF is set by Vercel during builds
  const branch = process.env.VERCEL_GIT_COMMIT_REF || 
                 process.env.GIT_BRANCH || 
                 process.env.BRANCH || 
                 'develop';
  
  // Normalize branch name to lowercase for comparison
  const branchLower = branch.toLowerCase();
  
  // Map branches to API endpoints
  if (branchLower.includes('main') || 
      branchLower.includes('master') || 
      branchLower === 'prod' || 
      branchLower === 'production') {
    // Production branch → Production API
    return 'https://blog-writer-api-prod-613248238610.us-east1.run.app';
  } else if (branchLower.includes('staging') || 
             branchLower === 'stage') {
    // Staging branch → Staging API
    return 'https://blog-writer-api-staging-613248238610.europe-west9.run.app';
  } else {
    // Default to dev for develop, feature branches, etc.
    // Dev endpoint: https://blog-writer-api-dev-613248238610.europe-west9.run.app
    return 'https://blog-writer-api-dev-613248238610.europe-west9.run.app';
  }
}

// Export the resolved URL as a constant
export const BLOG_WRITER_API_URL = getBlogWriterApiUrl();

// Updated: Sun Nov 16 23:40:37 CET 2025
