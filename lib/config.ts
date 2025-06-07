/**
 * Centralized configuration for iOS and mobile compatibility
 * Handles all URL resolution and environment detection
 */

import { Capacitor } from '@capacitor/core';

// Environment detection
export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isServer = typeof window === 'undefined';
export const isClient = typeof window !== 'undefined';

// Platform detection
export const isMobile = () => {
  if (isServer) return false;
  return Capacitor.isNativePlatform();
};

export const isIOS = () => {
  if (isServer) return false;
  return Capacitor.getPlatform() === 'ios';
};

export const isAndroid = () => {
  if (isServer) return false;
  return Capacitor.getPlatform() === 'android';
};

export const isCapacitor = () => {
  if (isServer) return false;
  return Capacitor.isNativePlatform() || 
         window.location.protocol === 'capacitor:' || 
         window.location.protocol === 'ionic:' ||
         window.navigator.userAgent.includes('Capacitor');
};

// URL Configuration
export const API_CONFIG = {
  // Production URL - always HTTPS
  PRODUCTION_URL: 'https://www.sacavia.com',
  
  // Development URLs
  DEV_WEB_URL: 'http://localhost:3000',
  DEV_MOBILE_URL: 'http://localhost:3001',
  
  // Get the correct base URL for the current environment
  getBaseUrl: (): string => {
    // For mobile apps, always use production URL
    if (isMobile() || isCapacitor()) {
      return API_CONFIG.PRODUCTION_URL;
    }
    
    // For client-side web
    if (isClient) {
      // Production web
      if (window.location.hostname === 'www.sacavia.com') {
        return API_CONFIG.PRODUCTION_URL;
      }
      
      // Vercel preview deployments
      if (window.location.hostname.includes('vercel.app')) {
        return window.location.origin;
      }
      
      // Development web
      return window.location.origin;
    }
    
    // Server-side
    if (isProduction) {
      return API_CONFIG.PRODUCTION_URL;
    }
    
    // Check environment variables
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL;
    }
    
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    
    // Development fallback
    return API_CONFIG.DEV_WEB_URL;
  },
  
  // Get API URL with endpoint
  getApiUrl: (endpoint: string): string => {
    const baseUrl = API_CONFIG.getBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
  },
  
  // Check if URL is external
  isExternalUrl: (url: string): boolean => {
    if (!url.includes('://')) return false;
    
    const baseUrl = API_CONFIG.getBaseUrl();
    return !url.startsWith(baseUrl) && 
           !url.includes('localhost') && 
           !url.includes('127.0.0.1') &&
           !url.includes('192.168.');
  }
};

// Network configuration for mobile
export const NETWORK_CONFIG = {
  // Request timeout for mobile networks
  TIMEOUT: isMobile() ? 15000 : 10000,
  
  // Retry configuration
  RETRY_ATTEMPTS: isMobile() ? 3 : 2,
  RETRY_DELAY: 1000,
  
  // Headers for mobile requests
  getMobileHeaders: (): HeadersInit => ({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': `GroundedGems/${isIOS() ? 'iOS' : isAndroid() ? 'Android' : 'Web'} 1.0.0`,
    'X-Requested-With': 'GroundedGems',
    ...(isMobile() && {
      'X-Mobile-App': 'true',
      'X-Platform': Capacitor.getPlatform(),
    })
  })
};

// Image optimization configuration
export const IMAGE_CONFIG = {
  // Use unoptimized images for mobile to avoid CORS issues
  shouldUseUnoptimized: (src: string): boolean => {
    // Always unoptimize for mobile apps
    if (isMobile()) return true;
    
    // Unoptimize external URLs
    if (API_CONFIG.isExternalUrl(src)) return true;
    
    // Unoptimize API media URLs
    if (src.includes('/api/media/') || src.includes('.blob.vercel-storage.com')) {
      return true;
    }
    
    return false;
  },
  
  // Get optimized image URL
  getOptimizedUrl: (src: string, width?: number, height?: number): string => {
    // For mobile, return original URL to avoid optimization issues
    if (isMobile()) return src;
    
    // For external services, let them handle optimization
    if (API_CONFIG.isExternalUrl(src)) return src;
    
    // For local images, apply Next.js optimization
    return src;
  }
};

export default {
  API_CONFIG,
  NETWORK_CONFIG,
  IMAGE_CONFIG,
  // Platform flags
  isProduction,
  isDevelopment,
  isServer,
  isClient,
  isMobile,
  isIOS,
  isAndroid,
  isCapacitor
}; 