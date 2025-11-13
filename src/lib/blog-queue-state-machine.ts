/**
 * Blog Queue State Machine
 * 
 * Defines valid status transitions and state management for the blog generation queue system.
 * This ensures data integrity and prevents invalid state transitions.
 */

// ============================================
// Type Definitions
// ============================================

export type QueueStatus = 
  | 'queued'
  | 'generating'
  | 'generated'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled';

export type PlatformStatus =
  | 'pending'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'unpublished';

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested';

// ============================================
// Status Transition Rules
// ============================================

/**
 * Valid state transitions for queue status
 * Maps current status to array of valid next statuses
 */
const VALID_QUEUE_TRANSITIONS: Record<QueueStatus, QueueStatus[]> = {
  queued: ['generating', 'cancelled'],
  generating: ['generated', 'failed', 'cancelled'],
  generated: ['in_review', 'scheduled', 'cancelled'],
  in_review: ['approved', 'rejected', 'cancelled'],
  approved: ['scheduled', 'publishing', 'cancelled'],
  rejected: ['generated', 'cancelled'],
  scheduled: ['publishing', 'cancelled'],
  publishing: ['published', 'failed'],
  published: [], // Terminal state - no transitions
  failed: ['queued', 'generating', 'cancelled'], // Can retry
  cancelled: [] // Terminal state - no transitions
};

/**
 * Valid state transitions for platform publishing status
 */
const VALID_PLATFORM_TRANSITIONS: Record<PlatformStatus, PlatformStatus[]> = {
  pending: ['scheduled', 'publishing', 'cancelled'],
  scheduled: ['publishing', 'cancelled'],
  publishing: ['published', 'failed'],
  published: ['unpublished'],
  failed: ['publishing', 'cancelled'], // Can retry
  unpublished: []
};

/**
 * Valid state transitions for approval status
 */
const VALID_APPROVAL_TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
  pending: ['approved', 'rejected', 'changes_requested'],
  approved: [], // Terminal state
  rejected: ['pending'], // Can resubmit
  changes_requested: ['pending'] // Can resubmit after changes
};

// ============================================
// Validation Functions
// ============================================

/**
 * Check if a queue status transition is valid
 */
