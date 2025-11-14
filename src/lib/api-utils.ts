/**
 * Shared utilities for API routes
 * Provides common patterns for authentication, error handling, and responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';

export interface AuthenticatedUser {
  id: string;
  email: string;
  org_id: string;
  role: string;
  full_name?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
  details?: unknown;
}

/**
 * Extract authenticated user from request
 * Returns user info or null if not authenticated
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      logger.debug('Authentication failed', { error: authError?.message });
      return null;
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, email, org_id, role, full_name')
      .eq('user_id', authUser.id)
      .single();

    if (userError || !userData) {
      logger.warn('User data not found', { userId: authUser.id, error: userError?.message });
      return null;
    }

    return {
      id: userData.user_id,
      email: userData.email,
      org_id: userData.org_id,
      role: userData.role,
      full_name: userData.full_name || undefined,
    };
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'getAuthenticatedUser',
    });
    return null;
  }
}

/**
 * Require authentication - throws if user is not authenticated
 */
export async function requireAuth(
  request: NextRequest
): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    throw new ApiErrorResponse('Unauthorized', 401);
  }
  return user;
}

/**
 * Require specific role(s) - throws if user doesn't have required role
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<AuthenticatedUser> {
  const user = await requireAuth(request);
  if (!allowedRoles.includes(user.role)) {
    throw new ApiErrorResponse('Forbidden: Insufficient permissions', 403);
  }
  return user;
}

/**
 * Custom error class for API responses
 */
export class ApiErrorResponse extends Error {
  statusCode: number;
  code?: string;
  details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'ApiErrorResponse';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiErrorResponse) {
    logger.error('API error response', {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
    });
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    logger.logError(error, { context: 'API route error handler' });
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }

  logger.error('Unknown error type', { error });
  return NextResponse.json(
    {
      error: 'Internal server error',
    },
    { status: 500 }
  );
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Parse JSON body with error handling
 */
export async function parseJsonBody<T = unknown>(
  request: NextRequest
): Promise<T> {
  try {
    return await request.json();
  } catch (error) {
    throw new ApiErrorResponse('Invalid JSON body', 400, 'INVALID_JSON');
  }
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  requiredFields: string[]
): void {
  const missingFields = requiredFields.filter((field) => !(field in body));
  if (missingFields.length > 0) {
    throw new ApiErrorResponse(
      `Missing required fields: ${missingFields.join(', ')}`,
      400,
      'MISSING_FIELDS',
      { missingFields }
    );
  }
}

/**
 * API route wrapper that handles errors and authentication
 */
export function withAuth<T = unknown>(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>,
  options?: {
    requireRoles?: string[];
    allowUnauthenticated?: boolean;
  }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      let user: AuthenticatedUser | null = null;

      if (!options?.allowUnauthenticated) {
        if (options?.requireRoles) {
          user = await requireRole(request, options.requireRoles);
        } else {
          user = await requireAuth(request);
        }
      } else {
        user = await getAuthenticatedUser(request);
      }

      return await handler(request, user!);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * API route wrapper for GET requests
 */
export function withGetAuth<T = unknown>(
  handler: (request: NextRequest, user: AuthenticatedUser | null) => Promise<NextResponse>,
  options?: {
    requireRoles?: string[];
    allowUnauthenticated?: boolean;
  }
) {
  return withAuth(handler, options);
}

/**
 * API route wrapper for POST/PUT/DELETE requests
 */
export function withMutationAuth<T = unknown>(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>,
  options?: {
    requireRoles?: string[];
  }
) {
  return withAuth(handler, { ...options, allowUnauthenticated: false });
}

