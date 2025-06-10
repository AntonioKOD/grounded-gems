"use server"

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { SECURITY_CONFIG, ValidationSchemas, sanitizeInput } from './security-config'

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; timestamp: number; attempts: number }>()

// Failed login attempts tracking
const loginAttemptsStore = new Map<string, { count: number; timestamp: number }>()

// Helper to get client IP
export function getClientIP(request: NextRequest): string {
  return (
    request.ip ||
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

// Rate limiting middleware
export function withRateLimit(
  endpoint: keyof typeof SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS,
  customLimit?: number
) {
  return function (handler: Function) {
    return async function (request: NextRequest, ...args: any[]) {
      const ip = getClientIP(request)
      const now = Date.now()
      const maxRequests = customLimit || SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS[endpoint]
      const windowMs = SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS

      const record = rateLimitStore.get(`${ip}-${endpoint}`)

      if (!record || (now - record.timestamp) > windowMs) {
        rateLimitStore.set(`${ip}-${endpoint}`, { count: 1, timestamp: now, attempts: 0 })
      } else {
        if (record.count >= maxRequests) {
          console.warn(`Rate limit exceeded for ${ip} on ${endpoint}`)
          return NextResponse.json(
            { 
              success: false, 
              error: 'Rate limit exceeded. Please try again later.',
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter: Math.ceil((windowMs - (now - record.timestamp)) / 1000)
            },
            { 
              status: 429,
              headers: {
                'Retry-After': Math.ceil((windowMs - (now - record.timestamp)) / 1000).toString(),
                'X-RateLimit-Limit': maxRequests.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': new Date(record.timestamp + windowMs).toISOString()
              }
            }
          )
        }
        record.count++
      }

      return handler(request, ...args)
    }
  }
}

// Authentication middleware
export function withAuth(requireAuth: boolean = true) {
  return function (handler: Function) {
    return async function (request: NextRequest, ...args: any[]) {
      if (!requireAuth) {
        return handler(request, ...args)
      }

      try {
        const payload = await getPayload({ config })
        const result = await payload.auth({ headers: request.headers })

        if (!result.user) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Authentication required',
              code: 'AUTHENTICATION_REQUIRED'
            },
            { status: 401 }
          )
        }

        // Add user to request context
        ;(request as any).user = result.user
        return handler(request, ...args)
      } catch (error) {
        console.error('Authentication error:', error)
        return NextResponse.json(
          { 
            success: false, 
            error: 'Authentication failed',
            code: 'AUTHENTICATION_FAILED'
          },
          { status: 401 }
        )
      }
    }
  }
}

// Input validation middleware
export function withValidation(schema: any) {
  return function (handler: Function) {
    return async function (request: NextRequest, ...args: any[]) {
      try {
        let body
        const contentType = request.headers.get('content-type')
        
        if (contentType?.includes('application/json')) {
          body = await request.json()
        } else if (contentType?.includes('application/x-www-form-urlencoded')) {
          const formData = await request.formData()
          body = Object.fromEntries(formData.entries())
        } else {
          body = {}
        }

        // Validate and sanitize input
        const validationResult = schema.safeParse(body)
        if (!validationResult.success) {
          return NextResponse.json(
            {
              success: false,
              error: 'Validation failed',
              details: validationResult.error.errors,
              code: 'VALIDATION_ERROR'
            },
            { status: 400 }
          )
        }

        // Add validated data to request
        ;(request as any).validatedData = validationResult.data
        return handler(request, ...args)
      } catch (error) {
        console.error('Validation error:', error)
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid request data',
            code: 'INVALID_REQUEST_DATA'
          },
          { status: 400 }
        )
      }
    }
  }
}

// CORS middleware
export function withCORS(allowedOrigins?: string[]) {
  return function (handler: Function) {
    return async function (request: NextRequest, ...args: any[]) {
      const origin = request.headers.get('origin')
      const defaultAllowedOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'https://www.sacavia.com',
        'https://sacavia.com'
      ]

      const origins = allowedOrigins || defaultAllowedOrigins
      const isAllowed = !origin || origins.includes(origin) || 
        (process.env.NODE_ENV === 'development' && origin.includes('localhost'))

      if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': isAllowed ? (origin || '*') : 'null',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400',
          },
        })
      }

      const response = await handler(request, ...args)
      
      if (response instanceof NextResponse) {
        response.headers.set('Access-Control-Allow-Origin', isAllowed ? (origin || '*') : 'null')
        response.headers.set('Access-Control-Allow-Credentials', 'true')
      }

      return response
    }
  }
}

