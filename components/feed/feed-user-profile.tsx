"use client"

import { useState } from "react"
import Link from "next/link"
import { MoreVertical, Settings, User, LogOut, Bell, Edit, Bookmark } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logoutUser } from "@/app/actions"

interface FeedUserProfileProps {
  user: any
  className?: string
  variant?: "compact" | "full"
}

export default function FeedUserProfile({
  user,
  className = "",
  variant = "full",
}: FeedUserProfileProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  if (!user) {
    return (
      <div className={`flex items-center justify-between p-4 ${className}`}>
        <div className="text-sm text-gray-500">Sign in to personalize your feed</div>
        <Button 
          size="sm"
          onClick={() => router.push("/login")}
          className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
        >
          Sign In
        </Button>
      </div>
    )
  }
  
  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }
  
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logoutUser()
      
      toast.success("Logged out successfully")
      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("Error logging out:", error)
      toast.error("Failed to log out")
      setIsLoggingOut(false)
    }
  }
  
  // Compact variant (just avatar and dropdown)
  if (variant === "compact") {
    return (
      <div className={`flex items-center justify-end ${className}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push(`/profile/${user.id}`)}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/notifications")}>
              <Bell className="mr-2 h-4 w-4" />
              <span>Notifications</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/profile/${user.id}/saved`)}>
              <Bookmark className="mr-2 h-4 w-4" />
              <span>Saved Items</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }
  
  // Full variant (avatar, name, stats, dropdown)
  return (
    <div className={`flex items-center justify-between p-4 ${className}`}>
      <Link href={`/profile/${user.id}`} className="flex items-center group">
        <Avatar className="h-10 w-10 mr-3 group-hover:ring-2 ring-[#FF6B6B]/20 transition-all">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium group-hover:text-[#FF6B6B] transition-colors">
            {user.name}
          </div>
          <div className="text-xs text-gray-500">
            {user.followersCount || 0} followers
          </div>
        </div>
      </Link>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/profile/${user.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            <span>Edit Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/notifications")}>
            <Bell className="mr-2 h-4 w-4" />
            <span>Notifications</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 