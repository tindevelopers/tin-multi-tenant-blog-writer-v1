/**
 * Content Structure Validator for v1.3.1
 * 
 * Validates that blog content meets v1.3.1 structure guarantees:
 * - Exactly 1 H1 heading
 * - Minimum 3 H2 sections
 * - Proper heading hierarchy (H1 → H2 → H3)
 */

export interface ContentStructureValidation {
  isValid: boolean;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  h4Count: number;
  warnings: string[];
  headings: Array<{
    level: number;
    text: string;
    line: number;
  }>;
}

/**
 * Extract headings from markdown content
 */
function extractHeadings(content: string): Array<{ level: number; text: string; line: number }> {
  const lines = content.split('\n');
  const headings: Array<{ level: number; text: string; line: number }> = [];
  
  lines.forEach((line, index) => {
    const h1Match = line.match(/^# (.+)$/);
    const h2Match = line.match(/^## (.+)$/);
    const h3Match = line.match(/^### (.+)$/);
    const h4Match = line.match(/^#### (.+)$/);
    
    if (h1Match) {
      headings.push({ level: 1, text: h1Match[1].trim(), line: index + 1 });
    } else if (h2Match) {
      headings.push({ level: 2, text: h2Match[1].trim(), line: index + 1 });
    } else if (h3Match) {
      headings.push({ level: 3, text: h3Match[1].trim(), line: index + 1 });
    } else if (h4Match) {
      headings.push({ level: 4, text: h4Match[1].trim(), line: index + 1 });
    }
  });
  
  return headings;
}

/**
 * Validate content structure according to v1.3.1 guarantees
 */
export function validateContentStructure(content: string): ContentStructureValidation {
  const headings = extractHeadings(content);
  const h1Headings = headings.filter(h => h.level === 1);
  const h2Headings = headings.filter(h => h.level === 2);
  const h3Headings = headings.filter(h => h.level === 3);
  const h4Headings = headings.filter(h => h.level === 4);
  
  const warnings: string[] = [];
  
  // Check for exactly 1 H1
  if (h1Headings.length === 0) {
    warnings.push('No H1 heading found. v1.3.1 guarantees exactly 1 H1 heading.');
  } else if (h1Headings.length > 1) {
    warnings.push(`Found ${h1Headings.length} H1 headings. v1.3.1 guarantees exactly 1 H1 heading.`);
  }
  
  // Check for minimum 3 H2 sections
  if (h2Headings.length < 3) {
    warnings.push(`Found ${h2Headings.length} H2 sections. v1.3.1 guarantees minimum 3 H2 sections.`);
  }
  
  // Check heading hierarchy
  if (h1Headings.length > 0 && h2Headings.length > 0) {
    const firstH2Line = h2Headings[0].line;
    const firstH1Line = h1Headings[0].line;
    
    if (firstH2Line < firstH1Line) {
      warnings.push('H2 heading appears before H1. Expected hierarchy: H1 → H2 → H3.');
    }
  }
  
  // Check for H3 without parent H2
  if (h3Headings.length > 0 && h2Headings.length === 0) {
    warnings.push('H3 headings found without parent H2 sections. Expected hierarchy: H1 → H2 → H3.');
  }
  
  // Check for H4 without parent H3
  if (h4Headings.length > 0 && h3Headings.length === 0) {
    warnings.push('H4 headings found without parent H3 sections. Expected hierarchy: H2 → H3 → H4.');
  }
  
  const isValid = 
    h1Headings.length === 1 &&
    h2Headings.length >= 3 &&
    warnings.length === 0;
  
  return {
    isValid,
    h1Count: h1Headings.length,
    h2Count: h2Headings.length,
    h3Count: h3Headings.length,
    h4Count: h4Headings.length,
    warnings,
    headings
  };
}

/**
 * Get structure summary message
 */
export function getStructureSummary(validation: ContentStructureValidation): string {
  const parts: string[] = [];
  
  if (validation.h1Count === 1) {
    parts.push('✅ 1 H1');
  } else {
    parts.push(`⚠️ ${validation.h1Count} H1`);
  }
  
  if (validation.h2Count >= 3) {
    parts.push(`✅ ${validation.h2Count} H2`);
  } else {
    parts.push(`⚠️ ${validation.h2Count} H2 (min 3)`);
  }
  
  if (validation.h3Count > 0) {
    parts.push(`${validation.h3Count} H3`);
  }
  
  if (validation.h4Count > 0) {
    parts.push(`${validation.h4Count} H4`);
  }
  
  return parts.join(' • ');
}

