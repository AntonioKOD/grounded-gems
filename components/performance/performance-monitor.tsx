'use client'

import { useEffect, useRef } from 'react'

interface PerformanceMetrics {
  fcp?: number // First Contentful Paint
  lcp?: number // Largest Contentful Paint
  fid?: number // First Input Delay
  cls?: number // Cumulative Layout Shift
  ttfb?: number // Time to First Byte
}

export default function PerformanceMonitor() {
  const metricsRef = useRef<PerformanceMetrics>({})
  const observerRef = useRef<PerformanceObserver | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'production') {
      return
    }

    // Track Core Web Vitals
    const trackMetric = (name: string, value: number) => {
      metricsRef.current = {
        ...metricsRef.current,
        [name]: value
      }

      // Send to analytics service (optional)
      if (window.gtag) {
        window.gtag('event', name, {
          event_category: 'Web Vitals',
          value: Math.round(value),
          non_interaction: true,
        })
      }

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 ${name}:`, Math.round(value))
      }
    }

    // Measure FCP (First Contentful Paint)
    const measureFCP = () => {
      const paintEntries = performance.getEntriesByType('paint')
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')
      if (fcpEntry) {
        trackMetric('fcp', fcpEntry.startTime)
      }
    }

    // Measure LCP (Largest Contentful Paint)
    const measureLCP = () => {
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const lastEntry = entries[entries.length - 1]
            if (lastEntry) {
              trackMetric('lcp', lastEntry.startTime)
            }
          })
          observer.observe({ entryTypes: ['largest-contentful-paint'] })
          observerRef.current = observer
        } catch (e) {
          console.warn('LCP measurement not supported')
        }
      }
    }

    // Measure FID (First Input Delay)
    const measureFID = () => {
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            entries.forEach((entry: any) => {
              if (entry.processingStart && entry.startTime) {
                const fid = entry.processingStart - entry.startTime
                trackMetric('fid', fid)
              }
            })
          })
          observer.observe({ entryTypes: ['first-input'] })
        } catch (e) {
          console.warn('FID measurement not supported')
        }
      }
    }

    // Measure CLS (Cumulative Layout Shift)
    const measureCLS = () => {
      if ('PerformanceObserver' in window) {
        try {
          let clsValue = 0
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            entries.forEach((entry: any) => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value
              }
            })
            trackMetric('cls', clsValue)
          })
          observer.observe({ entryTypes: ['layout-shift'] })
        } catch (e) {
          console.warn('CLS measurement not supported')
        }
      }
    }

    // Measure TTFB (Time to First Byte)
    const measureTTFB = () => {
      const navigationEntries = performance.getEntriesByType('navigation')
      if (navigationEntries.length > 0) {
        const navEntry = navigationEntries[0] as PerformanceNavigationTiming
        const ttfb = navEntry.responseStart - navEntry.requestStart
        trackMetric('ttfb', ttfb)
      }
    }

    // Initialize measurements
    measureFCP()
    measureLCP()
    measureFID()
    measureCLS()
    measureTTFB()

    // Track bundle size and loading performance
    const trackBundlePerformance = () => {
      const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      
      let totalJSSize = 0
      let totalCSSSize = 0
      let totalImageSize = 0
      
      resourceEntries.forEach(entry => {
        if (entry.name.includes('.js')) {
          totalJSSize += entry.transferSize || 0
        } else if (entry.name.includes('.css')) {
          totalCSSSize += entry.transferSize || 0
        } else if (entry.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
          totalImageSize += entry.transferSize || 0
        }
      })

      // Log bundle sizes (in KB)
      if (process.env.NODE_ENV === 'development') {
        console.log('📦 Bundle Performance:', {
          js: `${(totalJSSize / 1024).toFixed(1)}KB`,
          css: `${(totalCSSSize / 1024).toFixed(1)}KB`, 
          images: `${(totalImageSize / 1024).toFixed(1)}KB`,
          total: `${((totalJSSize + totalCSSSize + totalImageSize) / 1024).toFixed(1)}KB`
        })
      }
    }

    // Track after page load
    window.addEventListener('load', () => {
      setTimeout(trackBundlePerformance, 1000)
    })

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  // Track route changes for SPA navigation performance
  useEffect(() => {
    const handleRouteChange = () => {
      const navigationStart = performance.now()
      
      // Track route change performance
      requestAnimationFrame(() => {
        const navigationEnd = performance.now()
        const navigationTime = navigationEnd - navigationStart
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🚀 Route change time:', `${navigationTime.toFixed(2)}ms`)
        }
      })
    }

    // Listen for route changes (Next.js specific)
    window.addEventListener('beforeunload', handleRouteChange)
    
    return () => {
      window.removeEventListener('beforeunload', handleRouteChange)
    }
  }, [])

  return null // This component doesn't render anything
} 