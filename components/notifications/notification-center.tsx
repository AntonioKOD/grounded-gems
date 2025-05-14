"use client"

import Link from "next/link"

import { useState, useEffect } from "react"
import { Bell, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import NotificationItem from "./notification-item"
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
} from "@/app/actions"
import type { Notification } from "@/types/notification"

interface NotificationCenterProps {
  userId: string
}

export default function NotificationCenter({ userId }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  // Fetch notifications when the component mounts or when the popover opens
  useEffect(() => {
    if (userId && open) {
      fetchNotifications()
    }
  }, [userId, open])

  // Fetch unread count periodically
  useEffect(() => {
    if (!userId) return

    const fetchUnreadCount = async () => {
      const count = await getUnreadNotificationCount(userId)
      setUnreadCount(count)
    }

    fetchUnreadCount()

    // Set up polling for unread count
    const interval = setInterval(fetchUnreadCount, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [userId])

  const fetchNotifications = async () => {
    setIsLoading(true)
    try {
      const fetchedNotifications = await getNotifications(userId)
      setNotifications(fetchedNotifications)

      // Update unread count
      const unreadNotifications = fetchedNotifications.filter((n) => !n.read)
      setUnreadCount(unreadNotifications.length)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead(userId)
      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking all as read:", error)
    }
  }

  // Filter notifications based on active tab
  const filteredNotifications = activeTab === "unread" ? notifications.filter((n) => !n.read) : notifications

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-[#FF6B6B] text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 flex items-center justify-between">
          <h3 className="font-medium text-lg">Notifications</h3>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              title="Mark all as read"
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <div className="px-4">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                All
              </TabsTrigger>
              <TabsTrigger value="unread" className="flex-1">
                Unread
                {unreadCount > 0 && <Badge className="ml-1 bg-[#FF6B6B]">{unreadCount}</Badge>}
              </TabsTrigger>
            </TabsList>
          </div>

          <Separator className="my-2" />

          <TabsContent value="all" className="m-0">
            <ScrollArea className="h-[350px]">
              {isLoading ? (
                <div className="flex justify-center items-center h-[350px]">
                  <div className="h-8 w-8 rounded-full border-2 border-t-[#FF6B6B] border-r-[#FF6B6B]/30 border-b-[#FF6B6B]/10 border-l-[#FF6B6B]/60 animate-spin"></div>
                </div>
              ) : notifications.length > 0 ? (
                <div className="px-1">
                  {notifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} onAction={fetchNotifications} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[350px] text-center p-4">
                  <Bell className="h-12 w-12 text-gray-300 mb-2" />
                  <p className="text-gray-500">No notifications yet</p>
                  <p className="text-sm text-gray-400">We&apos;ll notify you when something happens</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="unread" className="m-0">
            <ScrollArea className="h-[350px]">
              {isLoading ? (
                <div className="flex justify-center items-center h-[350px]">
                  <div className="h-8 w-8 rounded-full border-2 border-t-[#FF6B6B] border-r-[#FF6B6B]/30 border-b-[#FF6B6B]/10 border-l-[#FF6B6B]/60 animate-spin"></div>
                </div>
              ) : filteredNotifications.length > 0 ? (
                <div className="px-1">
                  {filteredNotifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} onAction={fetchNotifications} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[350px] text-center p-4">
                  <Check className="h-12 w-12 text-green-300 mb-2" />
                  <p className="text-gray-500">All caught up!</p>
                  <p className="text-sm text-gray-400">You have no unread notifications</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <Separator className="my-2" />

        <div className="p-2 text-center">
          <Button variant="link" size="sm" asChild className="text-[#FF6B6B]">
            <Link href="/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
