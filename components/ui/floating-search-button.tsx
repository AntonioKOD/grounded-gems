"use client"

import React, { useState, useEffect } from 'react'
import { Search, Bell, Menu, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { getUnreadNotificationCount } from '@/app/actions'

interface FloatingSearchButtonProps {
  className?: string
}

export default function FloatingSearchButton({ className }: FloatingSearchButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { user } = useAuth()
  
  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch unread notification count
  useEffect(() => {
    if (!user?.id) return

    const fetchUnreadCount = async () => {
      try {
        const count = await getUnreadNotificationCount(user.id)
        setUnreadCount(count)
      } catch (error) {
        console.error('Error fetching unread notification count:', error)
      }
    }

    fetchUnreadCount()

    // Set up polling for unread count
    const interval = setInterval(fetchUnreadCount, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [user?.id])
  
  // Adjust position based on current page
  const getDynamicPosition = () => {
    if (typeof window === 'undefined') return ''
    
    const path = window.location.pathname
    const isMapPage = path.includes('/map')
    
    // On map page, move FAB to avoid map controls
    if (isMapPage && !isMobile) {
      return 'left-safe right-auto' // Move to left on map for desktop
    }
    
    return '' // Default position (right side)
  }
  
  const dynamicPosition = getDynamicPosition()

  // Primary actions - only 3 buttons as requested
  const quickActions = [
    {
      icon: Sparkles,
      label: 'Hangout Plan',
      href: '/planner',
      color: 'bg-[#FF6B6B]',
      hoverColor: 'hover:bg-[#FF5252]',
      primary: true
    },
    {
      icon: Search,
      label: 'Search',
      href: '/search',
      color: 'bg-[#4ECDC4]',
      hoverColor: 'hover:bg-[#26C6DA]'
    },
    {
      icon: Bell,
      label: 'Notifications',
      href: '/notifications',
      color: 'bg-[#FFE66D]',
      hoverColor: 'hover:bg-[#FFEB3B]',
      badgeCount: unreadCount
    }
  ]

  // Close expanded menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isExpanded) {
        const target = e.target as HTMLElement
        if (!target.closest('.floating-search-button')) {
          setIsExpanded(false)
        }
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isExpanded])

  return (
    <div className={cn('relative floating-search-button', dynamicPosition, className)}>
      {/* Main floating button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 border-2 relative',
          isExpanded 
            ? 'bg-gray-100 border-gray-300 shadow-md' 
            : 'bg-white border-gray-200 hover:bg-gray-50 hover:shadow-xl',
          'active:scale-95',
          'touch-manipulation select-none',
          'z-10'
        )}
        aria-label={isExpanded ? 'Close quick actions' : 'Open quick actions'}
      >
        {isExpanded ? (
          <X className="h-6 w-6 text-[#FF6B6B]" />
        ) : (
          <Menu className="h-6 w-6 text-[#FF6B6B]" />
        )}
        
        {/* Enhanced notification badge for main button when closed */}
        {!isExpanded && unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-[#FF6B6B] text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-lg z-20">
            <span className="leading-none px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </div>
        )}
      </button>

      {/* Quick actions open downward below the button */}
      {isExpanded && (
        <div className={cn(
          "absolute right-0 mr-4 bottom-full mb-3 flex flex-col space-y-3 animate-in slide-in-from-bottom-2 duration-300 w-max min-w-[180px] max-w-xs",
          "bg-white rounded-xl shadow-2xl border border-gray-100 p-2 z-60"
        )}>
          {quickActions.map((action, index) => {
            const Icon = action.icon
            return (
              <Link
                key={action.label}
                href={action.href}
                onClick={() => setIsExpanded(false)}
                className={cn(
                  'flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 relative',
                  'hover:bg-gray-50 active:bg-gray-100',
                  'text-gray-800',
                  'font-medium',
                  'text-base',
                  'w-full',
                  'focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:ring-offset-2'
                )}
                style={{
                  animationDelay: `${index * 50}ms`
                }}
              >
                <Icon className="h-5 w-5 flex-shrink-0 text-[#FF6B6B]" />
                <span className="flex-1">{action.label}</span>
                {/* Enhanced notification badge for notifications button */}
                {action.badgeCount && action.badgeCount > 0 && (
                  <div className="relative flex items-center justify-center">
                    <div className="min-w-[22px] h-[22px] bg-[#FF6B6B] text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-md">
                      <span className="leading-none px-1">
                        {action.badgeCount > 99 ? "99+" : action.badgeCount}
                      </span>
                    </div>
                    {/* Subtle pulse animation for new notifications */}
                    <div className="absolute inset-0 bg-[#FF6B6B] rounded-full animate-ping opacity-20"></div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}

      {/* Mobile indicator dot - only show when not expanded and no notifications */}
      {!isExpanded && unreadCount === 0 && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-[#FFE66D] to-[#FFD93D] rounded-full animate-pulse shadow-sm border border-white" />
      )}
    </div>
  )
}

// Hook for managing FAB visibility based on scroll and page context
export function useFloatingButtonVisibility() {
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Hide on scroll down (except near top), show on scroll up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }
      
      setLastScrollY(currentScrollY)
    }

    // Handle keyboard visibility on mobile
    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight
      const windowHeight = window.innerHeight
      
      // If keyboard is likely open (viewport smaller than window)
      if (viewportHeight < windowHeight * 0.75) {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)
    window.visualViewport?.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      window.visualViewport?.removeEventListener('resize', handleResize)
    }
  }, [lastScrollY])

  return isVisible
} 