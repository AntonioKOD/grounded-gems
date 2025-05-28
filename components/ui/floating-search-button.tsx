"use client"

import React, { useState, useEffect } from 'react'
import { Search, MapPin, Calendar, Plus, X, Sparkles, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface FloatingSearchButtonProps {
  className?: string
}

export default function FloatingSearchButton({ className }: FloatingSearchButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
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

  // Primary actions following Zipf's Law (most used first)
  const quickActions = [
    {
      icon: Sparkles,
      label: 'Gem Journey',
      href: '/planner',
      color: 'bg-[#FF6B6B]',
      hoverColor: 'hover:bg-[#FF5252]',
      primary: true
    },
    {
      icon: MapPin,
      label: 'Explore Nearby',
      href: '/explorer',
      color: 'bg-[#4ECDC4]',
      hoverColor: 'hover:bg-[#26C6DA]'
    },
    {
      icon: Calendar,
      label: 'Browse Events',
      href: '/events',
      color: 'bg-[#FFE66D]',
      hoverColor: 'hover:bg-[#FFEB3B]'
    },
    {
      icon: Plus,
      label: 'Add Place',
      href: '/add-location',
      color: 'bg-[#A8E6CF]',
      hoverColor: 'hover:bg-[#81C784]'
    },
    {
      icon: List,
      label: 'Gem List',
      href: '/bucket-list',
      color: 'bg-[#FFD93D]',
      hoverColor: 'hover:bg-[#FFEB3B]'
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
          'flex items-center justify-center w-14 h-14 rounded-full shadow transition-all duration-300 border',
          isExpanded 
            ? 'bg-gray-100 border-gray-300' 
            : 'bg-white border-gray-200 hover:bg-gray-50',
          'active:scale-95',
          'touch-manipulation select-none',
          'drop-shadow',
          'z-10'
        )}
        aria-label={isExpanded ? 'Close quick actions' : 'Open quick actions'}
      >
        {isExpanded ? (
          <X className="h-6 w-6 text-[#FF6B6B]" />
        ) : (
          <Sparkles className="h-6 w-6 text-[#FF6B6B]" />
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
                  'flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200',
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
                <span>{action.label}</span>
              </Link>
            )
          })}
        </div>
      )}

      {/* Mobile indicator dot - only show when not expanded */}
      {!isExpanded && (
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#FFE66D] rounded-full animate-pulse" />
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