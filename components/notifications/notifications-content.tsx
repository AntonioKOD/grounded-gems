"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Check, Calendar, UserPlus, Heart, MessageSquare, Star, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  
} from "@/app/actions"
import type { Notification } from "@/types/notification"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

export default function NotificationsContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    if (!user) return

    const fetchNotifications = async () => {
      setIsLoading(true)
      try {
        const data = await getNotifications(user.id)
        setNotifications(data)
      } catch (error) {
        console.error("Error fetching notifications:", error)
        toast.error("Failed to load notifications")
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotifications()
  }, [user])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const success = await markNotificationAsRead(notificationId)
      if (success) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === notificationId ? { ...notification, read: true } : notification,
          ),
        )
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user) return

    try {
      const success = await markAllNotificationsAsRead(user.id)
      if (success) {
        setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
        toast.success("All notifications marked as read")
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      toast.error("Failed to mark all as read")
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      await handleMarkAsRead(notification.id)
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
        case "locations":
            router.push(`/locations/${id}`)
            break
        default:
          // Default fallback
          router.push("/feed")
      }
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "event":
        return <Calendar className="h-5 w-5" />
      case "follow":
        return <UserPlus className="h-5 w-5" />
      case "like":
        return <Heart className="h-5 w-5" />
      case "comment":
        return <MessageSquare className="h-5 w-5" />
      case "rating":
        return <Star className="h-5 w-5" />
      default:
        return <Bell className="h-5 w-5" />
    }
  }

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
      case "rating":
        return "bg-amber-100 text-amber-600"
      default:
        return "bg-gray-100 text-gray-600"
    }
  }

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === "all") return true
    if (activeTab === "unread") return !notification.read
    return notification.type === activeTab
  })

  // Count notifications by type
  const counts = {
    all: notifications.length,
    unread: notifications.filter((n) => !n.read).length,
    event: notifications.filter((n) => n.type === "event").length,
    follow: notifications.filter((n) => n.type === "follow").length,
    like: notifications.filter((n) => n.type === "like").length,
    comment: notifications.filter((n) => n.type === "comment").length,
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-9 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl">Notifications</CardTitle>
            <CardDescription>Stay updated with what&apos;s happening</CardDescription>
          </div>
          {counts.unread > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <Check className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-4">
            <TabsTrigger value="all" className="relative">
              All
              {counts.all > 0 && <span className="ml-1 text-xs text-muted-foreground">({counts.all})</span>}
            </TabsTrigger>
            <TabsTrigger value="unread" className="relative">
              Unread
              {counts.unread > 0 && <span className="ml-1 text-xs text-[#FF6B6B]">({counts.unread})</span>}
            </TabsTrigger>
            <TabsTrigger value="event">
              Events
              {counts.event > 0 && <span className="ml-1 text-xs text-muted-foreground">({counts.event})</span>}
            </TabsTrigger>
            <TabsTrigger value="follow">
              Follows
              {counts.follow > 0 && <span className="ml-1 text-xs text-muted-foreground">({counts.follow})</span>}
            </TabsTrigger>
            <TabsTrigger value="like">
              Likes
              {counts.like > 0 && <span className="ml-1 text-xs text-muted-foreground">({counts.like})</span>}
            </TabsTrigger>
            <TabsTrigger value="comment">
              Comments
              {counts.comment > 0 && <span className="ml-1 text-xs text-muted-foreground">({counts.comment})</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {filteredNotifications.length > 0 ? (
              <div className="space-y-4">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start p-4 rounded-lg border cursor-pointer transition-colors",
                      !notification.read
                        ? "bg-[#FF6B6B]/5 border-[#FF6B6B]/20 hover:bg-[#FF6B6B]/10"
                        : "hover:bg-gray-50",
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center mr-4",
                        getIconBackground(notification.type),
                      )}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-sm text-gray-600 mt-1">{notification.message}</div>
                      <div className="text-xs text-gray-400 mt-2">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                    {!notification.read && <div className="h-2.5 w-2.5 rounded-full bg-[#FF6B6B] mt-1.5"></div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-gray-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No notifications</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {activeTab === "all"
                    ? "You don't have any notifications yet. Check back later!"
                    : activeTab === "unread"
                      ? "You've read all your notifications. Great job staying up to date!"
                      : `You don't have any ${activeTab} notifications yet.`}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
