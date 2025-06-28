import { redirect } from 'next/navigation'

/**
 * Handle location redirects with better logging and error context
 */
export function handleLocationRedirect(from: string, to: string, reason: string = 'canonical') {
  // Log the redirect for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔄 Location redirect (${reason}): ${from} → ${to}`)
  }
  
  // Add redirect metadata for monitoring
  if (typeof window === 'undefined') {
    // Server-side: add headers for monitoring
    console.log(`Location redirect: ${from} → ${to} (${reason})`)
  }
  
  // Perform the redirect
  redirect(to)
}

/**
 * Check if an error is a Next.js redirect (not a real error)
 */
export function isNextRedirectError(error: any): boolean {
  return error?.digest?.startsWith('NEXT_REDIRECT')
}

/**
 * Handle redirect errors gracefully in error boundaries
 */
export function handleRedirectError(error: any, context: string = 'unknown') {
  if (isNextRedirectError(error)) {
    // This is a normal redirect, not an actual error
    console.log(`✅ Redirect handled in ${context}:`, error.digest)
    return true
  }
  return false
} 