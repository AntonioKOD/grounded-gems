import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format time in 12-hour format with AM/PM
 * Ensures consistent time display across the app
 */
export function formatTime(date: Date | string | number): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return format(dateObj, "h:mm a")
}

/**
 * Format date and time in 12-hour format
 * Ensures consistent date-time display across the app
 */
export function formatDateTime(date: Date | string | number): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return format(dateObj, "PPP h:mm a") // e.g., "January 1, 2024 2:30 PM"
}

/**
 * Format date with short time in 12-hour format
 * Useful for compact displays
 */
export function formatDateTimeShort(date: Date | string | number): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return format(dateObj, "MMM d, h:mm a") // e.g., "Jan 1, 2:30 PM"
}

/**
 * Get the base URL for the application
 * Enhanced for iOS and mobile Capacitor apps
 */
export function getBaseUrl(): string {
  // Server-side rendering
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_BASE_URL || 'https://www.sacavia.com'
  }
  
  // Client-side
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:3000'
  }
  
  return 'https://www.sacavia.com'
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
