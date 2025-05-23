/**
 * PWA (Progressive Web App) utilities for Sacavia
 * Handles app installation, offline detection, and service worker management
 */

// Check if the app is running as a PWA
export const isPWA = (): boolean => {
  if (typeof window === 'undefined') return false
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as any).standalone === true
  )
}

// Check if PWA installation is available
export const canInstallPWA = (): boolean => {
  if (typeof window === 'undefined') return false
  
  return 'beforeinstallprompt' in window
}

// Check if the app is running offline
export const isOffline = (): boolean => {
  if (typeof navigator === 'undefined') return false
  
  return !navigator.onLine
}

// Get installation prompt
let deferredPrompt: any = null

export const setupInstallPrompt = (): void => {
  if (typeof window === 'undefined') return

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault()
    // Stash the event so it can be triggered later
    deferredPrompt = e
    console.log('PWA install prompt ready')
  })

  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed')
    deferredPrompt = null
  })
}

// Show install prompt
export const showInstallPrompt = async (): Promise<boolean> => {
  if (!deferredPrompt) {
    console.log('No install prompt available')
    return false
  }

  try {
    // Show the install prompt
    deferredPrompt.prompt()
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
      return true
    } else {
      console.log('User dismissed the install prompt')
      return false
    }
  } catch (error) {
    console.error('Error showing install prompt:', error)
    return false
  } finally {
    deferredPrompt = null
  }
}

// Check if service worker is supported
export const isServiceWorkerSupported = (): boolean => {
  if (typeof navigator === 'undefined') return false
  
  return 'serviceWorker' in navigator
}

// Register service worker
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isServiceWorkerSupported()) {
    console.log('Service workers are not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    console.log('Service worker registered:', registration)
    return registration
  } catch (error) {
    console.error('Service worker registration failed:', error)
    return null
  }
}

// Update service worker
export const updateServiceWorker = async (): Promise<void> => {
  if (!isServiceWorkerSupported()) return

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      await registration.update()
      console.log('Service worker updated')
    }
  } catch (error) {
    console.error('Service worker update failed:', error)
  }
}

// Listen for service worker updates
export const listenForServiceWorkerUpdates = (onUpdate: () => void): void => {
  if (!isServiceWorkerSupported()) return

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('Service worker controller changed')
    onUpdate()
  })
}

// Clear app cache
export const clearAppCache = async (): Promise<void> => {
  if (typeof caches === 'undefined') return

  try {
    const cacheNames = await caches.keys()
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    )
    console.log('App cache cleared')
  } catch (error) {
    console.error('Failed to clear app cache:', error)
  }
}

// Get app cache size
export const getAppCacheSize = async (): Promise<number> => {
  if (typeof caches === 'undefined') return 0

  try {
    const cacheNames = await caches.keys()
    let totalSize = 0

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName)
      const keys = await cache.keys()
      
      for (const request of keys) {
        const response = await cache.match(request)
        if (response) {
          const blob = await response.blob()
          totalSize += blob.size
        }
      }
    }

    return totalSize
  } catch (error) {
    console.error('Failed to calculate cache size:', error)
    return 0
  }
}

// Format cache size for display
export const formatCacheSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Check for app updates
export const checkForAppUpdates = async (): Promise<boolean> => {
  if (!isServiceWorkerSupported()) return false

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return false

    await registration.update()
    
    // Check if there's a waiting service worker
    return !!registration.waiting
  } catch (error) {
    console.error('Failed to check for updates:', error)
    return false
  }
}

// Apply app update
export const applyAppUpdate = async (): Promise<void> => {
  if (!isServiceWorkerSupported()) return

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  } catch (error) {
    console.error('Failed to apply update:', error)
  }
}

// Setup offline/online listeners
export const setupNetworkListeners = (
  onOnline: () => void,
  onOffline: () => void
): (() => void) => {
  if (typeof window === 'undefined') return () => {}

  const handleOnline = () => {
    console.log('App is online')
    onOnline()
  }

  const handleOffline = () => {
    console.log('App is offline')
    onOffline()
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
} 