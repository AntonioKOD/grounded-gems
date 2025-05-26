"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { LayoutList, Calendar, Plus, MapPin, Users } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import EnhancedPostForm from "@/components/post/enhanced-post-form"
import { toast } from "sonner"
import type { UserData } from "@/lib/features/user/userSlice"
import type { Post } from "@/types/feed"

interface MobileNavigationProps {
  initialUser: UserData | null;
}

export default function MobileNavigation({ initialUser }: MobileNavigationProps) {
  const [isHydrated, setIsHydrated] = useState(false)
  const [open, setOpen] = useState(false)
  const [postText, setPostText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleCreatePost = async () => {
    if (!postText.trim()) {
      toast.error("Please enter some text for your post")
      return
    }
    
    if (!initialUser?.id) {
      toast.error("Please log in to create a post")
      return
    }
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([30, 50, 30])
    }
    
    setIsSubmitting(true)
    
    try {
      // Import and use the actual server action
      const { createPost } = await import("@/app/actions")
      
      // Create FormData for the server action
      const formData = new FormData()
      formData.append("userId", initialUser.id)
      formData.append("content", postText)
      formData.append("type", "post")
      
      const result = await createPost(formData)
      
      if (result.success) {
        setPostText("")
        setOpen(false)
        toast.success("Post created successfully!")
        
        // Trigger a soft refresh of the feed instead of full page reload
        if (typeof window !== 'undefined') {
          // Dispatch a custom event that the feed can listen to
          window.dispatchEvent(new CustomEvent('postCreated', { 
            detail: { postId: result.postId } 
          }))
        }
      } else {
        toast.error(result.message || "Failed to create post")
      }
    } catch (error) {
      console.error("Error creating post:", error)
      toast.error("Failed to create post. Please try again.")
    } finally {
      setIsSubmitting(false)
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
            window.location.href = "/login"
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
                          />
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                )
              }
              
              return (
                <Link
                  key={index}
                  href={item.href}
                  className={`flex flex-col items-center justify-center h-12 min-w-[60px] transition-all duration-200 text-gray-600 hover:text-[#FF6B6B] hover:scale-105`}
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
                    <Icon className="h-5 w-5 mb-0.5" />
                  )}
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