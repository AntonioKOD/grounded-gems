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

export default function sacaviaImageLoader({ src, width, quality }: ImageLoaderProps): string {
  // If it's already a full URL, return as is
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  // Get the base URL based on environment
  const getBaseUrl = (): string => {
    // Server-side
    if (typeof window === 'undefined') {
      return process.env.NODE_ENV === 'production' 
        ? 'https://www.sacavia.com'
        : 'http://localhost:3000'
    }

    // Client-side
    if (window.location.hostname === 'www.sacavia.com') {
      return 'https://www.sacavia.com';
    }
    
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:3000';
    }

    // Default fallback
    return process.env.NODE_ENV === 'production'
      ? 'https://www.sacavia.com'
      : 'http://localhost:3000'
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