/**
 * React Hydration Debugging Utility
 * 
 * Helps identify and debug hydration mismatches between server and client rendering.
 * Based on React hydration error patterns and best practices.
 * 
 * @see https://medium.com/design-bootcamp/hydration-errors-in-react-causes-solutions-and-best-practices-81d24d98513f
 * @see https://www.dhiwise.com/post/text-content-does-not-match-server-rendered-htm
 */

interface HydrationError {
  type: 'text' | 'attribute' | 'missing' | 'extra'
  element: string
  expected: string
  actual: string
  timestamp: number
  stackTrace?: string
}

let hydrationErrors: HydrationError[] = []
let isMonitoring = false

/**
 * Initialize hydration error monitoring
 */
export function initializeHydrationMonitoring(): void {
  try {
    if (typeof window === 'undefined' || isMonitoring) return

    isMonitoring = true
    console.log('[Hydration Debug] Monitoring initialized')

  // Monitor React hydration warnings
  const originalConsoleError = console.error
  const originalConsoleWarn = console.warn

  console.error = function(...args) {
    const message = args.join(' ')
    
    // Detect React hydration errors
    if (message.includes('Hydration failed') || 
        message.includes('Text content does not match') ||
        message.includes('Warning: Did not expect server HTML to contain') ||
        message.includes('emitPendingHydrationWarnings')) {
      
      recordHydrationError({
        type: 'text',
        element: extractElementFromError(message),
        expected: extractExpectedFromError(message),
        actual: extractActualFromError(message),
        timestamp: Date.now(),
        stackTrace: new Error().stack
      })
    }
    
    originalConsoleError.apply(console, args)
  }

  console.warn = function(...args) {
    const message = args.join(' ')
    
    // Detect React hydration warnings
    if (message.includes('Warning: Expected server HTML to contain') ||
        message.includes('Warning: Did not expect server HTML') ||
        message.includes('hydration')) {
      
      recordHydrationError({
        type: 'attribute',
        element: extractElementFromError(message),
        expected: extractExpectedFromError(message),
        actual: extractActualFromError(message),
        timestamp: Date.now(),
        stackTrace: new Error().stack
      })
    }
    
    originalConsoleWarn.apply(console, args)
  }

  // Monitor DOM mutations after hydration
  setTimeout(() => {
    try {
      monitorPostHydrationChanges()
    } catch (monitorError) {
      console.warn('[Hydration Debug] Failed to start post-hydration monitoring:', monitorError)
    }
  }, 2000)
  } catch (error) {
    console.warn('[Hydration Debug] Failed to initialize hydration monitoring:', error)
  }
}

/**
 * Record a hydration error
 */
function recordHydrationError(error: HydrationError): void {
  hydrationErrors.push(error)
  console.warn('[Hydration Debug] Error recorded:', error)

  // Limit stored errors to prevent memory issues
  if (hydrationErrors.length > 50) {
    hydrationErrors = hydrationErrors.slice(-25)
  }

  // Send to analytics or error reporting service if needed
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'hydration_error', {
      event_category: 'performance',
      event_label: error.type,
      custom_parameter_1: error.element
    })
  }
}

/**
 * Extract element information from error message
 */
function extractElementFromError(message: string): string {
  // Try to extract element tag from error message
  const tagMatch = message.match(/<(\w+)[^>]*>/i)
  if (tagMatch) return tagMatch[1]

  // Try to extract component name
  const componentMatch = message.match(/in (\w+)/i)
  if (componentMatch) return componentMatch[1]

  return 'unknown'
}

/**
 * Extract expected content from error message
 */
function extractExpectedFromError(message: string): string {
  const expectedMatch = message.match(/expected[^"]*"([^"]+)"/i)
  return expectedMatch ? expectedMatch[1] : 'unknown'
}

/**
 * Extract actual content from error message
 */
function extractActualFromError(message: string): string {
  const actualMatch = message.match(/but received[^"]*"([^"]+)"/i)
  return actualMatch ? actualMatch[1] : 'unknown'
}

/**
 * Monitor changes after hydration completes
 */
function monitorPostHydrationChanges(): void {
  if (typeof window === 'undefined') return

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element
            if (element.tagName && isLikelyHydrationIssue(element)) {
              console.warn('[Hydration Debug] Suspicious post-hydration change:', element)
            }
          }
        })
      }
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeOldValue: true
  })

  // Stop monitoring after 30 seconds to prevent performance impact
  setTimeout(() => {
    observer.disconnect()
    console.log('[Hydration Debug] Post-hydration monitoring stopped')
  }, 30000)
}

/**
 * Check if an element change is likely a hydration issue
 */
function isLikelyHydrationIssue(element: Element): boolean {
  // Check for common hydration issue patterns
  const suspiciousClasses = ['animate-pulse', 'skeleton', 'loading']
  const classList = Array.from(element.classList || [])
  
  return suspiciousClasses.some(cls => classList.includes(cls)) ||
         element.textContent === 'Loading...' ||
         element.textContent === '' && element.children.length === 0
}

/**
 * Get hydration error report
 */
export function getHydrationErrors(): HydrationError[] {
  return hydrationErrors.slice()
}

/**
 * Clear hydration error history
 */
export function clearHydrationErrors(): void {
  hydrationErrors = []
  console.log('[Hydration Debug] Error history cleared')
}

/**
 * Check if hydration is likely complete
 */
export function isHydrationComplete(): boolean {
  if (typeof window === 'undefined') return false

  // Check for React hydration markers
  const hasReactRoot = document.querySelector('[data-reactroot]') !== null ||
                      document.querySelector('#__next') !== null

  // Check if we're past the typical hydration time
  const timeSinceLoad = Date.now() - (window.performance?.timing?.loadEventEnd || 0)
  const enoughTimeElapsed = timeSinceLoad > 2000

  return hasReactRoot && enoughTimeElapsed
}

/**
 * Safe hydration check for components
 */
export function useHydrationSafe<T>(
  clientValue: T,
  serverValue: T = clientValue,
  delay: number = 0
): T {
  if (typeof window === 'undefined') {
    return serverValue
  }

  // Use client value after hydration
  if (isHydrationComplete() || delay === 0) {
    return clientValue
  }

  // Use server value during hydration
  return serverValue
}

/**
 * Debug utilities for development
 */
export const hydrationDebugUtils = {
  getErrors: getHydrationErrors,
  clearErrors: clearHydrationErrors,
  isComplete: isHydrationComplete,
  monitor: initializeHydrationMonitoring,
  
  // Development helper to simulate hydration errors
  simulateError: (element: string, expected: string, actual: string) => {
    if (process.env.NODE_ENV === 'development') {
      recordHydrationError({
        type: 'text',
        element,
        expected,
        actual,
        timestamp: Date.now()
      })
    }
  }
} 