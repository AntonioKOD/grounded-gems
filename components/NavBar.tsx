/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import {
  Menu,
  X,
  LogOut,
  UserCircle,
  Settings,
  Home,
  Plus,
  Calendar,
  MapPin,
  LayoutList,
  Search,
  ChevronDown,
  Users,
} from "lucide-react"

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { logoutUser } from "@/app/actions"
import NotificationCenter from "@/components/notifications/notification-center"
import { Input } from "@/components/ui/input"
import { useMediaQuery } from "@/hooks/use-media-query"

interface UserData {
  id: string
  email: string
  name?: string
  avatar?: string
  profileImage?: {
    url: string
    alt?: string
  }
}

const NavBar = () => {
  // State
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const isTablet = useMediaQuery("(max-width: 1024px)")
  const isMobile = useMediaQuery("(max-width: 640px)")

  // Zipf's Law Navigation Links - Prioritized by frequency of use
  const getPrimaryNavLinks = (isLoggedIn: boolean) => {
    // High frequency links - Always visible
    const primaryLinks = [
      { path: "/feed", label: "Feed", icon: LayoutList, priority: "high" },
      { path: "/matchmaking", label: "Matchmaking", icon: Users, priority: "high" },
      { path: "/events", label: "Events", icon: Calendar, priority: "high" },
    ]

    // Only show primary links for logged in users, otherwise just show Home
    return isLoggedIn ? primaryLinks : [{ path: "/", label: "Home", icon: Home, priority: "high" }]
  }

  const getSecondaryNavLinks = (isLoggedIn: boolean) => {
    // Medium frequency links - Secondary visibility
    if (!isLoggedIn) return []

    return [
      { path: "/map", label: "Locations", icon: MapPin, priority: "medium" },
      { path: "/profile", label: "Profile", icon: UserCircle, priority: "medium" },
    ]
  }

  // Scroll effect
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Close menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
    setMobileSearchOpen(false)
  }, [pathname])

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/users/me", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            setUser(null)
            return
          }
          throw new Error(`Failed to fetch user: ${response.status}`)
        }

        const data = await response.json()
        setUser(data.user)
        // Update user location if available and coordinates exist
      } catch (error) {
        console.error("Error fetching user:", error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()

    // Auth event listeners
    const handleLoginSuccess = () => fetchUser()
    const handleLogoutSuccess = () => setUser(null)

    window.addEventListener("login-success", handleLoginSuccess)
    window.addEventListener("logout-success", handleLogoutSuccess)

    return () => {
      window.removeEventListener("login-success", handleLoginSuccess)
      window.removeEventListener("logout-success", handleLogoutSuccess)
    }
  }, [])

  // Handle logout
  const handleLogout = async () => {
    try {
      await logoutUser()
      setUser(null)
      window.dispatchEvent(new Event("logout-success"))
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  // Search handler
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
      setSearchQuery("")
      setMobileSearchOpen(false)
    }
  }

  // Get user initials for avatar
  const getInitials = (u: UserData) =>
    u.name
      ? u.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
      : u.email.charAt(0).toUpperCase()

  // Get navigation links based on login status
  const primaryNavLinks = getPrimaryNavLinks(!!user)
  const secondaryNavLinks = getSecondaryNavLinks(!!user)

  return (
    <header className="sticky top-0 z-50 mx-2">
      <nav
        className={cn(
          "mx-auto mt-2 rounded-xl p-3 transition-all duration-300 max-w-7xl",
          isScrolled ? "bg-white shadow-lg border border-gray-100" : "bg-white/90 backdrop-blur-md",
        )}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image src="/logo.svg" alt="Logo" width={80} height={40} className="h-20 w-auto" priority />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {/* Primary Nav Links - High Frequency (Zipf's Law) */}
            {primaryNavLinks.map((link) => (
              <Button
                key={link.path}
                variant={pathname === link.path ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-9",
                  pathname === link.path ? "bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white" : "hover:bg-gray-100",
                )}
                asChild
              >
                <Link href={link.path}>
                  <link.icon className="h-4 w-4 mr-2" />
                  {link.label}
                </Link>
              </Button>
            ))}

            {/* Secondary Nav Links - Medium Frequency (Zipf's Law) */}
            {secondaryNavLinks.map((link) => (
              <Button
                key={link.path}
                variant={pathname === link.path ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-9",
                  pathname === link.path ? "bg-[#FF6B6B]/80 hover:bg-[#FF6B6B]/90 text-white" : "hover:bg-gray-100",
                )}
                asChild
              >
                <Link href={link.path}>
                  <link.icon className="h-4 w-4 mr-2" />
                  {link.label}
                </Link>
              </Button>
            ))}

            {/* Action Buttons - Only show for logged in users */}
            {user && (
              <>
                {/* Add Event Button */}
                <Link href="/events/create" className="flex flex-col items-center mx-2">
                  <div className="h-10 w-10 rounded-full bg-[#FF6B6B] flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs mt-1">Add Event</span>
                </Link>

                {/* Add Location Button */}
                <Link href="/add-location" className="flex flex-col items-center mx-2">
                  <div className="h-10 w-10 rounded-full bg-[#4ECDC4] flex items-center justify-center">
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs mt-1">Add Location</span>
                </Link>
              </>
            )}

            {/* Desktop Search */}
            <form onSubmit={handleSearch} className="relative mx-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 h-9 w-40 focus:w-60 transition-all duration-300 bg-gray-50 border-gray-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>

            {/* User Menu / Auth Buttons */}
            {isLoading ? (
              <div className="flex items-center ml-2">
                <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
              </div>
            ) : user ? (
              <div className="flex items-center ml-2">
                {/* Notifications */}
                {user && <NotificationCenter userId={user.id} />}

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="p-1 flex items-center gap-2 hover:bg-[#FF6B6B]/5 rounded-full">
                      <Avatar className="h-8 w-8 border-2 border-[#FF6B6B]/20">
                        {user?.profileImage?.url ? (
                          <AvatarImage src={user.profileImage.url || "/placeholder.svg"} alt={user.name || "User"} />
                        ) : (
                          <AvatarFallback className="bg-[#FF6B6B]/10 text-[#FF6B6B]">
                            {getInitials(user)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <ChevronDown className="h-4 w-4 text-gray-500 hidden lg:block" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col">
                        <span className="font-medium">{user.name || "User"}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => router.push(`/profile/${user.id}`)}>
                        <UserCircle className="mr-2 h-4 w-4" /> View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push("/settings")}>
                        <Settings className="mr-2 h-4 w-4" /> Settings
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500">
                      <LogOut className="mr-2 h-4 w-4" /> Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-2 ml-2">
                {/* Auth buttons - Low frequency (Zipf's Law) */}
                <Button variant="ghost" asChild className="hover:bg-[#FF6B6B]/5 hover:text-[#FF6B6B]">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white">
                  <Link href="/signup">Sign up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Controls */}
          <div className="flex items-center md:hidden">
            {user && <NotificationCenter userId={user.id} />}

            {/* Search Toggle */}
            <Button variant="ghost" size="icon" onClick={() => setMobileSearchOpen(!mobileSearchOpen)} className="mr-1">
              <Search className="h-5 w-5" />
            </Button>

            {/* Menu Toggle */}
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Search */}
        {mobileSearchOpen && (
          <div className="md:hidden mt-3 px-2">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="mobile-search-input"
                type="search"
                placeholder="Search..."
                className="pl-10 pr-10 py-2 h-10 bg-gray-50 border-gray-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setMobileSearchOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </form>
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3">
            <div className="flex flex-col space-y-1 px-2 pb-3 pt-1">
              {/* Primary Navigation Links - High Frequency (Zipf's Law) */}
              {primaryNavLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 font-medium",
                    pathname === link.path
                      ? "bg-[#FF6B6B] text-white"
                      : "text-gray-700 hover:bg-[#FF6B6B]/5 hover:text-[#FF6B6B]",
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <link.icon className="mr-2 h-5 w-5" />
                  {link.label}
                </Link>
              ))}

              {/* Secondary Navigation Links - Medium Frequency (Zipf's Law) */}
              {secondaryNavLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 font-medium",
                    pathname === link.path
                      ? "bg-[#FF6B6B]/80 text-white"
                      : "text-gray-600 hover:bg-[#FF6B6B]/5 hover:text-[#FF6B6B]",
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <link.icon className="mr-2 h-5 w-5" />
                  {link.label}
                </Link>
              ))}

              {/* User-specific actions */}
              {isLoading ? (
                <div className="my-2 px-3 py-2 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
                    <div className="flex flex-col space-y-2">
                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ) : user ? (
                <>
                  <div className="my-2 px-3 py-2 bg-gray-50 rounded-md">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10 border-2 border-[#FF6B6B]/20">
                        {user?.profileImage?.url ? (
                          <AvatarImage src={user.profileImage.url || "/placeholder.svg"} alt={user.name || "User"} />
                        ) : (
                          <AvatarFallback className="bg-[#FF6B6B]/10 text-[#FF6B6B]">
                            {getInitials(user)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.name || "User"}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/profile/${user.id}`}
                    className="flex items-center rounded-md px-3 py-2 font-medium text-gray-700 hover:bg-[#FF6B6B]/5 hover:text-[#FF6B6B]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <UserCircle className="mr-2 h-5 w-5" />
                    View Profile
                  </Link>

                  <Link
                    href="/settings"
                    className="flex items-center rounded-md px-3 py-2 font-medium text-gray-700 hover:bg-[#FF6B6B]/5 hover:text-[#FF6B6B]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="mr-2 h-5 w-5" />
                    Settings
                  </Link>

                  {/* Add Location Button - Mobile */}
                  <Link
                    href="/add-location"
                    className="flex items-center rounded-md px-3 py-2 mt-1 font-medium text-gray-700 hover:bg-[#FF6B6B]/5 hover:text-[#FF6B6B]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Add Location
                  </Link>

                  {/* Add Event Button - Mobile */}
                  <Link
                    href="/events/create"
                    className="flex items-center rounded-md px-3 py-2 font-medium text-gray-700 hover:bg-[#FF6B6B]/5 hover:text-[#FF6B6B]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Calendar className="mr-2 h-5 w-5" />
                    Add Event
                  </Link>

                  <Button
                    variant="outline"
                    className="mt-1 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      handleLogout()
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </Button>
                </>
              ) : (
                <div className="flex flex-col space-y-2 mt-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      router.push("/login")
                    }}
                  >
                    Log in
                  </Button>
                  <Button
                    className="w-full bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      router.push("/signup")
                    }}
                  >
                    Sign up
                  </Button>
                </div>
              )}
            </div>
            <div className="px-2 pt-2 pb-3">
              <Button
                variant="ghost"
                className="w-full flex items-center justify-center text-gray-500"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Close Menu
              </Button>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}

export default NavBar

// Add this at the end of the file, outside the component
export function notifyLoginSuccess() {
  console.log("Notifying login success")
  window.dispatchEvent(new Event("login-success"))
}
