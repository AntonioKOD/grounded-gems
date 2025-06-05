/**
 * iOS Safari History Throttling Utility
 * 
 * Based on Mapbox's solution for iOS Safari's security restriction
 * that limits history.replaceState() to 100 calls per 30 seconds.
 * 
 * @see https://github.com/mapbox/mapbox-gl-js/pull/5613
 * @see https://discussions.apple.com/thread/253901334
 */

// Track history.replaceState calls for throttling
let callCount = 0;
let resetTimeout: NodeJS.Timeout | null = null;

// Store original methods
const originalReplaceState = typeof window !== 'undefined' ? window.history.replaceState : null;
const originalPushState = typeof window !== 'undefined' ? window.history.pushState : null;

// Throttle configuration
const MAX_CALLS = 80; // Conservative limit (iOS allows 100 per 30s, we use 80)
const RESET_INTERVAL = 30000; // 30 seconds

/**
 * Throttled version of history.replaceState that respects iOS Safari limits
 */
function throttledReplaceState(data: any, title: string, url?: string | URL | null) {
  if (!originalReplaceState) return;

  // Check if we're approaching the limit
  if (callCount >= MAX_CALLS) {
    console.warn('[iOS Throttle] history.replaceState() call skipped due to iOS Safari rate limit');
    return;
  }

  // Increment call count
  callCount++;

  // Set up reset timer if not already running
  if (!resetTimeout) {
    resetTimeout = setTimeout(() => {
      callCount = 0;
      resetTimeout = null;
      console.log('[iOS Throttle] History call count reset');
    }, RESET_INTERVAL);
  }

  // Call original method
  try {
    originalReplaceState.call(window.history, data, title, url);
  } catch (error) {
    console.error('[iOS Throttle] Error calling history.replaceState:', error);
  }
}

/**
 * Throttled version of history.pushState with similar protections
 */
function throttledPushState(data: any, title: string, url?: string | URL | null) {
  if (!originalPushState) return;

  // Use same throttling logic for pushState
  if (callCount >= MAX_CALLS) {
    console.warn('[iOS Throttle] history.pushState() call skipped due to iOS Safari rate limit');
    return;
  }

  callCount++;

  if (!resetTimeout) {
    resetTimeout = setTimeout(() => {
      callCount = 0;
      resetTimeout = null;
    }, RESET_INTERVAL);
  }

  try {
    originalPushState.call(window.history, data, title, url);
  } catch (error) {
    console.error('[iOS Throttle] Error calling history.pushState:', error);
  }
}

/**
 * Initialize iOS history throttling for Safari compatibility
 */
export function initializeIOSHistoryThrottling() {
  if (typeof window === 'undefined') return;
  
  // Detect iOS Safari
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  if (!isIOSSafari) {
    console.log('[iOS Throttle] Not iOS Safari, skipping history throttling');
    return;
  }

  // Only throttle if we haven't already
  if (window.history.replaceState === throttledReplaceState) {
    console.log('[iOS Throttle] History throttling already initialized');
    return;
  }

  console.log('[iOS Throttle] Initializing history.replaceState() throttling for iOS Safari');

  // Replace the native methods with throttled versions
  window.history.replaceState = throttledReplaceState;
  window.history.pushState = throttledPushState;

  // Monitor for excessive calls
  let warningCount = 0;
  const originalConsoleWarn = console.warn;
  console.warn = function(...args) {
    if (args[0] && args[0].includes && args[0].includes('history.replaceState')) {
      warningCount++;
      if (warningCount > 5) {
        console.error('[iOS Throttle] Excessive history manipulation detected. Check for redirect loops.');
      }
    }
    originalConsoleWarn.apply(console, args);
  };
}

/**
 * Get current throttling status for debugging
 */
export function getHistoryThrottleStatus() {
  return {
    callCount,
    maxCalls: MAX_CALLS,
    resetTimeRemaining: resetTimeout ? RESET_INTERVAL : 0,
    isThrottled: callCount >= MAX_CALLS
  };
}

/**
 * Reset the throttling counter (useful for debugging)
 */
export function resetHistoryThrottle() {
  callCount = 0;
  if (resetTimeout) {
    clearTimeout(resetTimeout);
    resetTimeout = null;
  }
  console.log('[iOS Throttle] Manually reset history throttling');
} 