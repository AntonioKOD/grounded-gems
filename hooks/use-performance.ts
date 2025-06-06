"use client"

import { useCallback, useEffect, useRef, useState } from 'react'

// Throttle utility
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }
}

// Performance-optimized scroll hook
export function useThrottledScroll(
  callback: (scrollTop: number, scrollHeight: number, clientHeight: number) => void,
  delay = 150
) {
  const throttledCallback = useCallback(throttle(callback, delay), [callback, delay])
  
  return throttledCallback
}

// Optimized intersection observer hook
export function useIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = { threshold: 0.1 }
) {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const [isSupported] = useState(() => 
    typeof window !== 'undefined' && 'IntersectionObserver' in window
  )

  const observe = useCallback((element: Element) => {
    if (!isSupported || !element) return

    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(callback, options)
    observerRef.current.observe(element)
  }, [callback, options, isSupported])

  const unobserve = useCallback((element: Element) => {
    if (observerRef.current && element) {
      observerRef.current.unobserve(element)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return { observe, unobserve, disconnect, isSupported }
}

// Memory management hook
export function useMemoryManagement() {
  const cleanup = useRef<(() => void)[]>([])

  const addCleanup = useCallback((cleanupFn: () => void) => {
    cleanup.current.push(cleanupFn)
  }, [])

  const runCleanup = useCallback(() => {
    cleanup.current.forEach(fn => {
      try {
        fn()
      } catch (error) {
        console.warn('Cleanup function failed:', error)
      }
    })
    cleanup.current = []
  }, [])

  useEffect(() => {
    return () => {
      runCleanup()
    }
  }, [runCleanup])

  return { addCleanup, runCleanup }
}

// Infinite scroll hook with performance optimizations
export function useInfiniteScroll(
  loadMore: () => void,
  hasMore: boolean,
  isLoading: boolean,
  threshold = 200
) {
  const { observe, disconnect } = useIntersectionObserver(
    (entries) => {
      const target = entries[0]
      if (target?.isIntersecting && hasMore && !isLoading) {
        loadMore()
      }
    },
    { threshold: 0, rootMargin: `${threshold}px` }
  )

  const lastElementRef = useCallback((node: HTMLElement | null) => {
    if (isLoading) return
    disconnect()
    if (node) observe(node)
  }, [isLoading, observe, disconnect])

  return lastElementRef
}

// Debounced search hook
export function useDebouncedSearch(
  searchFunction: (query: string) => void,
  delay = 300
) {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      setIsSearching(true)
      try {
        await searchFunction(searchQuery)
      } finally {
        setIsSearching(false)
      }
    }, delay),
    [searchFunction, delay]
  )

  const search = useCallback((newQuery: string) => {
    setQuery(newQuery)
    if (newQuery.trim()) {
      debouncedSearch(newQuery)
    } else {
      setIsSearching(false)
    }
  }, [debouncedSearch])

  return { query, isSearching, search }
}

// Performance monitoring hook
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    memoryUsage: 0,
    renderTime: 0,
    lastRender: Date.now()
  })

  const updateMetrics = useCallback(() => {
    const now = Date.now()
    const renderTime = now - metrics.lastRender

    // Memory usage (if available)
    const memoryUsage = (performance as any).memory 
      ? (performance as any).memory.usedJSHeapSize / 1024 / 1024 
      : 0

    setMetrics({
      memoryUsage,
      renderTime,
      lastRender: now
    })
  }, [metrics.lastRender])

  useEffect(() => {
    updateMetrics()
  })

  return metrics
}

// Virtual scrolling hook for large lists
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 5
) {
  const [scrollTop, setScrollTop] = useState(0)

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = items.slice(startIndex, endIndex + 1)
  const totalHeight = items.length * itemHeight
  const offsetY = startIndex * itemHeight

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll,
    startIndex,
    endIndex
  }
}

export { throttle, debounce } 