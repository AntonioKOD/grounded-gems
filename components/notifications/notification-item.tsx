"use client"

import type React from "react"

import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Notification } from "@/types/notification"
import { markNotificationAsRead, deleteNotification } from "@/app/actions"

// Icons for different notification types
import { UserPlus, Heart, MessageSquare, AtSign, Bell, Calendar } from "lucide-react"

interface NotificationItemProps {
  notification: Notification
  onAction: () => void
}

export default function NotificationItem({ notification, onAction }: NotificationItemProps) {
  // Get the appropriate icon based on notification type
  const getIcon = () => {
    switch (notification.type) {
      case "follow":
        return <UserPlus className="h-4 w-4" />
      case "like":
        return <Heart className="h-4 w-4" />
      case "comment":
        return <MessageSquare className="h-4 w-4" />
      case "mention":
        return <AtSign className="h-4 w-4" />
      case "reminder":
        return <Bell className="h-4 w-4" />
      case "event_update":
        return <Calendar className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  // Get the appropriate background color based on notification type
  const getIconBackground = () => {
    switch (notification.type) {
      case "follow":
        return "bg-blue-100 text-blue-600"
      case "like":
        return "bg-red-100 text-red-600"
      case "comment":
        return "bg-green-100 text-green-600"
      case "mention":
        return "bg-purple-100 text-purple-600"
      case "reminder":
        return "bg-yellow-100 text-yellow-600"
      case "event_update":
        return "bg-orange-100 text-orange-600"
      default:
        return "bg-gray-100 text-gray-600"
    }
  }

  // Get the appropriate link based on notification type and related entity
  const getNotificationLink = () => {
    if (!notification.relatedTo) return "#"

    const { collection, id } = notification.relatedTo

    switch (collection) {
      case "posts":
        return `/post/${id}`
      case "users":
        return `/profile/${id}`
      case "locations":
        return `/location/${id}`
      case "comments":
        // For comments, we need to find the parent post
        // This is simplified - in a real app, you might need to fetch the parent post ID
        return `/post/${id.split("-")[0]}`
      default:
        return "#"
    }
  }

  // Handle marking as read when clicked
  const handleClick = async () => {
    if (!notification.read) {
      await markNotificationAsRead(notification.id)
      onAction()
    }
  }

  // Handle deleting the notification
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await deleteNotification(notification.id)
    onAction()
  }

  return (
    <Link
      href={getNotificationLink()}
      onClick={handleClick}
      className={cn(
        "flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors rounded-md relative group",
        !notification.read && "bg-blue-50/50",
      )}
    >
      <div className={cn("p-2 rounded-full flex-shrink-0", getIconBackground())}>{getIcon()}</div>

      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", !notification.read && "font-medium")}>{notification.title}</p>
        {notification.message && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notification.message}</p>}
        <p className="text-xs text-gray-400 mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
        onClick={handleDelete}
        title="Delete notification"
      >
        <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
      </Button>

      {!notification.read && <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-blue-500" />}
    </Link>
  )
}
