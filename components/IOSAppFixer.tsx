"use client"

import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { logIOSEvent, trackIOSStartup } from '@/lib/ios-crash-debug'

export default function IOSAppFixer() {
  const isInitialized = useRef(false)
  const [isIOS, setIsIOS] = useState(false)
  const cleanupFunctions = useRef<Array<() => void>>([])
  const startupAttempts = useRef(0)
  const maxStartupAttempts = 3

  useEffect(() => {
    const checkIOS = Capacitor.getPlatform() === 'ios'
    setIsIOS(checkIOS)
    
    if (checkIOS && !isInitialized.current) {
      initializeIOSFixes()
    }
  }, [])

  const initializeIOSFixes = async () => {
    if (isInitialized.current) return
    
    startupAttempts.current++
    trackIOSStartup('initialization_start', { 
      attempt: startupAttempts.current,
      maxAttempts: maxStartupAttempts 
    })

    try {
      logIOSEvent('ios_fixer_start', { attempt: startupAttempts.current })

      // Clear any existing iOS app state that might be corrupted
      await clearIOSAppState()

      // Fix iOS-specific Capacitor issues
      await fixIOSCapacitorIssues()

      // Setup iOS-specific memory management
      setupIOSMemoryManagement()

      // Fix iOS modal/portal issues
      fixIOSModalIssues()

      // Setup iOS app lifecycle handling
      await setupIOSAppLifecycle()

      // iOS-specific navigation fixes
      setupIOSNavigationFixes()

      isInitialized.current = true
      logIOSEvent('ios_fixer_complete', { 
        attempt: startupAttempts.current,
        success: true 
      })

    } catch (error) {
      logIOSEvent('ios_fixer_error', { 
        attempt: startupAttempts.current,
        error: error.message,
        stack: error.stack 
      })

      // Retry if we haven't exceeded max attempts
      if (startupAttempts.current < maxStartupAttempts) {
        setTimeout(() => {
          isInitialized.current = false
          initializeIOSFixes()
        }, 1000 * startupAttempts.current) // Exponential backoff
      } else {
        logIOSEvent('ios_fixer_failed', { 
          totalAttempts: startupAttempts.current,
          finalError: error.message 
        })
      }
    }
  }

  const clearIOSAppState = async () => {
    logIOSEvent('clearing_ios_state')
    
    try {
      // Clear problematic localStorage items that might cause issues
      const keysToCheck = [
        'capacitor_',
        '__mobile',
        'react_',
        'nextjs_',
        'debug_'
      ]
      
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && keysToCheck.some(prefix => key.startsWith(prefix))) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key)
        } catch (e) {
          logIOSEvent('localStorage_clear_error', { key, error: e.message })
        }
      })

      // Clear any hanging timers
      if ((window as any).__iosTimers) {
        (window as any).__iosTimers.forEach((timer: number) => {
          clearTimeout(timer)
          clearInterval(timer)
        })
        delete (window as any).__iosTimers
      }

      // Clear any hanging event listeners
      if ((window as any).__iosListeners) {
        (window as any).__iosListeners.forEach((cleanup: () => void) => {
          try {
            cleanup()
          } catch (e) {
            logIOSEvent('listener_cleanup_error', { error: e.message })
          }
        })
        delete (window as any).__iosListeners
      }

      logIOSEvent('ios_state_cleared')
    } catch (error) {
      logIOSEvent('clear_state_error', { error: error.message })
    }
  }

  const fixIOSCapacitorIssues = async () => {
    logIOSEvent('fixing_capacitor_issues')
    
    try {
      // Import Capacitor modules safely
      const [
        { App },
        { SplashScreen },
        { StatusBar, Style },
        { Keyboard }
      ] = await Promise.all([
        import('@capacitor/app'),
        import('@capacitor/splash-screen'),
        import('@capacitor/status-bar'),
        import('@capacitor/keyboard')
      ])

      // Fix splash screen hanging issue
      try {
        await SplashScreen.hide({ fadeOutDuration: 200 })
        logIOSEvent('splash_screen_hidden')
      } catch (e) {
        logIOSEvent('splash_screen_error', { error: e.message })
      }

      // Fix status bar issues
      try {
        await StatusBar.setStyle({ style: Style.Dark })
        await StatusBar.setBackgroundColor({ color: '#FF6B6B' })
        await StatusBar.show()
        logIOSEvent('status_bar_configured')
      } catch (e) {
        logIOSEvent('status_bar_error', { error: e.message })
      }

      // Fix keyboard issues
      try {
        Keyboard.setAccessoryBarVisible({ isVisible: false })
        logIOSEvent('keyboard_configured')
      } catch (e) {
        logIOSEvent('keyboard_error', { error: e.message })
      }

      logIOSEvent('capacitor_issues_fixed')
    } catch (error) {
      logIOSEvent('capacitor_fix_error', { error: error.message })
      throw error
    }
  }

  const setupIOSMemoryManagement = () => {
    logIOSEvent('setting_up_memory_management')

    // iOS-specific memory pressure handling
    const handleMemoryWarning = () => {
      logIOSEvent('memory_warning_received')
      
      // Clear non-essential caches
      if ((window as any).__tempCache) {
        delete (window as any).__tempCache
      }
      
      // Force garbage collection if available
      if ((window as any).gc) {
        (window as any).gc()
      }
      
      // Clear image caches
      const images = document.querySelectorAll('img')
      images.forEach(img => {
        if (!img.classList.contains('essential')) {
          img.removeAttribute('src')
        }
      })
      
      logIOSEvent('memory_cleanup_completed')
    }

    // Listen for iOS memory warnings
    if ('onmemorywarning' in window) {
      window.addEventListener('memorywarning', handleMemoryWarning)
      cleanupFunctions.current.push(() => {
        window.removeEventListener('memorywarning', handleMemoryWarning)
      })
    }

    // Monitor memory usage
    const memoryMonitor = setInterval(() => {
      if ((performance as any).memory) {
        const memory = (performance as any).memory
        const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit
        
        if (usageRatio > 0.8) {
          logIOSEvent('high_memory_usage', { 
            usageRatio,
            usedMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
            limitMB: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
          })
          handleMemoryWarning()
        }
      }
    }, 30000) // Check every 30 seconds

    cleanupFunctions.current.push(() => clearInterval(memoryMonitor))
    logIOSEvent('memory_management_setup')
  }

  const fixIOSModalIssues = () => {
    logIOSEvent('fixing_modal_issues')

    // Fix iOS modal rendering issues
    const style = document.createElement('style')
    style.textContent = `
      /* iOS-specific modal fixes */
      @supports (-webkit-touch-callout: none) {
        .modal-backdrop {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          z-index: 99998 !important;
          -webkit-overflow-scrolling: touch;
        }
        
        .modal-content {
          position: fixed !important;
          z-index: 99999 !important;
          -webkit-transform: translate3d(0, 0, 0);
          transform: translate3d(0, 0, 0);
          -webkit-overflow-scrolling: touch;
        }
        
        .location-detail-modal {
          -webkit-overflow-scrolling: touch;
          overflow-y: auto;
        }
        
        /* Fix iOS safe area issues */
        .modal-header {
          padding-top: env(safe-area-inset-top, 20px);
        }
        
        .modal-bottom {
          padding-bottom: env(safe-area-inset-bottom, 20px);
        }
      }
    `
    document.head.appendChild(style)
    cleanupFunctions.current.push(() => document.head.removeChild(style))

    // Monitor modal operations
    const originalCreatePortal = (window as any).ReactDOM?.createPortal
    if (originalCreatePortal) {
      (window as any).ReactDOM.createPortal = (...args: any[]) => {
        logIOSEvent('portal_created', { target: args[1]?.tagName })
        return originalCreatePortal.apply((window as any).ReactDOM, args)
      }
    }

    logIOSEvent('modal_issues_fixed')
  }

  const setupIOSAppLifecycle = async () => {
    logIOSEvent('setting_up_app_lifecycle')

    try {
      const { App } = await import('@capacitor/app')

      // Handle iOS app state changes differently
      const stateChangeListener = App.addListener('appStateChange', (state) => {
        logIOSEvent('app_state_change', { 
          isActive: state.isActive,
          url: window.location.href,
          timestamp: Date.now()
        })

        if (!state.isActive) {
          // App going to background - aggressive cleanup
          logIOSEvent('app_backgrounding')
          
          // Close any open modals
          const modals = document.querySelectorAll('[role="dialog"], .modal, [data-modal="true"]')
          modals.forEach(modal => {
            const closeButton = modal.querySelector('[data-close], .close, .modal-close')
            if (closeButton) {
              (closeButton as HTMLElement).click()
            }
          })
          
          // Clear timers
          if ((window as any).__iosTimers) {
            (window as any).__iosTimers.forEach(clearTimeout)
            (window as any).__iosTimers = []
          }
          
        } else {
          // App coming to foreground - restore
          logIOSEvent('app_foregrounding')
          
          // Reset Capacitor plugins
          setTimeout(async () => {
            try {
              const { StatusBar, Style } = await import('@capacitor/status-bar')
              await StatusBar.setStyle({ style: Style.Dark })
              await StatusBar.setBackgroundColor({ color: '#FF6B6B' })
              logIOSEvent('status_bar_restored')
            } catch (e) {
              logIOSEvent('status_bar_restore_error', { error: e.message })
            }
          }, 100)
        }
      })

      cleanupFunctions.current.push(() => stateChangeListener.remove())

      // Handle iOS back button properly
      const backButtonListener = App.addListener('backButton', (event) => {
        logIOSEvent('ios_back_button', { canGoBack: event.canGoBack })
        
        // Check for open modals first
        const modals = document.querySelectorAll('[role="dialog"], .modal, [data-modal="true"]')
        if (modals.length > 0) {
          // Close the topmost modal
          const topModal = modals[modals.length - 1]
          const closeButton = topModal.querySelector('[data-close], .close, .modal-close')
          if (closeButton) {
            (closeButton as HTMLElement).click()
            return
          }
        }
        
        // If no modals and can't go back, minimize instead of exit
        if (!event.canGoBack) {
          App.minimizeApp()
        }
      })

      cleanupFunctions.current.push(() => backButtonListener.remove())
      logIOSEvent('app_lifecycle_setup')

    } catch (error) {
      logIOSEvent('app_lifecycle_error', { error: error.message })
      throw error
    }
  }

  const setupIOSNavigationFixes = () => {
    logIOSEvent('setting_up_navigation_fixes')

    // Fix iOS navigation issues
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState

    history.pushState = function(...args) {
      logIOSEvent('navigation_push', { url: args[2] })
      return originalPushState.apply(history, args)
    }

    history.replaceState = function(...args) {
      logIOSEvent('navigation_replace', { url: args[2] })
      return originalReplaceState.apply(history, args)
    }

    // Handle iOS-specific navigation events
    window.addEventListener('popstate', (event) => {
      logIOSEvent('navigation_popstate', { 
        url: window.location.href,
        state: event.state 
      })
    })

    cleanupFunctions.current.push(() => {
      history.pushState = originalPushState
      history.replaceState = originalReplaceState
    })

    logIOSEvent('navigation_fixes_setup')
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      logIOSEvent('ios_fixer_cleanup')
      cleanupFunctions.current.forEach(cleanup => {
        try {
          cleanup()
        } catch (error) {
          logIOSEvent('cleanup_error', { error: error.message })
        }
      })
      cleanupFunctions.current = []
    }
  }, [])

  // Only render on iOS, and don't render any UI
  if (!isIOS) return null
  
  return null
} 