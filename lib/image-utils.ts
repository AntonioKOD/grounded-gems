/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Utility function to get the correct image URL for Vercel Blob storage
 * Handles different image formats from Payload CMS
 */
export function getImageUrl(image: any): string {
    if (!image) return "/placeholder.svg"
  
    // If image is a string that's already a URL, return it
    if (typeof image === "string") {
      // If it's a Vercel Blob URL, use it directly
      if (
        image.includes("vercel-blob.com") ||
        image.includes("blob.vercel-storage.com") ||
        image.startsWith("https://")
      ) {
        return image
      }
  
      // If it's an ID, use a relative path, not an absolute one
      if (image.match(/^[a-f0-9]{24}$/i)) {
        return `/api/media/${image}` // Use relative path, not absolute
      }
  
      // Check if the URL already has a localhost prefix, and remove it
      if (image.startsWith("http://localhost:")) {
        try {
          // Extract just the path portion
          const url = new URL(image)
          return url.pathname // Returns just "/api/media/abc123"
        } catch (error) {
          console.error('Failed to parse localhost URL:', error)
          // Fallback: extract path manually
          return image.replace(/^http:\/\/localhost:\d+/, '')
        }
      }
  
      // Otherwise, use the string as is (might be a relative path)
      return image
    }
  
    // If image is an object with a url property (Payload CMS format)
    if (typeof image === "object" && image !== null) {
      // Handle Vercel Blob URL format
      if (image.url) {
        // Check if URL has localhost and strip it if needed
        if (typeof image.url === "string" && image.url.startsWith("http://localhost:")) {
          try {
            const url = new URL(image.url)
            return url.pathname
          } catch (error) {
            console.error('Failed to parse localhost image URL:', error)
            // Fallback: extract path manually
            return image.url.replace(/^http:\/\/localhost:\d+/, '')
          }
        }
        return image.url
      }
  
      // Handle Payload CMS media format with filename and sizes
      if (image.filename) {
        // Check if filename has localhost and strip it if needed
        if (typeof image.filename === "string" && image.filename.startsWith("http://localhost:")) {
          try {
            const url = new URL(image.filename)
            return url.pathname
          } catch (error) {
            console.error('Failed to parse localhost filename URL:', error)
            // Fallback: extract path manually
            return image.filename.replace(/^http:\/\/localhost:\d+/, '')
          }
        }
        return image.filename
      }
    }
  
    // Fallback to placeholder
    return "/placeholder.svg"
  }
  
  /**
   * Utility function to get the correct avatar URL
   */
  export function getAvatarUrl(avatar: any): string {
    const url = getImageUrl(avatar)
    return url || "/diverse-avatars.png"
  }
  