"use client"

import type React from "react"
import { useState } from "react"

import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Notification } from "@/types/notification"
import { markNotificationAsRead, deleteNotification } from "@/app/actions"

// Icons for different notification types
import { UserPlus, Heart, MessageSquare, AtSign, Bell, Calendar, Sparkles } from "lucide-react"

interface NotificationItemProps {
  notification: Notification
  onAction: () => void
}

export default function NotificationItem({ notification, onAction }: NotificationItemProps) {
  const [actionStatus, setActionStatus] = useState<'idle' | 'accepting' | 'declining' | 'accepted' | 'declined' | 'error'>('idle')
  const [actionError, setActionError] = useState<string | null>(null)

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
      case "invite":
        return <Sparkles className="h-4 w-4 text-[#FF6B6B]" />
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
      case "invite":
        return "bg-yellow-100 text-[#FF6B6B]"
      default:
        return "bg-gray-100 text-gray-600"
    }
  }

  // Get the appropriate link based on notification type and related entity
  const getNotificationLink = () => {
    if (!notification.relatedTo) return "#"
    const collection = notification.relatedTo.relationTo || notification.relatedTo.collection
    const id = notification.relatedTo.value || notification.relatedTo.id
    if (typeof id !== 'string' || !id) return "#"
    switch (collection) {
      case "posts":
        return `/post/${id}`
      case "users":
        return `/profile/${id}`
      case "locations":
        return `/location/${id}`
      case "journeys":
        return `/events/${id}/journey/${id}`
      case "comments":
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

  // Accept/Decline handlers for journey invites
  const handleInviteAction = async (status: 'accepted' | 'declined') => {
    if (!notification.relatedTo) return
    // Accept both relationTo and collection for compatibility
    const collection = notification.relatedTo.relationTo || notification.relatedTo.collection
    let journeyId = notification.relatedTo.value || notification.relatedTo.id
    // Fallback: if journeyId is an object, try id/_id
    if (typeof journeyId === 'object' && journeyId !== null) {
      journeyId = journeyId.id || journeyId._id || ''
    }
    if (collection !== 'journeys' || typeof journeyId !== 'string' || !journeyId) {
      console.error('Invalid journey ID for invite action:', notification.relatedTo)
      setActionStatus('error')
      setActionError('Invalid journey ID for invite action')
      return
    }
    setActionStatus(status === 'accepted' ? 'accepting' : 'declining')
    setActionError(null)
    try {
      const endpoint = status === 'accepted'
        ? `/api/journeys/${journeyId}/accept-invite`
        : `/api/journeys/${journeyId}/decline-invite`
      const res = await fetch(endpoint, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update invite status')
      }
      setActionStatus(status)
      await markNotificationAsRead(notification.id)
      onAction()
    } catch (err: any) {
      setActionStatus('error')
      setActionError(err.message || 'Failed to update invite status')
    }
  }

  // Accept/Decline for journey invites
  const isJourneyInvite = notification.type === 'reminder' && notification.relatedTo?.collection === 'journeys'

  return (
    <div className={cn(
      "flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors rounded-md relative group",
      !notification.read && "bg-blue-50/50",
    )}>
      <div className={cn("p-2 rounded-full flex-shrink-0", getIconBackground())}>{getIcon()}</div>

      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", !notification.read && "font-medium")}>{notification.title}</p>
        {notification.message && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notification.message}</p>}
        {/* Journey invite details */}
        {isJourneyInvite && (
          <div className="mt-1 text-xs text-gray-600">
            {notification.journeyTitle && <span className="font-semibold">Journey: {notification.journeyTitle}</span>}
            {notification.journeyOwner && <span className="ml-2">by {notification.journeyOwner}</span>}
            {notification.inviteStatus && notification.inviteStatus !== 'pending' && (
              <span className={cn("ml-2 font-semibold", notification.inviteStatus === 'accepted' ? 'text-green-600' : 'text-red-600')}>
                {notification.inviteStatus === 'accepted' ? 'Accepted' : 'Declined'}
              </span>
            )}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
        {/* Accept/Decline for journey invites */}
        {isJourneyInvite && (!notification.inviteStatus || notification.inviteStatus === 'pending') && (
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="outline" disabled={actionStatus === 'accepting'} onClick={e => { e.preventDefault(); handleInviteAction('accepted') }}>
              {actionStatus === 'accepting' ? 'Accepting...' : actionStatus === 'accepted' ? 'Accepted!' : 'Accept'}
            </Button>
            <Button size="sm" variant="ghost" disabled={actionStatus === 'declining'} onClick={e => { e.preventDefault(); handleInviteAction('declined') }}>
              {actionStatus === 'declining' ? 'Declining...' : actionStatus === 'declined' ? 'Declined' : 'Decline'}
            </Button>
            {getNotificationLink() !== '#' && (
              <Link href={getNotificationLink()} className="ml-2 text-[#4ECDC4] underline text-xs">View Journey</Link>
            )}
            {actionStatus === 'error' && (
              <span className="text-xs text-red-600 ml-2 font-semibold bg-red-50 border border-red-200 rounded px-2 py-1">
                {actionError || 'Failed to update invite status'}
              </span>
            )}
          </div>
        )}
        {isJourneyInvite && notification.inviteStatus && notification.inviteStatus !== 'pending' && getNotificationLink() !== '#' && (
          <Link href={getNotificationLink()} className="mt-2 inline-block text-[#4ECDC4] underline text-xs">View Journey</Link>
        )}
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
    </div>
  )
}
