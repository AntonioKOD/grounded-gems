"use client"

import { z } from 'zod'

// Security Configuration
export const SECURITY_CONFIG = {
  // Authentication settings
  AUTH: {
    TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
    REFRESH_TOKEN_EXPIRY: 30 * 24 * 60 * 60 * 1000, // 30 days
    ADMIN_EMAILS: ['antonio_kodheli@icloud.com', 'ermir1mata@yahoo.com'], // Authorized admin emails
    COOKIE_SETTINGS: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    }
  },

  // Rate limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: {
      API: 100,
      LOGIN: 5,
      REGISTRATION: 3,
      PASSWORD_RESET: 3,
      IMAGE_UPLOAD: 10
    }
  },

  // Input validation
  VALIDATION: {
    MAX_STRING_LENGTH: 10000,
    MAX_EMAIL_LENGTH: 254,
    MAX_PASSWORD_LENGTH: 128,
    MIN_PASSWORD_LENGTH: 8,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
      'image/avif', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff', 'image/tif',
      'image/ico', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/jp2', 'image/jpx',
      'image/jpm', 'image/psd', 'image/raw', 'image/x-portable-bitmap', 'image/x-portable-pixmap'
    ],
    ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg']
  },

  // Content Security Policy
  CSP: {
    DEFAULT_SRC: ["'self'"],
    SCRIPT_SRC: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.googletagmanager.com"],
    STYLE_SRC: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    IMAGE_SRC: ["'self'", "data:", "https:", "blob:"],
    FONT_SRC: ["'self'", "https://fonts.gstatic.com"],
    CONNECT_SRC: ["'self'", "https://api.mapbox.com", "wss://"],
    MEDIA_SRC: ["'self'", "blob:", "https:"]
  },

  // XSS Protection
  XSS: {
    DANGEROUS_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    DANGEROUS_ATTRIBUTES: ['onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout'],
    ALLOWED_PROTOCOLS: ['http:', 'https:', 'mailto:', 'tel:']
  }
} as const

// Input validation schemas
export const ValidationSchemas = {
  // User authentication
  email: z.string()
    .email('Invalid email format')
    .max(SECURITY_CONFIG.VALIDATION.MAX_EMAIL_LENGTH, 'Email too long')
    .transform(email => email.toLowerCase().trim()),

  password: z.string()
    .min(SECURITY_CONFIG.VALIDATION.MIN_PASSWORD_LENGTH, 'Password too short')
    .max(SECURITY_CONFIG.VALIDATION.MAX_PASSWORD_LENGTH, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),

  // User profile
  username: z.string()
    .min(3, 'Username too short')
    .max(30, 'Username too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
    .transform(username => username.toLowerCase().trim()),

  displayName: z.string()
    .min(1, 'Display name required')
    .max(100, 'Display name too long')
    .regex(/^[a-zA-Z0-9\s\-_.']+$/, 'Display name contains invalid characters')
    .transform(name => name.trim()),

  // Content validation
  postContent: z.string()
    .min(1, 'Content cannot be empty')
    .max(SECURITY_CONFIG.VALIDATION.MAX_STRING_LENGTH, 'Content too long')
    .transform(content => content.trim()),

  postTitle: z.string()
    .max(200, 'Title too long')
    .optional()
    .transform(title => title?.trim()),

  // Location data
  locationName: z.string()
    .min(1, 'Location name required')
    .max(200, 'Location name too long')
    .transform(name => name.trim()),

  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }),

  // File uploads
  imageFile: z.object({
    size: z.number().max(SECURITY_CONFIG.VALIDATION.MAX_FILE_SIZE, 'File too large'),
    type: z.enum(SECURITY_CONFIG.VALIDATION.ALLOWED_IMAGE_TYPES as unknown as [string, ...string[]], {
      errorMap: () => ({ message: 'Invalid image type' })
    })
  }),

  // URLs
  url: z.string()
    .url('Invalid URL format')
    .refine(url => {
      const protocol = new URL(url).protocol as "https:" | "http:" | "mailto:" | "tel:"
      return SECURITY_CONFIG.XSS.ALLOWED_PROTOCOLS.includes(protocol)
    }, 'Invalid URL protocol'),

  // Generic sanitization
  safeString: z.string()
    .max(SECURITY_CONFIG.VALIDATION.MAX_STRING_LENGTH, 'Text too long')
    .transform(str => sanitizeInput(str))
}

// Input sanitization utilities
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return ''

  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .slice(0, SECURITY_CONFIG.VALIDATION.MAX_STRING_LENGTH) // Truncate if too long
}

