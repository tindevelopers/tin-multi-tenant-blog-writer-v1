/**
 * Integration Connection Logger
 * 
 * Comprehensive logging service for integration connection attempts,
 * OAuth flows, and API interactions.
 */

import { createServiceClient } from '@/lib/supabase/service';
import type { Database } from '@/types/database';
import { logger } from '@/utils/logger';

type LogStatus = 
  | 'initiated'
  | 'oauth_initiated'
  | 'oauth_callback_received'
  | 'oauth_redirected'
  | 'oauth_success'
  | 'oauth_failed'
  | 'validating_credentials'
  | 'api_called'
  | 'api_success'
  | 'api_error'
  | 'saving_to_db'
  | 'saved'
  | 'failed'
  | 'cancelled'
  | 'connection_test_initiated'
  | 'connection_test_success'
  | 'connection_test_failed'
  | 'updated';

interface LogEntry {
  org_id: string;
  user_id: string;
  provider: 'webflow' | 'wordpress' | 'shopify';
  status: LogStatus;
  oauth_state?: string;
  oauth_code?: string;
  oauth_redirect_uri?: string;
  error_message?: string;
  error_code?: string;
  error_details?: Record<string, unknown>;
  api_request_payload?: Record<string, unknown>; // Sanitized
  api_response?: Record<string, unknown>;
  api_duration_ms?: number;
  saved_integration_id?: string;
  saved_recommendation_id?: string;
  connection_metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

export class IntegrationLogger {
  private supabase = createServiceClient();

  /**
   * Sanitize connection object to remove sensitive credentials
   */
  private sanitizeConnection(connection: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...connection };
    const sensitiveKeys = ['apiKey', 'api_key', 'token', 'access_token', 'refresh_token', 'password', 'secret'];
    
    sensitiveKeys.forEach(key => {
      if (key in sanitized) {
        sanitized[key] = sanitized[key] ? '[REDACTED]' : null;
      }
    });
    
    return sanitized;
  }

  /**
   * Create a new log entry
   */
  async log(entry: LogEntry): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('integration_connection_logs')
        .insert({
          org_id: entry.org_id,
          user_id: entry.user_id,
          provider: entry.provider,
          status: entry.status,
          oauth_state: entry.oauth_state,
          oauth_code: entry.oauth_code,
          oauth_redirect_uri: entry.oauth_redirect_uri,
          error_message: entry.error_message,
          error_code: entry.error_code,
          error_details: entry.error_details || null,
          api_request_payload: entry.api_request_payload 
            ? this.sanitizeConnection(entry.api_request_payload as Record<string, unknown>)
            : null,
          api_response: entry.api_response || null,
          api_duration_ms: entry.api_duration_ms || null,
          saved_integration_id: entry.saved_integration_id || null,
          saved_recommendation_id: entry.saved_recommendation_id || null,
          connection_metadata: entry.connection_metadata || {},
          ip_address: entry.ip_address || null,
          user_agent: entry.user_agent || null,
        })
        .select('log_id')
        .single();

      if (error) {
        logger.error('❌ Failed to log integration connection:', error);
        return null;
      }

      return data?.log_id || null;
    } catch (error) {
      logger.error('❌ Error logging integration connection:', error);
      return null;
    }
  }

  /**
   * Update an existing log entry
   */
  async updateLog(logId: string, updates: Partial<LogEntry>): Promise<boolean> {
    try {
      const updateData: Record<string, unknown> = {};
      
      if (updates.status) updateData.status = updates.status;
      if (updates.error_message) updateData.error_message = updates.error_message;
      if (updates.error_code) updateData.error_code = updates.error_code;
      if (updates.error_details) updateData.error_details = updates.error_details;
      if (updates.api_response) updateData.api_response = updates.api_response;
      if (updates.api_duration_ms) updateData.api_duration_ms = updates.api_duration_ms;
      if (updates.saved_integration_id) updateData.saved_integration_id = updates.saved_integration_id;
      if (updates.saved_recommendation_id) updateData.saved_recommendation_id = updates.saved_recommendation_id;
      if (updates.connection_metadata) updateData.connection_metadata = updates.connection_metadata;

      const { error } = await this.supabase
        .from('integration_connection_logs')
        .update(updateData)
        .eq('log_id', logId);

      if (error) {
        logger.error('❌ Failed to update log:', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('❌ Error updating log:', error);
      return false;
    }
  }

  /**
   * Get logs for an organization
   */
  async getLogs(
    orgId: string,
    options?: {
      provider?: 'webflow' | 'wordpress' | 'shopify';
      status?: LogStatus;
      limit?: number;
      offset?: number;
    }
  ) {
    try {
      let query = this.supabase
        .from('integration_connection_logs')
        .select('*')
        .eq('org_id', orgId)
        .order('connection_attempt_at', { ascending: false });

      if (options?.provider) {
        query = query.eq('provider', options.provider);
      }

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('❌ Failed to fetch logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('❌ Error fetching logs:', error);
      return [];
    }
  }
}

export const integrationLogger = new IntegrationLogger();

