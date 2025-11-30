/**
 * Webflow Blog Template for TipTap
 * 
 * Provides utilities to structure TipTap content to match Webflow blog templates
 * and ensure compatibility with Webflow CMS RichText fields
 */

import { logger } from '@/utils/logger';

export interface WebflowBlogTemplate {
  name: string;
  description: string;
  structure: {
    header?: boolean;
    featuredImage?: boolean;
    content: {
      allowHeadings: boolean;
      allowLists: boolean;
      allowBlockquotes: boolean;
      allowImages: boolean;
      allowLinks: boolean;
      allowCode: boolean;
    };
    footer?: boolean;
  };
  htmlWrapper?: (content: string) => string;
}

/**
 * Default Webflow blog template structure
 * Matches common Webflow blog post templates
 */
export const DEFAULT_WEBFLOW_TEMPLATE: WebflowBlogTemplate = {
  name: 'Default Webflow Blog',
  description: 'Standard blog post structure compatible with Webflow CMS',
  structure: {
    header: true,
    featuredImage: true,
    content: {
      allowHeadings: true,
      allowLists: true,
      allowBlockquotes: true,
      allowImages: true,
      allowLinks: true,
      allowCode: true,
    },
    footer: false,
  },
};

/**
 * Clean and structure HTML content for Webflow RichText fields
 * Webflow RichText fields support standard HTML but prefer semantic structure
 */
export function formatContentForWebflow(html: string, template?: WebflowBlogTemplate): string {
  const tpl = template || DEFAULT_WEBFLOW_TEMPLATE;
  
  try {
    // Parse HTML
    if (typeof window === 'undefined') {
      // Server-side: Use basic string manipulation
      return cleanHTMLForWebflow(html);
    }
    
    // Client-side: Use DOM manipulation for better control
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;
    
    // Clean and structure the content
    const cleaned = cleanAndStructureHTML(body, tpl);
    
    return cleaned;
  } catch (error) {
    logger.warn('Error formatting content for Webflow, using cleaned HTML', { error });
    return cleanHTMLForWebflow(html);
  }
}

/**
 * Clean HTML for Webflow compatibility (server-side safe)
 */
function cleanHTMLForWebflow(html: string): string {
  // Remove script tags and event handlers
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
  
  // Ensure proper semantic HTML structure
  // Webflow prefers semantic elements
  cleaned = cleaned
    .replace(/<div[^>]*class="[^"]*heading[^"]*"[^>]*>/gi, '<h2>')
    .replace(/<\/div>/gi, (match, offset, string) => {
      // Only replace closing divs that might be headings
      const before = string.substring(Math.max(0, offset - 50), offset);
      if (before.includes('heading')) {
        return '</h2>';
      }
      return match;
    });
  
  return cleaned;
}

/**
 * Clean and structure HTML using DOM (client-side)
 */
function cleanAndStructureHTML(element: HTMLElement, template: WebflowBlogTemplate): string {
  // Remove unwanted elements
  const unwantedSelectors = ['script', 'style', 'iframe', 'object', 'embed'];
  unwantedSelectors.forEach(selector => {
    element.querySelectorAll(selector).forEach(el => el.remove());
  });
  
  // Remove event handlers
  const allElements = element.querySelectorAll('*');
  allElements.forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  
  // Ensure semantic structure
  // Convert divs with heading classes to proper headings
  element.querySelectorAll('div[class*="heading"], div[class*="h1"], div[class*="h2"], div[class*="h3"]').forEach(div => {
    const level = div.className.includes('h1') ? 1 : div.className.includes('h2') ? 2 : 3;
    const heading = document.createElement(`h${level}`);
    heading.textContent = div.textContent || '';
    div.replaceWith(heading);
  });
  
  // Ensure images have proper structure for Webflow
  element.querySelectorAll('img').forEach(img => {
    // Wrap images in figure if not already wrapped
    if (img.parentElement?.tagName !== 'FIGURE') {
      const figure = document.createElement('figure');
      figure.className = 'blog-image';
      img.parentNode?.insertBefore(figure, img);
      figure.appendChild(img);
      
      // Add alt text if missing
      if (!img.alt) {
        img.alt = 'Blog image';
      }
    }
  });
  
  // Ensure lists are properly structured
  element.querySelectorAll('ul, ol').forEach(list => {
    // Remove empty list items
    list.querySelectorAll('li:empty').forEach(li => li.remove());
  });
  
  // Clean up empty paragraphs
  element.querySelectorAll('p').forEach(p => {
    if (!p.textContent?.trim() && p.children.length === 0) {
      p.remove();
    }
  });
  
  return element.innerHTML;
}

