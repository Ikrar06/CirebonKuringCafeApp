/**
 * CORS Utilities for Edge Functions
 * 
 * Handles Cross-Origin Resource Sharing for all web applications
 * Supports development and production environments
 */

/// <reference path="./deno.d.ts" />

// Development origins (local development)
const DEV_ORIGINS = [
  'http://localhost:3000', // Customer Web
  'http://localhost:3001', // Owner Dashboard  
  'http://localhost:3002', // Employee Portal
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
]

// Production origins (will be updated when deployed)
const PROD_ORIGINS = [
  'https://customer.cafemgmt.com',
  'https://dashboard.cafemgmt.com', 
  'https://employee.cafemgmt.com',
  // Add your actual production domains here
]

/**
 * Get allowed origins based on environment
 * @returns Array of allowed origins
 */
function getAllowedOrigins(): string[] {
  const isDev = Deno.env.get('ENVIRONMENT') !== 'production'
  
  if (isDev) {
    return [...DEV_ORIGINS, ...PROD_ORIGINS]
  }
  
  return PROD_ORIGINS
}

/**
 * Check if origin is allowed
 * @param origin - Origin to check
 * @returns True if origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  
  const allowedOrigins = getAllowedOrigins()
  return allowedOrigins.includes(origin)
}

/**
 * Get CORS headers for successful responses
 * @param origin - Request origin
 * @returns CORS headers object
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 
      'authorization, x-client-info, apikey, content-type, x-device-id, x-device-role',
    'Access-Control-Max-Age': '86400', // 24 hours
  }

  // Only set origin if it's allowed
  if (isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin!
    headers['Access-Control-Allow-Credentials'] = 'true'
  }

  return headers
}

/**
 * Create CORS preflight response
 * Handles OPTIONS requests for CORS preflight
 * 
 * @param request - Request object
 * @returns Response for preflight request
 */
export function createCorsResponse(request: Request): Response {
  const origin = request.headers.get('Origin')
  
  if (!isOriginAllowed(origin)) {
    return new Response('CORS not allowed', { 
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
      }
    })
  }

  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  })
}

/**
 * Add CORS headers to existing response
 * @param response - Original response
 * @param request - Original request  
 * @returns Response with CORS headers added
 */
export function addCorsHeaders(response: Response, request: Request): Response {
  const origin = request.headers.get('Origin')
  
  if (!isOriginAllowed(origin)) {
    return response
  }

  const corsHeaders = getCorsHeaders(origin)
  
  // Create new response with CORS headers
  const responseHeaders: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value
  })
  
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...responseHeaders,
      ...corsHeaders,
    },
  })

  return newResponse
}

/**
 * CORS middleware wrapper for Edge Functions
 * Automatically handles preflight requests and adds CORS headers
 * 
 * @param handler - Edge function handler
 * @returns Wrapped handler with CORS support
 */
export function withCors(
  handler: (request: Request) => Promise<Response> | Response
) {
  return async (request: Request): Promise<Response> => {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return createCorsResponse(request)
    }

    try {
      // Call the original handler
      const response = await handler(request)
      
      // Add CORS headers to response
      return addCorsHeaders(response, request)
    } catch (error) {
      console.error('Edge function error:', error)
      
      // Create error response with CORS headers
      const errorResponse = new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
      
      return addCorsHeaders(errorResponse, request)
    }
  }
}

/**
 * Validate request origin and method
 * @param request - Request to validate
 * @param allowedMethods - Array of allowed HTTP methods
 * @returns Validation result
 */
export function validateRequest(
  request: Request, 
  allowedMethods: string[] = ['GET', 'POST', 'PUT', 'DELETE']
): { valid: boolean; error?: string } {
  const origin = request.headers.get('Origin')
  const method = request.method

  // Check origin (skip for same-origin requests)
  if (origin && !isOriginAllowed(origin)) {
    return {
      valid: false,
      error: 'Origin not allowed',
    }
  }

  // Check method
  if (!allowedMethods.includes(method)) {
    return {
      valid: false,
      error: `Method ${method} not allowed`,
    }
  }

  return { valid: true }
}

/**
 * Extract device info from headers
 * Used for tablet authentication
 * 
 * @param request - Request object
 * @returns Device info or null
 */
export function extractDeviceInfo(request: Request): {
  deviceId: string
  deviceRole: 'kasir' | 'dapur' | 'pelayan' | 'stok'
} | null {
  const deviceId = request.headers.get('X-Device-ID')
  const deviceRole = request.headers.get('X-Device-Role') as 'kasir' | 'dapur' | 'pelayan' | 'stok'

  if (!deviceId || !deviceRole) {
    return null
  }

  // Validate device role
  const validRoles = ['kasir', 'dapur', 'pelayan', 'stok']
  if (!validRoles.includes(deviceRole)) {
    return null
  }

  return { deviceId, deviceRole }
}

/**
 * Create error response with CORS headers
 * @param error - Error message
 * @param status - HTTP status code
 * @param request - Original request
 * @returns Error response with CORS
 */
export function createErrorResponse(
  error: string,
  status: number,
  request: Request
): Response {
  const response = new Response(
    JSON.stringify({
      error,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )

  return addCorsHeaders(response, request)
}

/**
 * Security headers for enhanced protection
 * @returns Security headers object
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';",
  }
}

/**
 * Create response with security headers
 * @param body - Response body
 * @param options - Response options
 * @param request - Original request
 * @returns Secure response
 */
export function createSecureResponse(
  body: string | null,
  options: {
    status?: number
    headers?: Record<string, string>
  } = {},
  request: Request
): Response {
  const response = new Response(body, {
    status: options.status || 200,
    headers: {
      'Content-Type': 'application/json',
      ...getSecurityHeaders(),
      ...options.headers,
    },
  })

  return addCorsHeaders(response, request)
}