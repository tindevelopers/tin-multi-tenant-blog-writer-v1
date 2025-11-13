/**
 * Blog Queue System Type Definitions
 */

import type { QueueStatus, PlatformStatus, ApprovalStatus } from '@/lib/blog-queue-state-machine';

// ============================================
// Queue Item Types
// ============================================

export interface ProgressUpdate {
  stage: string;
  stage_number: number;
  total_stages: number;
  progress_percentage: number;
  status: string;
  details?: string;
  metadata: Record<string, any>;
  timestamp: number;
}

export interface BlogGenerationQueueItem {
  queue_id: string;
  org_id: string;
  post_id?: string | null;
  created_by: string;
  
  // Generation Request Details
  topic: string;
  keywords: string[];
  target_audience?: string | null;
  tone?: string | null;
  word_count?: number | null;
  quality_level?: string | null;
  custom_instructions?: string | null;
  template_type?: string | null;
  
  // Status Tracking
  status: QueueStatus;
  progress_percentage: number;
  current_stage?: string | null;
  progress_updates: ProgressUpdate[];
  
  // Generation Results
  generated_content?: string | null;
  generated_title?: string | null;
  generation_metadata: Record<string, any>;
  generation_error?: string | null;
  
  // Timing
  queued_at: string;
  generation_started_at?: string | null;
  generation_completed_at?: string | null;
  estimated_completion_at?: string | null;
  
  // Priority
  priority: number; // 1-10
  
  // Metadata
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  
  // Relations (when fetched with joins)
  created_by_user?: {
    user_id: string;
    email: string;
    full_name?: string | null;
  };
  post?: {
    post_id: string;
    title: string;
    status: string;
    content?: string | null;
    excerpt?: string | null;
  } | null;
  approvals?: BlogApproval[];
  publishing?: BlogPlatformPublishing[];
}

// ============================================
// Approval Types
// ============================================

export interface BlogApproval {
  approval_id: string;
  queue_id?: string | null;
  post_id?: string | null;
  org_id: string;
  status: ApprovalStatus;
  requested_by: string;
  requested_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  rejection_reason?: string | null;
  revision_number: number;
  previous_approval_id?: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  
  // Relations (when fetched with joins)
  requested_by_user?: {
    user_id: string;
    email: string;
    full_name?: string | null;
  };
  reviewed_by_user?: {
    user_id: string;
    email: string;
    full_name?: string | null;
  };
}

// ============================================
// Platform Publishing Types
// ============================================

export interface BlogPlatformPublishing {
  publishing_id: string;
  post_id: string;
  queue_id?: string | null;
  org_id: string;
  platform: 'webflow' | 'wordpress' | 'shopify';
  platform_post_id?: string | null;
  platform_url?: string | null;
  status: PlatformStatus;
  scheduled_at?: string | null;
  published_at?: string | null;
  published_by?: string | null;
  publish_metadata: Record<string, any>;
  error_message?: string | null;
  error_code?: string | null;
  retry_count: number;
  last_retry_at?: string | null;
  last_synced_at?: string | null;
  sync_status?: 'in_sync' | 'out_of_sync' | 'never_synced' | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateQueueItemRequest {
  topic: string;
  keywords?: string[];
  target_audience?: string;
  tone?: string;
  word_count?: number;
  quality_level?: string;
  custom_instructions?: string;
  template_type?: string;
  priority?: number; // 1-10, default 5
  metadata?: Record<string, any>;
}

export interface UpdateQueueItemRequest {
  status?: QueueStatus;
  priority?: number;
  progress_percentage?: number;
  current_stage?: string;
  progress_updates?: ProgressUpdate[];
  generation_error?: string;
  generated_content?: string;
  generated_title?: string;
  generation_metadata?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface QueueListResponse {
  items: BlogGenerationQueueItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface QueueStatsResponse {
  total: number;
  by_status: Record<QueueStatus, number>;
  recent_24h: number;
  average_generation_time_minutes: number;
}

// ============================================
// Filter Types
// ============================================

export interface QueueFilters {
  status?: QueueStatus;
  priority?: number;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  search?: string; // Search in topic, title
}

export interface QueueSortOptions {
  field: 'priority' | 'queued_at' | 'status' | 'created_at' | 'updated_at';
  order: 'asc' | 'desc';
}

