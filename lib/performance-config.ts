"use client"

// Performance Configuration and Utilities
// Centralized performance settings for the entire application

export const PERFORMANCE_CONFIG = {
  // Image optimization settings
  IMAGE: {
    QUALITY: 85,
    FORMATS: ['image/webp', 'image/avif'],
    CACHE_TTL: 31536000, // 1 year
    LAZY_LOADING_THRESHOLD: '100px',
    SIZES: {
      MOBILE: '(max-width: 768px) 100vw',
      TABLET: '(max-width: 1200px) 50vw', 
      DESKTOP: '33vw'
    }
  },

  // Bundle optimization
  BUNDLE: {
    CHUNK_SIZE_LIMIT: 244000, // 244KB max chunk size
    MAX_ASYNC_REQUESTS: 30,
    MAX_INITIAL_REQUESTS: 5,
    ENABLE_TREE_SHAKING: true
  },

  // Memory management
  MEMORY: {
    MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
    CLEANUP_INTERVAL: 300000, // 5 minutes
    GC_THRESHOLD: 0.8 // Trigger cleanup at 80% memory usage
  },

  // Network optimization
  NETWORK: {
    REQUEST_TIMEOUT: 10000, // 10 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
    CONCURRENT_REQUESTS: 6
  },

  // Scroll performance
  SCROLL: {
    THROTTLE_DELAY: 16, // ~60fps
    DEBOUNCE_DELAY: 100,
    INTERSECTION_THRESHOLD: 0.1,
    ROOT_MARGIN: '50px'
  },

  // Animation performance
  ANIMATION: {
    REDUCED_MOTION_QUERY: '(prefers-reduced-motion: reduce)',
    DEFAULT_DURATION: 300,
    EASING: 'cubic-bezier(0.4, 0, 0.2, 1)'
  }
} as const

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, any> = new Map()
  private observers: IntersectionObserver[] = []

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // Monitor Core Web Vitals
  measureCoreWebVitals() {
    if (typeof window === 'undefined') return

    // Largest Contentful Paint (LCP)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      const lastEntry = entries[entries.length - 1]
      this.metrics.set('LCP', lastEntry.startTime)
    }).observe({ entryTypes: ['largest-contentful-paint'] })

    // First Input Delay (FID)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      entries.forEach((entry: any) => {
        this.metrics.set('FID', entry.processingStart - entry.startTime)
      })
    }).observe({ entryTypes: ['first-input'] })

    // Cumulative Layout Shift (CLS)
    let clsValue = 0
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value
          this.metrics.set('CLS', clsValue)
        }
      }
    }).observe({ entryTypes: ['layout-shift'] })
  }

  // Monitor memory usage
  getMemoryUsage() {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      return null
    }

    const memory = (performance as any).memory
    return {
      usedJSHeapSize: memory.usedJSHeapSize / 1024 / 1024, // MB
      totalJSHeapSize: memory.totalJSHeapSize / 1024 / 1024, // MB
      usagePercentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
    }
  }

  // Monitor network requests
  trackNetworkRequest(url: string, startTime: number, endTime: number) {
    const duration = endTime - startTime
    const existing = this.metrics.get('networkRequests') || []
    existing.push({ url, duration, timestamp: Date.now() })
    
    // Keep only last 100 requests
    if (existing.length > 100) {
      existing.splice(0, existing.length - 100)
    }
    
    this.metrics.set('networkRequests', existing)
  }

  // Get performance summary
  getPerformanceSummary() {
    const memory = this.getMemoryUsage()
    const networkRequests = this.metrics.get('networkRequests') || []
    const avgNetworkTime = networkRequests.length > 0 
      ? networkRequests.reduce((sum: number, req: any) => sum + req.duration, 0) / networkRequests.length 
      : 0

    return {
      coreWebVitals: {
        LCP: this.metrics.get('LCP'),
        FID: this.metrics.get('FID'),
        CLS: this.metrics.get('CLS')
      },
      memory,
      network: {
        averageRequestTime: avgNetworkTime,
        totalRequests: networkRequests.length
      },
      timestamp: Date.now()
    }
  }

  // Cleanup
  cleanup() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.metrics.clear()
  }
}

// Optimized image loader
export function createOptimizedImageLoader() {
  return ({ src, width, quality }: { src: string; width: number; quality?: number }) => {
    // Use Next.js built-in loader for local images
    if (src.startsWith('/') || src.includes(window.location.hostname)) {
      return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality || PERFORMANCE_CONFIG.IMAGE.QUALITY}`
    }

    // For external images, return as-is to avoid CORS issues
    return src
  }
}

// Bundle analyzer utility
export function analyzeBundleSize() {
  if (typeof window === 'undefined') return null

  const scripts = Array.from(document.querySelectorAll('script[src]'))
  const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
  
  return {
    scripts: scripts.length,
    stylesheets: stylesheets.length,
    estimatedSize: scripts.length * 50 + stylesheets.length * 20 // Rough estimate in KB
  }
}

// Performance-optimized fetch wrapper
export async function performantFetch(url: string, options: RequestInit = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), PERFORMANCE_CONFIG.NETWORK.REQUEST_TIMEOUT)

  const startTime = performance.now()
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    
    const endTime = performance.now()
    PerformanceMonitor.getInstance().trackNetworkRequest(url, startTime, endTime)
    
    return response
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout: ${url}`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

// Memory cleanup utility
export function cleanupMemory() {
  // Clear any cached data that's not needed
  if (typeof window !== 'undefined') {
    // Clear old cache entries
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('old-') || name.includes('temp-')) {
            caches.delete(name)
          }
        })
      })
    }

    // Suggest garbage collection if available
    if ((window as any).gc) {
      (window as any).gc()
    }
  }
}

// Initialize performance monitoring
export function initializePerformanceMonitoring() {
  if (typeof window === 'undefined') return

  const monitor = PerformanceMonitor.getInstance()
  monitor.measureCoreWebVitals()

  // Set up periodic memory cleanup
  setInterval(() => {
    const memory = monitor.getMemoryUsage()
    if (memory && memory.usagePercentage > PERFORMANCE_CONFIG.MEMORY.GC_THRESHOLD * 100) {
      cleanupMemory()
    }
  }, PERFORMANCE_CONFIG.MEMORY.CLEANUP_INTERVAL)

  // Log performance summary periodically in development
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      console.log('Performance Summary:', monitor.getPerformanceSummary())
    }, 60000) // Every minute
  }
}

export default PERFORMANCE_CONFIG 