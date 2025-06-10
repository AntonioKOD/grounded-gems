"use client"

// Performance Monitoring and Analytics
// Tracks performance metrics and provides optimization insights

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  type: 'timing' | 'counter' | 'gauge'
  tags?: Record<string, string>
}

interface WebVital {
  name: string
  value: number
  delta: number
  id: string
  attribution?: any
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private observers: PerformanceObserver[] = []
  private isEnabled: boolean = false

  constructor() {
    this.initialize()
  }

  private initialize() {
    if (typeof window === 'undefined') return

    this.isEnabled = process.env.NODE_ENV === 'development' || 
                    process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true'

    if (!this.isEnabled) return

    this.setupPerformanceObservers()
    this.trackWebVitals()
    this.setupMemoryMonitoring()
    this.setupNetworkMonitoring()
  }

  // Core Web Vitals tracking
  private trackWebVitals() {
    if (typeof window === 'undefined') return

    // Largest Contentful Paint (LCP)
    this.observeMetric('largest-contentful-paint', (entry: any) => {
      this.recordMetric('LCP', entry.startTime, 'timing', {
        element: entry.element?.tagName || 'unknown'
      })
    })

    // First Input Delay (FID)
    this.observeMetric('first-input', (entry: any) => {
      this.recordMetric('FID', entry.processingStart - entry.startTime, 'timing', {
        eventType: entry.name
      })
    })

    // Cumulative Layout Shift (CLS)
    this.observeMetric('layout-shift', (entry: any) => {
      if (!entry.hadRecentInput) {
        this.recordMetric('CLS', entry.value, 'gauge', {
          sources: entry.sources?.length.toString() || '0'
        })
      }
    })
  }

