/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Bell, Heart, Plus, Search, User, LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import Image from 'next/image'
import NotificationCenter from "@/components/notifications/notification-center"

interface NavBarProps {
  initialUser?: any; // Keep for compatibility but don't use
}

export default function NavBar({ initialUser }: NavBarProps) {
  const { user, isAuthenticated, logout, isLoading } = useAuth()
  const [notificationCount] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Reset image error when user changes
  useEffect(() => {
    setImageError(false);
  }, [user?.profileImage?.url]);

  // Listen for user updates to refresh navbar immediately
  useEffect(() => {
    const handleUserUpdate = (event: CustomEvent) => {
      console.log("NavBar: User update detected", event.detail);
      // The useUser hook will automatically update, but we can force a re-render
      setImageError(false); // Reset image error state
    };

    window.addEventListener("user-updated", handleUserUpdate as EventListener);
    window.addEventListener("user-login", handleUserUpdate as EventListener);

    return () => {
      window.removeEventListener("user-updated", handleUserUpdate as EventListener);
      window.removeEventListener("user-login", handleUserUpdate as EventListener);
    };
  }, []);

  const getInitials = (userData: any) => {
    if (!userData?.name) return 'U';
    return userData.name
      .split(' ')
      .map((word: string) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    await logout()
  };

  // Show loading state during authentication check
  if (!isHydrated) {
    return (
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm transition-all duration-300 border-b border-gray-100 shadow-sm"
      )}>
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16 lg:h-18">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 lg:w-11 lg:h-11 flex items-center justify-center transition-transform group-hover:scale-105">
                <Image 
                  src="/logo.svg" 
                  alt="Grounded Gems" 
                  className="w-full h-full object-contain"
                  width={44}
                  height={44}
                />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] bg-clip-text text-transparent">
                  Grounded Gems
                </span>
              </div>
            </Link>

            {/* Navigation Links - Zipf's Law: Most used features first */}
            <div className="hidden lg:flex items-center space-x-6">
              <Link 
                href="/map"
                className="relative text-gray-700 hover:text-[#FF6B6B] transition-colors font-medium text-sm lg:text-base group"
              >
                Explore
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <Link 
                href="/feed"
                className="relative text-gray-700 hover:text-[#FF6B6B] transition-colors font-medium text-sm lg:text-base group"
              >
                Feed
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <Link 
                href="/events"
                className="relative text-gray-700 hover:text-[#FF6B6B] transition-colors font-medium text-sm lg:text-base group"
              >
                Events
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] transition-all duration-300 group-hover:w-full"></span>
              </Link>
            </div>

            {/* Right Section - Loading skeleton */}
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 lg:h-10 lg:w-10 rounded-full bg-gray-200 animate-pulse"></div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm transition-all duration-300 border-b border-gray-100 shadow-sm"
    )}>
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 lg:w-11 lg:h-11 flex items-center justify-center transition-transform group-hover:scale-105">
              <Image 
                src="/logo.svg" 
                alt="Grounded Gems" 
                className="w-full h-full object-contain"
                width={44}
                height={44}
              />
            </div>
            <div className="hidden sm:block">
              <span className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] bg-clip-text text-transparent">
                Grounded Gems
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden lg:flex items-center space-x-8">
            <Link 
              href="/feed"
              className="relative text-gray-700 hover:text-[#FF6B6B] transition-colors font-medium text-sm lg:text-base group"
            >
              Feed
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link 
              href="/events"
              className="relative text-gray-700 hover:text-[#FF6B6B] transition-colors font-medium text-sm lg:text-base group"
            >
              Events
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link 
              href="/map"
              className="relative text-gray-700 hover:text-[#FF6B6B] transition-colors font-medium text-sm lg:text-base group"
            >
              Explore
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] transition-all duration-300 group-hover:w-full"></span>
            </Link>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-3">
          {!isAuthenticated ? (
            // Not authenticated: show login/signup buttons
            <div className="flex items-center space-x-3">
              <Link href="/login">
                <Button variant="ghost" className="text-gray-700 hover:text-[#FF6B6B] hover:bg-gray-50 transition-all font-medium">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:from-[#FF6B6B]/90 hover:to-[#4ECDC4]/90 text-white font-medium px-6 shadow-md hover:shadow-lg transition-all">
                  Sign up
                </Button>
              </Link>
            </div>
          ) : (
            // Client-side authenticated: render authenticated user UI
            <>
              {/* Add Location Button */}
              <Link href="/add-location">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden lg:flex items-center space-x-2 text-gray-700 hover:text-[#4ECDC4] hover:bg-[#4ECDC4]/10 transition-all font-medium px-4"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Location</span>
                </Button>
              </Link>

              {/* Notifications Button */}
              <div className="relative">
                {user?.id && (
                  <NotificationCenter userId={user.id} />
                )}
              </div>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-9 w-9 lg:h-10 lg:w-10 rounded-full p-0 overflow-hidden ring-2 ring-transparent hover:ring-[#4ECDC4]/30 transition-all"
                  >
                    {user?.profileImage?.url && !imageError ? (
                      <Image
                        src={user.profileImage.url} 
                        alt={user.profileImage?.alt || user.name || 'User avatar'}
                        width={40}
                        height={40}
                        className="h-full w-full rounded-full object-cover"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div className="h-full w-full rounded-full bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] flex items-center justify-center text-white text-sm lg:text-base font-semibold">
                        {getInitials(user)}
                      </div>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 mt-2 shadow-lg border-0 bg-white/95 backdrop-blur-sm" forceMount>
                  <DropdownMenuLabel className="font-normal p-4">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold leading-none text-gray-900">
                        {user?.name || 'User'}
                      </p>
                      <p className="text-xs leading-none text-gray-500">
                        {user?.email || ''}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuGroup className="p-1">
                    <DropdownMenuItem asChild className="cursor-pointer rounded-md">
                      <Link href={`/profile/${user?.id}`} className="flex items-center p-3 text-gray-700 hover:text-[#FF6B6B] hover:bg-gray-50 transition-colors">
                        <User className="mr-3 h-4 w-4" />
                        <span className="font-medium">Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer rounded-md">
                      <Link href="/saved" className="flex items-center p-3 text-gray-700 hover:text-[#FF6B6B] hover:bg-gray-50 transition-colors">
                        <Heart className="mr-3 h-4 w-4" />
                        <span className="font-medium">Saved</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer rounded-md p-3 m-1 text-gray-700 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut className="mr-3 h-4 w-4" />
                    <span className="font-medium">Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          </div>
        </div>
      </div>
    </nav>
  )
}
