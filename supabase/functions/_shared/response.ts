/**
 * Standardized API Response Utilities
 * 
 * Provides consistent response formats across all Edge Functions
 * Includes success/error responses, pagination, and validation helpers
 */

import { createSecureResponse } from './cors'

/**
 * Standard API response interface
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
  pagination?: PaginationInfo
  meta?: Record<string, any>
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string
  message: string
  code: string
}

/**
 * Create success response
 * @param data - Response data
 * @param message - Success message (optional)
 * @param meta - Additional metadata (optional)
 * @param request - Original request for CORS
 * @returns Success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  meta?: Record<string, any>,
  request?: Request
): Response {
  const responseBody: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    meta,
  }

  if (request) {
    return createSecureResponse(
      JSON.stringify(responseBody),
      { status: 200 },
      request
    )
  }

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Create paginated success response
 * @param data - Response data array
 * @param pagination - Pagination info
 * @param message - Success message (optional)
 * @param request - Original request for CORS
 * @returns Paginated success response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationInfo,
  message?: string,
  request?: Request
): Response {
  const responseBody: ApiResponse<T[]> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    pagination,
  }

  if (request) {
    return createSecureResponse(
      JSON.stringify(responseBody),
      { status: 200 },
      request
    )
  }

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Create error response
 * @param error - Error message
 * @param status - HTTP status code
 * @param details - Additional error details (optional)
 * @param request - Original request for CORS
 * @returns Error response
 */
