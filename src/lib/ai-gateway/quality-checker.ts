/**
 * AI Gateway Quality Checker
 * 
 * Detects and removes LLM artifacts, meta-commentary, and quality issues
 * from generated blog content.
 */

import { logger } from '@/utils/logger';

export interface QualityIssue {
  type: 'meta_commentary' | 'artifact' | 'structure' | 'formatting' | 'incomplete';
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: string;
  suggestion?: string;
}

export interface QualityCheckResult {
  isClean: boolean;
  qualityScore: number; // 0-100
  issues: QualityIssue[];
  cleanedContent: string;
}

// Patterns that indicate LLM meta-commentary (the AI talking about what it will do)
const META_COMMENTARY_PATTERNS = [
  /I'll provide[^.]*\./gi,
  /I will provide[^.]*\./gi,
  /I'm going to[^.]*\./gi,
  /Let me[^.]*\./gi,
  /Here's[^.]*:/gi,
  /Here is[^.]*:/gi,
  /Would you like me to[^?]*\?/gi,
  /Do you want me to[^?]*\?/gi,
  /I can help you[^.]*\./gi,
  /This enhanced version[^.]*\./gi,
  /This blog post[^.]*addresses[^.]*\./gi,
  /I've[^.]*created[^.]*\./gi,
  /I have[^.]*created[^.]*\./gi,
  /As requested[^.]*\./gi,
  /Based on your[^.]*\./gi,
  /According to your instructions[^.]*\./gi,
];

// Patterns for self-referential endings
const SELF_REFERENTIAL_PATTERNS = [
  /Would you like me to further refine[^?]*\?/gi,
  /Would you like any changes[^?]*\?/gi,
  /Let me know if you[^.]*\./gi,
  /Feel free to ask[^.]*\./gi,
  /I hope this helps[^.]*\./gi,
  /Please let me know[^.]*\./gi,
  /If you need any[^.]*\./gi,
  /Is there anything else[^?]*\?/gi,
];

// Patterns for formatting artifacts
const ARTIFACT_PATTERNS = [
  /!\s*([A-Z][a-z]+\s+[A-Za-z]+)/g, // Image placeholder artifacts like "!AI Marketing"
  /\[Image:?\s*[^\]]*\]/gi, // [Image: description] placeholders
  /\(image-url\)/gi, // Literal placeholder text
  /\{[^}]*placeholder[^}]*\}/gi, // {placeholder} patterns
  /for example similar cases\.\./gi, // Repeated artifact
  /such as similar cases\.\./gi,
  /\.\s*\.\s*\./g, // Multiple periods with spaces
];

// Check for proper heading structure
function checkHeadingStructure(content: string): QualityIssue[] {
  const issues: QualityIssue[] = [];
  
  // Check for H1
  const h1Matches = content.match(/<h1[^>]*>|^#\s+/gm);
  if (!h1Matches || h1Matches.length === 0) {
    issues.push({
      type: 'structure',
      severity: 'warning',
      message: 'Missing H1 heading',
      suggestion: 'Add a main title with H1 tag',
    });
  } else if (h1Matches.length > 1) {
    issues.push({
      type: 'structure',
      severity: 'warning',
      message: 'Multiple H1 headings found',
      suggestion: 'Use only one H1 heading per page',
    });
  }
  
  // Check for H2 sections
  const h2Matches = content.match(/<h2[^>]*>|^##\s+/gm);
  if (!h2Matches || h2Matches.length < 2) {
    issues.push({
      type: 'structure',
      severity: 'info',
      message: 'Few H2 sections found',
      suggestion: 'Consider adding more H2 sections for better structure',
    });
  }
  
  return issues;
}

// Check for broken characters (encoding issues)
function checkEncodingIssues(content: string): QualityIssue[] {
  const issues: QualityIssue[] = [];
  
  // Common encoding artifacts
  const encodingPatterns = [
    { pattern: /\ufffd/g, name: 'replacement character' },
    { pattern: /â€™/g, name: 'smart quote encoding' },
    { pattern: /â€"/g, name: 'em dash encoding' },
    { pattern: /Ã©/g, name: 'accented character encoding' },
  ];
  
  for (const { pattern, name } of encodingPatterns) {
    if (pattern.test(content)) {
      issues.push({
        type: 'formatting',
        severity: 'error',
        message: `Encoding issue detected: ${name}`,
        suggestion: 'Fix character encoding',
      });
    }
  }
  
  return issues;
}

/**
 * Remove meta-commentary and artifacts from content
 */
export function cleanContent(content: string): string {
  let cleaned = content;
  
  // Remove meta-commentary
  for (const pattern of META_COMMENTARY_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove self-referential endings
  for (const pattern of SELF_REFERENTIAL_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove artifacts
  for (const pattern of ARTIFACT_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Clean up multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Clean up leading/trailing whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Calculate quality score based on issues found
 */
function calculateQualityScore(issues: QualityIssue[]): number {
  let score = 100;
  
  for (const issue of issues) {
    switch (issue.severity) {
      case 'error':
        score -= 15;
        break;
      case 'warning':
        score -= 5;
        break;
      case 'info':
        score -= 2;
        break;
    }
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Perform comprehensive quality check on blog content
 */
export function checkContentQuality(content: string): QualityCheckResult {
  const issues: QualityIssue[] = [];
  
  // Check for meta-commentary
  for (const pattern of META_COMMENTARY_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      issues.push({
        type: 'meta_commentary',
        severity: 'error',
        message: `Meta-commentary detected: "${matches[0].substring(0, 50)}..."`,
        suggestion: 'Remove AI self-referential text',
      });
    }
  }
  
  // Check for self-referential endings
  for (const pattern of SELF_REFERENTIAL_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      issues.push({
        type: 'meta_commentary',
        severity: 'error',
        message: `Self-referential ending detected: "${matches[0].substring(0, 50)}..."`,
        suggestion: 'Remove conversational endings',
      });
    }
  }
  
  // Check for artifacts
  for (const pattern of ARTIFACT_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      issues.push({
        type: 'artifact',
        severity: 'warning',
        message: `Artifact detected: "${matches[0].substring(0, 30)}..."`,
        suggestion: 'Remove placeholder text',
      });
    }
  }
  
  // Check heading structure
  issues.push(...checkHeadingStructure(content));
  
  // Check encoding issues
  issues.push(...checkEncodingIssues(content));
  
  // Clean the content
  const cleanedContent = cleanContent(content);
  
  // Check if content seems incomplete
  if (cleanedContent.length < 500) {
    issues.push({
      type: 'incomplete',
      severity: 'warning',
      message: 'Content appears too short',
      suggestion: 'Consider generating more comprehensive content',
    });
  }
  
  const qualityScore = calculateQualityScore(issues);
  const isClean = issues.filter(i => i.severity === 'error').length === 0;
  
  logger.debug('Quality check completed', {
    issueCount: issues.length,
    qualityScore,
    isClean,
  });
  
  return {
    isClean,
    qualityScore,
    issues,
    cleanedContent,
  };
}
