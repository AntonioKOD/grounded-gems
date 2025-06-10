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
  // Set default quality if not provided (85 for good balance of quality/size)
  const q = quality || 85;

  // If it's already a full URL, optimize if possible
  if (src.startsWith('http://') || src.startsWith('https://')) {
    // For blob storage URLs, add optimization parameters
    if (src.includes('blob.vercel-storage.com')) {
      try {
        const url = new URL(src);
        url.searchParams.set('w', width.toString());
        url.searchParams.set('q', q.toString());
        url.searchParams.set('fm', 'webp');
        return url.toString();
      } catch {
        return src; // Fallback if URL parsing fails
      }
    }
    
    // For Unsplash images, add optimization
    if (src.includes('images.unsplash.com')) {
      try {
        const url = new URL(src);
        url.searchParams.set('w', width.toString());
        url.searchParams.set('q', q.toString());
        url.searchParams.set('fm', 'webp');
        url.searchParams.set('auto', 'format,compress');
        return url.toString();
      } catch {
        return src;
      }
    }
    
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
  
  // Handle Payload media URLs with optimization
  if (src.startsWith('/api/media/') || src.startsWith('/media/')) {
    const optimizedSrc = `${baseUrl}${src}`;
    
    // Add optimization parameters for media files
    try {
      const url = new URL(optimizedSrc);
      url.searchParams.set('width', width.toString());
      url.searchParams.set('quality', q.toString());
      url.searchParams.set('format', 'webp');
      return url.toString();
    } catch {
      return optimizedSrc;
    }
  }
  
  // Handle relative URLs with optimization
  if (src.startsWith('/')) {
    const optimizedSrc = `${baseUrl}${src}`;
    
    // Add optimization for image files
    if (src.match(/\.(jpg|jpeg|png|webp|avif)$/i)) {
      try {
        const url = new URL(optimizedSrc);
        url.searchParams.set('w', width.toString());
        url.searchParams.set('q', q.toString());
        url.searchParams.set('fm', 'webp');
        return url.toString();
      } catch {
        return optimizedSrc;
      }
    }
    
    return optimizedSrc;
  }
  
  // For Payload media files without path
  const fallbackSrc = `${baseUrl}/api/media/${src}`;
  
  // Try to add optimization parameters
  try {
    const url = new URL(fallbackSrc);
    url.searchParams.set('width', width.toString());
    url.searchParams.set('quality', q.toString());
    url.searchParams.set('format', 'webp');
    return url.toString();
  } catch {
    return fallbackSrc;
  }
} 