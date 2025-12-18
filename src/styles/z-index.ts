/**
 * Standardized Z-Index Layer System
 * 
 * This file defines the z-index hierarchy for the application.
 * Use these constants instead of arbitrary z-index values to maintain
 * a consistent stacking order.
 * 
 * Layer Hierarchy (lowest to highest):
 * - content: 0 - Base page content
 * - dropdown: 30 - Dropdowns and popovers within content
 * - header: 40 - Sticky header
 * - sidebar: 50 - Fixed sidebar navigation
 * - modal: 60 - Modal overlays and dialogs
 * - toast: 70 - Toast notifications (above everything)
 */

export const Z_INDEX = {
  /** Base content - no z-index needed in most cases */
  content: 0,
  
  /** Dropdowns and popovers within content areas */
  dropdown: 30,
  
  /** Sticky header - below sidebar so sidebar overlaps on mobile */
  header: 40,
  
  /** Fixed sidebar navigation - primary navigation layer */
  sidebar: 50,
  
  /** Modal overlays and dialogs - above all navigation */
  modal: 60,
  
  /** Toast notifications - highest priority, always visible */
  toast: 70,
} as const;

/** Type for z-index layer names */
export type ZIndexLayer = keyof typeof Z_INDEX;

/**
 * Tailwind CSS class equivalents for each z-index layer.
 * Use these when you need Tailwind classes instead of inline styles.
 */
export const Z_INDEX_CLASSES = {
  content: 'z-0',
  dropdown: 'z-30',
  header: 'z-40',
  sidebar: 'z-50',
  modal: 'z-[60]',
  toast: 'z-[70]',
} as const;

/**
 * Helper to get inline style object for z-index
 * @example style={{ zIndex: getZIndex('modal') }}
 */
export function getZIndex(layer: ZIndexLayer): number {
  return Z_INDEX[layer];
}
