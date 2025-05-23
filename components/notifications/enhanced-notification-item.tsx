'use client'

import { useState } from 'react'
import { Heart, Share2, MapPin, Calendar, Bell, Users, Star, TrendingUp, Award, Clock, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { markNotificationAsRead } from '@/app/actions'
import { toast } from 'sonner'
import Link from 'next/link'

interface NotificationItemProps {
  notification: {
    id: string
    type: string
    title: string
    message: string
    read: boolean
    createdAt: string
    priority?: 'low' | 'normal' | 'high' | 'urgent'
    actionRequired?: boolean
    actionStatus?: 'pending' | 'approved' | 'denied' | 'expired'
    actionBy?: {
      id: string
      name: string
      profileImage?: { url: string }
    }
    relatedTo?: {
      id: string
      collection: string
    }
    metadata?: Record<string, unknown>
  }
  onRead?: (notificationId: string) => void
  compact?: boolean
}

export default function EnhancedNotificationItem({ 
  notification, 
  onRead,
  compact = false 
}: NotificationItemProps) {
  const [isMarking, setIsMarking] = useState(false)

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (notification.read) return
    
    setIsMarking(true)
    try {
      const success = await markNotificationAsRead(notification.id)
      if (success) {
        onRead?.(notification.id)
      } else {
        toast.error('Failed to mark notification as read')
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast.error('Failed to mark notification as read')
    } finally {
      setIsMarking(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    const iconConfig = {
      // Location-based notifications
      location_liked: { icon: Heart, color: 'text-red-500', bg: 'bg-red-50' },
      location_shared: { icon: Share2, color: 'text-blue-500', bg: 'bg-blue-50' },
      location_visited: { icon: MapPin, color: 'text-green-500', bg: 'bg-green-50' },
      location_reviewed: { icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-50' },
      location_saved: { icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50' },
      location_verified: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
      location_featured: { icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50' },
      location_published: { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
      location_interaction: { icon: Users, color: 'text-gray-500', bg: 'bg-gray-50' },
      
      // Event request notifications
      event_request_received: { icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-50' },
      event_request_approved: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
      event_request_denied: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
      
      // Proximity and location alerts
      proximity_alert: { icon: MapPin, color: 'text-indigo-500', bg: 'bg-indigo-50' },
      business_hours_changed: { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
      new_review_received: { icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-50' },
      friend_checked_in: { icon: Users, color: 'text-green-500', bg: 'bg-green-50' },
      
      // Milestone and achievement notifications
      location_milestone: { icon: Award, color: 'text-purple-500', bg: 'bg-purple-50' },
      location_trending: { icon: TrendingUp, color: 'text-pink-500', bg: 'bg-pink-50' },
      
      // Check-in notifications
      check_in: { icon: MapPin, color: 'text-green-500', bg: 'bg-green-50' },
      
      // Default notifications
      follow: { icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
      like: { icon: Heart, color: 'text-red-500', bg: 'bg-red-50' },
      comment: { icon: Users, color: 'text-green-500', bg: 'bg-green-50' },
      mention: { icon: Users, color: 'text-purple-500', bg: 'bg-purple-50' },
      reminder: { icon: Bell, color: 'text-orange-500', bg: 'bg-orange-50' },
      event_update: { icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50' },
    }
    
    return iconConfig[type as keyof typeof iconConfig] || { 
      icon: Bell, 
      color: 'text-gray-500', 
      bg: 'bg-gray-50' 
    }
  }

  const getPriorityIndicator = (priority?: string) => {
    if (!priority || priority === 'normal') return null
    
    const priorityConfig = {
      low: { color: 'border-l-gray-400', label: 'Low' },
      high: { color: 'border-l-orange-400', label: 'High' },
      urgent: { color: 'border-l-red-500', label: 'Urgent' },
    }
    
    const config = priorityConfig[priority as keyof typeof priorityConfig]
    if (!config) return null
    
    return (
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.color} rounded-l`} />
    )
  }

  const getActionStatusBadge = (actionRequired?: boolean, actionStatus?: string) => {
    if (!actionRequired) return null
    
    const statusConfig = {
      pending: { label: 'Action Required', variant: 'default' as const, color: 'bg-yellow-100 text-yellow-800' },
      approved: { label: 'Approved', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      denied: { label: 'Denied', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
      expired: { label: 'Expired', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' },
    }
    
    const config = statusConfig[actionStatus as keyof typeof statusConfig] || statusConfig.pending
    
    return (
      <Badge className={`text-xs ${config.color}`}>
        {config.label}
      </Badge>
    )
  }

  const getNotificationLink = () => {
    if (!notification.relatedTo) return null
    
    const { id, collection } = notification.relatedTo
    
    switch (collection) {
      case 'locations':
        return `/map?location=${id}`
      case 'events':
        return `/events/${id}`
      case 'posts':
        return `/post/${id}`
      case 'users':
        return `/profile/${id}`
      case 'eventRequests':
        return `/events/requests` // You'd need to create this page
      default:
        return null
    }
  }

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
  const { icon: Icon, color, bg } = getNotificationIcon(notification.type)
  const link = getNotificationLink()

  const NotificationContent = () => (
    <Card className={`
      relative transition-all duration-200 hover:shadow-md cursor-pointer
      ${!notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white'}
      ${compact ? 'p-2' : 'p-4'}
    `}>
      {getPriorityIndicator(notification.priority)}
      
      <CardContent className={compact ? 'p-2' : 'p-4'}>
        <div className="flex items-start gap-3">
          {/* Notification Icon */}
          <div className={`flex-shrink-0 ${bg} p-2 rounded-full ${compact ? 'w-8 h-8' : 'w-10 h-10'} flex items-center justify-center`}>
            <Icon className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} ${color}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                {/* User Avatar and Name (if actionBy exists) */}
                {notification.actionBy && (
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage 
                        src={notification.actionBy.profileImage?.url} 
                        alt={notification.actionBy.name}
                      />
                      <AvatarFallback className="text-xs">
                        {notification.actionBy.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-900">
                      {notification.actionBy.name}
                    </span>
                  </div>
                )}

                {/* Title */}
                <h4 className={`font-medium text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
                  {notification.title}
                </h4>

                {/* Message */}
                {!compact && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                )}

                {/* Metadata (if available) */}
                {!compact && notification.metadata && (
                  <div className="mt-2 text-xs text-gray-500">
                    {notification.metadata.locationName && (
                      <span>📍 {notification.metadata.locationName}</span>
                    )}
                    {notification.metadata.eventTitle && (
                      <span>🎉 {notification.metadata.eventTitle}</span>
                    )}
                    {notification.metadata.visitCount && (
                      <span>👥 {notification.metadata.visitCount} total visits</span>
                    )}
                  </div>
                )}

                {/* Time and Status */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500">{timeAgo}</span>
                  {getActionStatusBadge(notification.actionRequired, notification.actionStatus)}
                </div>
              </div>

              {/* Mark as read button */}
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAsRead}
                  disabled={isMarking}
                  className="flex-shrink-0 h-8 w-8 p-0 hover:bg-blue-100"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (link) {
    return (
      <Link href={link} className="block">
        <NotificationContent />
      </Link>
    )
  }

  return <NotificationContent />
}

// Export types for use in other components
export type { NotificationItemProps } 