export function canTransitionQueueStatus(
  currentStatus: QueueStatus,
  newStatus: QueueStatus
): boolean {
  return VALID_QUEUE_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Check if a platform status transition is valid
 */
export function canTransitionPlatformStatus(
  currentStatus: PlatformStatus,
  newStatus: PlatformStatus
): boolean {
  return VALID_PLATFORM_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Check if an approval status transition is valid
 */
export function canTransitionApprovalStatus(
  currentStatus: ApprovalStatus,
  newStatus: ApprovalStatus
): boolean {
  return VALID_APPROVAL_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

// ============================================
// Status Metadata
// ============================================

export interface StatusMetadata {
  label: string;
  color: string;
  icon: string;
  description: string;
  isTerminal: boolean;
  canRetry: boolean;
}

/**
 * Queue status metadata for UI display
 */
export const QUEUE_STATUS_METADATA: Record<QueueStatus, StatusMetadata> = {
  queued: {
    label: 'Queued',
    color: '#9CA3AF', // gray
    icon: '⏳',
    description: 'Waiting to start generation',
    isTerminal: false,
    canRetry: false
  },
  generating: {
    label: 'Generating',
    color: '#3B82F6', // blue
    icon: '🔄',
    description: 'AI is creating content',
    isTerminal: false,
    canRetry: false
  },
  generated: {
    label: 'Generated',
    color: '#10B981', // green
    icon: '✅',
    description: 'Content ready for review',
    isTerminal: false,
    canRetry: false
  },
  in_review: {
    label: 'In Review',
    color: '#F59E0B', // yellow
    icon: '👀',
    description: 'Waiting for manager approval',
    isTerminal: false,
    canRetry: false
  },
  approved: {
    label: 'Approved',
    color: '#10B981', // green
    icon: '✓',
    description: 'Approved and ready to publish',
    isTerminal: false,
    canRetry: false
  },
  rejected: {
    label: 'Rejected',
    color: '#EF4444', // red
    icon: '✗',
    description: 'Rejected - needs revision',
    isTerminal: false,
    canRetry: true
  },
  scheduled: {
    label: 'Scheduled',
    color: '#8B5CF6', // purple
    icon: '📅',
    description: 'Scheduled for future publishing',
    isTerminal: false,
    canRetry: false
  },
  publishing: {
    label: 'Publishing',
    color: '#3B82F6', // blue
    icon: '📤',
    description: 'Currently publishing to platforms',
    isTerminal: false,
    canRetry: false
  },
  published: {
    label: 'Published',
    color: '#10B981', // green
    icon: '🌐',
    description: 'Successfully published',
    isTerminal: true,
    canRetry: false
  },
  failed: {
    label: 'Failed',
    color: '#EF4444', // red
    icon: '❌',
    description: 'Generation or publishing failed',
    isTerminal: false,
    canRetry: true
  },
  cancelled: {
    label: 'Cancelled',
    color: '#6B7280', // gray
    icon: '🚫',
    description: 'Cancelled by user',
    isTerminal: true,
    canRetry: false
  }
};

/**
 * Platform status metadata for UI display
 */
export const PLATFORM_STATUS_METADATA: Record<PlatformStatus, StatusMetadata> = {
  pending: {
    label: 'Pending',
    color: '#9CA3AF',
    icon: '⏸️',
    description: 'Waiting for action',
    isTerminal: false,
    canRetry: false
  },
  scheduled: {
    label: 'Scheduled',
    color: '#8B5CF6',
    icon: '📅',
    description: 'Scheduled for future',
    isTerminal: false,
    canRetry: false
  },
  publishing: {
    label: 'Publishing',
    color: '#3B82F6',
    icon: '⏳',
    description: 'Currently publishing',
    isTerminal: false,
    canRetry: false
  },
  published: {
    label: 'Published',
    color: '#10B981',
    icon: '✅',
    description: 'Successfully published',
    isTerminal: false,
    canRetry: false
  },
  failed: {
    label: 'Failed',
    color: '#EF4444',
    icon: '❌',
    description: 'Publishing failed',
    isTerminal: false,
    canRetry: true
  },
  unpublished: {
    label: 'Unpublished',
    color: '#6B7280',
    icon: '🔒',
    description: 'Unpublished from platform',
    isTerminal: true,
    canRetry: false
  }
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get status metadata for queue status
 */
export function getQueueStatusMetadata(status: QueueStatus): StatusMetadata {
  return QUEUE_STATUS_METADATA[status];
}

/**
 * Get status metadata for platform status
 */
export function getPlatformStatusMetadata(status: PlatformStatus): StatusMetadata {
  return PLATFORM_STATUS_METADATA[status];
}

/**
 * Get all valid next statuses for a queue status
 */
export function getValidNextQueueStatuses(currentStatus: QueueStatus): QueueStatus[] {
  return VALID_QUEUE_TRANSITIONS[currentStatus] ?? [];
}

/**
 * Get all valid next statuses for a platform status
 */
export function getValidNextPlatformStatuses(currentStatus: PlatformStatus): PlatformStatus[] {
  return VALID_PLATFORM_TRANSITIONS[currentStatus] ?? [];
}

/**
 * Check if status is terminal (no further transitions)
 */
export function isTerminalQueueStatus(status: QueueStatus): boolean {
  return QUEUE_STATUS_METADATA[status].isTerminal;
}

/**
 * Check if status allows retry
 */
export function canRetryQueueStatus(status: QueueStatus): boolean {
  return QUEUE_STATUS_METADATA[status].canRetry;
}

/**
 * Validate and transition queue status
 * Throws error if transition is invalid
 */
export function transitionQueueStatus(
  currentStatus: QueueStatus,
  newStatus: QueueStatus
): QueueStatus {
  if (!canTransitionQueueStatus(currentStatus, newStatus)) {
    throw new Error(
      `Invalid status transition: ${currentStatus} → ${newStatus}. ` +
      `Valid transitions from ${currentStatus}: ${getValidNextQueueStatuses(currentStatus).join(', ')}`
    );
  }
  return newStatus;
}

/**
 * Validate and transition platform status
 * Throws error if transition is invalid
 */
export function transitionPlatformStatus(
  currentStatus: PlatformStatus,
  newStatus: PlatformStatus
): PlatformStatus {
  if (!canTransitionPlatformStatus(currentStatus, newStatus)) {
    throw new Error(
      `Invalid platform status transition: ${currentStatus} → ${newStatus}. ` +
      `Valid transitions from ${currentStatus}: ${getValidNextPlatformStatuses(currentStatus).join(', ')}`
    );
  }
  return newStatus;
}

/**
 * Get status progression percentage (for progress bars)
 */
export function getQueueStatusProgress(status: QueueStatus): number {
  const progressMap: Record<QueueStatus, number> = {
    queued: 0,
    generating: 25,
    generated: 50,
    in_review: 60,
    approved: 75,
    rejected: 50, // Back to generated state
    scheduled: 80,
    publishing: 90,
    published: 100,
    failed: 0, // Reset on retry
    cancelled: 0
  };
  return progressMap[status] ?? 0;
}

/**
 * Check if status indicates active work (not terminal or waiting)
 */
export function isActiveStatus(status: QueueStatus): boolean {
  return ['generating', 'publishing'].includes(status);
}

/**
 * Check if status indicates waiting state
 */
export function isWaitingStatus(status: QueueStatus): boolean {
  return ['queued', 'in_review', 'scheduled'].includes(status);
}

/**
 * Check if status indicates completion (success or failure)
 */
export function isCompleteStatus(status: QueueStatus): boolean {
  return ['published', 'failed', 'cancelled'].includes(status);
}

