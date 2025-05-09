"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import useSWR from "swr"
import { Menu, X, LogOut, UserCircle, Bell, Settings, Search, ChevronDown, Home, Info, Mail, Plus } from "lucide-react"

import { Button } from "./ui/button"
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
import logo from "@/public/logo.svg"
import { logoutUser } from "@/app/actions"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

interface UserData {
  id: string
  email: string
  name?: string
  avatar?: string
}

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => (res.ok ? res.json().then((d) => d.user) : null))

export default function NavBar() {
  const router = useRouter()
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const menuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  // Add a new state for search visibility on mobile
  const [showMobileSearch, setShowMobileSearch] = useState(false)

  // SWR for current user
  const { data: user, mutate } = useSWR<UserData | null>("/api/users/me", fetcher)

  // Navigation links
  const navLinks = [
    { path: "/", label: "Home", icon: Home },
    { path: "/about", label: "About", icon: Info },
    { path: "/contact", label: "Contact", icon: Mail },
  ]

  // Scroll effect
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Logout handler
  const handleLogout = async () => {
    await logoutUser()
    // clear SWR cache so UI updates immediately
    mutate(null, false)
    router.push("/login")
  }

  // Avatar initials
  const getInitials = (u: UserData) =>
    u.name
      ? u.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
      : u.email.charAt(0).toUpperCase()

  // Search handler
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
      setSearchQuery("")
    }
  }

  // Add a function to handle mobile search toggle
  const toggleMobileSearch = () => {
    setShowMobileSearch((prev) => !prev)
    // Focus the search input when showing
    if (!showMobileSearch) {
      setTimeout(() => {
        const mobileSearchInput = document.getElementById("mobile-search-input")
        mobileSearchInput?.focus()
      }, 100)
    }
  }

  return (
    <header className="sticky top-0 z-50 mx-2">
      <nav
        className={cn(
          "mx-auto mt-2 rounded-xl p-3 transition-all duration-300 max-w-7xl",
          isScrolled ? "bg-white shadow-lg border border-gray-100" : "bg-white/90 backdrop-blur-md",
        )}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image src={logo || "/placeholder.svg"} alt="Logo" className="h-20 w-auto" priority />
            </Link>
          </div>


          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={cn(
                  "relative px-3 py-2 rounded-md font-medium transition-colors",
                  pathname === link.path
                    ? "text-[#FF6B6B] bg-[#FF6B6B]/5"
                    : "text-gray-700 hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/5",
                )}
              >
                {link.label}
              </Link>
            ))}

            {/* Create Button */}
            {user && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => router.push("/locations/add")}
                      size="sm"
                      className="ml-2 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      <span className="hidden lg:inline">Add Location</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add a new location</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Auth / Profile */}
            {user ? (
              <div className="flex items-center ml-2">
                {/* Notifications */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative mr-1"
                        onClick={() => router.push("/notifications")}
                      >
                        <Bell className="h-5 w-5" />
                        <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-[#FF6B6B] text-[10px]">
                          3
                        </Badge>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Notifications</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="p-1 flex items-center gap-2 hover:bg-[#FF6B6B]/5 rounded-full">
                      <Avatar className="h-8 w-8 border-2 border-[#FF6B6B]/20">
                        {user.avatar ? (
                          <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name || "User"} />
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
                <Button variant="ghost" asChild className="hover:bg-[#FF6B6B]/5 hover:text-[#FF6B6B]">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white">
                  <Link href="/signup">Sign up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center md:hidden">
            {user && (
              <Button
                variant="ghost"
                size="icon"
                className="relative mr-1"
                onClick={() => router.push("/notifications")}
              >
                <Bell className="h-5 w-5" />
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-[#FF6B6B] text-[10px]">
                  3
                </Badge>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={toggleMobileSearch} className="mr-1" aria-label="Search">
              <Search className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (isMenuOpen) {
                  setIsMenuOpen(false)
                } else {
                  setIsMenuOpen(true)
                }
              }}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300 ease-in-out px-2",
            showMobileSearch ? "max-h-16 opacity-100 py-2" : "max-h-0 opacity-0 py-0 pointer-events-none",
          )}
        >
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="mobile-search-input"
              type="search"
              placeholder="Search..."
              className="pl-10 pr-10 py-2 h-10 bg-gray-50 border-gray-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setShowMobileSearch(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </form>
        </div>

        {/* Mobile Menu */}
        <div
          id="mobile-menu"
          ref={menuRef}
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
            isMenuOpen ? "max-h-[500px] opacity-100 mt-3" : "max-h-0 opacity-0 mt-0 pointer-events-none",
          )}
        >
          <div className="flex flex-col space-y-1 px-2 pb-3 pt-1">
            {/* Navigation Links */}
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 font-medium",
                  pathname === link.path
                    ? "bg-[#FF6B6B]/10 text-[#FF6B6B]"
                    : "text-gray-700 hover:bg-[#FF6B6B]/5 hover:text-[#FF6B6B]",
                )}
              >
                <link.icon className="mr-2 h-5 w-5" />
                {link.label}
              </Link>
            ))}

            {/* User-specific actions */}
            {user ? (
              <>
                <div className="my-2 px-3 py-2 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10 border-2 border-[#FF6B6B]/20">
                      {user.avatar ? (
                        <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name || "User"} />
                      ) : (
                        <AvatarFallback className="bg-[#FF6B6B]/10 text-[#FF6B6B]">{getInitials(user)}</AvatarFallback>
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
                >
                  <UserCircle className="mr-2 h-5 w-5" />
                  View Profile
                </Link>

                <Link
                  href="/settings"
                  className="flex items-center rounded-md px-3 py-2 font-medium text-gray-700 hover:bg-[#FF6B6B]/5 hover:text-[#FF6B6B]"
                >
                  <Settings className="mr-2 h-5 w-5" />
                  Settings
                </Link>

                <Button
                  onClick={() => router.push("/locations/add")}
                  className="mt-1 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>

                <Button
                  variant="outline"
                  className="mt-1 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </Button>
              </>
            ) : (
              <div className="flex flex-col space-y-2 mt-2">
                <Button variant="outline" className="w-full" onClick={() => router.push("/login")}>
                  Log in
                </Button>
                <Button
                  className="w-full bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white"
                  onClick={() => router.push("/signup")}
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
              onClick={() => setIsMenuOpen(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Close Menu
            </Button>
          </div>
        </div>
      </nav>
    </header>
  )
}
