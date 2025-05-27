"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LayoutList, Calendar, Plus, MapPin, Users } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

import EnhancedPostForm from "@/components/post/enhanced-post-form"
import { toast } from "sonner"
import type { UserData } from "@/lib/features/user/userSlice"
import type { Post } from "@/types/feed"
import Image from "next/image"

interface MobileNavigationProps {
  initialUser: UserData | null;
}

export default function MobileNavigation({ initialUser }: MobileNavigationProps) {
  const [isHydrated, setIsHydrated] = useState(false)
  const [open, setOpen] = useState(false)
  const router = useRouter()

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

  const handlePostCreated = () => {
    setOpen(false)
    // Trigger feed refresh via custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('postCreated'))
    }
  }



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
        href: "#",
        icon: Plus,
        label: "Create",
        isCenter: true,
        onClick: () => {
          if (!isAuthenticated) {
            router.push("/login")
            return
          }
          setOpen(true)
          if (navigator.vibrate) {
            navigator.vibrate(50)
          }
        }
      },
      {
        href: "/map",
        icon: MapPin,
        label: "Explore",
        isCenter: false,
      },
      {
        href: `/profile/${user?.id}`,
        icon: Users,
        label: "Profile",
        isCenter: false,
        isProfile: true,
        hasProfileImage: isAuthenticated && (user?.profileImage?.url || user?.avatar),
        profileImageUrl: user?.profileImage?.url || user?.avatar,
        profileImageAlt: user?.profileImage?.alt || user?.name || 'User avatar',
        userInitials: isAuthenticated ? getInitials(user) : null,
      },
    ]
  }

  const navItems = getNavItems()

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
        <div className="safe-area-bottom">
          <div className="flex items-center justify-around h-16 px-2">
            {navItems.map((item, index) => {
              const Icon = item.icon
              
              if (item.isCenter) {
                return (
                  <Sheet key={index} open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                      <button
                        onClick={item.onClick}
                        className="flex flex-col items-center justify-center bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] text-white rounded-full w-12 h-12 mx-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                      >
                        <Icon className="h-6 w-6" />
                      </button>
                    </SheetTrigger>
                    
                    <SheetContent side="bottom" className="h-[95vh] rounded-t-xl p-0">
                      <div className="flex flex-col h-full">
                        <SheetHeader className="text-left p-4 pb-0 flex-shrink-0">
                          <SheetTitle>Create post</SheetTitle>
                        </SheetHeader>
                        
                        <div className="flex-1 p-4 pt-2">
                          <EnhancedPostForm
                            user={{
                              id: initialUser?.id || "",
                              name: initialUser?.name || "",
                              avatar: initialUser?.profileImage?.url || initialUser?.avatar,
                            }}
                            onClose={() => setOpen(false)}
                            onPostCreated={handlePostCreated}
                          />
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                )
              }
              
              // Handle profile navigation - use Link component for proper navigation
              if ((item as any).isProfile) {
                return (
                  <Link
                    key={index}
                    href={item.href}
                    className={`flex flex-col items-center justify-center h-12 min-w-[60px] transition-all duration-200 text-gray-600 hover:text-[#FF6B6B] hover:scale-105`}
                  >
                    {item.label === "Profile" && (item as any).hasProfileImage ? (
                      <>
                        <Image
                          unoptimized
                          width={20}
                          height={20}
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
                      <Icon className="h-5 w-5 mb-0.5" />
                    )}
                    <span className="text-xs font-medium">{item.label}</span>
                  </Link>
                )
              }
              
              return (
                <Link
                  key={index}
                  href={item.href}
                  className={`flex flex-col items-center justify-center h-12 min-w-[60px] transition-all duration-200 text-gray-600 hover:text-[#FF6B6B] hover:scale-105`}
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