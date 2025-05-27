import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

// Common routes that users frequently visit
const COMMON_ROUTES = [
  '/feed',
  '/map',
  '/profile',
  '/events',
  '/notifications',
  '/search',
  '/add-location',
  '/login',
]

// API endpoints to prefetch
const COMMON_API_ENDPOINTS = [
  '/api/users/me',
  '/api/locations/nearby',
  '/api/notifications/recent',
]

/**
 * Prefetch common routes for faster navigation
 */
export function prefetchCommonRoutes(router: AppRouterInstance) {
  // Use requestIdleCallback for non-blocking prefetching
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => {
      COMMON_ROUTES.forEach(route => {
        router.prefetch(route)
      })
    })
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      COMMON_ROUTES.forEach(route => {
        router.prefetch(route)
      })
    }, 100)
  }
}

/**
 * Prefetch user-specific routes after authentication
 */
export function prefetchUserRoutes(router: AppRouterInstance, userId?: string) {
  const userRoutes = [
    `/profile/${userId}`,
    `/profile/${userId}/edit`,
    '/post/create',
    '/events/create',
  ]

  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => {
      userRoutes.forEach(route => {
        if (route.includes('undefined')) return // Skip if userId is undefined
        router.prefetch(route)
      })
    })
  } else {
    setTimeout(() => {
      userRoutes.forEach(route => {
        if (route.includes('undefined')) return
        router.prefetch(route)
      })
    }, 200)
  }
}

/**
 * Prefetch API data for faster loading
 */
export function prefetchApiData() {
  if (typeof window === 'undefined') return

  // Use requestIdleCallback for non-blocking API prefetching
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => {
      COMMON_API_ENDPOINTS.forEach(endpoint => {
        fetch(endpoint, {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
          },
        }).catch(() => {
          // Silently ignore errors in prefetching
        })
      })
    })
  }
}

/**
 * Smart prefetching based on user behavior
 */
export function smartPrefetch(router: AppRouterInstance, currentPath: string) {
  // Prefetch likely next destinations based on current path
  const prefetchMap: Record<string, string[]> = {
    '/login': ['/feed', '/map', '/profile'],
    '/feed': ['/map', '/profile', '/post/create'],
    '/map': ['/feed', '/add-location'],
    '/profile': ['/profile/edit', '/feed'],
    '/events': ['/events/create', '/feed'],
  }

  const nextRoutes = prefetchMap[currentPath] || []
  
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => {
      nextRoutes.forEach(route => {
        router.prefetch(route)
      })
    })
  } else {
    setTimeout(() => {
      nextRoutes.forEach(route => {
        router.prefetch(route)
      })
    }, 50)
  }
} 