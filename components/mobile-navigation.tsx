"use client"

import Link from "next/link"
import { LayoutList, Calendar, Plus, MapPin, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useState, useCallback, useEffect } from "react"
import { safeIOSNavigation } from "@/lib/ios-auth-helper"
import type { UserData } from "@/lib/features/user/userSlice"

interface MobileNavigationProps {
  initialUser: UserData | null;
}

export default function MobileNavigation({ initialUser }: MobileNavigationProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [navigating, setNavigating] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Prevent hydration mismatch by only rendering on client
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Safe navigation function that uses iOS-optimized auth checking
  const safeNavigate = useCallback(async (path: string, requiresAuth: boolean = true) => {
    if (navigating) return // Prevent multiple navigation attempts
    
    setNavigating(path)
    
    try {
      // Use iOS-optimized navigation helper
      const success = await safeIOSNavigation(path, {
        requiresAuth,
        fallbackPath: '/login',
        useWindowLocation: true // Always use window.location for mobile for better reliability
      })
      
      if (!success) {
        console.log('[Mobile Nav] Navigation failed or redirected to login')
      }
      
    } catch (error) {
      console.error('[Mobile Nav] Navigation error:', error)
    } finally {
      // Reset navigation state after a delay
      setTimeout(() => setNavigating(null), 1000)
    }
  }, [navigating])

  // Handle add post action - check auth first
  const handleAddPost = useCallback(() => {
    safeNavigate('/post/create', true)
  }, [safeNavigate])

  // Handle profile action - check auth first  
  const handleProfile = useCallback(() => {
    // Always check current auth state rather than relying on props
    if (isClient && isAuthenticated && initialUser) {
      safeNavigate(`/profile/${initialUser.id}`, true)
    } else {
      safeNavigate('/login?redirect=/profile', false)
    }
  }, [safeNavigate, isAuthenticated, initialUser, isClient])

  // Handle feed navigation
  const handleFeed = useCallback(() => {
    safeNavigate('/feed', true)
  }, [safeNavigate])

  // Handle events navigation
  const handleEvents = useCallback(() => {
    safeNavigate('/events', true)
  }, [safeNavigate])

  // Show skeleton during SSR and initial client render to prevent hydration mismatch
  if (!isClient) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden" suppressHydrationWarning={true}>
        <div className="flex items-center justify-around h-20 px-2">
            {/* Static skeleton that matches the final render */}
            <div className="flex flex-col items-center justify-center h-16 min-w-[60px] px-2 text-gray-400">
              <LayoutList className="h-6 w-6 mb-1" />
              <span className="text-xs">Local Buzz</span>
            </div>
            <div className="flex flex-col items-center justify-center h-16 min-w-[60px] px-2 text-gray-400">
              <MapPin className="h-6 w-6 mb-1" />
              <span className="text-xs">Map</span>
            </div>
            <div className="flex flex-col items-center justify-center h-16 min-w-[60px] px-2">
              <div className="w-14 h-14 bg-gray-300 rounded-full flex items-center justify-center mb-1">
                <Plus className="h-7 w-7 text-gray-500" />
              </div>
            </div>
            <div className="flex flex-col items-center justify-center h-16 min-w-[60px] px-2 text-gray-400">
              <Calendar className="h-6 w-6 mb-1" />
              <span className="text-xs">Events</span>
            </div>
            <div className="flex flex-col items-center justify-center h-16 min-w-[60px] px-2 text-gray-400">
              <User className="h-6 w-6 mb-1" />
              <span className="text-xs">Profile</span>
            </div>
          </div>
      </nav>
    )
  }

  // Client-side rendered navigation with full functionality
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden" 
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      suppressHydrationWarning={true}
    >
      <div className="flex items-center justify-around h-20 px-2">
          <button
            onClick={handleFeed}
            disabled={navigating === '/feed'}
            className="flex flex-col items-center justify-center h-16 min-w-[60px] px-2 text-gray-600 hover:text-[#FF6B6B] transition-colors disabled:opacity-50"
          >
            <LayoutList className="h-6 w-6 mb-1" />
            <span className="text-xs">Local Buzz</span>
          </button>

          <Link
            href="/map"
            className="flex flex-col items-center justify-center h-16 min-w-[60px] px-2 text-gray-600 hover:text-[#FF6B6B] transition-colors"
          >
            <MapPin className="h-6 w-6 mb-1" />
            <span className="text-xs">Map</span>
          </Link>

          <button
            onClick={handleAddPost}
            disabled={navigating === '/post/create'}
            className="flex flex-col items-center justify-center h-16 min-w-[60px] px-2 text-white transition-colors disabled:opacity-50"
          >
            <div className="w-14 h-14 bg-[#FF6B6B] rounded-full flex items-center justify-center mb-1 hover:bg-[#FF5252] transition-colors">
              <Plus className="h-7 w-7" />
            </div>
          </button>

          <button
            onClick={handleEvents}
            disabled={navigating === '/events'}
            className="flex flex-col items-center justify-center h-16 min-w-[60px] px-2 text-gray-600 hover:text-[#FF6B6B] transition-colors disabled:opacity-50"
          >
            <Calendar className="h-6 w-6 mb-1" />
            <span className="text-xs">Events</span>
          </button>

          <button
            onClick={handleProfile}
            disabled={navigating?.startsWith('/profile')}
            className="flex flex-col items-center justify-center h-16 min-w-[60px] px-2 text-gray-600 hover:text-[#FF6B6B] transition-colors disabled:opacity-50"
          >
            <User className="h-6 w-6 mb-1" />
            <span className="text-xs">Profile</span>
          </button>
        </div>
    </nav>
  )
}