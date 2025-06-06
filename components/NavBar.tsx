/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Bell, Heart, Plus, Search, User, LogOut, Menu, X } from "lucide-react"

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
  initialUser?: any;
}

export default function NavBar({ initialUser }: NavBarProps) {
  const { user, isAuthenticated, logout, isLoading } = useAuth()
  const [notificationCount] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect with throttling for better performance
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      setImageError(false);
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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Navigation links data
  const navLinks = [
    { href: "/feed", label: "Feed", priority: 1 },
    { href: "/events", label: "Events", priority: 2 },
    { href: "/map", label: "Explore", priority: 3 },
  ];

  // Show loading state during authentication check
  if (!isHydrated) {
    return (
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        "bg-white/80 backdrop-blur-xl border-b border-white/20",
        "shadow-lg shadow-black/5"
      )}>
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo Skeleton */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse"></div>
              <div className="hidden sm:block w-40 h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div>
            </div>

            {/* Right Section - Loading skeleton */}
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse"></div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <>
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled 
          ? "bg-white/95 backdrop-blur-xl border-b border-white/20 shadow-lg shadow-black/5" 
          : "bg-white/80 backdrop-blur-md border-b border-white/10"
      )}>
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <Image
                src="https://i.imgur.com/btJCRer.png"
                width={40}
                height={40}
                alt="Sacavia"
                className="rounded-lg"
              />
              <span className="ml-3 text-xl font-bold text-[#8B4513] hidden sm:block">
                Sacavia
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center space-x-1">
              {navLinks.map(({ href, label }, index) => (
                <Link 
                  key={href}
                  href={href}
                  className="relative group px-4 py-2 rounded-full transition-all duration-300 hover:bg-gradient-to-r hover:from-[#FF6B6B]/10 hover:to-[#4ECDC4]/10"
                >
                  <span className="relative text-gray-700 hover:text-transparent hover:bg-gradient-to-r hover:from-[#FF6B6B] hover:to-[#4ECDC4] hover:bg-clip-text transition-all duration-300 font-medium text-sm lg:text-base">
                    {label}
                  </span>
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] transition-all duration-300 group-hover:w-8 rounded-full"></div>
                </Link>
              ))}
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-2 lg:space-x-3">
              {!isAuthenticated ? (
                // Not authenticated: show login/signup buttons
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <Link href="/login">
                    <Button 
                      variant="ghost" 
                      className="text-gray-700 hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/10 transition-all duration-300 font-medium rounded-full px-4 lg:px-6"
                    >
                      Log in
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button className="relative bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:from-[#FF6B6B]/90 hover:to-[#4ECDC4]/90 text-white font-medium px-4 lg:px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                      <span className="relative z-10">Sign up</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-[#4ECDC4] to-[#FF6B6B] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </Button>
                  </Link>
                </div>
              ) : (
                // Authenticated: render authenticated user UI
                <>
                  {/* Add Location Button */}
                  <Link href="/add-location">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hidden lg:flex items-center space-x-2 text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-[#4ECDC4] hover:to-[#4ECDC4]/80 transition-all duration-300 font-medium px-4 rounded-full shadow-sm hover:shadow-lg"
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
                        className="relative h-10 w-10 lg:h-11 lg:w-11 rounded-full p-0 overflow-hidden ring-2 ring-transparent hover:ring-[#4ECDC4]/40 transition-all duration-300 shadow-md hover:shadow-lg"
                      >
                        {user?.profileImage?.url && !imageError ? (
                          <Image
                            src={user.profileImage.url} 
                            alt={user.profileImage?.alt || user.name || 'User avatar'}
                            width={44}
                            height={44}
                            className="h-full w-full rounded-full object-cover"
                            onError={() => setImageError(true)}
                          />
                        ) : (
                          <div className="h-full w-full rounded-full bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] flex items-center justify-center text-white text-sm lg:text-base font-bold shadow-inner">
                            {getInitials(user)}
                          </div>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end" 
                      className="w-64 mt-2 shadow-2xl border-0 bg-white/95 backdrop-blur-xl rounded-2xl overflow-hidden" 
                      forceMount
                    >
                      <DropdownMenuLabel className="font-normal p-4 bg-gradient-to-r from-[#FF6B6B]/5 to-[#4ECDC4]/5">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-semibold leading-none text-gray-900">
                            {user?.name || 'User'}
                          </p>
                          <p className="text-xs leading-none text-gray-500">
                            {user?.email || ''}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                      <DropdownMenuGroup className="p-2">
                        <DropdownMenuItem asChild className="cursor-pointer rounded-xl">
                          <Link href={`/profile/${user?.id}`} className="flex items-center p-3 text-gray-700 hover:text-[#FF6B6B] hover:bg-gradient-to-r hover:from-[#FF6B6B]/10 hover:to-[#4ECDC4]/10 transition-all duration-300 rounded-xl">
                            <User className="mr-3 h-4 w-4" />
                            <span className="font-medium">Profile</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer rounded-xl">
                          <Link href="/saved" className="flex items-center p-3 text-gray-700 hover:text-[#FF6B6B] hover:bg-gradient-to-r hover:from-[#FF6B6B]/10 hover:to-[#4ECDC4]/10 transition-all duration-300 rounded-xl">
                            <Heart className="mr-3 h-4 w-4" />
                            <span className="font-medium">Saved</span>
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                      <DropdownMenuItem 
                        onClick={handleLogout} 
                        className="cursor-pointer rounded-xl p-3 m-2 text-gray-700 hover:text-red-600 hover:bg-red-50 transition-all duration-300"
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        <span className="font-medium">Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden p-2 text-gray-700 hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/10 rounded-full transition-all duration-300"
                onClick={toggleMobileMenu}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={cn(
        "fixed inset-0 z-40 lg:hidden transition-all duration-300",
        isMobileMenuOpen 
          ? "opacity-100 pointer-events-auto" 
          : "opacity-0 pointer-events-none"
      )}>
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={toggleMobileMenu}></div>
        <div className={cn(
          "absolute top-16 left-4 right-4 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 transition-all duration-300 overflow-hidden",
          isMobileMenuOpen 
            ? "opacity-100 translate-y-0 scale-100" 
            : "opacity-0 -translate-y-4 scale-95"
        )}>
          <div className="p-6 space-y-4">
            {navLinks.map(({ href, label }) => (
              <Link 
                key={href}
                href={href}
                className="block w-full p-3 text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-[#FF6B6B] hover:to-[#4ECDC4] transition-all duration-300 rounded-xl font-medium"
                onClick={toggleMobileMenu}
              >
                {label}
              </Link>
            ))}
            
            {isAuthenticated && (
              <>
                <div className="border-t border-gray-200 pt-4">
                  <Link 
                    href="/add-location"
                    className="flex items-center w-full p-3 text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-[#4ECDC4] hover:to-[#4ECDC4]/80 transition-all duration-300 rounded-xl font-medium"
                    onClick={toggleMobileMenu}
                  >
                    <Plus className="w-4 h-4 mr-3" />
                    Add Location
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
