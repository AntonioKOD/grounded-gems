"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check } from "lucide-react"
import NotificationItem from "./notification-item"
import { getNotifications, markAllNotificationsAsRead } from "@/app/actions"
import type { Notification } from "@/types/notification"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [user, setUser] = useState<{ id: string } | null>(null)

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
      const fetchedNotifications = await getNotifications(userId, 50) // Get more notifications for the full page
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
      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (error) {
      console.error("Error marking all as read:", error)
    }
  }

  // Filter notifications based on active tab
  const filteredNotifications = activeTab === "unread" ? notifications.filter((n) => !n.read) : notifications

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce(
    (groups, notification) => {
      const date = new Date(notification.createdAt).toLocaleDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(notification)
      return groups
    },
    {} as Record<string, Notification[]>,
  )

  // Count unread notifications
  const unreadCount = notifications.filter((n) => !n.read).length

  if (!user) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Sign in to view notifications</h2>
        <p className="text-gray-500 mb-4">You need to be logged in to see your notifications.</p>
        <Button asChild>
          <a href="/login">Sign In</a>
        </Button>
      </Card>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md">
          <TabsList>
            <TabsTrigger value="all" className="flex-1">
              All Notifications
            </TabsTrigger>
            <TabsTrigger value="unread" className="flex-1">
              Unread
              {unreadCount > 0 && (
                <span className="ml-2 bg-[#FF6B6B] text-white rounded-full px-2 py-0.5 text-xs">{unreadCount}</span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} disabled={unreadCount === 0} className="ml-4">
          <Check className="h-4 w-4 mr-2" />
          Mark all as read
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="h-8 w-8 rounded-full border-2 border-t-[#FF6B6B] border-r-[#FF6B6B]/30 border-b-[#FF6B6B]/10 border-l-[#FF6B6B]/60 animate-spin"></div>
        </div>
      ) : filteredNotifications.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([date, notifications]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-gray-500 mb-3">{date}</h3>
              <Card>
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onAction={() => fetchNotifications(user.id)}
                    />
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No notifications</h2>
          <p className="text-gray-500">
            {activeTab === "unread" ? "You've read all your notifications." : "You don't have any notifications yet."}
          </p>
        </Card>
      )}
    </div>
  )
}
