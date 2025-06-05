"use client"

import { Capacitor } from '@capacitor/core'

interface IOSDebugLog {
  timestamp: number
  event: string
  details: any
  memoryUsage?: number
  error?: any
}

class IOSCrashDebugger {
  private static instance: IOSCrashDebugger
  private logs: IOSDebugLog[] = []
  private maxLogs = 100
  private isIOSDevice = false

  constructor() {
    this.isIOSDevice = Capacitor.getPlatform() === 'ios'
    if (this.isIOSDevice) {
      this.initializeIOSDebugging()
    }
  }

  static getInstance(): IOSCrashDebugger {
    if (!IOSCrashDebugger.instance) {
      IOSCrashDebugger.instance = new IOSCrashDebugger()
    }
    return IOSCrashDebugger.instance
  }

  private async initializeIOSDebugging() {
    console.log('🍎 [iOS Debug] Initializing iOS crash debugging...')
    
    // Track app lifecycle events
    try {
      const { App } = await import('@capacitor/app')
      
      App.addListener('appStateChange', (state) => {
        this.log('app_state_change', {
          isActive: state.isActive,
          url: window.location.href
        })
      })

      App.addListener('backButton', (event) => {
        this.log('back_button_pressed', {
          canGoBack: event.canGoBack
        })
      })

      App.addListener('appUrlOpen', (event) => {
        this.log('app_url_open', {
          url: event.url
        })
      })

    } catch (error) {
      this.log('initialization_error', { error })
    }

    // Track memory warnings (iOS specific)
    if (typeof window !== 'undefined') {
      // Listen for iOS memory warnings
      window.addEventListener('beforeunload', () => {
        this.log('before_unload', { url: window.location.href })
      })

      window.addEventListener('pagehide', () => {
        this.log('page_hide', { url: window.location.href })
      })

      window.addEventListener('pageshow', (event) => {
        this.log('page_show', { 
          persisted: event.persisted,
          url: window.location.href 
        })
      })

      // Track unhandled errors
      window.addEventListener('error', (event) => {
        this.log('js_error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.stack
        })
      })

      window.addEventListener('unhandledrejection', (event) => {
        this.log('unhandled_rejection', {
          reason: event.reason,
          stack: event.reason?.stack
        })
      })
    }

    // Track React component errors
    const originalConsoleError = console.error
    console.error = (...args) => {
      if (args[0]?.includes?.('React') || args[0]?.includes?.('component')) {
        this.log('react_error', { args })
      }
      originalConsoleError.apply(console, args)
    }

    this.log('ios_debugging_initialized', { 
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform() 
    })
  }

  log(event: string, details: any = {}, error?: any) {
    if (!this.isIOSDevice) return

    const logEntry: IOSDebugLog = {
      timestamp: Date.now(),
      event,
      details,
      error
    }

    // Add memory usage if available
    if ((performance as any).memory) {
      logEntry.memoryUsage = (performance as any).memory.usedJSHeapSize
    }

    this.logs.push(logEntry)

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Console log for immediate debugging
    console.log(`🍎 [iOS Debug] ${event}:`, details, error)

    // Store in localStorage for persistence across app restarts
    try {
      localStorage.setItem('ios_debug_logs', JSON.stringify(this.logs.slice(-20)))
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  getLogs(): IOSDebugLog[] {
    return [...this.logs]
  }

  getLastCrashLogs(): IOSDebugLog[] {
    try {
      const stored = localStorage.getItem('ios_debug_logs')
      return stored ? JSON.parse(stored) : []
    } catch (e) {
      return []
    }
  }

  clearLogs() {
    this.logs = []
    try {
      localStorage.removeItem('ios_debug_logs')
    } catch (e) {
      // Ignore
    }
  }

  // Export logs for debugging
  exportLogs(): string {
    const allLogs = {
      currentSession: this.logs,
      lastSession: this.getLastCrashLogs(),
      deviceInfo: {
        platform: Capacitor.getPlatform(),
        isNative: Capacitor.isNativePlatform(),
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    }
    return JSON.stringify(allLogs, null, 2)
  }

  // Track specific iOS modal issues
  trackModalOperation(operation: string, details: any = {}) {
    this.log(`modal_${operation}`, {
      ...details,
      modalCount: document.querySelectorAll('[role="dialog"], .modal, [data-modal]').length,
      portalCount: document.querySelectorAll('[data-portal]').length
    })
  }

  // Track iOS app startup
  trackStartup(stage: string, details: any = {}) {
    this.log(`startup_${stage}`, {
      ...details,
      timeFromStart: performance.now(),
      memoryUsage: (performance as any).memory?.usedJSHeapSize
    })
  }
}

// Global instance
export const iosDebugger = IOSCrashDebugger.getInstance()

// Export functions for easy use
export const logIOSEvent = (event: string, details?: any, error?: any) => {
  iosDebugger.log(event, details, error)
}

export const trackIOSModal = (operation: string, details?: any) => {
  iosDebugger.trackModalOperation(operation, details)
}

export const trackIOSStartup = (stage: string, details?: any) => {
  iosDebugger.trackStartup(stage, details)
}

export const getIOSDebugLogs = () => {
  return iosDebugger.exportLogs()
}

// Auto-initialize if on iOS
if (typeof window !== 'undefined' && Capacitor.getPlatform() === 'ios') {
  iosDebugger.log('ios_debugger_loaded', { url: window.location.href })
} 