// Security headers middleware
export function withSecurityHeaders() {
  return function (handler: Function) {
    return async function (request: NextRequest, ...args: any[]) {
      const response = await handler(request, ...args)
      
      if (response instanceof NextResponse) {
        response.headers.set('X-Content-Type-Options', 'nosniff')
        response.headers.set('X-Frame-Options', 'DENY')
        response.headers.set('X-XSS-Protection', '1; mode=block')
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      }

      return response
    }
  }
}

// Login attempt tracking
export function trackLoginAttempt(ip: string, success: boolean) {
  const now = Date.now()
  const record = loginAttemptsStore.get(ip)

  if (!record) {
    loginAttemptsStore.set(ip, {
      count: success ? 0 : 1,
      timestamp: now
    })
    return true
  }

  // Reset if window expired
  if ((now - record.timestamp) > SECURITY_CONFIG.AUTH.LOCKOUT_DURATION) {
    record.count = success ? 0 : 1
    record.timestamp = now
    return true
  }

  if (success) {
    record.count = 0
    return true
  }

  record.count++
  
  if (record.count >= SECURITY_CONFIG.AUTH.MAX_LOGIN_ATTEMPTS) {
    console.warn(`Login attempts exceeded for IP: ${ip}`)
    return false
  }

  return true
}

// Check if IP is locked out
export function isIPLockedOut(ip: string): boolean {
  const record = loginAttemptsStore.get(ip)
  if (!record) return false

  const now = Date.now()
  if ((now - record.timestamp) > SECURITY_CONFIG.AUTH.LOCKOUT_DURATION) {
    return false
  }

  return record.count >= SECURITY_CONFIG.AUTH.MAX_LOGIN_ATTEMPTS
}

// Compose multiple middlewares
export function createSecureHandler(...middlewares: any[]) {
  return function (handler: Function) {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler)
  }
}

// Error handling wrapper
export function withErrorHandling() {
  return function (handler: Function) {
    return async function (request: NextRequest, ...args: any[]) {
      try {
        return await handler(request, ...args)
      } catch (error) {
        console.error('API Error:', error)
        
        // Don't expose internal errors in production
        const isDev = process.env.NODE_ENV === 'development'
        const errorMessage = isDev && error instanceof Error ? error.message : 'Internal server error'
        
        return NextResponse.json(
          {
            success: false,
            error: errorMessage,
            code: 'INTERNAL_SERVER_ERROR',
            ...(isDev && { stack: error instanceof Error ? error.stack : undefined })
          },
          { status: 500 }
        )
      }
    }
  }
}

// Content validation for user-generated content
export function validateContent(content: string): { isValid: boolean; sanitized: string; warnings: string[] } {
  const warnings: string[] = []
  let sanitized = sanitizeInput(content)

  // Check for spam patterns
  const spamPatterns = [
    /(.)\1{10,}/, // Repeated characters
    /https?:\/\/[^\s]+/gi, // Multiple URLs (count them)
    /\b(buy|sale|discount|free|click here|urgent)\b/gi, // Spam keywords
  ]

  const urlMatches = content.match(/https?:\/\/[^\s]+/gi) || []
  if (urlMatches.length > 3) {
    warnings.push('Too many URLs detected')
  }

  spamPatterns.forEach((pattern, index) => {
    if (pattern.test(content)) {
      switch (index) {
        case 0:
          warnings.push('Excessive repeated characters detected')
          break
        case 2:
          warnings.push('Potential spam content detected')
          break
      }
    }
  })

  // Check content length
  if (content.length > SECURITY_CONFIG.VALIDATION.MAX_STRING_LENGTH) {
    sanitized = sanitized.slice(0, SECURITY_CONFIG.VALIDATION.MAX_STRING_LENGTH)
    warnings.push('Content truncated to maximum length')
  }

  return {
    isValid: warnings.length === 0,
    sanitized,
    warnings
  }
}

export default {
  withRateLimit,
  withAuth,
  withValidation,
  withCORS,
  withSecurityHeaders,
  withErrorHandling,
  createSecureHandler,
  trackLoginAttempt,
  isIPLockedOut,
  validateContent,
  getClientIP
} 