"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, Bell, Heart, Sparkles, Settings, Filter } from "lucide-react"
import NotificationItem from "./notification-item"
import { getNotifications, markAllNotificationsAsRead } from "@/app/actions"
import type { Notification } from "@/types/notification"
import TestNotificationButton from "../test-notification-button"
import { cn } from "@/lib/utils"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/users/me", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })
        const data = await response.json()
        return data.user
      } catch (error) {
        console.error("Error fetching current user:", error)
        return null
      }
    }

    fetchCurrentUser().then((userData) => {
      if (userData) {
        setUser(userData)
        fetchNotifications(userData.id)
      }
    })
  }, [])

  const fetchNotifications = async (userId: string) => {
    setIsLoading(true)
    try {
      const fetchedNotifications = await getNotifications(userId, 50)
      setNotifications(fetchedNotifications)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user) return

    try {
      await markAllNotificationsAsRead(user.id)
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (error) {
      console.error("Error marking all as read:", error)
    }
  }

  // Filter notifications based on active tab
  const filteredNotifications = activeTab === "unread" ? notifications.filter((n) => !n.read) : notifications

  // Group notifications by time periods (like Instagram)
  const groupNotificationsByTime = (notifications: Notification[]) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    const groups: Record<string, Notification[]> = {
      "Today": [],
      "Yesterday": [],
      "This Week": [],
      "Earlier": []
    }

    notifications.forEach(notification => {
      const notificationDate = new Date(notification.createdAt)
      
      if (notificationDate >= today) {
        groups["Today"].push(notification)
      } else if (notificationDate >= yesterday) {
        groups["Yesterday"].push(notification)
      } else if (notificationDate >= thisWeek) {
        groups["This Week"].push(notification)
      } else {
        groups["Earlier"].push(notification)
      }
    })

    // Remove empty groups
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key]
      }
    })

    return groups
  }

  const groupedNotifications = groupNotificationsByTime(filteredNotifications)
  const unreadCount = notifications.filter((n) => !n.read).length

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] rounded-full mx-auto mb-6 flex items-center justify-center">
            <Bell className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Sign in to view notifications</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">You need to be logged in to see your notifications and stay connected.</p>
          <Button asChild className="w-full bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:from-[#FF6B6B]/90 hover:to-[#4ECDC4]/90 text-white font-semibold py-3 rounded-2xl shadow-lg">
            <a href="/login">Sign In</a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                <p className="text-sm text-gray-500">Stay connected with your community</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button 
                  onClick={handleMarkAllAsRead}
                  variant="ghost" 
                  size="sm" 
                  className="text-[#FF6B6B] hover:text-[#FF6B6B]/80 hover:bg-[#FF6B6B]/10 font-medium"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark all read
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Modern Tabs */}
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-2xl p-1 h-12">
              <TabsTrigger 
                value="all" 
                className="rounded-xl font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-600"
              >
                All
                {notifications.length > 0 && (
                  <span className="ml-2 bg-gray-200 text-gray-600 rounded-full px-2 py-0.5 text-xs font-medium">
                    {notifications.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="unread" 
                className="rounded-xl font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-600"
              >
                Unread
                {unreadCount > 0 && (
                  <span className="ml-2 bg-[#FF6B6B] text-white rounded-full px-2 py-0.5 text-xs font-bold animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Debug Tools - Only show in development */}
      {process.env.NODE_ENV === 'development' && user && (
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">Debug Tools (Development Only)</h3>
            <div className="flex gap-2 flex-wrap">
              <TestNotificationButton userId={user.id} />
              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <a href="/notifications/debug">Debug Page</a>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-gray-200"></div>
              <div className="w-16 h-16 rounded-full border-4 border-[#FF6B6B] border-t-transparent absolute top-0 animate-spin"></div>
            </div>
            <p className="text-gray-500 mt-4 font-medium">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedNotifications).map(([timeGroup, notifications]) => (
              <div key={timeGroup} className="space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-gray-900">{timeGroup}</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent"></div>
                  <span className="text-sm text-gray-500 font-medium">{notifications.length}</span>
                </div>
                
                <div className="space-y-2">
                  {notifications.map((notification, index) => (
                    <div 
                      key={notification.id}
                      className={cn(
                        "transform transition-all duration-300 hover:scale-[1.02]",
                        "animate-in slide-in-from-bottom-2",
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <NotificationItem
                        notification={notification}
                        onAction={() => fetchNotifications(user.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Beautiful Empty State
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative mb-8">
              <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                <Bell className="w-16 h-16 text-gray-400" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {activeTab === "unread" ? "All caught up! 🎉" : "No notifications yet"}
            </h2>
            <p className="text-gray-600 max-w-md leading-relaxed mb-6">
              {activeTab === "unread" 
                ? "You've read all your notifications. Great job staying up to date with your community!"
                : "When people interact with your content or invite you to hangouts, you'll see notifications here. Start exploring and connecting!"
              }
            </p>
            
            {activeTab !== "unread" && (
              <Button 
                asChild 
                className="bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:from-[#FF6B6B]/90 hover:to-[#4ECDC4]/90 text-white font-semibold px-8 py-3 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <a href="/feed">Explore Feed</a>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