/**
 * Wrap content in Webflow-compatible structure
 */
export function wrapContentForWebflow(content: string, template?: WebflowBlogTemplate): string {
  const tpl = template || DEFAULT_WEBFLOW_TEMPLATE;
  
  let wrapped = content;
  
  // Add wrapper if template specifies it
  if (tpl.htmlWrapper) {
    wrapped = tpl.htmlWrapper(content);
  }
  
  return wrapped;
}

/**
 * Create a custom Webflow template wrapper
 */
export function createWebflowTemplateWrapper(
  options: {
    containerClass?: string;
    contentClass?: string;
    imageWrapperClass?: string;
  } = {}
): (content: string) => string {
  const {
    containerClass = 'blog-post-content',
    contentClass = 'blog-content',
    imageWrapperClass = 'blog-image-wrapper',
  } = options;
  
  return (content: string) => {
    // Wrap images in proper containers
    let wrapped = content.replace(
      /<img([^>]*)>/gi,
      `<div class="${imageWrapperClass}"><img$1></div>`
    );
    
    // Wrap entire content
    wrapped = `<div class="${containerClass}"><div class="${contentClass}">${wrapped}</div></div>`;
    
    return wrapped;
  };
}

/**
 * Validate HTML structure for Webflow compatibility
 */
export function validateWebflowHTML(html: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for script tags
  if (/<script/i.test(html)) {
    errors.push('Script tags are not allowed in Webflow RichText fields');
  }
  
  // Check for iframes
  if (/<iframe/i.test(html)) {
    warnings.push('Iframes may not render correctly in Webflow RichText fields');
  }
  
  // Check for proper heading hierarchy
  const h1Count = (html.match(/<h1/gi) || []).length;
  if (h1Count > 1) {
    warnings.push('Multiple H1 tags detected. Webflow templates typically use one H1 for the title.');
  }
  
  // Check for images without alt text
  const imagesWithoutAlt = (html.match(/<img[^>]*(?!alt=)[^>]*>/gi) || []).length;
  if (imagesWithoutAlt > 0) {
    warnings.push(`${imagesWithoutAlt} image(s) missing alt text`);
  }
  
  // Check for proper list structure
  const orphanListItems = (html.match(/<li[^>]*>(?![\s\S]*<\/[uo]l>)/gi) || []).length;
  if (orphanListItems > 0) {
    errors.push('List items found outside of <ul> or <ol> tags');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Predefined Webflow blog templates
 */
export const WEBFLOW_TEMPLATES: Record<string, WebflowBlogTemplate> = {
  default: DEFAULT_WEBFLOW_TEMPLATE,
  
  minimal: {
    name: 'Minimal Blog',
    description: 'Simple blog structure with minimal formatting',
    structure: {
      header: false,
      featuredImage: false,
      content: {
        allowHeadings: true,
        allowLists: true,
        allowBlockquotes: false,
        allowImages: true,
        allowLinks: true,
        allowCode: false,
      },
      footer: false,
    },
  },
  
  magazine: {
    name: 'Magazine Style',
    description: 'Rich content structure for magazine-style blogs',
    structure: {
      header: true,
      featuredImage: true,
      content: {
        allowHeadings: true,
        allowLists: true,
        allowBlockquotes: true,
        allowImages: true,
        allowLinks: true,
        allowCode: true,
      },
      footer: true,
    },
    htmlWrapper: createWebflowTemplateWrapper({
      containerClass: 'magazine-blog-content',
      contentClass: 'magazine-content',
      imageWrapperClass: 'magazine-image',
    }),
  },
  
  technical: {
    name: 'Technical Blog',
    description: 'Structure optimized for technical content with code blocks',
    structure: {
      header: true,
      featuredImage: true,
      content: {
        allowHeadings: true,
        allowLists: true,
        allowBlockquotes: true,
        allowImages: true,
        allowLinks: true,
        allowCode: true,
      },
      footer: false,
    },
    htmlWrapper: createWebflowTemplateWrapper({
      containerClass: 'technical-blog-content',
      contentClass: 'technical-content',
      imageWrapperClass: 'technical-image',
    }),
  },
};

