"use client"

import Link from "next/link"
import { LayoutList, Calendar, Plus, MapPin, User } from "lucide-react"
import { useRouter } from "next/navigation"
import type { UserData } from "@/lib/features/user/userSlice"

interface MobileNavigationProps {
  initialUser: UserData | null;
}

export default function MobileNavigation({ initialUser }: MobileNavigationProps) {
  const router = useRouter()

  // Handle add post action - stable function
  const handleAddPost = () => {
    if (initialUser) {
      router.push('/post/create')
    } else {
      router.push('/login?redirect=/post/create')
    }
  }

  // Handle profile action - stable function  
  const handleProfile = () => {
    if (initialUser) {
      router.push(`/profile/${initialUser.id}`)
    } else {
      router.push('/login?redirect=/profile')
    }
  }

  // Static navigation structure - no dependencies
  const navItems = [
    {
      id: "feed",
      href: "/feed", 
      icon: LayoutList,
      label: "Local Buzz"
    },
    {
      id: "map",
      href: "/map",
      icon: MapPin,
      label: "Explore"
    },
    {
      id: "add",
      icon: Plus,
      label: "Add",
      onClick: handleAddPost
    },
    {
      id: "events", 
      href: "/events",
      icon: Calendar,
      label: "Events"
    },
    {
      id: "profile",
      icon: User,
      label: "Profile",
      onClick: handleProfile
    }
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
        <div className="safe-area-bottom">
          <div className="flex items-center justify-around h-16 px-2">
            {navItems.map((item) => {
              const Icon = item.icon
              
              // Handle click-based navigation
              if (item.onClick) {
                return (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className="flex flex-col items-center justify-center h-12 min-w-[60px] transition-all duration-200 text-gray-600 hover:text-[#FF6B6B] hover:scale-105"
                  >
                    {item.id === 'add' ? (
                      <div className="w-12 h-12 bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] rounded-full flex items-center justify-center mb-1 shadow-lg hover:shadow-xl transition-all duration-200 relative">
                        <Icon className="h-6 w-6 text-white" />
                        <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse"></div>
                      </div>
                    ) : item.id === 'profile' ? (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all duration-200 bg-gray-100 text-gray-600 hover:bg-gray-200">
                        <Icon className="h-5 w-5" />
                      </div>
                    ) : (
                      <Icon className="h-5 w-5 mb-0.5" />
                    )}
                    <span className={`text-xs font-medium ${
                      item.id === 'add' ? 'text-[#FF6B6B] font-semibold' : ''
                    }`}>
                      {item.label}
                    </span>
                  </button>
                )
              }
              
              // Handle link-based navigation
              return (
                <Link
                  key={item.id}
                  href={item.href!}
                  className="flex flex-col items-center justify-center h-12 min-w-[60px] transition-all duration-200 text-gray-600 hover:text-[#FF6B6B] hover:scale-105"
                >
                  <Icon className="h-5 w-5 mb-0.5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </>
  )
}