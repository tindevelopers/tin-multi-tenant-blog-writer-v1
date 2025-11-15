/**
 * Register Blog Writer API Providers
 * 
 * This file registers Blog Writer API providers for webflow, wordpress, and shopify.
 * These providers use the Blog Writer API as the backend for integration operations.
 */

import { registerProvider } from '../registry';
import {
  BlogWriterAPIWebflowProvider,
  BlogWriterAPIWordPressProvider,
  BlogWriterAPIShopifyProvider,
} from './blog-writer-api-provider';
import type { IntegrationType } from '../types';
import { logger } from '@/utils/logger';

/**
 * Register Blog Writer API providers
 * 
 * Call this function during application initialization to register
 * Blog Writer API providers for supported integration types.
 */
export function registerBlogWriterAPIProviders(): void {
  // Register Webflow provider
  registerProvider('webflow' as IntegrationType, BlogWriterAPIWebflowProvider);
  
  // Register WordPress provider
  registerProvider('wordpress' as IntegrationType, BlogWriterAPIWordPressProvider);
  
  // Register Shopify provider
  registerProvider('shopify' as IntegrationType, BlogWriterAPIShopifyProvider);

  logger.debug('✅ Registered Blog Writer API providers: webflow, wordpress, shopify');
}

/**
 * Auto-register providers if not already registered
 * This allows the providers to be available immediately
 * Note: In Next.js, this runs on both server and client, but we only register server-side
 * Client-side registration should be done explicitly in client components
 */
if (typeof window === 'undefined') {
  // Server-side: register immediately
  registerBlogWriterAPIProviders();
}