  private observeMetric(type: string, callback: (entry: any) => void) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          callback(entry)
        }
      })
      observer.observe({ entryTypes: [type] })
      this.observers.push(observer)
    } catch (error) {
      console.warn(`Failed to observe ${type}:`, error)
    }
  }

  private setupPerformanceObservers() {
    if (typeof window === 'undefined') return

    // Navigation timing
    this.observeMetric('navigation', (entry: any) => {
      this.recordMetric('TTFB', entry.responseStart - entry.requestStart, 'timing')
      this.recordMetric('DOMLoad', entry.domContentLoadedEventEnd - entry.navigationStart, 'timing')
      this.recordMetric('WindowLoad', entry.loadEventEnd - entry.navigationStart, 'timing')
    })

    // Resource timing
    this.observeMetric('resource', (entry: any) => {
      const resourceType = this.getResourceType(entry.name)
      this.recordMetric(`Resource_${resourceType}`, entry.responseEnd - entry.requestStart, 'timing', {
        url: entry.name,
        size: entry.transferSize?.toString() || '0'
      })
    })

    // Paint timing
    this.observeMetric('paint', (entry: any) => {
      this.recordMetric(entry.name.replace('-', '_').toUpperCase(), entry.startTime, 'timing')
    })
  }

  private setupMemoryMonitoring() {
    if (typeof window === 'undefined') return
    if (!(performance as any).memory) return

    const checkMemory = () => {
      const memory = (performance as any).memory
      this.recordMetric('MemoryUsed', memory.usedJSHeapSize / 1024 / 1024, 'gauge')
      this.recordMetric('MemoryTotal', memory.totalJSHeapSize / 1024 / 1024, 'gauge')
      this.recordMetric('MemoryLimit', memory.jsHeapSizeLimit / 1024 / 1024, 'gauge')
    }

    checkMemory()
    setInterval(checkMemory, 30000) // Check every 30 seconds
  }

  private setupNetworkMonitoring() {
    if (typeof navigator === 'undefined') return
    if (!(navigator as any).connection) return

    const connection = (navigator as any).connection
    this.recordMetric('NetworkType', this.getNetworkTypeValue(connection.effectiveType), 'gauge', {
      type: connection.effectiveType,
      downlink: connection.downlink?.toString() || 'unknown'
    })

    connection.addEventListener('change', () => {
      this.recordMetric('NetworkType', this.getNetworkTypeValue(connection.effectiveType), 'gauge', {
        type: connection.effectiveType,
        downlink: connection.downlink?.toString() || 'unknown'
      })
    })
  }

  private getNetworkTypeValue(type: string): number {
    const values = { 'slow-2g': 1, '2g': 2, '3g': 3, '4g': 4 }
    return values[type as keyof typeof values] || 0
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'JavaScript'
    if (url.includes('.css')) return 'CSS'
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)/)) return 'Image'
    if (url.match(/\.(mp4|webm|ogg)/)) return 'Video'
    if (url.includes('/api/')) return 'API'
    return 'Other'
  }

  // Public API
  recordMetric(name: string, value: number, type: 'timing' | 'counter' | 'gauge', tags?: Record<string, string>) {
    if (!this.isEnabled) return

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      type,
      tags
    }

    this.metrics.push(metric)

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }

    // Log significant performance issues
    this.checkPerformanceThresholds(metric)
  }

  private checkPerformanceThresholds(metric: PerformanceMetric) {
    const thresholds = {
      LCP: 2500, // 2.5 seconds
      FID: 100,  // 100ms
      CLS: 0.1,  // 0.1
      TTFB: 800, // 800ms
      MemoryUsed: 50, // 50MB
    }

    const threshold = thresholds[metric.name as keyof typeof thresholds]
    if (threshold && metric.value > threshold) {
      console.warn(`Performance threshold exceeded: ${metric.name} = ${metric.value} (threshold: ${threshold})`, metric)
    }
  }

  getMetrics(filter?: { name?: string; type?: string; since?: number }): PerformanceMetric[] {
    let filtered = this.metrics

    if (filter?.name) {
      filtered = filtered.filter(m => m.name.includes(filter.name!))
    }

    if (filter?.type) {
      filtered = filtered.filter(m => m.type === filter.type)
    }

    if (filter?.since) {
      filtered = filtered.filter(m => m.timestamp >= filter.since!)
    }

    return filtered
  }

  getAverageMetric(name: string, since?: number): number {
    const metrics = this.getMetrics({ name, since })
    if (metrics.length === 0) return 0

    const sum = metrics.reduce((acc, m) => acc + m.value, 0)
    return sum / metrics.length
  }

  getPerformanceReport(): {
    webVitals: Record<string, number>
    resources: Record<string, { count: number; avgTime: number }>
    memory: Record<string, number>
    recommendations: string[]
  } {
    const report = {
      webVitals: {
        LCP: this.getAverageMetric('LCP'),
        FID: this.getAverageMetric('FID'),
        CLS: this.getAverageMetric('CLS'),
        TTFB: this.getAverageMetric('TTFB'),
      },
      resources: {} as Record<string, { count: number; avgTime: number }>,
      memory: {
        used: this.getAverageMetric('MemoryUsed'),
        total: this.getAverageMetric('MemoryTotal'),
        limit: this.getAverageMetric('MemoryLimit'),
      },
      recommendations: [] as string[]
    }

    // Resource analysis
    const resourceTypes = ['JavaScript', 'CSS', 'Image', 'Video', 'API']
    resourceTypes.forEach(type => {
      const metrics = this.getMetrics({ name: `Resource_${type}` })
      if (metrics.length > 0) {
        report.resources[type] = {
          count: metrics.length,
          avgTime: metrics.reduce((acc, m) => acc + m.value, 0) / metrics.length
        }
      }
    })

    // Generate recommendations
    if (report.webVitals.LCP > 2500) {
      report.recommendations.push('LCP is slow. Consider optimizing images and reducing render-blocking resources.')
    }

    if (report.webVitals.FID > 100) {
      report.recommendations.push('FID is high. Consider reducing JavaScript execution time.')
    }

    if (report.webVitals.CLS > 0.1) {
      report.recommendations.push('CLS is high. Ensure images and ads have defined dimensions.')
    }

    if (report.memory.used > 50) {
      report.recommendations.push('Memory usage is high. Check for memory leaks and optimize component re-renders.')
    }

    if (report.resources.JavaScript?.avgTime > 1000) {
      report.recommendations.push('JavaScript resources are loading slowly. Consider code splitting and lazy loading.')
    }

    return report
  }

  // Component performance tracking
  trackComponentRender(componentName: string, startTime: number) {
    const renderTime = performance.now() - startTime
    this.recordMetric(`Component_${componentName}`, renderTime, 'timing')
  }

  // API call tracking
  trackAPICall(endpoint: string, method: string, duration: number, status: number) {
    this.recordMetric('API_Call', duration, 'timing', {
      endpoint,
      method,
      status: status.toString()
    })
  }

  // Image loading tracking
  trackImageLoad(src: string, duration: number, size?: number) {
    this.recordMetric('Image_Load', duration, 'timing', {
      src: src.split('/').pop() || 'unknown',
      size: size?.toString() || 'unknown'
    })
  }

  // Route change tracking
  trackRouteChange(from: string, to: string, duration: number) {
    this.recordMetric('Route_Change', duration, 'timing', {
      from,
      to
    })
  }

  // User interaction tracking
  trackUserInteraction(type: string, element: string) {
    this.recordMetric('User_Interaction', 1, 'counter', {
      type,
      element
    })
  }

  // Cleanup
  destroy() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.metrics = []
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

// React Hook for component performance tracking
export function usePerformanceTracking(componentName: string) {
  const startTime = performance.now()

  return {
    trackRender: () => performanceMonitor.trackComponentRender(componentName, startTime),
    trackInteraction: (type: string, element: string) => 
      performanceMonitor.trackUserInteraction(type, element)
  }
}

// HOC for automatic component performance tracking
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  return function PerformanceTrackedComponent(props: P) {
    const { trackRender } = usePerformanceTracking(
      componentName || WrappedComponent.displayName || WrappedComponent.name
    )

    React.useEffect(() => {
      trackRender()
    })

    return React.createElement(WrappedComponent, props)
  }
}

export default performanceMonitor 