"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function MobileRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Check if we're on the client side
    if (typeof window === 'undefined') return

    // Check if the device is mobile
    const isMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      
      // Check for mobile user agents (more comprehensive)
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i
      const isMobileUserAgent = mobileRegex.test(userAgent.toLowerCase())
      
      // Check screen width as backup
      const isMobileScreen = window.innerWidth <= 768
      
      // Check for touch capability
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      
      return isMobileUserAgent || (isMobileScreen && isTouchDevice)
    }

    // Only redirect if on mobile and not already on auth pages or specific routes
    const currentPath = window.location.pathname
    const excludedPaths = ['/login', '/signup', '/verify', '/map', '/feed']
    const shouldRedirect = !excludedPaths.some(path => currentPath.includes(path))

    if (isMobile() && shouldRedirect) {
      // Add a small delay to prevent hydration issues
      setTimeout(() => {
        router.push('/login')
      }, 100)
    }
  }, [router])

  // This component doesn't render anything
  return null
} 