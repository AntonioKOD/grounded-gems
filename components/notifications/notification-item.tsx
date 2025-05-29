"use client"

import type React from "react"
import { useState } from "react"

import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trash2, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Notification } from "@/types/notification"
import { markNotificationAsRead, deleteNotification } from "@/app/actions"

// Icons for different notification types
import { UserPlus, Heart, MessageSquare, AtSign, Bell, Calendar, Sparkles, Check, X } from "lucide-react"

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
      case "journey_invite":
        return <Sparkles className="h-4 w-4 text-[#FF6B6B]" />
      case "journey_invite_accepted":
        return <Check className="h-4 w-4 text-green-600" />
      case "journey_invite_declined":
        return <X className="h-4 w-4 text-red-600" />
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
        return "bg-blue-500 text-white"
      case "like":
        return "bg-red-500 text-white"
      case "comment":
        return "bg-green-500 text-white"
      case "mention":
        return "bg-purple-500 text-white"
      case "reminder":
        return "bg-yellow-500 text-white"
      case "event_update":
        return "bg-orange-500 text-white"
      case "journey_invite":
        return "bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] text-white"
      case "journey_invite_accepted":
        return "bg-green-500 text-white"
      case "journey_invite_declined":
        return "bg-red-500 text-white"
      case "invite":
        return "bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] text-white"
      default:
        return "bg-gray-500 text-white"
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

  // Accept/Decline for journey invites - simplified logic using specific notification types
  const isJourneyInvite = notification.type === 'journey_invite' || 
    (notification.type === 'reminder' && notification.relatedTo?.collection === 'journeys')
  
  // Only show accept/decline buttons for actual pending invites (journey_invite type)
  // Don't show them for notifications about responses (journey_invite_accepted/declined)
  const shouldShowInviteButtons = notification.type === 'journey_invite' && 
    (!notification.inviteStatus || notification.inviteStatus === 'pending')

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
  const link = getNotificationLink()

  return (
    <div className={cn(
      "group relative bg-white rounded-2xl border border-gray-100 p-4 transition-all duration-300 hover:shadow-lg hover:shadow-gray-100 hover:border-gray-200",
      !notification.read && "bg-gradient-to-r from-blue-50/50 to-purple-50/30 border-blue-200/50"
    )}>
      {/* Unread indicator */}
      {!notification.read && (
        <div className="absolute top-4 right-4 w-3 h-3 bg-[#FF6B6B] rounded-full animate-pulse"></div>
      )}

      <div className="flex items-start gap-4">
        {/* Profile Avatar or Icon */}
        <div className="flex-shrink-0 relative">
          {notification.actionBy && typeof notification.actionBy === 'object' ? (
            <Avatar className="w-12 h-12 ring-2 ring-white shadow-md">
              <AvatarImage 
                src={notification.actionBy.profileImage?.url} 
                alt={notification.actionBy.name}
              />
              <AvatarFallback className="bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 font-semibold">
                {notification.actionBy.name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center shadow-md",
              getIconBackground()
            )}>
              {getIcon()}
            </div>
          )}
          
          {/* Notification type badge */}
          <div className={cn(
            "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-md ring-2 ring-white",
            getIconBackground()
          )}>
            {getIcon()}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              {/* Title */}
              <p className={cn(
                "text-gray-900 leading-relaxed",
                !notification.read ? "font-semibold" : "font-medium"
              )}>
                {notification.title}
              </p>
              
              {/* Message */}
              {notification.message && (
                <p className="text-gray-600 text-sm mt-1 leading-relaxed line-clamp-2">
                  {notification.message}
                </p>
              )}

              {/* Journey invite details */}
              {isJourneyInvite && (
                <div className="mt-2 text-sm text-gray-600">
                  {notification.journeyTitle && (
                    <span className="font-semibold text-gray-800">📍 {notification.journeyTitle}</span>
                  )}
                  {notification.journeyOwner && (
                    <span className="ml-2 text-gray-500">by {notification.journeyOwner}</span>
                  )}
                  {notification.inviteStatus && notification.inviteStatus !== 'pending' && (
                    <span className={cn(
                      "ml-2 px-2 py-1 rounded-full text-xs font-bold",
                      notification.inviteStatus === 'accepted' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    )}>
                      {notification.inviteStatus === 'accepted' ? '✅ Accepted' : '❌ Declined'}
                    </span>
                  )}
                </div>
              )}

              {/* Timestamp */}
              <p className="text-gray-400 text-xs mt-2 font-medium">
                {timeAgo}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* Mark as read button */}
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClick}
                  className="text-gray-400 hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/10 transition-colors"
                  title="Mark as read"
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}

              {/* Delete button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                title="Delete notification"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Accept/Decline buttons for journey invites */}
          {shouldShowInviteButtons && (
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
              <Button 
                size="sm" 
                disabled={actionStatus === 'accepting'} 
                onClick={e => { e.preventDefault(); handleInviteAction('accepted') }}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-6 py-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
              >
                {actionStatus === 'accepting' ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Accepting...
                  </div>
                ) : actionStatus === 'accepted' ? (
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Accepted!
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Accept
                  </div>
                )}
              </Button>
              
              <Button 
                size="sm" 
                variant="outline" 
                disabled={actionStatus === 'declining'} 
                onClick={e => { e.preventDefault(); handleInviteAction('declined') }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-6 py-2 rounded-xl transition-all duration-200"
              >
                {actionStatus === 'declining' ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    Declining...
                  </div>
                ) : actionStatus === 'declined' ? (
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4" />
                    Declined
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4" />
                    Decline
                  </div>
                )}
              </Button>

              {/* Error state */}
              {actionStatus === 'error' && (
                <span className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-1">
                  {actionError || 'Failed to update invite status'}
                </span>
              )}
            </div>
          )}

          {/* View link for journey notifications */}
          {isJourneyInvite && !shouldShowInviteButtons && link !== '#' && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <Link 
                href={link} 
                className="inline-flex items-center gap-2 text-[#4ECDC4] hover:text-[#4ECDC4]/80 font-semibold text-sm transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                View Journey
              </Link>
            </div>
          )}

          {/* General view link for other notifications */}
          {!isJourneyInvite && link !== '#' && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <Link 
                href={link} 
                onClick={handleClick}
                className="inline-flex items-center gap-2 text-[#4ECDC4] hover:text-[#4ECDC4]/80 font-semibold text-sm transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                View Details
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
