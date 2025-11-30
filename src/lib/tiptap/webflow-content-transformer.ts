/**
 * Webflow Content Transformer for TipTap
 * 
 * Transforms TipTap HTML output to match Webflow blog structure
 */

import { formatContentForWebflow, validateWebflowHTML, WEBFLOW_TEMPLATES, type WebflowBlogTemplate } from './webflow-template';
import { logger } from '@/utils/logger';

export interface WebflowContentTransformOptions {
  template?: string | WebflowBlogTemplate;
  validate?: boolean;
  clean?: boolean;
}

/**
 * Transform TipTap HTML content for Webflow CMS
 */
export function transformForWebflow(
  html: string,
  options: WebflowContentTransformOptions = {}
): {
  html: string;
  validation?: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
} {
  const {
    template = 'default',
    validate = true,
    clean = true,
  } = options;
  
  // Get template
  let webflowTemplate: WebflowBlogTemplate;
  if (typeof template === 'string') {
    webflowTemplate = WEBFLOW_TEMPLATES[template] || WEBFLOW_TEMPLATES.default;
  } else {
    webflowTemplate = template;
  }
  
  // Transform content
  let transformed = html;
  
  if (clean) {
    transformed = formatContentForWebflow(html, webflowTemplate);
  }
  
  // Validate if requested
  let validation;
  if (validate) {
    validation = validateWebflowHTML(transformed);
    
    if (!validation.valid) {
      logger.warn('Webflow HTML validation failed', {
        errors: validation.errors,
        warnings: validation.warnings,
      });
    } else if (validation.warnings.length > 0) {
      logger.debug('Webflow HTML validation warnings', {
        warnings: validation.warnings,
      });
    }
  }
  
  return {
    html: transformed,
    validation,
  };
}

/**
 * Create a TipTap content handler that automatically transforms for Webflow
 */
export function createWebflowContentHandler(options: WebflowContentTransformOptions = {}) {
  return (html: string): string => {
    const result = transformForWebflow(html, options);
    return result.html;
  };
}