export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return ''

  // Remove dangerous tags
  let clean = html
  SECURITY_CONFIG.XSS.DANGEROUS_TAGS.forEach(tag => {
    const regex = new RegExp(`<${tag}\\b[^>]*>(.*?)</${tag}>`, 'gi')
    clean = clean.replace(regex, '')
  })

  // Remove dangerous attributes
  SECURITY_CONFIG.XSS.DANGEROUS_ATTRIBUTES.forEach(attr => {
    const regex = new RegExp(`${attr}\\s*=\\s*["'][^"']*["']`, 'gi')
    clean = clean.replace(regex, '')
  })

  return clean.trim()
}

// URL validation and sanitization
export function validateAndSanitizeUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url)
    
    // Check protocol
    if (!SECURITY_CONFIG.XSS.ALLOWED_PROTOCOLS.includes(parsedUrl.protocol as "https:" | "http:" | "mailto:" | "tel:")) {
      return null
    }

    // Additional security checks
    if (parsedUrl.hostname === 'localhost' && process.env.NODE_ENV === 'production') {
      return null
    }

    return parsedUrl.toString()
  } catch {
    return null
  }
}

// Rate limiting utilities
const rateLimitStore = new Map<string, { count: number; timestamp: number }>()

export function checkRateLimit(
  identifier: string, 
  endpoint: keyof typeof SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS
): boolean {
  const now = Date.now()
  const maxRequests = SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS[endpoint]
  const windowMs = SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS

  const record = rateLimitStore.get(identifier)
  
  if (!record || (now - record.timestamp) > windowMs) {
    // Reset or create new record
    rateLimitStore.set(identifier, { count: 1, timestamp: now })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

// JWT utilities for client-side token handling
export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.')
    if (!parts[1]) return true
    const payload = JSON.parse(atob(parts[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export function getTokenPayload(token: string): any {
  try {
    return JSON.parse(atob(token.split('.')[1] || ''))
  } catch {
    return null
  }
}

// Secure header utilities
export function getSecurityHeaders(): HeadersInit {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': buildCSP()
  }
}

function buildCSP(): string {
  const csp = SECURITY_CONFIG.CSP
  return [
    `default-src ${csp.DEFAULT_SRC.join(' ')}`,
    `script-src ${csp.SCRIPT_SRC.join(' ')}`,
    `style-src ${csp.STYLE_SRC.join(' ')}`,
    `img-src ${csp.IMAGE_SRC.join(' ')}`,
    `font-src ${csp.FONT_SRC.join(' ')}`,
    `connect-src ${csp.CONNECT_SRC.join(' ')}`,
    `media-src ${csp.MEDIA_SRC.join(' ')}`
  ].join('; ')
}

// Password utilities
export function generateSecurePassword(length: number = 16): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  
  return password
}

export function checkPasswordStrength(password: string): {
  score: number
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0

  if (password.length >= 8) score += 1
  else feedback.push('Use at least 8 characters')

  if (/[a-z]/.test(password)) score += 1
  else feedback.push('Include lowercase letters')

  if (/[A-Z]/.test(password)) score += 1
  else feedback.push('Include uppercase letters')

  if (/\d/.test(password)) score += 1
  else feedback.push('Include numbers')

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1
  else feedback.push('Include special characters')

  if (password.length >= 12) score += 1

  return { score, feedback }
}

// File validation utilities
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type)
}

export function validateFileSize(file: File, maxSize: number = SECURITY_CONFIG.VALIDATION.MAX_FILE_SIZE): boolean {
  return file.size <= maxSize
}

// CSRF protection utilities
export function generateCSRFToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
  return token === sessionToken && token.length === 64
}

// Encryption utilities for sensitive data
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
}

// API request security wrapper
export async function secureApiRequest(
  url: string, 
  options: RequestInit = {},
  requiresAuth: boolean = true
): Promise<Response> {
  const headers = new Headers(options.headers)
  
  // Add security headers
  Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
    headers.set(key, value)
  })

  // Add authentication if required
  if (requiresAuth) {
    const token = localStorage.getItem('auth-token')
    if (token && !isTokenExpired(token)) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  // Add CSRF protection for state-changing operations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase() || '')) {
    const csrfToken = sessionStorage.getItem('csrf-token')
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken)
    }
  }

  return fetch(url, {
    ...options,
    headers
  })
}

export default SECURITY_CONFIG 