import { logger } from '@/utils/logger';

export type PolishOperation =
  | 'improve_readability'
  | 'fix_grammar'
  | 'enhance_seo'
  | 'add_internal_links'
  | 'strengthen_intro'
  | 'strengthen_conclusion'
  | 'ensure_tone'
  | 'full_polish';

export interface PolishRequest {
  content: string;
  title: string;
  keywords?: string[];
  operations?: PolishOperation[];
  org_id?: string;
  target_tone?: string;
  brand_voice?: string;
  max_internal_links?: number;
  site_id?: string;
}

export interface PolishResult {
  polished_content: string;
  changes_made?: string[];
  improvements?: {
    readability_score_before?: number;
    readability_score_after?: number;
    seo_score_before?: number;
    seo_score_after?: number;
    internal_links_added?: number;
    grammar_fixes?: number;
    style_improvements?: number;
  };
  suggestions?: string[];
}

export const blogPolishAPI = {
  async polishContent(payload: PolishRequest): Promise<PolishResult> {
    try {
      const response = await fetch('/api/blog-polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error || `Polish failed: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to polish content'), {
        endpoint: '/api/blog-polish',
      });
      throw error;
    }
  },
};

