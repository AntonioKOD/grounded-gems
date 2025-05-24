"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { LayoutList, Calendar, Plus, MapPin, Users } from "lucide-react"
import type { UserData } from "@/context/user-context"

interface MobileNavigationProps {
  initialUser: UserData | null;
}

export default function MobileNavigation({ initialUser }: MobileNavigationProps) {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const getInitials = (userData: UserData | null) => {
    if (!userData?.name) return 'U';
    return userData.name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get navigation items - always start with unauthenticated state to avoid hydration mismatch
  const getNavItems = () => {
    const user = initialUser
    const isAuthenticated = isHydrated && !!user

    return [
      {
        href: "/feed",
        icon: LayoutList,
        label: "Feed",
        isCenter: false,
      },
      {
        href: "/events",
        icon: Calendar,
        label: "Events", 
        isCenter: false,
      },
      {
        href: isAuthenticated ? "/add-location" : "/login",
        icon: Plus,
        label: "Add",
        isCenter: true,
      },
      {
        href: "/map",
        icon: MapPin,
        label: "Explore",
        isCenter: false,
      },
      {
        href: isAuthenticated ? `/profile/${user?.id}` : "/login",
        icon: Users,
        label: "Profile",
        isCenter: false,
        hasProfileImage: isAuthenticated && (user?.profileImage?.url || user?.avatar),
        profileImageUrl: user?.profileImage?.url || user?.avatar,
        profileImageAlt: user?.profileImage?.alt || user?.name || 'User avatar',
        userInitials: isAuthenticated ? getInitials(user) : null,
      },
    ]
  }

  const navItems = getNavItems()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
      <div className="safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item, index) => {
            const Icon = item.icon
            
            return (
              <Link
                key={index}
                href={item.href}
                className={`flex flex-col items-center justify-center h-12 min-w-[60px] transition-all duration-200 ${
                  item.isCenter 
                    ? "bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] text-white rounded-full w-12 h-12 mx-2 shadow-lg hover:shadow-xl transform hover:scale-105" 
                    : "text-gray-600 hover:text-[#FF6B6B] hover:scale-105"
                }`}
              >
                {item.label === "Profile" && (item as any).hasProfileImage ? (
                  <>
                    <img 
                      src={(item as any).profileImageUrl} 
                      alt={(item as any).profileImageAlt}
                      className="h-5 w-5 rounded-full object-cover border border-gray-300 mb-0.5"
                      onError={(e) => {
                        // Fallback to icon if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <Icon className="h-5 w-5 mb-0.5 hidden" />
                  </>
                ) : (
                  <Icon className={`${item.isCenter ? "h-6 w-6" : "h-5 w-5"} mb-0.5`} />
                )}
                {!item.isCenter && (
                  <span className="text-xs font-medium">{item.label}</span>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}