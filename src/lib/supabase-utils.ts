/**
 * Shared utilities for Supabase queries
 * Provides common patterns for database operations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}

/**
 * Execute a Supabase query with error handling
 */
export async function executeQuery<T>(
  query: Promise<{ data: T | null; error: unknown }>,
  context: string
): Promise<T> {
  try {
    const { data, error } = await query;
    
    if (error) {
      logger.error('Supabase query error', {
        context,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    if (!data) {
      throw new Error(`No data returned from query: ${context}`);
    }
    
    return data;
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error('Unknown query error'), {
      context,
    });
    throw error;
  }
}

/**
 * Get single record by ID
 */
export async function getById<T>(
  supabase: SupabaseClient,
  table: string,
  id: string,
  idColumn: string = 'id'
): Promise<T | null> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(idColumn, id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      logger.error('Error fetching record by ID', {
        table,
        id,
        error: error.message,
      });
      throw error;
    }
    
    return data as T;
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'getById',
      table,
      id,
    });
    throw error;
  }
}

/**
 * Get records with pagination and filtering
 */
export async function getPaginated<T>(
  supabase: SupabaseClient,
  table: string,
  options: QueryOptions = {}
): Promise<{ data: T[]; count: number }> {
  try {
    let query = supabase.from(table).select('*', { count: 'exact' });
    
    // Apply filters
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }
    
    // Apply ordering
    if (options.orderBy) {
      query = query.order(options.orderBy, {
        ascending: options.orderDirection !== 'desc',
      });
    }
    
    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      logger.error('Error fetching paginated records', {
        table,
        error: error.message,
      });
      throw error;
    }
    
    return {
      data: (data || []) as T[],
      count: count || 0,
    };
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'getPaginated',
      table,
    });
    throw error;
  }
}

/**
 * Create a record
 */
export async function createRecord<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  record: T
): Promise<T> {
  try {
    const { data, error } = await supabase
      .from(table)
      .insert(record)
      .select()
      .single();
    
    if (error) {
      logger.error('Error creating record', {
        table,
        error: error.message,
      });
      throw error;
    }
    
    return data as T;
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'createRecord',
      table,
    });
    throw error;
  }
}

/**
 * Update a record
 */
export async function updateRecord<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  id: string,
  updates: Partial<T>,
  idColumn: string = 'id'
): Promise<T> {
  try {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq(idColumn, id)
      .select()
      .single();
    
    if (error) {
      logger.error('Error updating record', {
        table,
        id,
        error: error.message,
      });
      throw error;
    }
    
    if (!data) {
      throw new Error(`Record not found: ${table}.${idColumn} = ${id}`);
    }
    
    return data as T;
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'updateRecord',
      table,
      id,
    });
    throw error;
  }
}

/**
 * Delete a record
 */
export async function deleteRecord(
  supabase: SupabaseClient,
  table: string,
  id: string,
  idColumn: string = 'id'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq(idColumn, id);
    
    if (error) {
      logger.error('Error deleting record', {
        table,
        id,
        error: error.message,
      });
      throw error;
    }
    
    return true;
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'deleteRecord',
      table,
      id,
    });
    throw error;
  }
}

/**
 * Check if record exists
 */
export async function recordExists(
  supabase: SupabaseClient,
  table: string,
  id: string,
  idColumn: string = 'id'
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(idColumn)
      .eq(idColumn, id)
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return false;
      }
      logger.error('Error checking record existence', {
        table,
        id,
        error: error.message,
      });
      throw error;
    }
    
    return !!data;
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'recordExists',
      table,
      id,
    });
    throw error;
  }
}

