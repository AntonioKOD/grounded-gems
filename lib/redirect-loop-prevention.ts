/**
 * Redirect Loop Prevention Utility
 * 
 * This utility helps prevent ERR_TOO_MANY_REDIRECTS errors by:
 * 1. Tracking redirect history
 * 2. Detecting potential loops
 * 3. Providing safe navigation methods
 * 4. Clearing redirect history when needed
 */

interface RedirectRecord {
  path: string
  timestamp: number
  count: number
}

class RedirectLoopPrevention {
  private redirectHistory: Map<string, RedirectRecord> = new Map()
  private readonly MAX_REDIRECTS_PER_PATH = 3
  private readonly REDIRECT_WINDOW_MS = 30000 // 30 seconds
  private readonly CLEANUP_INTERVAL_MS = 60000 // 1 minute

  constructor() {
    // Clean up old redirect records periodically
    setInterval(() => {
      this.cleanupOldRecords()
    }, this.CLEANUP_INTERVAL_MS)
  }

  /**
   * Check if a redirect to the given path would create a loop
   */
  shouldPreventRedirect(path: string): boolean {
    const now = Date.now()
    const record = this.redirectHistory.get(path)

    if (!record) {
      // First time visiting this path
      this.redirectHistory.set(path, {
        path,
        timestamp: now,
        count: 1
      })
      return false
    }

    // Check if we're within the time window
    if (now - record.timestamp > this.REDIRECT_WINDOW_MS) {
      // Reset the record for this path
      this.redirectHistory.set(path, {
        path,
        timestamp: now,
        count: 1
      })
      return false
    }

    // Increment the count
    record.count++
    record.timestamp = now

    // Check if we've exceeded the maximum redirects
    if (record.count >= this.MAX_REDIRECTS_PER_PATH) {
      console.warn(`🚫 [Redirect Prevention] Potential redirect loop detected for path: ${path}`)
      return true
    }

    return false
  }

  /**
   * Record a successful navigation to prevent future loops
   */
  recordSuccessfulNavigation(path: string): void {
    const now = Date.now()
    this.redirectHistory.set(path, {
      path,
      timestamp: now,
      count: 0 // Reset count on successful navigation
    })
  }

  /**
   * Clear redirect history for a specific path
   */
  clearPathHistory(path: string): void {
    this.redirectHistory.delete(path)
  }

  /**
   * Clear all redirect history
   */
  clearAllHistory(): void {
    this.redirectHistory.clear()
  }

  /**
   * Get current redirect statistics
   */
  getRedirectStats(): { totalPaths: number; suspiciousPaths: string[] } {
    const suspiciousPaths: string[] = []
    
    this.redirectHistory.forEach((record, path) => {
      if (record.count >= this.MAX_REDIRECTS_PER_PATH) {
        suspiciousPaths.push(path)
      }
    })

    return {
      totalPaths: this.redirectHistory.size,
      suspiciousPaths
    }
  }

  /**
   * Clean up old redirect records
   */
  private cleanupOldRecords(): void {
    const now = Date.now()
    const pathsToDelete: string[] = []

    this.redirectHistory.forEach((record, path) => {
      if (now - record.timestamp > this.REDIRECT_WINDOW_MS) {
        pathsToDelete.push(path)
      }
    })

    pathsToDelete.forEach(path => {
      this.redirectHistory.delete(path)
    })

    if (pathsToDelete.length > 0) {
      console.log(`🧹 [Redirect Prevention] Cleaned up ${pathsToDelete.length} old redirect records`)
    }
  }
}

// Create a singleton instance
const redirectLoopPrevention = new RedirectLoopPrevention()

/**
 * Safe navigation function that prevents redirect loops
 */
