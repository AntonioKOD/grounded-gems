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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 border-b border-gray-100 h-16 flex items-center px-3 md:hidden backdrop-blur">
      {/* Logo - bigger, no text */}
      <Link href="/" className="flex items-center h-full">
        <Image src="/logo.svg" alt="Logo" width={44} height={44} className="h-11 w-11" />
      </Link>
      {/* Spacer */}
      <div className="flex-1" />
      {/* Floating Search Button in Navbar */}
      <div className="flex items-center justify-center mr-3">
        <FloatingSearchButton className="w-11 h-11" />
      </div>
      {/* Notifications Button */}
      {initialUser?.id && (
        <NotificationCenter userId={initialUser.id} />
      )}
    </nav>
  )
} 