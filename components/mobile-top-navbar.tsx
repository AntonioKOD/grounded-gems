"use client"

import Link from "next/link"
import Image from "next/image"
import { Bell } from "lucide-react"
import FloatingSearchButton from "@/components/ui/floating-search-button"
import type { UserData } from "@/lib/features/user/userSlice"
import NotificationCenter from "@/components/notifications/notification-center"

interface MobileTopNavbarProps {
  initialUser: UserData | null
}

export default function MobileTopNavbar({ initialUser }: MobileTopNavbarProps) {
  if (!initialUser) return null

  return (
    <nav className="fixed top-0 left-4 right-4 mt-2 z-50 bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-lg h-14 flex items-center px-4 md:hidden">
      {/* Logo - optimized for smaller space */}
      <Link href="/" className="flex items-center h-full">
        <div className="relative w-9 h-9 flex items-center justify-center bg-gradient-to-br from-[#FF6B6B]/10 to-[#4ECDC4]/10 rounded-lg">
          <Image 
            src="/logo-mobile.svg" 
            alt="Grounded Gems" 
            width={36} 
            height={36} 
            className="w-full h-full object-contain"
            priority
          />
        </div>
      </Link>
      
      {/* Spacer */}
      <div className="flex-1" />
      
      {/* Action buttons container */}
      <div className="flex items-center gap-2">
        {/* Floating Search Button in Navbar */}
        <div className="flex items-center justify-center">
          <FloatingSearchButton className="w-10 h-10 bg-gray-100/80 hover:bg-gray-200/80 transition-all duration-300" />
        </div>
        
        {/* Notifications Button */}
        {initialUser?.id && (
          <div className="bg-gray-100/80 hover:bg-gray-200/80 rounded-xl transition-all duration-300">
            <NotificationCenter userId={initialUser.id} />
          </div>
        )}
      </div>

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#FF6B6B]/5 via-transparent to-[#4ECDC4]/5 pointer-events-none"></div>
    </nav>
  )
} 