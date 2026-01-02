import { logger } from '@/utils/logger';

export interface MetaTagsRequest {
  content: string;
  title?: string;
  keywords?: string[];
  canonical_url?: string;
  featured_image?: string;
}

export interface MetaTagsResult {
  meta_title?: string;
  meta_description?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  og_type?: string;
  twitter_card?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image?: string;
  canonical_url?: string;
  [key: string]: string | undefined;
}

export const metadataGenerationAPI = {
  async generateMetaTags(payload: MetaTagsRequest): Promise<MetaTagsResult> {
    try {
      const response = await fetch('/api/blog-meta-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error ||
          `Meta tags generation failed: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to generate meta tags'), {
        endpoint: '/api/blog-meta-tags',
      });
      throw error;
    }
  },
};

