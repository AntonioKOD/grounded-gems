/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import { useState, useEffect } from "react"
import type React from "react"

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
  Bell,
  Check,
  Heart,
  MessageSquare,
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
import { useMediaQuery } from "@/hooks/use-media-query"
import { useAuth } from "@/hooks/use-auth"
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  
} from "@/app/actions"
import type { Notification } from "@/types/notification"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

const NavBar = () => {
  // Get user data from auth context
  const { user, isLoading, isAuthenticated, logout } = useAuth()

  // State
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isTablet = useMediaQuery("(max-width: 1024px)")
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isMobile = useMediaQuery("(max-width: 640px)")

  // Zipf's Law Navigation Links - Prioritized by frequency of use
  const getPrimaryNavLinks = (isLoggedIn: boolean) => {
    // High frequency links - Always visible
    const primaryLinks = [
      { path: "/feed", label: "Feed", icon: LayoutList, priority: "high" },
      { path: "/events", label: "Events", icon: Calendar, priority: "high" },
    ]

    // Only show primary links for logged in users, otherwise just show Home
    return isLoggedIn ? primaryLinks : [{ path: "/", label: "Home", icon: Home, priority: "high" }]
  }

  const getSecondaryNavLinks = (isLoggedIn: boolean) => {
    // Medium frequency links - Secondary visibility
    if (!isLoggedIn) return []

    return [{ path: "/map", label: "Locations", icon: MapPin, priority: "medium" }]
  }

  // Fetch notifications
  useEffect(() => {
    if (!user) return

    const fetchNotifications = async () => {
      setIsLoadingNotifications(true)
      try {
        // Fetch notifications
        const notificationsData = await getNotifications(user.id, 5)
        setNotifications(notificationsData)

        // Fetch unread count
        const count = await getUnreadNotificationCount(user.id)
        setUnreadCount(count)
      } catch (error) {
        console.error("Error fetching notifications:", error)
      } finally {
        setIsLoadingNotifications(false)
      }
    }

    fetchNotifications()

    // Set up polling for notifications (every 30 seconds)
    const intervalId = setInterval(fetchNotifications, 30000)

    return () => clearInterval(intervalId)
  }, [user])

  // Scroll effect
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Close menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent the parent click handler from firing

    try {
      const success = await markNotificationAsRead(notificationId)
      if (success) {
        // Update local state
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === notificationId ? { ...notification, read: true } : notification,
          ),
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  // Mark all notifications as read
  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent the parent click handler from firing

    if (!user) return

    try {
      const success = await markAllNotificationsAsRead(user.id)
      if (success) {
        // Update local state
        setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
        setUnreadCount(0)
        toast.success("All notifications marked as read")
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      await markNotificationAsRead(notification.id)

      // Update local state
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }

    // Navigate based on notification type and related content
    if (notification.relatedTo) {
      const { collection, id } = notification.relatedTo

      switch (collection) {
        case "events":
          router.push(`/events/${id}`)
          break
        case "posts":
          router.push(`/posts/${id}`)
          break
        case "users":
          router.push(`/profile/${id}`)
          break
        default:
          // Default fallback
          router.push("/feed")
      }
    } else {
      // If no specific related content, go to notifications page
      router.push("/notifications")
    }
  }

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "event":
        return <Calendar className="h-4 w-4" />
      case "follow":
        return <UserCircle className="h-4 w-4" />
      case "like":
        return <Heart className="h-4 w-4" />
      case "comment":
        return <MessageSquare className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  // Get notification icon background
  const getIconBackground = (type: string) => {
    switch (type) {
      case "event":
        return "bg-[#FF6B6B]/10 text-[#FF6B6B]"
      case "follow":
        return "bg-blue-100 text-blue-600"
      case "like":
        return "bg-pink-100 text-pink-600"
      case "comment":
        return "bg-purple-100 text-purple-600"
      default:
        return "bg-gray-100 text-gray-600"
    }
  }

  // Get user initials for avatar
  const getInitials = (u: any) =>
    u.name
      ? u.name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
      : u.email.charAt(0).toUpperCase()

  // Get navigation links based on login status
  const primaryNavLinks = getPrimaryNavLinks(isAuthenticated)
  const secondaryNavLinks = getSecondaryNavLinks(isAuthenticated)

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

            {/* Desktop Search Icon */}
            <Button
              variant="ghost"
              size="icon"
              className="mx-2 h-10 w-10 rounded-full hover:bg-gray-100"
              onClick={() => router.push("/search")}
            >
              <Search className="h-5 w-5 text-gray-600" />
            </Button>

            {/* Notifications Dropdown */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mx-2 h-10 w-10 rounded-full hover:bg-gray-100 relative"
                  >
                    <Bell className="h-5 w-5 text-gray-600" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 h-4 w-4 bg-[#FF6B6B] rounded-full flex items-center justify-center text-[10px] text-white font-medium">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="font-normal flex justify-between items-center">
                    <span className="font-semibold text-base">Notifications</span>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleMarkAllAsRead}>
                        <Check className="mr-1 h-3 w-3" />
                        Mark all as read
                      </Button>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isLoadingNotifications ? (
                    <div className="p-4 space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-start space-x-3">
                          <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
                          <div className="space-y-2 flex-1">
                            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-3 w-full bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-3 w-1/3 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : notifications.length > 0 ? (
                    <div className="max-h-[300px] overflow-y-auto">
                      {notifications.map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          className={cn(
                            "flex flex-col items-start p-3 cursor-pointer",
                            !notification.read && "bg-[#FF6B6B]/5",
                          )}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start w-full">
                            <div
                              className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center mr-3",
                                getIconBackground(notification.type),
                              )}
                            >
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{notification.title}</div>
                              <div className="text-xs text-gray-500 mt-1">{notification.message}</div>
                              <div className="text-xs text-gray-400 mt-1">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </div>
                            </div>
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 rounded-full hover:bg-gray-100"
                                onClick={(e) => handleMarkAsRead(notification.id, e)}
                              >
                                <Check className="h-3 w-3" />
                                <span className="sr-only">Mark as read</span>
                              </Button>
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-sm text-gray-500">No notifications yet</div>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="justify-center text-sm text-[#FF6B6B]"
                    onClick={() => router.push("/notifications")}
                  >
                    View all notifications
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* User Menu / Auth Buttons */}
            {isLoading ? (
              <div className="flex items-center ml-2">
                <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
              </div>
            ) : user ? (
              <div className="flex items-center ml-2">
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
            {/* Search Icon */}
            <Button variant="ghost" size="icon" onClick={() => router.push("/search")} className="mr-1">
              <Search className="h-5 w-5" />
            </Button>

            {/* Notifications Icon */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="mr-1 relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 h-3 w-3 bg-[#FF6B6B] rounded-full"></span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel className="font-normal flex justify-between items-center">
                    <span className="font-semibold">Notifications</span>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleMarkAllAsRead}>
                        <Check className="mr-1 h-3 w-3" />
                        Mark all read
                      </Button>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isLoadingNotifications ? (
                    <div className="p-4 space-y-4">
                      {[1, 2].map((i) => (
                        <div key={i} className="flex items-start space-x-3">
                          <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
                          <div className="space-y-2 flex-1">
                            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-3 w-full bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : notifications.length > 0 ? (
                    <div className="max-h-[300px] overflow-y-auto">
                      {notifications.map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          className={cn(
                            "flex flex-col items-start p-3 cursor-pointer",
                            !notification.read && "bg-[#FF6B6B]/5",
                          )}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start w-full">
                            <div
                              className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center mr-3",
                                getIconBackground(notification.type),
                              )}
                            >
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{notification.title}</div>
                              <div className="text-xs text-gray-500 mt-1">{notification.message}</div>
                              <div className="text-xs text-gray-400 mt-1">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </div>
                            </div>
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 rounded-full hover:bg-gray-100"
                                onClick={(e) => handleMarkAsRead(notification.id, e)}
                              >
                                <Check className="h-3 w-3" />
                                <span className="sr-only">Mark as read</span>
                              </Button>
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-sm text-gray-500">No notifications yet</div>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="justify-center text-sm text-[#FF6B6B]"
                    onClick={() => router.push("/notifications")}
                  >
                    View all notifications
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Menu Toggle */}
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

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
                    href="/notifications"
                    className="flex items-center rounded-md px-3 py-2 font-medium text-gray-700 hover:bg-[#FF6B6B]/5 hover:text-[#FF6B6B] relative"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Bell className="mr-2 h-5 w-5" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="ml-2 bg-[#FF6B6B] text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
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
