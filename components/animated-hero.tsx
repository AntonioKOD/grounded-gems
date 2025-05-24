/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useEffect, useRef, useState } from "react"
import { Search, ChevronDown, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useAnime } from "@/components/anime-loader"

export default function AnimatedHero() {
  const [searchFocused, setSearchFocused] = useState(false)
  const { anime, loading, error } = useAnime()
  const heroRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const floatingItemsRef = useRef<HTMLDivElement>(null)
  const staggeredItemsRef = useRef<HTMLDivElement>(null)

  // Handle search focus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Initial animation
  useEffect(() => {
    if (loading || error || !anime || typeof anime !== 'function') return
    
    // Title animation
    anime({
      targets: titleRef.current,
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 1000,
      easing: 'easeOutExpo',
    })

    // Subtitle animation with delay
    anime({
      targets: subtitleRef.current,
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 1000,
      delay: 200,
      easing: 'easeOutExpo',
    })

    // Search box animation
    anime({
      targets: searchRef.current,
      opacity: [0, 1],
      translateY: [20, 0],
      scale: [0.95, 1],
      duration: 1000,
      delay: 400,
      easing: 'easeOutExpo',
    })

    // Staggered animations for category buttons
    anime({
      targets: staggeredItemsRef.current?.children,
      opacity: [0, 1],
      translateY: [10, 0],
      scale: [0.9, 1],
      delay: function(el: any, i: number) {
        return 600 + (i * 100)
      },
      duration: 800,
      easing: 'easeOutExpo',
    })

    // Floating animation for decorative elements
    const floatingAnimation = anime({
      targets: floatingItemsRef.current?.children,
      translateY: function() {
        return Math.random() * 20 - 10
      },
      translateX: function() {
        return Math.random() * 20 - 10
      },
      rotate: function() {
        return Math.random() * 10 - 5
      },
      duration: function() {
        return Math.random() * 2000 + 3000
      },
      easing: 'easeInOutSine',
      complete: function(anim: any) {
        floatingAnimation.restart()
      },
      direction: 'alternate',
    })

    // Background gradient shift animation
    anime({
      targets: heroRef.current,
      background: [
        'linear-gradient(130deg, rgba(255,107,107,0.05) 0%, rgba(78,205,196,0.05) 100%)',
        'linear-gradient(130deg, rgba(78,205,196,0.05) 0%, rgba(255,107,107,0.05) 100%)',
      ],
      duration: 15000,
      direction: 'alternate',
      easing: 'easeInOutSine',
      loop: true
    })

    // Cleanup
    return () => {
      floatingAnimation.pause()
    }
  }, [anime, loading, error])

  // Mouse move parallax effect
  useEffect(() => {
    if (loading || error || !anime || typeof anime !== 'function') return
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!floatingItemsRef.current) return
      
      const items = floatingItemsRef.current.children
      const mouseX = e.clientX / window.innerWidth
      const mouseY = e.clientY / window.innerHeight
      
      Array.from(items).forEach((item, index) => {
        const depth = 0.05 + (index % 3) * 0.01
        const moveX = (mouseX - 0.5) * depth * 40
        const moveY = (mouseY - 0.5) * depth * 40
        
        anime({
          targets: item,
          translateX: moveX,
          translateY: moveY,
          duration: 1000,
          easing: 'easeOutQuad',
        })
      })
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [anime, loading, error])

  return (
    <section 
      ref={heroRef}
      className="relative min-h-[85vh] w-full overflow-hidden flex flex-col items-center justify-center px-4 py-16"
    >
      {/* Animated Decorative Elements */}
      <div ref={floatingItemsRef} className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[15%] left-[10%] w-32 h-32 rounded-full bg-[#FF6B6B]/5 blur-xl"></div>
        <div className="absolute top-[60%] left-[65%] w-40 h-40 rounded-full bg-[#4ECDC4]/5 blur-xl"></div>
        <div className="absolute top-[35%] left-[75%] w-24 h-24 rounded-full bg-[#FF6B6B]/5 blur-xl"></div>
        <div className="absolute top-[75%] left-[25%] w-48 h-48 rounded-full bg-[#4ECDC4]/5 blur-xl"></div>
        <div className="absolute top-[20%] left-[40%] w-36 h-36 rounded-full bg-[#FF6B6B]/5 blur-xl"></div>
        
        {/* Animated Shapes */}
        <svg className="absolute top-[10%] right-[20%] w-12 h-12 text-[#FF6B6B]/10" viewBox="0 0 100 100">
          <polygon points="50,0 100,50 50,100 0,50" fill="currentColor" />
        </svg>
        <svg className="absolute bottom-[15%] left-[15%] w-16 h-16 text-[#4ECDC4]/10" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="50" fill="currentColor" />
        </svg>
        <svg className="absolute top-[30%] left-[5%] w-10 h-10 text-[#FF6B6B]/10" viewBox="0 0 100 100">
          <rect width="100" height="100" fill="currentColor" />
        </svg>
        <svg className="absolute bottom-[25%] right-[10%] w-14 h-14 text-[#4ECDC4]/10" viewBox="0 0 100 100">
          <polygon points="0,0 100,0 100,100" fill="currentColor" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
        <h1 
          ref={titleRef}
          className="text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] bg-clip-text text-transparent"
        >
          Discover Hidden Gems
        </h1>
        
        <p 
          ref={subtitleRef} 
          className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto"
        >
          Explore authentic local experiences and connect with your community
        </p>

        {/* Search Box */}
        <div 
          ref={searchRef} 
          className="relative w-full max-w-2xl mx-auto"
        >
          <div className="relative flex h-16 overflow-hidden rounded-full border-2 bg-white shadow-lg transition-all duration-300 border-[#4ECDC4]/50 hover:border-[#4ECDC4]">
            <div className="absolute left-6 top-0 bottom-0 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Find hidden gems near you..."
              className="flex-1 h-full border-0 text-lg focus-visible:ring-0 focus-visible:ring-offset-0 pl-14"
              onFocus={() => setSearchFocused(true)}
            />
            <Button
              className="h-full px-8 rounded-r-full bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] hover:from-[#FF5A5A] hover:to-[#FF7A7A] text-white"
            >
              Explore
            </Button>
          </div>

          {/* Search suggestions - only show when focused */}
          {searchFocused && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 transform transition-all duration-200 origin-top animate-in fade-in-0 zoom-in-95">
              <div className="p-3">
                <div className="text-xs font-medium text-gray-500 px-3 py-1">Popular Searches</div>
                <div className="space-y-1">
                  <Link href="/search?q=coffee%20shops" className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md text-sm flex items-center">
                    <Search className="h-3.5 w-3.5 mr-2 text-gray-400" />
                    Coffee shops with character
                  </Link>
                  <Link href="/search?q=hiking%20trails" className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md text-sm flex items-center">
                    <Search className="h-3.5 w-3.5 mr-2 text-gray-400" />
                    Hidden hiking trails
                  </Link>
                  <Link href="/search?q=local%20art" className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md text-sm flex items-center">
                    <Search className="h-3.5 w-3.5 mr-2 text-gray-400" />
                    Local art galleries
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Category Pills */}
        <div ref={staggeredItemsRef} className="flex flex-wrap justify-center gap-3 pt-3">
          <Link 
            href="/search?category=food"
            className="px-6 py-3 rounded-full border-2 border-[#FF6B6B]/30 bg-white text-[#FF6B6B] hover:bg-[#FF6B6B]/5 transition-all duration-300 hover:scale-105 shadow-sm"
          >
            Food & Drink
          </Link>
          <Link 
            href="/search?category=outdoors"
            className="px-6 py-3 rounded-full border-2 border-[#4ECDC4]/30 bg-white text-[#4ECDC4] hover:bg-[#4ECDC4]/5 transition-all duration-300 hover:scale-105 shadow-sm"
          >
            Outdoor Adventures
          </Link>
          <Link 
            href="/search?category=arts"
            className="px-6 py-3 rounded-full border-2 border-[#FF6B6B]/30 bg-white text-[#FF6B6B] hover:bg-[#FF6B6B]/5 transition-all duration-300 hover:scale-105 shadow-sm"
          >
            Arts & Culture
          </Link>
          <Link 
            href="/search?category=events"
            className="px-6 py-3 rounded-full border-2 border-[#4ECDC4]/30 bg-white text-[#4ECDC4] hover:bg-[#4ECDC4]/5 transition-all duration-300 hover:scale-105 shadow-sm"
          >
            Local Events
          </Link>
        </div>

        {/* Scroll Down Indicator */}
        <button 
          onClick={() => {
            window.scrollTo({
              top: window.innerHeight - 80,
              behavior: 'smooth'
            })
          }}
          className="inline-flex flex-col items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors duration-300 absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20"
        >
          <span className="text-sm">Scroll for more</span>
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </button>
      </div>
    </section>
  )
} 