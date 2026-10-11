/**
 * Standard API Response Structures for School Management System
 * Guarantees uniform payload shape across all endpoints
 */

export interface ApiErrorPayload {
  message: string;
  code?: string;
  details?: unknown;
  fieldErrors?: Record<string, string[]>;
}

export interface ApiPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponseMeta {
  timestamp: string;
  requestId?: string;
  pagination?: ApiPaginationMeta;
  [key: string]: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiErrorPayload;
  code?: string;
  meta: ApiResponseMeta;
}

/**
 * Creates a standard successful API response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  metaExtensions?: Record<string, unknown>
): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(message ? { message } : {}),
    meta: {
      timestamp: new Date().toISOString(),
      ...metaExtensions,
    },
  };
}

/**
 * Creates a standard paginated API response
 */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
  message?: string
): ApiResponse<T[]> {
  const safeLimit = Math.max(1, limit);
  const totalPages = Math.ceil(total / safeLimit);

  return {
    success: true,
    data: items,
    ...(message ? { message } : {}),
    meta: {
      timestamp: new Date().toISOString(),
      pagination: {
        page,
        limit: safeLimit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
  };
}

/**
 * Creates a standard error API response
 */
export function errorResponse(
  message: string,
  code: string = "INTERNAL_ERROR",
  details?: unknown,
  fieldErrors?: Record<string, string[]>,
  metaExtensions?: Record<string, unknown>
): ApiResponse<never> {
  return {
    success: false,
    error: {
      message,
      code,
      ...(details !== undefined ? { details } : {}),
      ...(fieldErrors ? { fieldErrors } : {}),
    },
    code,
    meta: {
      timestamp: new Date().toISOString(),
      ...metaExtensions,
    },
  };
}
