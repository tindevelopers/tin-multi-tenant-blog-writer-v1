/**
 * Hook for validating internal links before publishing
 * 
 * Provides functions to validate links and display results
 */

import { useState, useCallback } from 'react';

export interface ValidatedLink {
  url: string;
  anchorText: string;
  position: number;
  isValid: boolean;
  status: 'valid' | 'broken' | 'wrong_site' | 'not_published' | 'not_indexed' | 'external';
  issue?: string;
  suggestion?: string;
  suggestedUrl?: string;
}

export interface LinkValidationResult {
  isValid: boolean;
  canPublish: boolean;
  totalLinks: number;
  validLinks: number;
  brokenLinks: number;
  wrongSiteLinks: number;
  externalLinks: number;
  links: ValidatedLink[];
  warnings: string[];
  errors: string[];
}

export interface UseLinkValidationReturn {
  validating: boolean;
  result: LinkValidationResult | null;
  error: string | null;
  validateLinks: (params: {
    content: string;
    targetSiteId: string;
    targetSiteUrl?: string;
    postId?: string;
    strictMode?: boolean;
  }) => Promise<LinkValidationResult | null>;
  autoFixLinks: (params: {
    content: string;
    targetSiteId: string;
    targetSiteUrl?: string;
    postId?: string;
  }) => Promise<{
    fixedContent: string;
    fixedCount: number;
    validation: LinkValidationResult;
  } | null>;
  clearResult: () => void;
}

export function useLinkValidation(): UseLinkValidationReturn {
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<LinkValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateLinks = useCallback(async (params: {
    content: string;
    targetSiteId: string;
    targetSiteUrl?: string;
    postId?: string;
    strictMode?: boolean;
  }): Promise<LinkValidationResult | null> => {
    setValidating(true);
    setError(null);

    try {
      const response = await fetch('/api/publishing/validate-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: params.content,
          target_site_id: params.targetSiteId,
          target_site_url: params.targetSiteUrl,
          post_id: params.postId,
          strict_mode: params.strictMode || false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate links');
      }

      const validationResult = data.validation as LinkValidationResult;
      setResult(validationResult);
      return validationResult;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to validate links';
      setError(errorMessage);
      return null;
    } finally {
      setValidating(false);
    }
  }, []);

  const autoFixLinks = useCallback(async (params: {
    content: string;
    targetSiteId: string;
    targetSiteUrl?: string;
    postId?: string;
  }): Promise<{
    fixedContent: string;
    fixedCount: number;
    validation: LinkValidationResult;
  } | null> => {
    setValidating(true);
    setError(null);

    try {
      const response = await fetch('/api/publishing/validate-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: params.content,
          target_site_id: params.targetSiteId,
          target_site_url: params.targetSiteUrl,
          post_id: params.postId,
          auto_fix: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to auto-fix links');
      }

      const validationResult = data.validation as LinkValidationResult;
      setResult(validationResult);

      return {
        fixedContent: data.autoFix?.fixedContent || params.content,
        fixedCount: data.autoFix?.fixedCount || 0,
        validation: validationResult,
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to auto-fix links';
      setError(errorMessage);
      return null;
    } finally {
      setValidating(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    validating,
    result,
    error,
    validateLinks,
    autoFixLinks,
    clearResult,
  };
}
