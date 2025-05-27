/**
 * Production Error Handler
 * Handles common production errors and provides user-friendly messages
 */

export interface ErrorInfo {
  message: string
  code?: string
  status?: number
  isRetryable?: boolean
}

export class ProductionError extends Error {
  public code?: string
  public status?: number
  public isRetryable?: boolean

  constructor(message: string, code?: string, status?: number, isRetryable = false) {
    super(message)
    this.name = 'ProductionError'
    this.code = code
    this.status = status
    this.isRetryable = isRetryable
  }
}

/**
 * Handle common production errors and return user-friendly messages
 */
export function handleProductionError(error: unknown): ErrorInfo {
  console.error('Production error:', error)

  // Handle fetch/network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      message: 'Network connection error. Please check your internet connection and try again.',
      code: 'NETWORK_ERROR',
      isRetryable: true
    }
  }

  // Handle URL parsing errors
  if (error instanceof TypeError && error.message.includes('Invalid URL')) {
    return {
      message: 'Service temporarily unavailable. Please try again in a moment.',
      code: 'URL_ERROR',
      isRetryable: true
    }
  }

  // Handle 404 errors
  if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
    return {
      message: 'The requested resource was not found.',
      code: 'NOT_FOUND',
      status: 404,
      isRetryable: false
    }
  }

  // Handle authentication errors
  if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
    return {
      message: 'Please log in to continue.',
      code: 'UNAUTHORIZED',
      status: 401,
      isRetryable: false
    }
  }

  // Handle server errors
  if (error && typeof error === 'object' && 'status' in error && 
      typeof error.status === 'number' && error.status >= 500) {
    return {
      message: 'Server error. Please try again later.',
      code: 'SERVER_ERROR',
      status: error.status,
      isRetryable: true
    }
  }

  // Handle Payload CMS specific errors
  if (error && typeof error === 'object' && 'message' in error) {
    const errorMessage = String(error.message)
    
    if (errorMessage.includes('Not Found')) {
      return {
        message: 'The requested item was not found.',
        code: 'PAYLOAD_NOT_FOUND',
        isRetryable: false
      }
    }
    
    if (errorMessage.includes('session')) {
      return {
        message: 'Session expired. Please refresh the page.',
        code: 'SESSION_ERROR',
        isRetryable: true
      }
    }
  }

  // Handle generic errors
  if (error instanceof Error) {
    return {
      message: error.message || 'An unexpected error occurred.',
      code: 'GENERIC_ERROR',
      isRetryable: false
    }
  }

  // Fallback for unknown errors
  return {
    message: 'An unexpected error occurred. Please try again.',
    code: 'UNKNOWN_ERROR',
    isRetryable: true
  }
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      const errorInfo = handleProductionError(error)
      
      // Don't retry if the error is not retryable
      if (!errorInfo.isRetryable || attempt === maxRetries) {
        throw error
      }
      
      // Wait with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Safe async function wrapper that handles errors gracefully
 */
export function safeAsync<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  return fn().catch((error) => {
    const errorInfo = handleProductionError(error)
    console.error('Safe async error:', errorInfo)
    return fallback
  })
} 