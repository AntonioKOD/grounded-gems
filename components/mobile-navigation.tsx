"use client"

import Link from "next/link"
import { LayoutList, Calendar, Plus, MapPin, User, Search, BookOpen, LibraryBig } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useState, useCallback, useEffect } from "react"
import { safeIOSNavigation } from "@/lib/ios-auth-helper"
import type { UserData } from "@/lib/features/user/userSlice"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu"

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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex flex-col items-center justify-center h-16 min-w-[60px] px-2 text-white transition-colors"
              >
                <div className="w-14 h-14 bg-[#FF6B6B] rounded-full flex items-center justify-center mb-1 hover:bg-[#FF5252] transition-colors">
                  <Plus className="h-7 w-7" />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="center" 
              side="top"
              className="w-64 mb-4 shadow-2xl border-0 bg-white/95 backdrop-blur-xl rounded-2xl overflow-hidden"
            >
              <div className="p-2 space-y-1">
                <button
                  onClick={() => safeNavigate('/library', true)}
                  disabled={navigating === '/library'}
                  className="flex items-center w-full p-4 text-white bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#6366F1]/90 hover:to-[#8B5CF6]/90 transition-all duration-300 rounded-xl font-medium shadow-lg disabled:opacity-50 relative overflow-hidden"
                >
                  <div className="flex items-center space-x-3 relative z-10">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <LibraryBig className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold">My Library</div>
                      <div className="text-xs opacity-90">Your purchased guides</div>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-4"></div>
                </button>
                <button
                  onClick={() => safeNavigate('/guides', true)}
                  disabled={navigating === '/guides'}
                  className="flex items-center w-full p-4 text-white bg-gradient-to-r from-[#4ECDC4] to-[#26C6DA] hover:from-[#4ECDC4]/90 hover:to-[#26C6DA]/90 transition-all duration-300 rounded-xl font-medium shadow-lg disabled:opacity-50 relative overflow-hidden"
                >
                  <div className="flex items-center space-x-3 relative z-10">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold">Browse Guides</div>
                      <div className="text-xs opacity-90">Discover local expertise</div>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-4"></div>
                </button>
                <button
                  onClick={() => safeNavigate('/post/create', true)}
                  disabled={navigating === '/post/create'}
                  className="flex items-center w-full p-3 text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-[#FF6B6B] hover:to-[#4ECDC4] transition-all duration-300 rounded-xl font-medium disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 mr-3" />
                  Create Post
                </button>
                <button
                  onClick={() => safeNavigate('/guides/create', true)}
                  disabled={navigating === '/guides/create'}
                  className="flex items-center w-full p-3 text-white bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:from-[#FF6B6B]/90 hover:to-[#4ECDC4]/90 transition-all duration-300 rounded-xl font-medium shadow-lg disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 mr-3" />
                  Create Guide & Earn
                </button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

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