/**
 * Word Count Expectations for v1.3.1
 * 
 * Defines minimum and target word counts for each content length option.
 * These expectations are guaranteed by the API in v1.3.1.
 */

export type ContentLength = 'short' | 'medium' | 'long' | 'extended' | 'very_long';

export interface WordCountExpectation {
  min: number;
  target: number;
  label: string;
}

export const WORD_COUNT_EXPECTATIONS: Record<ContentLength, WordCountExpectation> = {
  short: { min: 800, target: 1000, label: 'Short' },
  medium: { min: 1500, target: 2000, label: 'Medium' },
  long: { min: 2500, target: 3000, label: 'Long' },
  extended: { min: 4000, target: 5000, label: 'Extended' },
  very_long: { min: 4000, target: 5000, label: 'Very Long' } // Alias for extended
};

export type WordCountStatus = 'below_min' | 'meets_min' | 'exceeds_target';

/**
 * Get word count status based on actual count and expected length
 */
export function getWordCountStatus(
  wordCount: number,
  length?: ContentLength | string | null
): WordCountStatus | null {
  if (!length) return null;
  
  const normalizedLength = length === 'very_long' ? 'extended' : length as ContentLength;
  const expectation = WORD_COUNT_EXPECTATIONS[normalizedLength];
  
  if (!expectation) return null;
  
  if (wordCount < expectation.min) return 'below_min';
  if (wordCount >= expectation.target) return 'exceeds_target';
  return 'meets_min';
}

/**
 * Get formatted word count message with expectations
 */
export function getWordCountMessage(
  wordCount: number,
  length?: ContentLength | string | null
): string {
  if (!length) return `${wordCount} words`;
  
  const normalizedLength = length === 'very_long' ? 'extended' : length as ContentLength;
  const expectation = WORD_COUNT_EXPECTATIONS[normalizedLength];
  
  if (!expectation) return `${wordCount} words`;
  
  const status = getWordCountStatus(wordCount, length);
  const statusIcon = status === 'below_min' ? '⚠️' : status === 'exceeds_target' ? '✅' : '✓';
  
  return `${statusIcon} ${wordCount.toLocaleString()} words (Target: ${expectation.min.toLocaleString()}+ for ${expectation.label})`;
}

/**
 * Get word count expectation for a given length
 */
export function getWordCountExpectation(length?: ContentLength | string | null): WordCountExpectation | null {
  if (!length) return null;
  
  const normalizedLength = length === 'very_long' ? 'extended' : length as ContentLength;
  return WORD_COUNT_EXPECTATIONS[normalizedLength] || null;
}

