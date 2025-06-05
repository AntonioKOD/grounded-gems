/**
 * iOS Safari Authentication Helper
 * 
 * Handles iOS Safari's Intelligent Tracking Prevention (ITP) issues
 * and provides more reliable authentication checking for mobile navigation.
 * 
 * References:
 * - https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/4313
 * - https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
 */

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  lastChecked: number
  user?: any
}

// In-memory auth state cache to prevent excessive API calls
let authStateCache: AuthState | null = null
const CACHE_DURATION = 10000 // 10 seconds

// Track ongoing auth checks to prevent duplicates
let ongoingAuthCheck: Promise<AuthState> | null = null

/**
 * Detect if we're running in iOS Safari
 */
export function isIOSSafari(): boolean {
  if (typeof window === 'undefined') return false
  
  const userAgent = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent)
  
  return isIOS && isSafari
}

/**
 * Check if cookies are available and working
 */
export function areCookiesWorking(): boolean {
  if (typeof document === 'undefined') return false
  
  try {
    // Try to read existing auth cookie
    const cookies = document.cookie.split(';')
    const hasAuthCookie = cookies.some(cookie => cookie.trim().startsWith('payload-token='))
    
    // Also check if we can set/read a test cookie
    const testKey = '_ios_cookie_test'
    const testValue = Date.now().toString()
    
    document.cookie = `${testKey}=${testValue}; path=/; SameSite=Lax`
    const canRead = document.cookie.includes(testValue)
    
    // Clean up test cookie
    document.cookie = `${testKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    
    return hasAuthCookie || canRead
  } catch (error) {
    console.warn('[iOS Auth] Cookie check failed:', error)
    return false
  }
}

/**
 * Enhanced authentication check for iOS Safari
 */
export async function checkIOSAuthState(): Promise<AuthState> {
  // Prevent SSR execution to avoid hydration mismatches
  if (typeof window === 'undefined') {
    return {
      isAuthenticated: false,
      isLoading: false,
      lastChecked: Date.now()
    }
  }

  // Return cached result if still valid
  if (authStateCache && (Date.now() - authStateCache.lastChecked) < CACHE_DURATION) {
    console.log('[iOS Auth] Returning cached auth state')
    return authStateCache
  }

  // Return ongoing check if already in progress
  if (ongoingAuthCheck) {
    console.log('[iOS Auth] Auth check already in progress, waiting...')
    return ongoingAuthCheck
  }

  // Start new auth check
  ongoingAuthCheck = performAuthCheck()
  
  try {
    const result = await ongoingAuthCheck
    authStateCache = result
    return result
  } finally {
    ongoingAuthCheck = null
  }
}

/**
 * Perform the actual authentication check
 */
async function performAuthCheck(): Promise<AuthState> {
  console.log('[iOS Auth] Performing authentication check...')
  
  const defaultState: AuthState = {
    isAuthenticated: false,
    isLoading: false,
    lastChecked: Date.now()
  }

  try {
    // First check if cookies are working
    if (isIOSSafari() && !areCookiesWorking()) {
      console.warn('[iOS Auth] Cookies may be blocked by ITP')
      // Still try the API call in case localStorage tokens work
    }

    // Use lightweight auth check endpoint
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3s timeout for mobile

    const response = await fetch('/api/auth-check', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-iOS-Auth-Check': '1'
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    const isAuthenticated = response.status === 200
    
    // If authenticated, get user data
    let user = null
    if (isAuthenticated) {
      try {
        const userResponse = await fetch('/api/users/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'X-iOS-Auth-Check': '1'
          },
          signal: controller.signal
        })

        if (userResponse.ok) {
          const userData = await userResponse.json()
          user = userData.user
        }
      } catch (userError) {
        console.warn('[iOS Auth] Failed to fetch user data:', userError)
        // Still consider authenticated if auth-check passed
      }
    }

    const authState: AuthState = {
      isAuthenticated,
      isLoading: false,
      lastChecked: Date.now(),
      user
    }

    console.log(`[iOS Auth] Auth check complete: ${isAuthenticated ? 'authenticated' : 'not authenticated'}`)
    return authState

  } catch (error) {
    console.error('[iOS Auth] Auth check failed:', error)
    
    // On error, check if we have any cached user data we can rely on
    if (authStateCache && authStateCache.isAuthenticated) {
      console.log('[iOS Auth] Using cached auth state due to network error')
      return {
        ...authStateCache,
        lastChecked: Date.now()
      }
    }

    return defaultState
  }
}

/**
 * Clear auth cache (useful after login/logout)
 */
export function clearIOSAuthCache(): void {
  authStateCache = null
  ongoingAuthCheck = null
  console.log('[iOS Auth] Auth cache cleared')
}

/**
 * Safe navigation helper for iOS
 */
export async function safeIOSNavigation(
  path: string, 
  options: { 
    requiresAuth?: boolean
    fallbackPath?: string
    useWindowLocation?: boolean
  } = {}
): Promise<boolean> {
  // Prevent SSR execution to avoid hydration mismatches
  if (typeof window === 'undefined') {
    console.warn('[iOS Auth] Navigation called during SSR, skipping')
    return false
  }

  const { 
    requiresAuth = true, 
    fallbackPath = '/login',
    useWindowLocation = isIOSSafari() 
  } = options

  try {
    if (requiresAuth) {
      console.log(`[iOS Auth] Checking authentication for navigation to: ${path}`)
      const authState = await checkIOSAuthState()
      
      if (!authState.isAuthenticated) {
        const redirectUrl = `${fallbackPath}?redirect=${encodeURIComponent(path)}`
        console.log(`[iOS Auth] Not authenticated, redirecting to: ${redirectUrl}`)
        
        if (useWindowLocation) {
          window.location.href = redirectUrl
        } else {
          // Use Next.js router if available
          if (typeof window !== 'undefined' && (window as any).__NEXT_ROUTER__) {
            (window as any).__NEXT_ROUTER__.push(redirectUrl)
          } else {
            window.location.href = redirectUrl
          }
        }
        return false
      }
    }

    // Proceed with navigation
    console.log(`[iOS Auth] Navigating to: ${path}`)
    
    if (useWindowLocation) {
      // For iOS Safari, use window.location for more reliable navigation
      window.location.href = path
    } else {
      // Use Next.js router for other browsers
      if (typeof window !== 'undefined' && (window as any).__NEXT_ROUTER__) {
        (window as any).__NEXT_ROUTER__.push(path)
      } else {
        window.location.href = path
      }
    }

    return true

  } catch (error) {
    console.error('[iOS Auth] Navigation failed:', error)
    
    // Fallback to direct navigation
    window.location.href = path
    return false
  }
}

/**
 * Initialize iOS auth monitoring
 */
export function initializeIOSAuthMonitoring(): void {
  try {
    if (typeof window === 'undefined') {
      console.warn('[iOS Auth] Window not available during SSR, skipping initialization')
      return
    }
    
    if (!isIOSSafari()) return

    console.log('[iOS Auth] Initializing iOS Safari auth monitoring')

  // Listen for storage events (cross-tab auth changes)
  window.addEventListener('storage', (event) => {
    if (event.key === 'auth-state-changed') {
      console.log('[iOS Auth] Auth state changed in another tab, clearing cache')
      clearIOSAuthCache()
    }
  })

  // Listen for focus events to recheck auth
  window.addEventListener('focus', () => {
    if (authStateCache && (Date.now() - authStateCache.lastChecked) > CACHE_DURATION) {
      console.log('[iOS Auth] Window focused, rechecking auth state')
      checkIOSAuthState()
    }
  })

  // Listen for auth events
  window.addEventListener('login-success', () => {
    console.log('[iOS Auth] Login success detected, clearing auth cache')
    clearIOSAuthCache()
  })

  window.addEventListener('logout-success', () => {
    console.log('[iOS Auth] Logout success detected, clearing auth cache')
    clearIOSAuthCache()
  })
  } catch (error) {
    console.warn('[iOS Auth] Failed to initialize iOS auth monitoring:', error)
  }
} 