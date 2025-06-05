'use client'

/**
 * Custom Next.js image loader for Payload CMS and mobile compatibility
 * Based on Next.js documentation: https://nextjs.org/docs/app/api-reference/config/next-config-js/images
 */

interface ImageLoaderProps {
  src: string;
  width: number;
  quality?: number;
}

export default function groundedGemsImageLoader({ src, width, quality }: ImageLoaderProps): string {
  // If it's already a full URL, return as is
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  // Get the base URL based on environment
  const getBaseUrl = (): string => {
    // Client-side
    if (typeof window !== 'undefined') {
      // Check if we're in a Capacitor app
      const isCapacitor = window.location.protocol === 'capacitor:' || 
                         window.location.protocol === 'ionic:' ||
                         window.navigator.userAgent.includes('Capacitor');
      
      if (isCapacitor) {
        return 'https://groundedgems.com';
      }
      
      // Production web
      if (window.location.hostname === 'groundedgems.com') {
        return 'https://groundedgems.com';
      }
      
      // Development web
      return window.location.origin;
    }
    
    // Server-side fallback
    return process.env.NODE_ENV === 'production' 
      ? 'https://groundedgems.com' 
      : 'http://localhost:3000';
  };

  const baseUrl = getBaseUrl();
  
  // Handle Payload media URLs
  if (src.startsWith('/api/media/') || src.startsWith('/media/')) {
    return `${baseUrl}${src}`;
  }
  
  // Handle relative URLs
  if (src.startsWith('/')) {
    return `${baseUrl}${src}`;
  }
  
  // For Payload media files without path
  return `${baseUrl}/api/media/${src}`;
} 