export function createErrorResponse(
  error: string,
  status: number = 400,
  details?: Record<string, any>,
  request?: Request
): Response {
  const responseBody: ApiResponse = {
    success: false,
    error,
    timestamp: new Date().toISOString(),
    meta: details,
  }

  if (request) {
    return createSecureResponse(
      JSON.stringify(responseBody),
      { status },
      request
    )
  }

  return new Response(JSON.stringify(responseBody), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Create validation error response
 * @param errors - Array of validation errors
 * @param request - Original request for CORS
 * @returns Validation error response
 */
export function createValidationErrorResponse(
  errors: ValidationError[],
  request?: Request
): Response {
  const responseBody: ApiResponse = {
    success: false,
    error: 'Validation failed',
    timestamp: new Date().toISOString(),
    meta: { validationErrors: errors },
  }

  if (request) {
    return createSecureResponse(
      JSON.stringify(responseBody),
      { status: 422 },
      request
    )
  }

  return new Response(JSON.stringify(responseBody), {
    status: 422,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Create unauthorized response
 * @param message - Unauthorized message
 * @param request - Original request for CORS
 * @returns Unauthorized response
 */
export function createUnauthorizedResponse(
  message: string = 'Unauthorized access',
  request?: Request
): Response {
  return createErrorResponse(message, 401, undefined, request)
}

/**
 * Create forbidden response
 * @param message - Forbidden message
 * @param request - Original request for CORS
 * @returns Forbidden response
 */
export function createForbiddenResponse(
  message: string = 'Access forbidden',
  request?: Request
): Response {
  return createErrorResponse(message, 403, undefined, request)
}

/**
 * Create not found response
 * @param resource - Resource name
 * @param request - Original request for CORS
 * @returns Not found response
 */
export function createNotFoundResponse(
  resource: string = 'Resource',
  request?: Request
): Response {
  return createErrorResponse(`${resource} not found`, 404, undefined, request)
}

/**
 * Create server error response
 * @param message - Error message
 * @param request - Original request for CORS
 * @returns Server error response
 */
export function createServerErrorResponse(
  message: string = 'Internal server error',
  request?: Request
): Response {
  return createErrorResponse(message, 500, undefined, request)
}

/**
 * Calculate pagination info
 * @param total - Total number of items
 * @param page - Current page (1-based)
 * @param limit - Items per page
 * @returns Pagination information
 */
export function calculatePagination(
  total: number,
  page: number,
  limit: number
): PaginationInfo {
  const totalPages = Math.ceil(total / limit)
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}

/**
 * Parse pagination parameters from URL
 * @param url - Request URL
 * @returns Pagination parameters
 */
export function parsePaginationParams(url: string): {
  page: number
  limit: number
  offset: number
} {
  const urlObj = new URL(url)
  const page = Math.max(1, parseInt(urlObj.searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(urlObj.searchParams.get('limit') || '20')))
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

/**
 * Validate required fields in request body
 * @param body - Request body object
 * @param requiredFields - Array of required field names
 * @returns Validation errors array
 */
export function validateRequiredFields(
  body: Record<string, any>,
  requiredFields: string[]
): ValidationError[] {
  const errors: ValidationError[] = []

  for (const field of requiredFields) {
    if (!body[field] || body[field] === '') {
      errors.push({
        field,
        message: `${field} is required`,
        code: 'REQUIRED_FIELD',
      })
    }
  }

  return errors
}

/**
 * Validate field types in request body
 * @param body - Request body object
 * @param fieldTypes - Object mapping field names to expected types
 * @returns Validation errors array
 */
export function validateFieldTypes(
  body: Record<string, any>,
  fieldTypes: Record<string, 'string' | 'number' | 'boolean' | 'array' | 'object'>
): ValidationError[] {
  const errors: ValidationError[] = []

  for (const [field, expectedType] of Object.entries(fieldTypes)) {
    if (body[field] !== undefined && body[field] !== null) {
      const actualType = Array.isArray(body[field]) ? 'array' : typeof body[field]
      
      if (actualType !== expectedType) {
        errors.push({
          field,
          message: `${field} must be of type ${expectedType}`,
          code: 'INVALID_TYPE',
        })
      }
    }
  }

  return errors
}

/**
 * Parse and validate JSON request body
 * @param request - Request object
 * @returns Parsed body or null if invalid
 */
export async function parseJsonBody(request: Request): Promise<Record<string, any> | null> {
  try {
    const contentType = request.headers.get('Content-Type')
    
    if (!contentType?.includes('application/json')) {
      return null
    }

    const text = await request.text()
    
    if (!text.trim()) {
      return {}
    }

    return JSON.parse(text)
  } catch (error) {
    console.error('Failed to parse JSON body:', error)
    return null
  }
}

/**
 * Extract authentication token from request
 * @param request - Request object
 * @returns Bearer token or null
 */
export function extractAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  return authHeader.replace('Bearer ', '')
}

/**
 * Create standardized Edge Function handler with common patterns
 * @param handlers - Object mapping HTTP methods to handler functions
 * @returns Edge Function handler
 */
export function createHandler(handlers: {
  GET?: (request: Request) => Promise<Response>
  POST?: (request: Request) => Promise<Response>
  PUT?: (request: Request) => Promise<Response>
  DELETE?: (request: Request) => Promise<Response>
  PATCH?: (request: Request) => Promise<Response>
}) {
  return async (request: Request): Promise<Response> => {
    const method = request.method as keyof typeof handlers
    const handler = handlers[method]

    if (!handler) {
      return createErrorResponse(
        `Method ${method} not allowed`,
        405,
        undefined,
        request
      )
    }

    try {
      return await handler(request)
    } catch (error) {
      console.error(`Error in ${method} handler:`, error)
      
      return createServerErrorResponse(
        error instanceof Error ? error.message : 'Unknown error',
        request
      )
    }
  }
}

/**
 * Sanitize output data to remove sensitive fields
 * @param data - Data to sanitize
 * @param excludeFields - Fields to exclude from output
 * @returns Sanitized data
 */
export function sanitizeOutput<T extends Record<string, any>>(
  data: T | T[],
  excludeFields: string[] = ['password', 'password_hash', 'secret_key', 'private_key']
): T | T[] {
  if (Array.isArray(data)) {
    return data.map(item => sanitizeOutput(item, excludeFields)) as T[]
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data }
    
    for (const field of excludeFields) {
      if (field in sanitized) {
        delete sanitized[field]
      }
    }
    
    return sanitized
  }

  return data
}

/**
 * Add rate limiting headers to response
 * @param response - Response object
 * @param limit - Rate limit
 * @param remaining - Remaining requests
 * @param reset - Reset timestamp
 * @returns Response with rate limit headers
 */
export function addRateLimitHeaders(
  response: Response,
  limit: number,
  remaining: number,
  reset: number
): Response {
  const headers = new Headers(response.headers)
  headers.set('X-RateLimit-Limit', limit.toString())
  headers.set('X-RateLimit-Remaining', remaining.toString())
  headers.set('X-RateLimit-Reset', reset.toString())

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}