export function safeNavigate(
  path: string, 
  router: any, 
  options: { 
    force?: boolean
    replace?: boolean
  } = {}
): boolean {
  const { force = false, replace = false } = options

  // Skip loop prevention if forced
  if (force) {
    if (replace) {
      router.replace(path)
    } else {
      router.push(path)
    }
    return true
  }

  // Check if this redirect should be prevented
  if (redirectLoopPrevention.shouldPreventRedirect(path)) {
    console.warn(`🚫 [Safe Navigate] Redirect prevented to avoid loop: ${path}`)
    return false
  }

  // Perform the navigation
  try {
    if (replace) {
      router.replace(path)
    } else {
      router.push(path)
    }
    
    // Record successful navigation
    redirectLoopPrevention.recordSuccessfulNavigation(path)
    return true
  } catch (error) {
    console.error(`❌ [Safe Navigate] Navigation failed: ${path}`, error)
    return false
  }
}

/**
 * Safe window.location navigation that prevents redirect loops
 */
export function safeWindowNavigate(
  path: string, 
  options: { 
    force?: boolean
    replace?: boolean
  } = {}
): boolean {
  const { force = false, replace = false } = options

  // Skip loop prevention if forced
  if (force) {
    if (replace) {
      window.location.replace(path)
    } else {
      window.location.href = path
    }
    return true
  }

  // Check if this redirect should be prevented
  if (redirectLoopPrevention.shouldPreventRedirect(path)) {
    console.warn(`🚫 [Safe Window Navigate] Redirect prevented to avoid loop: ${path}`)
    return false
  }

  // Perform the navigation
  try {
    if (replace) {
      window.location.replace(path)
    } else {
      window.location.href = path
    }
    
    // Record successful navigation
    redirectLoopPrevention.recordSuccessfulNavigation(path)
    return true
  } catch (error) {
    console.error(`❌ [Safe Window Navigate] Navigation failed: ${path}`, error)
    return false
  }
}

/**
 * Clear authentication-related redirect history
 * Call this after successful login/logout
 */
export function clearAuthRedirectHistory(): void {
  const authPaths = ['/login', '/signup', '/logout']
  authPaths.forEach(path => {
    redirectLoopPrevention.clearPathHistory(path)
  })
  
  // Also clear profile-related authentication redirects
  const stats = redirectLoopPrevention.getRedirectStats()
  stats.suspiciousPaths.forEach(path => {
    if (path.includes('/profile/') && (path.includes('/edit') || path.includes('/dashboard'))) {
      redirectLoopPrevention.clearPathHistory(path)
    }
  })
  
  console.log('🧹 [Redirect Prevention] Cleared auth-related redirect history')
}

/**
 * Check if a path is safe for redirect after authentication
 */
export function isValidRedirectPath(path: string): boolean {
  // Don't redirect to login/signup pages
  if (path === '/login' || path === '/signup' || path.startsWith('/login') || path.startsWith('/signup')) {
    return false
  }
  
  // Check for valid profile paths
  if (path.startsWith('/profile/')) {
    // Profile viewing is okay
    const profileViewPattern = /^\/profile\/[^\/]+\/?$/
    if (profileViewPattern.test(path)) {
      return true
    }
    
    // Protected profile actions require authentication
    const protectedActions = ['/edit', '/location-dashboard', '/creator-dashboard']
    const hasProtectedAction = protectedActions.some(action => path.includes(action))
    
    if (hasProtectedAction) {
      // Only allow if it's a valid protected action format
      const validProtectedPattern = /^\/profile\/[^\/]+\/(edit|location-dashboard|creator-dashboard)/
      return validProtectedPattern.test(path)
    }
  }
  
  // Most other paths are valid
  return true
}

/**
 * Get a safe redirect path for after authentication
 */
export function getSafeRedirectPath(requestedPath: string, fallback: string = '/feed'): string {
  if (!requestedPath || !isValidRedirectPath(requestedPath)) {
    return fallback
  }
  
  // For profile actions, ensure user has permission
  if (requestedPath.startsWith('/profile/') && 
      (requestedPath.includes('/edit') || requestedPath.includes('/dashboard'))) {
    // Extract profile ID and return safe profile view
    const profileIdMatch = requestedPath.match(/^\/profile\/([^\/]+)/)
    if (profileIdMatch) {
      return `/profile/${profileIdMatch[1]}`
    }
    return fallback
  }
  
  return requestedPath
}

/**
 * Get redirect prevention statistics
 */
export function getRedirectPreventionStats() {
  return redirectLoopPrevention.getRedirectStats()
}

export default redirectLoopPrevention 