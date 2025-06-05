import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the base URL for the application
 * Enhanced for iOS and mobile Capacitor apps
 */
export function getBaseUrl(): string {
  // Client-side - check if we're in a Capacitor app
  if (typeof window !== 'undefined') {
    // If we're in a Capacitor app or iOS, always use production URL
    const isCapacitor = window.location.protocol === 'capacitor:' || 
                       window.location.protocol === 'ionic:' ||
                       window.navigator.userAgent.includes('Capacitor') ||
                       window.location.hostname === 'localhost' && window.navigator.userAgent.includes('Mobile')
    
    if (isCapacitor) {
      return 'https://groundedgems.com'
    }
    
    // For web browsers, use current origin
    return window.location.origin
  }
  
  // Server-side - production URL
  if (process.env.NODE_ENV === 'production') {
    return 'https://groundedgems.com'
  }
  
  // Server-side - check environment variables
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  // Fallback for development (web only)
  return 'http://localhost:3000'
}

/**
 * Construct an API URL with the correct base URL
 * Enhanced for mobile/iOS environments
 */
export function getApiUrl(path: string): string {
  const baseUrl = getBaseUrl()
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${cleanPath}`
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function getInitials(name: string): string {
  if (!name) return "U"
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)
}
