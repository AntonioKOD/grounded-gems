// Video utility functions for handling video thumbnails and fallbacks

/**
 * Generate a simple placeholder thumbnail for videos when FFmpeg is not available
 * This creates a basic colored rectangle with video icon
 */
export function generatePlaceholderThumbnail(videoUrl: string, width: number = 400, height: number = 300): string {
  // Create a simple SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#1f2937"/>
      <circle cx="${width / 2}" cy="${height / 2}" r="40" fill="#6b7280" opacity="0.3"/>
      <polygon 
        points="${width / 2 - 15},${height / 2 - 20} ${width / 2 - 15},${height / 2 + 20} ${width / 2 + 20},${height / 2}" 
        fill="#ffffff"
      />
      <text x="${width / 2}" y="${height - 20}" text-anchor="middle" fill="#9ca3af" font-family="Arial, sans-serif" font-size="12">
        Video
      </text>
    </svg>
  `
  
  // Convert SVG to data URL
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

/**
 * Get video thumbnail URL with fallback options
 */
export function getVideoThumbnailUrl(videoDoc: any): string | null {
  // Priority 1: Use generated thumbnail if available
  if (videoDoc?.videoThumbnail?.url) {
    return videoDoc.videoThumbnail.url
  }
  
  // Priority 2: Use video URL as fallback (browsers can generate thumbnails)
  if (videoDoc?.url) {
    return videoDoc.url
  }
  
  // Priority 3: Generate placeholder
  if (videoDoc?.url) {
    return generatePlaceholderThumbnail(videoDoc.url)
  }
  
  return null
}

/**
 * Check if a media document is a video
 */
export function isVideo(mediaDoc: any): boolean {
  return mediaDoc?.mimeType?.startsWith('video/') || mediaDoc?.isVideo === true
}

/**
 * Get video duration from media document (if available)
 */
export function getVideoDuration(mediaDoc: any): number | null {
  return mediaDoc?.duration || null
}

/**
 * Format video duration for display
 */
export function formatVideoDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
} 