"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

export default function MobileTopNavbar() {
  const { isAuthenticated, isLoading } = useAuth()
  const [isHydrated, setIsHydrated] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Handle scroll effect
  useEffect(() => {
    let ticking = false
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20)
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Don't render during loading or if user is authenticated
  if (!isHydrated || isLoading || isAuthenticated) {
    return null
  }

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-500 md:hidden",
      scrolled 
        ? "bg-white/95 backdrop-blur-xl border-b border-white/20 shadow-lg shadow-black/5" 
        : "bg-white/80 backdrop-blur-md border-b border-white/10"
    )}>
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <Image
            src="https://i.imgur.com/btJCRer.png"
            width={32}
            height={32}
            alt="Sacavia"
            className="rounded-lg"
          />
          <span className="ml-2 text-lg font-bold text-[#8B4513]">
            Sacavia
          </span>
        </Link>

        {/* Login Button */}
        <Link href="/login">
          <Button 
            size="sm"
            className="relative bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:from-[#FF6B6B]/90 hover:to-[#4ECDC4]/90 text-white font-medium px-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
          >
            <span className="relative z-10">Log in</span>
            <div className="absolute inset-0 bg-gradient-to-r from-[#4ECDC4] to-[#FF6B6B] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </Button>
        </Link>
      </div>
    </nav>
  )
} 